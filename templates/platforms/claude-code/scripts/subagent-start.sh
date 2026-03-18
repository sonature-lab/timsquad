#!/bin/bash
# SubagentStart Hook — Daemon에 baseline 저장 요청 (fail-open)
set -e

INPUT=$(cat 2>/dev/null || echo "{}")
AGENT=$(echo "$INPUT" | jq -r '.agent // "unknown"' 2>/dev/null || echo "unknown")

# Daemon에 통지 (실패해도 서브에이전트 실행은 차단하지 않음)
echo "$INPUT" | tsq daemon notify subagent-start --agent "$AGENT" 2>/dev/null || true

exit 0
