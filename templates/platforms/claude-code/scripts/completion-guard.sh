#!/bin/bash
# Completion Guard — Stop Hook
# 1. Implementation phase에서 테스트 미실행 시 블로킹 (decision: block)
# 2. 세션 노트 컨텍스트를 systemMessage로 주입 (컨텍스트 생존 메모)
# 3. 컨텍스트 윈도우 85% 경고
#
# Input: JSON via stdin (Claude Code hook protocol)
# Output: JSON with decision (block) or systemMessage

set -e

# ── 0. Stop hook loop prevention ──
INPUT=$(cat 2>/dev/null || echo "")
STOP_HOOK_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false' 2>/dev/null || echo "false")
if [ "$STOP_HOOK_ACTIVE" = "true" ]; then
  echo '{}'
  exit 0
fi

# Find project root
PROJECT_ROOT="$(pwd)"
while [ "$PROJECT_ROOT" != "/" ]; do
  if [ -d "$PROJECT_ROOT/.timsquad" ]; then
    break
  fi
  PROJECT_ROOT="$(dirname "$PROJECT_ROOT")"
done

# If not in a TimSquad project, allow
if [ ! -d "$PROJECT_ROOT/.timsquad" ]; then
  echo '{}'
  exit 0
fi

BLOCK_REASON=""

# ── 1. Test execution gate ──
# 변경된 소스 파일에 대한 테스트 실행 여부 확인
# implementation phase에서만 block, 그 외에는 warning
PHASE_FILE="$PROJECT_ROOT/.timsquad/state/current-phase.json"
PHASE="unknown"
if [ -f "$PHASE_FILE" ]; then
  PHASE=$(jq -r '.current // .current_phase // .phase // "unknown"' "$PHASE_FILE" 2>/dev/null || echo "unknown")
fi

TEST_WARNING=""
SESSION_STATE="$PROJECT_ROOT/.timsquad/.daemon/session-state.json"
if [ -f "$SESSION_STATE" ]; then
  # Check if any bash commands were executed (tests run via bash)
  BASH_COMMANDS=$(jq -r '.metrics.bashCommands // 0' "$SESSION_STATE" 2>/dev/null || echo "0")

  if [ "$BASH_COMMANDS" -eq 0 ] 2>/dev/null; then
    # No tests or bash at all — check for changed source files
    CHANGED_SRC=$(cd "$PROJECT_ROOT" && git diff --name-only --diff-filter=ACMR HEAD 2>/dev/null | grep -E '\.(ts|tsx|js|jsx)$' | grep -vE '\.(test|spec)\.' | head -5)
    if [ -n "$CHANGED_SRC" ]; then
      # List related test files that should have been run
      RELATED_TESTS=""
      while IFS= read -r SRC_FILE; do
        [ -z "$SRC_FILE" ] && continue
        BASE_NAME=$(basename "$SRC_FILE" | sed 's/\.[^.]*$//')
        POTENTIAL=$(cd "$PROJECT_ROOT" && find . -name "${BASE_NAME}.test.*" -o -name "${BASE_NAME}.spec.*" 2>/dev/null | head -1)
        if [ -n "$POTENTIAL" ]; then
          RELATED_TESTS="$RELATED_TESTS $POTENTIAL"
        fi
      done <<< "$CHANGED_SRC"

      if [ -n "$RELATED_TESTS" ]; then
        TEST_WARNING="[Test Gate] 변경된 파일에 대한 테스트가 실행되지 않았습니다. 관련 테스트:$RELATED_TESTS"
      else
        TEST_WARNING="[Test Gate] 변경된 소스 파일이 있으나 테스트가 실행되지 않았습니다."
      fi

      if [ "$PHASE" = "implementation" ]; then
        BLOCK_REASON="$TEST_WARNING 테스트를 실행한 후 완료하세요."
      fi
    fi
  fi
fi

# ── 1b. TDD gate: 소스 변경 시 테스트 파일도 변경되었는지 확인 ──
if [ "$PHASE" = "implementation" ] && [ -z "$BLOCK_REASON" ]; then
  ALL_CHANGED=$(cd "$PROJECT_ROOT" && {
    git diff --cached --name-only --diff-filter=ACMR 2>/dev/null
    git diff --name-only --diff-filter=ACMR 2>/dev/null
    git ls-files --others --exclude-standard 2>/dev/null
  } | sort -u | grep -E '\.(ts|tsx|js|jsx)$')

  if [ -n "$ALL_CHANGED" ]; then
    SRC_CHANGED=$(echo "$ALL_CHANGED" | grep -vE '\.(test|spec)\.' | grep -v '__tests__/' | head -5)
    TEST_CHANGED=$(echo "$ALL_CHANGED" | grep -E '\.(test|spec)\.' | head -1)

    if [ -n "$SRC_CHANGED" ] && [ -z "$TEST_CHANGED" ]; then
      REFACTOR_ONLY=$(echo "$INPUT" | jq -r '.transcript // ""' 2>/dev/null | grep -ci 'refactor-only' || echo "0")
      if [ "$REFACTOR_ONLY" -eq 0 ] 2>/dev/null; then
        BLOCK_REASON="[TDD Gate] 소스 파일이 변경되었으나 테스트 파일(.test./.spec.)이 없습니다. 테스트를 먼저 작성하세요. (리팩토링만 한 경우 Notes에 'refactor-only' 명시)"
      fi
    fi
  fi
fi

# ── 2. Session notes context injection ──
SESSION_CTX=""
NOTES_FILE="$PROJECT_ROOT/.timsquad/.daemon/session-notes.jsonl"
if [ -f "$NOTES_FILE" ]; then
  LAST_LINE=$(tail -1 "$NOTES_FILE" 2>/dev/null || echo "")
  if [ -n "$LAST_LINE" ]; then
    TURN=$(echo "$LAST_LINE" | jq -r '.turn // 0' 2>/dev/null)
    TOOLS=$(echo "$LAST_LINE" | jq -r '.metrics.tools // 0' 2>/dev/null)
    FAILS=$(echo "$LAST_LINE" | jq -r '.metrics.fails // 0' 2>/dev/null)
    AGENTS=$(echo "$LAST_LINE" | jq -r '(.activeAgents // []) | join(", ")' 2>/dev/null)
    FILES=$(echo "$LAST_LINE" | jq -r '(.recentFiles // [])[:5] | map(split("/") | last) | join(", ")' 2>/dev/null)

    CTX_PCT=$(echo "$LAST_LINE" | jq -r '.contextPct // 0' 2>/dev/null)

    SESSION_CTX="[Session] Turn $TURN | Tools: $TOOLS"
    [ "$FAILS" != "0" ] && [ "$FAILS" != "null" ] && SESSION_CTX="$SESSION_CTX (Fail: $FAILS)"
    [ -n "$AGENTS" ] && [ "$AGENTS" != "null" ] && SESSION_CTX="$SESSION_CTX | Active: $AGENTS"
    [ -n "$FILES" ] && [ "$FILES" != "null" ] && SESSION_CTX="$SESSION_CTX | Files: $FILES"

    # ── 3. Context window monitor (85% threshold) ──
    if [ "$CTX_PCT" -ge 85 ] 2>/dev/null; then
      SESSION_CTX="$SESSION_CTX\\n⚠ [Context ${CTX_PCT}%] 컨텍스트 윈도우 85% 이상. 현재 작업을 마무리하고, Phase Memory(.timsquad/state/phase-memory.md)를 갱신한 뒤 /clear로 컨텍스트를 초기화하세요. /clear 후에도 phase-memory가 자동 주입됩니다."
    elif [ "$CTX_PCT" -ge 70 ] 2>/dev/null; then
      SESSION_CTX="$SESSION_CTX | Ctx: ${CTX_PCT}%"
    fi
  fi
fi

# ── 4. SSOT readiness check ──
SSOT_WARNING=""
PRD_FILE="$PROJECT_ROOT/.timsquad/ssot/prd.md"
if [ -f "$PRD_FILE" ]; then
  # Check if PRD is mostly placeholder (TBD, [Resource Name], example.com)
  TOTAL_LINES=$(wc -l < "$PRD_FILE" 2>/dev/null || echo "0")
  PLACEHOLDER_LINES=$(grep -ciE 'TBD|\[Resource Name\]|\[프로젝트|example\.com|placeholder' "$PRD_FILE" 2>/dev/null || echo "0")
  if [ "$TOTAL_LINES" -gt 0 ] 2>/dev/null; then
    PCT=$((PLACEHOLDER_LINES * 100 / TOTAL_LINES))
    if [ "$PCT" -ge 50 ] 2>/dev/null; then
      SSOT_WARNING="[SSOT] PRD가 아직 작성되지 않았습니다. /tsq-start로 온보딩을 진행하세요 (PRD 작성 + 기능별 /grill 인터뷰)."
    fi
  fi
elif [ -d "$PROJECT_ROOT/.timsquad/ssot" ]; then
  SSOT_WARNING="[SSOT] PRD가 존재하지 않습니다. /tsq-start로 온보딩을 시작하세요."
fi

# Check Sub-PRD coverage (grill completeness)
if [ -z "$SSOT_WARNING" ] && [ -f "$PRD_FILE" ]; then
  # Count features in PRD index that have no Sub-PRD link
  FEATURE_COUNT=$(grep -cE '^\|.*\|.*\|' "$PRD_FILE" 2>/dev/null || echo "0")
  SUBPRD_DIR="$PROJECT_ROOT/.timsquad/ssot/prd"
  SUBPRD_COUNT=0
  if [ -d "$SUBPRD_DIR" ]; then
    SUBPRD_COUNT=$(find "$SUBPRD_DIR" -name "*.md" -not -name "_template.md" 2>/dev/null | wc -l | tr -d ' ')
  fi
  if [ "$FEATURE_COUNT" -gt 2 ] && [ "$SUBPRD_COUNT" -eq 0 ] 2>/dev/null; then
    SSOT_WARNING="[SSOT] PRD에 기능이 정의되었으나 Sub-PRD가 없습니다. /tsq-grill로 각 기능을 상세화하세요."
  fi
fi

# ── 5. Skill Verification reminder (max 3 skills) ──
VERIFICATION=""
SKILLS_DIR="$PROJECT_ROOT/.claude/skills"
if [ -d "$SKILLS_DIR" ]; then
  SKILL_COUNT=0
  for SKILL_DIR in "$SKILLS_DIR"/*/; do
    [ "$SKILL_COUNT" -ge 3 ] && break
    SKILL_FILE="$SKILL_DIR/SKILL.md"
    [ ! -f "$SKILL_FILE" ] && continue

    SKILL_NAME=$(basename "$SKILL_DIR")
    # Skip non-active/template skills
    case "$SKILL_NAME" in _template|tsq-cli|main-session-constraints) continue ;; esac

    # Extract Verification section (2 lines max)
    CHECKS=$(awk '/^## Verification/{capture=1; next} /^## /{capture=0} capture && /\|.*\|.*\|/ && !/Check.*Command/' "$SKILL_FILE" 2>/dev/null | head -2)
    if [ -n "$CHECKS" ]; then
      VERIFICATION="$VERIFICATION
[Skill Verification] $SKILL_NAME: $CHECKS"
      SKILL_COUNT=$((SKILL_COUNT + 1))
    fi
  done
fi

# ── 6. Combine and output ──
# BLOCK_REASON이 있으면 decision:block으로 강제 속행 (세션 컨텍스트 포함)
if [ -n "$BLOCK_REASON" ]; then
  FULL_REASON="$BLOCK_REASON"
  [ -n "$SESSION_CTX" ] && FULL_REASON="$FULL_REASON
$SESSION_CTX"
  [ -n "$SSOT_WARNING" ] && FULL_REASON="$FULL_REASON
$SSOT_WARNING"
  [ -n "$VERIFICATION" ] && FULL_REASON="$FULL_REASON
$VERIFICATION"
  jq -n --arg reason "$FULL_REASON" '{"decision": "block", "reason": $reason}'
elif [ -n "$SESSION_CTX" ] || [ -n "$VERIFICATION" ] || [ -n "$TEST_WARNING" ] || [ -n "$SSOT_WARNING" ]; then
  FULL_MSG=""
  [ -n "$SESSION_CTX" ] && FULL_MSG="$SESSION_CTX"
  if [ -n "$SSOT_WARNING" ]; then
    [ -n "$FULL_MSG" ] && FULL_MSG="$FULL_MSG
$SSOT_WARNING" || FULL_MSG="$SSOT_WARNING"
  fi
  if [ -n "$TEST_WARNING" ]; then
    [ -n "$FULL_MSG" ] && FULL_MSG="$FULL_MSG
$TEST_WARNING" || FULL_MSG="$TEST_WARNING"
  fi
  if [ -n "$VERIFICATION" ]; then
    [ -n "$FULL_MSG" ] && FULL_MSG="$FULL_MSG
$VERIFICATION" || FULL_MSG="$VERIFICATION"
  fi
  jq -n --arg msg "$FULL_MSG" '{"systemMessage": $msg}'
else
  echo '{}'
fi
