#!/bin/bash
# TimSquad Auto Work Log Generator
# SessionEnd 이벤트 시 호출되어 세션 JSONL을 분석하고
# .timsquad/logs/{date}-session.md 작업 로그를 자동 생성
#
# 사용법: auto-worklog.sh <jsonl_file> <session_id_short>

set -euo pipefail

JSONL_FILE="${1:-}"
SESSION_SHORT="${2:-unknown}"

if [ -z "$JSONL_FILE" ] || [ ! -f "$JSONL_FILE" ]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
LOGS_DIR="$PROJECT_DIR/.timsquad/logs"
mkdir -p "$LOGS_DIR"

TODAY=$(date +"%Y-%m-%d")
LOG_FILE="$LOGS_DIR/${TODAY}-session.md"
TIMESTAMP=$(date +"%H:%M:%S")

# ============================================================
# JSONL에서 통계 추출
# ============================================================

TOTAL_EVENTS=$(wc -l < "$JSONL_FILE" | tr -d ' ')

# 최소 이벤트 수 체크 (너무 짧은 세션은 스킵)
if [ "$TOTAL_EVENTS" -lt 3 ]; then
  exit 0
fi

# 도구 사용 횟수
TOOL_EVENTS=$(jq -r 'select(.event == "PostToolUse") | .tool' "$JSONL_FILE" 2>/dev/null | wc -l | tr -d ' ')
FAILURES=$(jq -r 'select(.event == "PostToolUseFailure")' "$JSONL_FILE" 2>/dev/null | wc -l | tr -d ' ')

# 서브에이전트 사용
SUBAGENT_STARTS=$(jq -r 'select(.event == "SubagentStart") | .detail.subagent_type' "$JSONL_FILE" 2>/dev/null)
SUBAGENT_COUNT=$(echo "$SUBAGENT_STARTS" | grep -c '.' 2>/dev/null || echo "0")

# 도구별 횟수 (상위 5개)
TOOL_BREAKDOWN=$(jq -r 'select(.event == "PostToolUse") | .tool' "$JSONL_FILE" 2>/dev/null \
  | sort | uniq -c | sort -rn | head -5 \
  | awk '{printf "%s(%d) ", $2, $1}')

# 수정된 파일 목록
FILES_MODIFIED=$(jq -r 'select(.event == "PostToolUse" and (.tool == "Write" or .tool == "Edit")) | .detail.file_path // empty' "$JSONL_FILE" 2>/dev/null \
  | sort -u)

# 읽은 파일 목록 (상위 10개)
FILES_READ=$(jq -r 'select(.event == "PostToolUse" and .tool == "Read") | .detail.file_path // empty' "$JSONL_FILE" 2>/dev/null \
  | sort -u | head -10)

# Bash 커맨드 (상위 5개)
BASH_COMMANDS=$(jq -r 'select(.event == "PostToolUse" and .tool == "Bash") | .detail.command // empty' "$JSONL_FILE" 2>/dev/null \
  | head -5)

# 서브에이전트 상세
SUBAGENT_DETAILS=$(jq -r 'select(.event == "SubagentStart") | "\(.detail.subagent_type): \(.detail.description // "")"' "$JSONL_FILE" 2>/dev/null)

# 타임라인
FIRST_TS=$(jq -r '.timestamp' "$JSONL_FILE" 2>/dev/null | head -1)
LAST_TS=$(jq -r '.timestamp' "$JSONL_FILE" 2>/dev/null | tail -1)

FIRST_TIME=$(echo "$FIRST_TS" | sed 's/.*T//;s/Z//')
LAST_TIME=$(echo "$LAST_TS" | sed 's/.*T//;s/Z//')

# ============================================================
# 작업 로그 생성
# ============================================================

# 파일이 없으면 헤더 생성
if [ ! -f "$LOG_FILE" ]; then
  cat > "$LOG_FILE" << EOF
# session 작업 로그 - ${TODAY}

> TimSquad Auto Work Log - Claude Code 세션 이벤트에서 자동 생성

---

EOF
fi

# 로그 항목 추가
{
  echo ""
  echo "## [$TIMESTAMP] work"
  echo ""
  echo "**Session:** \`$SESSION_SHORT\` ($FIRST_TIME ~ $LAST_TIME)"
  echo ""
  echo "### 세션 통계"
  echo "- 총 이벤트: $TOTAL_EVENTS"
  echo "- 도구 사용: $TOOL_EVENTS회"
  if [ "$FAILURES" -gt 0 ]; then
    echo "- 실패: ${FAILURES}회"
  fi
  if [ "$SUBAGENT_COUNT" -gt 0 ]; then
    echo "- 서브에이전트: ${SUBAGENT_COUNT}회"
  fi
  echo "- 도구 분포: $TOOL_BREAKDOWN"
  echo ""

  # 수정 파일
  if [ -n "$FILES_MODIFIED" ]; then
    echo "### 수정된 파일"
    echo "$FILES_MODIFIED" | while read -r f; do
      [ -n "$f" ] && echo "- \`$f\`"
    done
    echo ""
  fi

  # 서브에이전트 활동
  if [ -n "$SUBAGENT_DETAILS" ] && [ "$SUBAGENT_COUNT" -gt 0 ]; then
    echo "### 서브에이전트 활동"
    echo "$SUBAGENT_DETAILS" | while read -r line; do
      [ -n "$line" ] && echo "- $line"
    done
    echo ""
  fi

  # 주요 Bash 명령
  if [ -n "$BASH_COMMANDS" ]; then
    echo "### 주요 명령"
    echo '```'
    echo "$BASH_COMMANDS"
    echo '```'
    echo ""
  fi

  # 토큰 사용량 (SessionEnd 이벤트에서 추출)
  SESSION_END_USAGE=$(jq -c 'select(.event == "SessionEnd") | .total_usage // empty' "$JSONL_FILE" 2>/dev/null | head -1)

  if [ -n "$SESSION_END_USAGE" ] && [ "$SESSION_END_USAGE" != "{}" ]; then
    TOTAL_INPUT=$(echo "$SESSION_END_USAGE" | jq -r '.total_input // 0')
    TOTAL_OUTPUT=$(echo "$SESSION_END_USAGE" | jq -r '.total_output // 0')
    TOTAL_CACHE_CREATE=$(echo "$SESSION_END_USAGE" | jq -r '.total_cache_create // 0')
    TOTAL_CACHE_READ=$(echo "$SESSION_END_USAGE" | jq -r '.total_cache_read // 0')
    TOTAL_TURNS=$(echo "$SESSION_END_USAGE" | jq -r '.turns // 0')

    # cache hit rate 계산
    TOTAL_ALL_INPUT=$((TOTAL_INPUT + TOTAL_CACHE_CREATE + TOTAL_CACHE_READ))
    if [ "$TOTAL_ALL_INPUT" -gt 0 ]; then
      CACHE_HIT_RATE=$((TOTAL_CACHE_READ * 100 / TOTAL_ALL_INPUT))
    else
      CACHE_HIT_RATE=0
    fi

    echo "### 토큰 사용량"
    echo ""
    echo "| 항목 | 토큰 | 의미 |"
    echo "|------|------|------|"
    echo "| Input | $(printf "%'d" "$TOTAL_INPUT") | 새로 처리된 입력 (캐시 미스) |"
    echo "| Output | $(printf "%'d" "$TOTAL_OUTPUT") | 생성된 출력 (비용 주요 부분) |"
    echo "| Cache Create | $(printf "%'d" "$TOTAL_CACHE_CREATE") | 새로 캐시 저장 (첫 턴에 높음) |"
    echo "| Cache Read | $(printf "%'d" "$TOTAL_CACHE_READ") | 캐시 재사용 (높을수록 효율적) |"
    echo "| **Cache Hit Rate** | **${CACHE_HIT_RATE}%** | **80%+ 우수 / 60-80% 보통 / <60% 주의** |"
    echo "| Turns | $TOTAL_TURNS | API 호출 횟수 |"
    echo ""
  fi

} >> "$LOG_FILE"

# ============================================================
# 품질 경고 (threshold 기반 자동 감지)
# 토큰 비용: 0 - 순수 조건 체크
# ============================================================

ALERT_FILE="$LOGS_DIR/${TODAY}-alerts.md"
ALERTS_FOUND=0

# Alert 1: 도구 실패율 > 10%
TOTAL_ATTEMPTS=$((TOOL_EVENTS + FAILURES))
if [ "$TOTAL_ATTEMPTS" -gt 5 ]; then
  FAIL_RATE=$((FAILURES * 100 / TOTAL_ATTEMPTS))
  if [ "$FAIL_RATE" -gt 10 ]; then
    if [ "$ALERTS_FOUND" -eq 0 ] && [ ! -f "$ALERT_FILE" ]; then
      echo "# Quality Alerts - ${TODAY}" > "$ALERT_FILE"
      echo "" >> "$ALERT_FILE"
      echo "> TimSquad 자동 품질 경고 - threshold 초과 시 자동 생성" >> "$ALERT_FILE"
      echo "" >> "$ALERT_FILE"
    fi
    echo "- **[$TIMESTAMP]** Tool Failure Rate ${FAIL_RATE}% (> 10%) - 세션 \`$SESSION_SHORT\`" >> "$ALERT_FILE"
    echo "  - 도구 실패 ${FAILURES}/${TOTAL_ATTEMPTS}회. 에이전트 프롬프트나 권한 설정 점검" >> "$ALERT_FILE"
    ALERTS_FOUND=1
  fi
fi

# Alert 2: Cache Hit Rate < 60% (토큰 데이터가 있을 때만)
if [ -n "$SESSION_END_USAGE" ] && [ "$SESSION_END_USAGE" != "{}" ]; then
  if [ "$TOTAL_ALL_INPUT" -gt 0 ] && [ "$CACHE_HIT_RATE" -lt 60 ]; then
    if [ "$ALERTS_FOUND" -eq 0 ] && [ ! -f "$ALERT_FILE" ]; then
      echo "# Quality Alerts - ${TODAY}" > "$ALERT_FILE"
      echo "" >> "$ALERT_FILE"
      echo "> TimSquad 자동 품질 경고 - threshold 초과 시 자동 생성" >> "$ALERT_FILE"
      echo "" >> "$ALERT_FILE"
    fi
    echo "- **[$TIMESTAMP]** Cache Hit Rate ${CACHE_HIT_RATE}% (< 60%) - 세션 \`$SESSION_SHORT\`" >> "$ALERT_FILE"
    echo "  - 프롬프트 구조 불안정. CLAUDE.md 또는 에이전트 프롬프트 검토" >> "$ALERT_FILE"
    ALERTS_FOUND=1
  fi
fi

# ============================================================
# 자동 피드백 생성 (실패 패턴 감지)
# 도구 실패 3회 이상 → 자동으로 FB-XXXX.json 생성
# 토큰 비용: 0
# ============================================================

if [ "$FAILURES" -ge 3 ]; then
  FEEDBACK_DIR="$PROJECT_DIR/.timsquad/feedback"
  mkdir -p "$FEEDBACK_DIR"

  # 다음 피드백 번호 결정
  EXISTING_COUNT=$(ls "$FEEDBACK_DIR"/FB-*.json 2>/dev/null | wc -l | tr -d ' ')
  NEXT_NUM=$((EXISTING_COUNT + 1))
  FB_ID=$(printf "FB-%04d" "$NEXT_NUM")
  FB_FILE="$FEEDBACK_DIR/${FB_ID}.json"

  # 실패한 도구 목록 추출
  FAILED_TOOLS=$(jq -r 'select(.event == "PostToolUseFailure") | .tool // "unknown"' "$JSONL_FILE" 2>/dev/null \
    | sort | uniq -c | sort -rn | head -3 \
    | awk '{printf "%s(%d) ", $2, $1}')

  jq -n \
    --arg id "$FB_ID" \
    --arg ts "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    --arg msg "세션 ${SESSION_SHORT}에서 도구 실패 ${FAILURES}회 감지. 실패 도구: ${FAILED_TOOLS}" \
    --arg trigger "tool_failure" \
    --arg session "$SESSION_SHORT" \
    '{
      id: $id,
      timestamp: $ts,
      type: "auto-feedback",
      level: 1,
      trigger: $trigger,
      message: $msg,
      routeTo: "developer",
      tags: ["auto-detected", "tool_failure", $session]
    }' > "$FB_FILE"
fi

exit 0
