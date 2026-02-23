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

# ── 1. Test execution gate (implementation phase only) ──
# 자기 보고 금지: 테스트 exit code로 완료를 판정한다.
# stop_hook_active=false일 때만 블로킹 (1회 기회 부여, 루프 방지는 섹션 0에서 처리)
PHASE_FILE="$PROJECT_ROOT/.timsquad/state/current-phase.json"
if [ -f "$PHASE_FILE" ]; then
  PHASE=$(jq -r '.current // .current_phase // .phase // "unknown"' "$PHASE_FILE" 2>/dev/null || echo "unknown")
  if [ "$PHASE" = "implementation" ]; then
    SESSION_STATE="$PROJECT_ROOT/.timsquad/.daemon/session-state.json"
    if [ -f "$SESSION_STATE" ]; then
      BASH_COMMANDS=$(jq -r '.metrics.bashCommands // 0' "$SESSION_STATE" 2>/dev/null || echo "0")
      if [ "$BASH_COMMANDS" -eq 0 ] 2>/dev/null; then
        BLOCK_REASON="[Completion Guard] 이번 세션에서 테스트가 실행되지 않았습니다. 프로젝트의 테스트를 실행하여 변경사항을 검증한 후 완료하세요."
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
      SESSION_CTX="$SESSION_CTX\\n⚠ [Context ${CTX_PCT}%] 컨텍스트 윈도우 85% 이상 사용. 중요 정보를 session-notes에 기록하고, 현재 태스크를 정리한 뒤 완료하세요."
    elif [ "$CTX_PCT" -ge 70 ] 2>/dev/null; then
      SESSION_CTX="$SESSION_CTX | Ctx: ${CTX_PCT}%"
    fi
  fi
fi

# ── 4. Combine and output ──
# BLOCK_REASON이 있으면 decision:block으로 강제 속행 (세션 컨텍스트 포함)
if [ -n "$BLOCK_REASON" ]; then
  FULL_REASON="$BLOCK_REASON"
  [ -n "$SESSION_CTX" ] && FULL_REASON="$BLOCK_REASON
$SESSION_CTX"
  jq -n --arg reason "$FULL_REASON" '{"decision": "block", "reason": $reason}'
elif [ -n "$SESSION_CTX" ]; then
  jq -n --arg msg "$SESSION_CTX" '{"systemMessage": $msg}'
else
  echo '{}'
fi
