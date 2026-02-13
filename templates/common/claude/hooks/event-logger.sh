#!/bin/bash
# TimSquad Event Logger - Claude Code Hook
# PostToolUse, Stop, SessionStart, SessionEnd 이벤트를 자동 기록
#
# 저장 위치: .timsquad/logs/sessions/{date}-{session_id_short}.jsonl
# 형식: JSON Lines (한 줄 = 하나의 이벤트)

set -euo pipefail

# 프로젝트 루트 결정
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
SESSIONS_DIR="$PROJECT_DIR/.timsquad/logs/sessions"
mkdir -p "$SESSIONS_DIR"

# stdin에서 JSON 읽기
INPUT=$(cat)

# 기본 필드 추출
EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // "unknown"')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
SESSION_SHORT="${SESSION_ID:0:8}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
TODAY=$(date +"%Y-%m-%d")

# 로그 파일 경로
LOG_FILE="$SESSIONS_DIR/${TODAY}-${SESSION_SHORT}.jsonl"

# 이벤트별 데이터 추출
case "$EVENT" in
  PostToolUse|PostToolUseFailure)
    TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // "unknown"')

    # tool_input에서 핵심 정보만 추출 (전체 content 제외 - 용량 절약)
    case "$TOOL_NAME" in
      Write|Edit)
        TOOL_SUMMARY=$(echo "$INPUT" | jq -c '{
          file_path: .tool_input.file_path,
          action: "'"$TOOL_NAME"'"
        }')
        ;;
      Read)
        TOOL_SUMMARY=$(echo "$INPUT" | jq -c '{
          file_path: .tool_input.file_path,
          action: "Read"
        }')
        ;;
      Bash)
        # 커맨드만 추출 (출력 제외)
        TOOL_SUMMARY=$(echo "$INPUT" | jq -c '{
          command: (.tool_input.command // "" | .[0:200]),
          action: "Bash"
        }')
        ;;
      Glob|Grep)
        TOOL_SUMMARY=$(echo "$INPUT" | jq -c '{
          pattern: (.tool_input.pattern // ""),
          path: (.tool_input.path // ""),
          action: "'"$TOOL_NAME"'"
        }')
        ;;
      Task)
        TOOL_SUMMARY=$(echo "$INPUT" | jq -c '{
          description: (.tool_input.description // ""),
          subagent_type: (.tool_input.subagent_type // ""),
          action: "Task"
        }')
        ;;
      *)
        TOOL_SUMMARY=$(echo "$INPUT" | jq -c '{action: "'"$TOOL_NAME"'"}')
        ;;
    esac

    # 성공 여부
    if [ "$EVENT" = "PostToolUseFailure" ]; then
      STATUS="failure"
    else
      STATUS="success"
    fi

    LOG_ENTRY=$(jq -n -c \
      --arg ts "$TIMESTAMP" \
      --arg ev "$EVENT" \
      --arg sid "$SESSION_SHORT" \
      --arg tool "$TOOL_NAME" \
      --arg status "$STATUS" \
      --argjson summary "$TOOL_SUMMARY" \
      '{timestamp: $ts, event: $ev, session: $sid, tool: $tool, status: $status, detail: $summary}')
    ;;

  Stop)
    # transcript에서 마지막 assistant 턴의 토큰 사용량 추출
    TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // ""')
    USAGE='{}'

    if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
      # 마지막 assistant 메시지의 usage 추출
      LAST_USAGE=$(tac "$TRANSCRIPT_PATH" | jq -c 'select(.type == "assistant" and .message.usage) | .message.usage' 2>/dev/null | head -1)

      if [ -n "$LAST_USAGE" ] && [ "$LAST_USAGE" != "null" ]; then
        USAGE=$(echo "$LAST_USAGE" | jq -c '{
          input: (.input_tokens // 0),
          output: (.output_tokens // 0),
          cache_create: (.cache_creation_input_tokens // 0),
          cache_read: (.cache_read_input_tokens // 0)
        }')
      fi

      # 누적 토큰 합산
      CUMULATIVE=$(jq -s -c '{
        total_input: ([.[].message.usage.input_tokens // 0] | add),
        total_output: ([.[].message.usage.output_tokens // 0] | add),
        total_cache_create: ([.[].message.usage.cache_creation_input_tokens // 0] | add),
        total_cache_read: ([.[].message.usage.cache_read_input_tokens // 0] | add),
        turns: length
      }' <(jq -c 'select(.type == "assistant" and .message.usage)' "$TRANSCRIPT_PATH" 2>/dev/null) 2>/dev/null || echo '{}')
    fi

    LOG_ENTRY=$(jq -n -c \
      --arg ts "$TIMESTAMP" \
      --arg ev "Stop" \
      --arg sid "$SESSION_SHORT" \
      --argjson usage "${USAGE:-'{}'}" \
      --argjson cumulative "${CUMULATIVE:-'{}'}" \
      '{timestamp: $ts, event: $ev, session: $sid, usage: $usage, cumulative: $cumulative}')
    ;;

  SessionStart)
    SOURCE=$(echo "$INPUT" | jq -r '.source // "unknown"')
    LOG_ENTRY=$(jq -n -c \
      --arg ts "$TIMESTAMP" \
      --arg ev "SessionStart" \
      --arg sid "$SESSION_SHORT" \
      --arg src "$SOURCE" \
      --arg cwd "$(echo "$INPUT" | jq -r '.cwd // ""')" \
      '{timestamp: $ts, event: $ev, session: $sid, source: $src, cwd: $cwd}')
    ;;

  SessionEnd)
    # transcript에서 최종 토큰 합산
    TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // ""')
    TOTAL_USAGE='{}'

    if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
      TOTAL_USAGE=$(jq -s -c '{
        total_input: ([.[].message.usage.input_tokens // 0] | add),
        total_output: ([.[].message.usage.output_tokens // 0] | add),
        total_cache_create: ([.[].message.usage.cache_creation_input_tokens // 0] | add),
        total_cache_read: ([.[].message.usage.cache_read_input_tokens // 0] | add),
        turns: length
      }' <(jq -c 'select(.type == "assistant" and .message.usage)' "$TRANSCRIPT_PATH" 2>/dev/null) 2>/dev/null || echo '{}')
    fi

    LOG_ENTRY=$(jq -n -c \
      --arg ts "$TIMESTAMP" \
      --arg ev "SessionEnd" \
      --arg sid "$SESSION_SHORT" \
      --argjson total_usage "${TOTAL_USAGE:-'{}'}" \
      '{timestamp: $ts, event: $ev, session: $sid, total_usage: $total_usage}')

    # SessionEnd 시 자동화 스크립트 체인 실행
    # 1. 작업 로그 자동 생성
    AUTO_WORKLOG="$PROJECT_DIR/.claude/hooks/auto-worklog.sh"
    if [ -f "$AUTO_WORKLOG" ]; then
      bash "$AUTO_WORKLOG" "$LOG_FILE" "$SESSION_SHORT" &
    fi

    # 2. 메트릭 자동 수집 (누적 갱신, 토큰 비용 0)
    AUTO_METRICS="$PROJECT_DIR/.claude/hooks/auto-metrics.sh"
    if [ -f "$AUTO_METRICS" ]; then
      bash "$AUTO_METRICS" "$LOG_FILE" "$SESSION_SHORT" &
    fi
    ;;

  SubagentStart)
    AGENT_TYPE=$(echo "$INPUT" | jq -r '.subagent_type // "unknown"')
    AGENT_DESC=$(echo "$INPUT" | jq -r '.description // ""' | head -c 200)
    LOG_ENTRY=$(jq -n -c \
      --arg ts "$TIMESTAMP" \
      --arg ev "SubagentStart" \
      --arg sid "$SESSION_SHORT" \
      --arg atype "$AGENT_TYPE" \
      --arg desc "$AGENT_DESC" \
      '{timestamp: $ts, event: $ev, session: $sid, detail: {subagent_type: $atype, description: $desc}}')
    ;;

  SubagentStop)
    AGENT_TYPE=$(echo "$INPUT" | jq -r '.subagent_type // "unknown"')
    LOG_ENTRY=$(jq -n -c \
      --arg ts "$TIMESTAMP" \
      --arg ev "SubagentStop" \
      --arg sid "$SESSION_SHORT" \
      --arg atype "$AGENT_TYPE" \
      '{timestamp: $ts, event: $ev, session: $sid, detail: {subagent_type: $atype}}')
    ;;

  *)
    LOG_ENTRY=$(jq -n -c \
      --arg ts "$TIMESTAMP" \
      --arg ev "$EVENT" \
      --arg sid "$SESSION_SHORT" \
      '{timestamp: $ts, event: $ev, session: $sid}')
    ;;
esac

# JSONL 파일에 append
echo "$LOG_ENTRY" >> "$LOG_FILE"

exit 0
