#!/bin/bash
# Context Restore — SessionStart (compact) Hook
# 컴팩션 후 핵심 컨텍스트를 재주입하여 에이전트 맥락 유실을 방지한다.
#
# Input: JSON via stdin (Claude Code hook protocol)
# Output: JSON with systemMessage (컨텍스트 재주입)

set -e

# Find project root
PROJECT_ROOT="$(pwd)"
while [ "$PROJECT_ROOT" != "/" ]; do
  if [ -d "$PROJECT_ROOT/.timsquad" ]; then
    break
  fi
  PROJECT_ROOT="$(dirname "$PROJECT_ROOT")"
done

if [ ! -d "$PROJECT_ROOT/.timsquad" ]; then
  exit 0
fi

# Build context summary
CONTEXT=""

# 1. Project name from config
PROJECT_NAME=""
CONFIG_FILE="$PROJECT_ROOT/.timsquad/config.yaml"
if [ -f "$CONFIG_FILE" ]; then
  PROJECT_NAME=$(grep -m1 'name:' "$CONFIG_FILE" 2>/dev/null | awk '{print $2}' || echo "")
fi

if [ -n "$PROJECT_NAME" ]; then
  CONTEXT="[Context Restore] Project: $PROJECT_NAME"
else
  CONTEXT="[Context Restore] TimSquad project"
fi

# 2. Current phase
PHASE_FILE="$PROJECT_ROOT/.timsquad/state/current-phase.json"
if [ -f "$PHASE_FILE" ]; then
  CURRENT_PHASE=$(jq -r '.current // .current_phase // .phase // "unknown"' "$PHASE_FILE" 2>/dev/null || echo "unknown")
  CONTEXT="$CONTEXT | Phase: $CURRENT_PHASE"
fi

# 3. Read compact summary if exists (saved by pre-compact.sh)
COMPACT_SUMMARY="$PROJECT_ROOT/.timsquad/.daemon/compact-summary.md"
if [ -f "$COMPACT_SUMMARY" ]; then
  SUMMARY_CONTENT=$(head -10 "$COMPACT_SUMMARY" 2>/dev/null || echo "")
  if [ -n "$SUMMARY_CONTENT" ]; then
    CONTEXT="$CONTEXT
$SUMMARY_CONTENT"
  fi
fi

# 4. Phase Memory (이전 Phase 요약)
PHASE_MEMORY="$PROJECT_ROOT/.timsquad/state/phase-memory.md"
if [ -f "$PHASE_MEMORY" ]; then
  MEMORY_CONTENT=$(head -50 "$PHASE_MEMORY" 2>/dev/null || echo "")
  if [ -n "$MEMORY_CONTENT" ]; then
    CONTEXT="$CONTEXT
[Phase Memory]
$MEMORY_CONTENT"
  fi
fi

# 5. SSOT readiness check
PRD_FILE="$PROJECT_ROOT/.timsquad/ssot/prd.md"
if [ -f "$PRD_FILE" ]; then
  TOTAL_LINES=$(wc -l < "$PRD_FILE" 2>/dev/null || echo "0")
  PLACEHOLDER_LINES=$(grep -ciE 'TBD|\[Resource Name\]|\[프로젝트|example\.com|placeholder' "$PRD_FILE" 2>/dev/null || echo "0")
  TOTAL_LINES=${TOTAL_LINES:-0}
  PLACEHOLDER_LINES=${PLACEHOLDER_LINES:-0}
  if [ "$TOTAL_LINES" -gt 0 ] && [ "$((PLACEHOLDER_LINES * 100 / TOTAL_LINES))" -ge 50 ] 2>/dev/null; then
    CONTEXT="$CONTEXT
[SSOT] PRD 미작성. /tsq-start로 온보딩을 진행하세요 (PRD + /tsq-grill 인터뷰)."
  fi
elif [ -d "$PROJECT_ROOT/.timsquad/ssot" ]; then
  CONTEXT="$CONTEXT
[SSOT] PRD 없음. /tsq-start로 온보딩을 시작하세요."
fi

# 6. Key constraints (3 lines max)
CONTEXT="$CONTEXT
[Key Constraints] 구현 전 검증 기준 명시. 작업 지시 시 SSOT + 데몬 사전조건 확인."

# Output as systemMessage
jq -n --arg msg "$CONTEXT" '{
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    systemMessage: $msg
  }
}'

exit 0
