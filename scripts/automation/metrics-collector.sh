#!/bin/bash

# TimSquad Metrics Collector v1.0
# 메트릭 자동 수집 (토큰 0)
#
# 사용법: tsq metrics [collect|summary|export]

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# TimSquad 루트 찾기
find_timsquad_root() {
    local dir="$PWD"
    while [[ "$dir" != "/" ]]; do
        if [[ -d "$dir/.timsquad" ]]; then
            echo "$dir"
            return 0
        fi
        dir="$(dirname "$dir")"
    done
    return 1
}

TSQ_ROOT=$(find_timsquad_root) || {
    echo -e "${RED}Error: TimSquad 프로젝트가 아닙니다.${NC}"
    exit 1
}

METRICS_DIR="$TSQ_ROOT/.timsquad/retrospective/metrics"
LOGS_DIR="$TSQ_ROOT/.timsquad/logs"
STATE_DIR="$TSQ_ROOT/.timsquad/state"

# 디렉토리 생성
mkdir -p "$METRICS_DIR"

# 도움말
show_help() {
    echo "사용법: tsq metrics [command]"
    echo ""
    echo "Commands:"
    echo "  collect    메트릭 수집"
    echo "  summary    메트릭 요약"
    echo "  export     JSON 내보내기"
    echo "  reset      메트릭 초기화"
    echo ""
}

# 로그 파일 수 카운트
count_logs() {
    local pattern="$1"
    find "$LOGS_DIR" -name "$pattern" -type f 2>/dev/null | wc -l | tr -d ' '
}

# 에이전트별 로그 수
count_agent_logs() {
    local agent="$1"
    find "$LOGS_DIR" -name "*-${agent}.md" -type f 2>/dev/null | wc -l | tr -d ' '
}

# SSOT 문서 상태
count_ssot_docs() {
    local dir="$TSQ_ROOT/.timsquad/ssot"
    local total=$(find "$dir" -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
    local filled=0

    for file in "$dir"/*.md; do
        if [[ -f "$file" ]]; then
            local size=$(wc -c < "$file" | tr -d ' ')
            if [[ $size -gt 500 ]]; then
                filled=$((filled + 1))
            fi
        fi
    done

    echo "$filled/$total"
}

# 패턴 수 카운트
count_patterns() {
    local type="$1"  # failure or success
    local file="$TSQ_ROOT/.timsquad/retrospective/patterns/${type}-patterns.md"

    if [[ -f "$file" ]]; then
        grep -c "^## ${type^^:0:1}P-" "$file" 2>/dev/null || echo "0"
    else
        echo "0"
    fi
}

# 메트릭 수집
cmd_collect() {
    echo -e "${CYAN}━━━ 메트릭 수집 중 ━━━${NC}"

    local timestamp=$(date +"%Y-%m-%dT%H:%M:%S%z")
    local metrics_file="$METRICS_DIR/daily-metrics.json"

    # 기본 메트릭 수집
    local total_logs=$(count_logs "*.md" | grep -v "_template\|_example")
    local ssot_status=$(count_ssot_docs)
    local failure_patterns=$(count_patterns "failure")
    local success_patterns=$(count_patterns "success")

    # 에이전트별 메트릭
    local planner_logs=$(count_agent_logs "planner")
    local developer_logs=$(count_agent_logs "developer")
    local qa_logs=$(count_agent_logs "qa")
    local dba_logs=$(count_agent_logs "dba")

    # 현재 Phase
    local current_phase="unknown"
    if [[ -f "$STATE_DIR/current-phase.json" ]]; then
        current_phase=$(grep '"current_phase"' "$STATE_DIR/current-phase.json" | sed 's/.*: *"\([^"]*\)".*/\1/')
    fi

    # JSON 생성
    cat > "$metrics_file" << EOF
{
  "timestamp": "$timestamp",
  "project": {
    "phase": "$current_phase",
    "ssot_completion": "$ssot_status"
  },
  "logs": {
    "total": $total_logs,
    "by_agent": {
      "planner": $planner_logs,
      "developer": $developer_logs,
      "qa": $qa_logs,
      "dba": $dba_logs
    }
  },
  "patterns": {
    "failure": $failure_patterns,
    "success": $success_patterns
  }
}
EOF

    echo -e "  ${GREEN}✓${NC} 메트릭 수집 완료"
    echo -e "  저장 위치: $metrics_file"
}

# 메트릭 요약
cmd_summary() {
    local metrics_file="$METRICS_DIR/daily-metrics.json"

    if [[ ! -f "$metrics_file" ]]; then
        echo -e "${YELLOW}메트릭이 없습니다. 'tsq metrics collect'를 실행하세요.${NC}"
        exit 1
    fi

    echo ""
    echo -e "${CYAN}━━━ TimSquad 메트릭 요약 ━━━${NC}"
    echo ""

    # jq가 있으면 예쁘게 출력
    if command -v jq &> /dev/null; then
        local phase=$(jq -r '.project.phase' "$metrics_file")
        local ssot=$(jq -r '.project.ssot_completion' "$metrics_file")
        local total_logs=$(jq -r '.logs.total' "$metrics_file")
        local fp=$(jq -r '.patterns.failure' "$metrics_file")
        local sp=$(jq -r '.patterns.success' "$metrics_file")

        echo -e "  ${BLUE}현재 Phase:${NC} $phase"
        echo -e "  ${BLUE}SSOT 완성도:${NC} $ssot"
        echo ""
        echo -e "  ${BLUE}로그 현황:${NC}"
        echo -e "    총 로그: $total_logs개"
        echo -e "    Planner: $(jq -r '.logs.by_agent.planner' "$metrics_file")개"
        echo -e "    Developer: $(jq -r '.logs.by_agent.developer' "$metrics_file")개"
        echo -e "    QA: $(jq -r '.logs.by_agent.qa' "$metrics_file")개"
        echo -e "    DBA: $(jq -r '.logs.by_agent.dba' "$metrics_file")개"
        echo ""
        echo -e "  ${BLUE}패턴 현황:${NC}"
        echo -e "    실패 패턴: ${YELLOW}$fp${NC}개"
        echo -e "    성공 패턴: ${GREEN}$sp${NC}개"
    else
        cat "$metrics_file"
    fi

    echo ""
}

# 메트릭 내보내기
cmd_export() {
    local output="${1:-metrics-export.json}"
    local metrics_file="$METRICS_DIR/daily-metrics.json"

    if [[ ! -f "$metrics_file" ]]; then
        cmd_collect
    fi

    cp "$metrics_file" "$output"
    echo -e "${GREEN}✓${NC} 메트릭 내보내기 완료: $output"
}

# 메트릭 초기화
cmd_reset() {
    echo -e "${YELLOW}메트릭을 초기화하시겠습니까? (y/N)${NC}"
    read -r confirm

    if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
        rm -f "$METRICS_DIR"/*.json
        echo -e "${GREEN}✓${NC} 메트릭 초기화 완료"
    else
        echo "취소됨"
    fi
}

# 메인 실행
case "${1:-summary}" in
    collect)
        cmd_collect
        ;;
    summary)
        cmd_summary
        ;;
    export)
        cmd_export "$2"
        ;;
    reset)
        cmd_reset
        ;;
    -h|--help|help)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        show_help
        exit 1
        ;;
esac
