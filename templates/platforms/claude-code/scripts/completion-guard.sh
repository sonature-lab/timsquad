#!/bin/bash
# Completion Guard — Stop Hook
# Warns when stopping without test execution during implementation phase.
# First version: warn only (not block), to avoid disrupting workflow.
#
# Input: JSON via stdin (Claude Code hook protocol)
# Output: JSON with systemMessage (warning if applicable)

set -e

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

# Read current phase
PHASE_FILE="$PROJECT_ROOT/.timsquad/state/current-phase.json"
if [ ! -f "$PHASE_FILE" ]; then
  echo '{}'
  exit 0
fi

PHASE=$(jq -r '.phase // "unknown"' "$PHASE_FILE" 2>/dev/null)

# Only check during implementation phase
if [ "$PHASE" != "implementation" ]; then
  echo '{}'
  exit 0
fi

# Check session metrics for test execution
SESSION_STATE="$PROJECT_ROOT/.timsquad/.daemon/session-state.json"
if [ ! -f "$SESSION_STATE" ]; then
  echo '{"systemMessage":"[Completion Guard] 세션 메트릭을 확인할 수 없습니다. 테스트 실행 여부를 확인해주세요."}'
  exit 0
fi

# Check if any bash commands included test execution
BASH_COMMANDS=$(jq -r '.metrics.bashCommands // 0' "$SESSION_STATE" 2>/dev/null)

if [ "$BASH_COMMANDS" -eq 0 ]; then
  echo '{"systemMessage":"[Completion Guard] 이번 세션에서 테스트가 실행되지 않았습니다. 완료 전 테스트 실행을 권장합니다."}'
  exit 0
fi

# Allow
echo '{}'
