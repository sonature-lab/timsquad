#!/bin/bash
# Pre-Compact — PreCompact Hook
# 컴팩션 직전 현재 상태 요약을 compact-summary.md에 저장한다.
# context-restore.sh가 이 파일을 읽어 compact 후 재주입.
#
# Input: JSON via stdin (Claude Code hook protocol)
# Output: none (파일 생성만)

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

DAEMON_DIR="$PROJECT_ROOT/.timsquad/.daemon"
mkdir -p "$DAEMON_DIR"

SUMMARY_FILE="$DAEMON_DIR/compact-summary.md"

# Collect summary data
SUMMARY="# Compact Summary (auto-generated)"
SUMMARY="$SUMMARY
Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Current phase
WORKFLOW_FILE="$PROJECT_ROOT/.timsquad/workflow.json"
if [ -f "$WORKFLOW_FILE" ]; then
  PHASE=$(jq -r '.currentPhase // "unknown"' "$WORKFLOW_FILE" 2>/dev/null || echo "unknown")
  SUMMARY="$SUMMARY
Phase: $PHASE"
fi

# Recent changed files (top 5)
RECENT_FILES=$(git -C "$PROJECT_ROOT" diff --name-only HEAD 2>/dev/null | head -5 || echo "")
if [ -n "$RECENT_FILES" ]; then
  SUMMARY="$SUMMARY
Recent changes: $RECENT_FILES"
fi

# Active tasks from session state
SESSION_STATE="$DAEMON_DIR/session-state.json"
if [ -f "$SESSION_STATE" ]; then
  TASK_INFO=$(jq -r '.currentTask // "none"' "$SESSION_STATE" 2>/dev/null || echo "none")
  SUMMARY="$SUMMARY
Active task: $TASK_INFO"
fi

# Session notes (last entry)
NOTES_FILE="$DAEMON_DIR/session-notes.jsonl"
if [ -f "$NOTES_FILE" ]; then
  LAST_NOTE=$(tail -1 "$NOTES_FILE" 2>/dev/null | jq -r '.summary // ""' 2>/dev/null || echo "")
  if [ -n "$LAST_NOTE" ] && [ "$LAST_NOTE" != "null" ]; then
    SUMMARY="$SUMMARY
Last note: $LAST_NOTE"
  fi
fi

# Write summary (fail-open: if write fails, don't block compact)
echo "$SUMMARY" > "$SUMMARY_FILE" 2>/dev/null || true

exit 0
