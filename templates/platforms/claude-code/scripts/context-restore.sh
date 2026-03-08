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

# 2. Current phase from workflow
WORKFLOW_FILE="$PROJECT_ROOT/.timsquad/workflow.json"
if [ -f "$WORKFLOW_FILE" ]; then
  CURRENT_PHASE=$(jq -r '.currentPhase // "unknown"' "$WORKFLOW_FILE" 2>/dev/null || echo "unknown")
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

# 4. Key constraints (3 lines max)
CONTEXT="$CONTEXT
[Key Constraints] TSQ CLI 사용 필수 (tsq log/feedback/commit). 직접 파일 조작 금지. 구현 전 검증 기준 명시."

# Output as systemMessage
jq -n --arg msg "$CONTEXT" '{
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    systemMessage: $msg
  }
}'

exit 0
