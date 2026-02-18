#!/bin/bash
# Phase Guard — PreToolUse Hook
# Enforces phase restrictions on file operations.
# planning/design phase: blocks src/** writes
# implementation phase: blocks .timsquad/ssot/** writes
#
# Input: JSON via stdin (Claude Code hook protocol)
# Output: JSON with permissionDecision (allow/deny)

set -e

# Read hook input from stdin (non-blocking)
INPUT=""
if read -t 1 -r line; then
  INPUT="$line"
fi

# If no input, allow (fail-open for safety)
if [ -z "$INPUT" ]; then
  echo '{"hookSpecificOutput":{"permissionDecision":"allow"}}'
  exit 0
fi

# Extract file path from tool input
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // ""' 2>/dev/null)

# If no file path, allow (not a file operation)
if [ -z "$FILE_PATH" ] || [ "$FILE_PATH" = "null" ]; then
  echo '{"hookSpecificOutput":{"permissionDecision":"allow"}}'
  exit 0
fi

# Find project root (look for .timsquad directory)
PROJECT_ROOT="$(pwd)"
while [ "$PROJECT_ROOT" != "/" ]; do
  if [ -d "$PROJECT_ROOT/.timsquad" ]; then
    break
  fi
  PROJECT_ROOT="$(dirname "$PROJECT_ROOT")"
done

# If not in a TimSquad project, allow
if [ ! -d "$PROJECT_ROOT/.timsquad" ]; then
  echo '{"hookSpecificOutput":{"permissionDecision":"allow"}}'
  exit 0
fi

# Read current phase
PHASE_FILE="$PROJECT_ROOT/.timsquad/state/current-phase.json"
if [ ! -f "$PHASE_FILE" ]; then
  echo '{"hookSpecificOutput":{"permissionDecision":"allow"}}'
  exit 0
fi

PHASE=$(jq -r '.phase // "unknown"' "$PHASE_FILE" 2>/dev/null)

# Normalize file path (make relative to project root)
REL_PATH="${FILE_PATH#$PROJECT_ROOT/}"

# Phase enforcement rules
case "$PHASE" in
  planning|design)
    # Block source code modifications during planning/design
    if echo "$REL_PATH" | grep -qE '^src/|^lib/|^app/|^pages/|^components/'; then
      echo "{\"hookSpecificOutput\":{\"permissionDecision\":\"deny\"},\"systemMessage\":\"[Phase Guard] $PHASE phase에서 코드 수정이 금지됩니다. SSOT 문서 작성을 먼저 완료하세요.\"}"
      exit 0
    fi
    ;;
  implementation)
    # Block SSOT modifications during implementation (prevent drift)
    if echo "$REL_PATH" | grep -qE '^\.timsquad/ssot/'; then
      echo "{\"hookSpecificOutput\":{\"permissionDecision\":\"deny\"},\"systemMessage\":\"[Phase Guard] implementation phase에서 SSOT 직접 수정이 금지됩니다. 변경이 필요하면 PM에게 L2 피드백을 보고하세요.\"}"
      exit 0
    fi
    ;;
esac

# Default: allow
echo '{"hookSpecificOutput":{"permissionDecision":"allow"}}'
