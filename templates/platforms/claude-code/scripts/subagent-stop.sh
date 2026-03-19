#!/bin/bash
# SubagentStop Hook — task-complete 자동 기록 + Daemon 통지 (fail-open)
# Hybrid Controller: tsq next --complete 자동 호출로 workflow.json 갱신
set -e

INPUT=$(cat 2>/dev/null || echo "{}")
AGENT=$(echo "$INPUT" | jq -r '.agent // "unknown"' 2>/dev/null || echo "unknown")

# Find project root
PROJECT_ROOT="$(pwd)"
while [ "$PROJECT_ROOT" != "/" ]; do
  [ -d "$PROJECT_ROOT/.timsquad" ] && break
  PROJECT_ROOT="$(dirname "$PROJECT_ROOT")"
done

# ── 1. Extract task ID from Completion Report ──
# Completion Report의 Task 필드에서 task ID 추출 (P{N}-S{NNN}-T{NNN} 형식)
TASK_ID=""
SUMMARY=""
if [ -d "$PROJECT_ROOT/.timsquad" ]; then
  # task-context.json에서 현재 task ID 읽기 (Controller가 설정)
  CONTEXT_FILE="$PROJECT_ROOT/.timsquad/.daemon/task-context.json"
  if [ -f "$CONTEXT_FILE" ]; then
    TASK_ID=$(jq -r '.taskId // ""' "$CONTEXT_FILE" 2>/dev/null || echo "")
    # Sanitize: flatten newlines, strip shell metacharacters
    SUMMARY=$(jq -r '.title // "" | gsub("[\\n\\r\\t]"; " ")' "$CONTEXT_FILE" 2>/dev/null || echo "")
    SUMMARY=$(echo "$SUMMARY" | tr -d '`$(){}' | head -c 200)
  fi

  # task ID가 있으면 tsq next --complete 호출 (workflow.json 자동 갱신)
  if [ -n "$TASK_ID" ] && echo "$TASK_ID" | grep -qE '^P[0-9]+-S[0-9]+-T[0-9]+$'; then
    timeout 5 tsq next --complete "$TASK_ID" \
      --agent "$AGENT" \
      --summary "${SUMMARY:-task completed}" 2>/dev/null || true
  fi
fi

# ── 2. Daemon에 통지 → L1 태스크 로그 자동 생성 ──
echo "$INPUT" | tsq daemon notify subagent-stop --agent "$AGENT" 2>/dev/null || true

exit 0
