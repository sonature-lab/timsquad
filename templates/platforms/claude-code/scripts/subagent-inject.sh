#!/bin/bash
# Subagent Inject — SubagentStart Hook
# 서브에이전트 시작 시 tsq-protocol 핵심 내용을 자동 주입한다.
#
# Input: JSON via stdin (Claude Code hook protocol)
# Output: JSON with systemMessage (프로토콜 주입)

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

# Load tsq-protocol Contract + Protocol sections
PROTOCOL_FILE="$PROJECT_ROOT/.claude/skills/tsq-protocol/SKILL.md"
if [ ! -f "$PROTOCOL_FILE" ]; then
  exit 0
fi

# Extract Contract + Quick Rules (compact, max 1000 chars)
SECTIONS=$(awk '
  /^## Contract/ { capture=1; next }
  /^## Quick Rules/ { capture=1; next }
  /^## / { capture=0 }
  capture { print }
' "$PROTOCOL_FILE" 2>/dev/null | head -30)

if [ -z "$SECTIONS" ]; then
  exit 0
fi

INJECTION="[TSQ Protocol - Subagent] $SECTIONS"

# Trim to 1000 chars max
INJECTION="${INJECTION:0:1000}"

jq -n --arg msg "$INJECTION" '{
  hookSpecificOutput: {
    hookEventName: "SubagentStart",
    systemMessage: $msg
  }
}'

exit 0
