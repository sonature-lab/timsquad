#!/bin/bash
# SubagentStop Hook — Daemon에 task-complete 이벤트 전달 (fail-open)
set -e

INPUT=$(cat 2>/dev/null || echo "{}")
AGENT=$(echo "$INPUT" | jq -r '.agent // "unknown"' 2>/dev/null || echo "unknown")

# Daemon에 통지 → L1 태스크 로그 자동 생성
echo "$INPUT" | tsq daemon notify subagent-stop --agent "$AGENT" 2>/dev/null || true

exit 0
