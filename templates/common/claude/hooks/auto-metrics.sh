#!/bin/bash
# TimSquad Auto Metrics Collector
# SessionEnd 이벤트 시 호출되어 세션 JSONL을 분석하고
# .timsquad/retrospective/metrics/latest.json 에 누적 메트릭 갱신
#
# 토큰 비용: 0 (순수 파일 I/O)
# 사용법: auto-metrics.sh <jsonl_file> <session_id_short>

set -euo pipefail

JSONL_FILE="${1:-}"
SESSION_SHORT="${2:-unknown}"

if [ -z "$JSONL_FILE" ] || [ ! -f "$JSONL_FILE" ]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
METRICS_DIR="$PROJECT_DIR/.timsquad/retrospective/metrics"
mkdir -p "$METRICS_DIR"

LATEST_FILE="$METRICS_DIR/latest.json"
TODAY=$(date +"%Y-%m-%d")
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# ============================================================
# JSONL에서 세션 통계 추출
# ============================================================

TOTAL_EVENTS=$(wc -l < "$JSONL_FILE" | tr -d ' ')

if [ "$TOTAL_EVENTS" -lt 3 ]; then
  exit 0
fi

# 도구 사용
TOOL_USES=$(jq -r 'select(.event == "PostToolUse")' "$JSONL_FILE" 2>/dev/null | wc -l | tr -d ' ')
TOOL_FAILURES=$(jq -r 'select(.event == "PostToolUseFailure")' "$JSONL_FILE" 2>/dev/null | wc -l | tr -d ' ')
SUBAGENTS=$(jq -r 'select(.event == "SubagentStart")' "$JSONL_FILE" 2>/dev/null | wc -l | tr -d ' ')

# 토큰 (SessionEnd에서 추출)
TOKEN_DATA=$(jq -c 'select(.event == "SessionEnd") | .total_usage // {}' "$JSONL_FILE" 2>/dev/null | head -1)
if [ -z "$TOKEN_DATA" ] || [ "$TOKEN_DATA" = "{}" ]; then
  TOKEN_INPUT=0
  TOKEN_OUTPUT=0
  TOKEN_CACHE_CREATE=0
  TOKEN_CACHE_READ=0
else
  TOKEN_INPUT=$(echo "$TOKEN_DATA" | jq -r '.total_input // 0')
  TOKEN_OUTPUT=$(echo "$TOKEN_DATA" | jq -r '.total_output // 0')
  TOKEN_CACHE_CREATE=$(echo "$TOKEN_DATA" | jq -r '.total_cache_create // 0')
  TOKEN_CACHE_READ=$(echo "$TOKEN_DATA" | jq -r '.total_cache_read // 0')
fi

# CLI 채택률
TOTAL_BASH=$(jq -r 'select(.event == "PostToolUse" and .tool == "Bash") | .detail.command // ""' "$JSONL_FILE" 2>/dev/null | wc -l | tr -d ' ')
TSQ_BASH=$(jq -r 'select(.event == "PostToolUse" and .tool == "Bash") | .detail.command // ""' "$JSONL_FILE" 2>/dev/null | grep -c '^\(tsq\|npx tsq\)' || echo "0")

# ============================================================
# latest.json 읽기 또는 초기화
# ============================================================

if [ -f "$LATEST_FILE" ]; then
  EXISTING=$(cat "$LATEST_FILE")
else
  EXISTING='{}'
fi

# 기존 값 추출 (없으면 0)
PREV_SESSIONS=$(echo "$EXISTING" | jq -r '.totalSessions // 0')
PREV_EVENTS=$(echo "$EXISTING" | jq -r '.totalEvents // 0')
PREV_TOOL_USES=$(echo "$EXISTING" | jq -r '.totalToolUses // 0')
PREV_FAILURES=$(echo "$EXISTING" | jq -r '.totalFailures // 0')
PREV_SUBAGENTS=$(echo "$EXISTING" | jq -r '.subagentCount // 0')
PREV_INPUT=$(echo "$EXISTING" | jq -r '.tokens.totalInput // 0')
PREV_OUTPUT=$(echo "$EXISTING" | jq -r '.tokens.totalOutput // 0')
PREV_CACHE_CREATE=$(echo "$EXISTING" | jq -r '.tokens.totalCacheCreate // 0')
PREV_CACHE_READ=$(echo "$EXISTING" | jq -r '.tokens.totalCacheRead // 0')
PREV_BASH=$(echo "$EXISTING" | jq -r '.cliAdoption.totalBashCommands // 0')
PREV_TSQ=$(echo "$EXISTING" | jq -r '.cliAdoption.tsqCommands // 0')

# ============================================================
# 누적 갱신
# ============================================================

NEW_SESSIONS=$((PREV_SESSIONS + 1))
NEW_EVENTS=$((PREV_EVENTS + TOTAL_EVENTS))
NEW_TOOL_USES=$((PREV_TOOL_USES + TOOL_USES))
NEW_FAILURES=$((PREV_FAILURES + TOOL_FAILURES))
NEW_SUBAGENTS=$((PREV_SUBAGENTS + SUBAGENTS))
NEW_INPUT=$((PREV_INPUT + TOKEN_INPUT))
NEW_OUTPUT=$((PREV_OUTPUT + TOKEN_OUTPUT))
NEW_CACHE_CREATE=$((PREV_CACHE_CREATE + TOKEN_CACHE_CREATE))
NEW_CACHE_READ=$((PREV_CACHE_READ + TOKEN_CACHE_READ))
NEW_BASH=$((PREV_BASH + TOTAL_BASH))
NEW_TSQ=$((PREV_TSQ + TSQ_BASH))

# 파생 지표
TOTAL_ATTEMPTS=$((NEW_TOOL_USES + NEW_FAILURES))
if [ "$TOTAL_ATTEMPTS" -gt 0 ]; then
  TOOL_EFFICIENCY=$((NEW_TOOL_USES * 100 / TOTAL_ATTEMPTS))
else
  TOOL_EFFICIENCY=0
fi

ALL_INPUT=$((NEW_INPUT + NEW_CACHE_CREATE + NEW_CACHE_READ))
if [ "$ALL_INPUT" -gt 0 ]; then
  CACHE_HIT_RATE=$((NEW_CACHE_READ * 100 / ALL_INPUT))
else
  CACHE_HIT_RATE=0
fi

if [ "$NEW_BASH" -gt 0 ]; then
  CLI_ADOPTION=$((NEW_TSQ * 100 / NEW_BASH))
else
  CLI_ADOPTION=0
fi

# ============================================================
# latest.json 갱신
# ============================================================

jq -n -c \
  --arg ts "$TIMESTAMP" \
  --arg date "$TODAY" \
  --arg last_session "$SESSION_SHORT" \
  --argjson sessions "$NEW_SESSIONS" \
  --argjson events "$NEW_EVENTS" \
  --argjson tool_uses "$NEW_TOOL_USES" \
  --argjson failures "$NEW_FAILURES" \
  --argjson efficiency "$TOOL_EFFICIENCY" \
  --argjson subagents "$NEW_SUBAGENTS" \
  --argjson input "$NEW_INPUT" \
  --argjson output "$NEW_OUTPUT" \
  --argjson cache_create "$NEW_CACHE_CREATE" \
  --argjson cache_read "$NEW_CACHE_READ" \
  --argjson cache_rate "$CACHE_HIT_RATE" \
  --argjson bash_total "$NEW_BASH" \
  --argjson tsq_total "$NEW_TSQ" \
  --argjson cli_rate "$CLI_ADOPTION" \
  '{
    updatedAt: $ts,
    lastDate: $date,
    lastSession: $last_session,
    totalSessions: $sessions,
    totalEvents: $events,
    totalToolUses: $tool_uses,
    totalFailures: $failures,
    toolEfficiency: $efficiency,
    subagentCount: $subagents,
    tokens: {
      totalInput: $input,
      totalOutput: $output,
      totalCacheCreate: $cache_create,
      totalCacheRead: $cache_read,
      cacheHitRate: $cache_rate
    },
    cliAdoption: {
      totalBashCommands: $bash_total,
      tsqCommands: $tsq_total,
      adoptionRate: $cli_rate
    }
  }' | jq '.' > "$LATEST_FILE"

exit 0
