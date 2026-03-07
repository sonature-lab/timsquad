#!/usr/bin/env bash
# change-scope-guard.sh — PreToolUse Hook (Edit/Write)
# Tracks cumulative file changes and enforces SCR (Single Change Rule).
# 3 files: warning, 6 files: block, >100 lines total: warning
#
# Input: JSON via stdin (Claude Code hook protocol)
# Output: JSON with permissionDecision (allow/deny/ask)
#
# State file: /tmp/tsq-scope-guard-${SESSION_ID:-default}.json

set -euo pipefail

WARN_FILES=3
BLOCK_FILES=6
WARN_LINES=100

# Session-scoped state file
SESSION_ID="${CLAUDE_SESSION_ID:-default}"
STATE_FILE="/tmp/tsq-scope-guard-${SESSION_ID}.json"

# Read hook input from stdin
INPUT=""
if read -t 1 -r line; then
  INPUT="$line"
fi

# Fail-open: no input → allow
if [ -z "$INPUT" ]; then
  echo '{"hookSpecificOutput":{"permissionDecision":"allow"}}'
  exit 0
fi

# Extract tool name
TOOL_NAME=""
if command -v jq >/dev/null 2>&1; then
  TOOL_NAME=$(echo "$INPUT" | jq -r '.toolName // empty' 2>/dev/null || true)
fi

# Only track Edit and Write tools
if [ "$TOOL_NAME" != "Edit" ] && [ "$TOOL_NAME" != "Write" ]; then
  echo '{"hookSpecificOutput":{"permissionDecision":"allow"}}'
  exit 0
fi

# Extract file path from tool input
FILE_PATH=""
if command -v jq >/dev/null 2>&1; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.toolInput.file_path // empty' 2>/dev/null || true)
fi

if [ -z "$FILE_PATH" ]; then
  echo '{"hookSpecificOutput":{"permissionDecision":"allow"}}'
  exit 0
fi

# Initialize state file if needed
if [ ! -f "$STATE_FILE" ]; then
  echo '{"files":[],"total_lines":0}' > "$STATE_FILE"
fi

# Read current state
if command -v jq >/dev/null 2>&1; then
  CURRENT_FILES=$(jq -r '.files[]' "$STATE_FILE" 2>/dev/null || true)
  TOTAL_LINES=$(jq -r '.total_lines // 0' "$STATE_FILE" 2>/dev/null || echo "0")
else
  echo '{"hookSpecificOutput":{"permissionDecision":"allow"}}'
  exit 0
fi

# Check if file is already tracked
ALREADY_TRACKED=false
while IFS= read -r f; do
  if [ "$f" = "$FILE_PATH" ]; then
    ALREADY_TRACKED=true
    break
  fi
done <<< "$CURRENT_FILES"

# Add new file if not tracked
if [ "$ALREADY_TRACKED" = false ]; then
  jq --arg fp "$FILE_PATH" '.files += [$fp]' "$STATE_FILE" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"
fi

# Estimate line changes (for Edit: old_string length approximation)
if [ "$TOOL_NAME" = "Edit" ]; then
  NEW_LINES=$(echo "$INPUT" | jq -r '.toolInput.new_string // ""' 2>/dev/null | wc -l || echo "0")
  TOTAL_LINES=$((TOTAL_LINES + NEW_LINES))
  jq --argjson tl "$TOTAL_LINES" '.total_lines = $tl' "$STATE_FILE" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"
fi

# Count unique files
FILE_COUNT=$(jq '.files | length' "$STATE_FILE" 2>/dev/null || echo "0")

# Decision logic
if [ "$FILE_COUNT" -ge "$BLOCK_FILES" ]; then
  MSG="SCR violation: ${FILE_COUNT} files modified (limit: ${BLOCK_FILES}). Split into smaller tasks."
  echo "{\"hookSpecificOutput\":{\"permissionDecision\":\"deny\",\"message\":\"${MSG}\"}}"
  exit 0
fi

if [ "$FILE_COUNT" -ge "$WARN_FILES" ]; then
  MSG="SCR warning: ${FILE_COUNT} files modified. Consider splitting this task."
  echo "{\"hookSpecificOutput\":{\"permissionDecision\":\"allow\",\"message\":\"${MSG}\"}}"
  exit 0
fi

if [ "$TOTAL_LINES" -ge "$WARN_LINES" ]; then
  MSG="Large change: ~${TOTAL_LINES} lines modified across ${FILE_COUNT} files."
  echo "{\"hookSpecificOutput\":{\"permissionDecision\":\"allow\",\"message\":\"${MSG}\"}}"
  exit 0
fi

echo '{"hookSpecificOutput":{"permissionDecision":"allow"}}'
