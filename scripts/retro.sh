#!/bin/bash

# TimSquad Retrospective Script v1.0
# 회고 시스템 실행 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 현재 디렉토리
PROJECT_ROOT="$(pwd)"
TIMSQUAD_DIR="$PROJECT_ROOT/.timsquad"
RETRO_DIR="$TIMSQUAD_DIR/retrospective"

# ============================================================
# 함수 정의
# ============================================================

show_help() {
    echo -e "${CYAN}TimSquad Retrospective System${NC}"
    echo ""
    echo "사용법: tsq retro <command> [options]"
    echo ""
    echo "Commands:"
    echo "  start           새 회고 사이클 시작"
    echo "  collect         로그 및 메트릭 수집"
    echo "  analyze         패턴 분석 (Claude 호출)"
    echo "  report          회고 리포트 생성"
    echo "  apply           개선 사항 적용"
    echo "  status          현재 회고 상태"
    echo ""
    echo "Examples:"
    echo "  tsq retro start                새 회고 사이클 시작"
    echo "  tsq retro collect              로그 수집"
    echo "  tsq retro report               리포트 생성"
    echo ""
}

check_timsquad() {
    if [[ ! -d "$TIMSQUAD_DIR" ]]; then
        echo -e "${RED}❌ TimSquad 프로젝트가 아닙니다.${NC}"
        echo "  'tsq init'으로 프로젝트를 초기화하세요."
        exit 1
    fi
}

get_next_cycle_number() {
    local cycles_dir="$RETRO_DIR/cycles"
    if [[ ! -d "$cycles_dir" ]]; then
        echo "1"
        return
    fi

    local last_cycle=$(ls -1 "$cycles_dir" 2>/dev/null | grep -E '^cycle-[0-9]+\.md$' | sort -V | tail -1 | sed 's/cycle-\([0-9]*\)\.md/\1/')

    if [[ -z "$last_cycle" ]]; then
        echo "1"
    else
        echo $((last_cycle + 1))
    fi
}

get_current_cycle() {
    local state_file="$RETRO_DIR/state.json"
    if [[ -f "$state_file" ]]; then
        grep -o '"current_cycle":[0-9]*' "$state_file" | cut -d':' -f2
    else
        echo "0"
    fi
}

# ============================================================
# 명령어: start
# ============================================================
cmd_start() {
    check_timsquad

    echo -e "${BLUE}🔄 새 회고 사이클 시작...${NC}"

    # 디렉토리 확인/생성
    mkdir -p "$RETRO_DIR"/{cycles,metrics,improvements/prompts,improvements/templates,patterns}

    local cycle=$(get_next_cycle_number)
    local today=$(date +%Y-%m-%d)
    local timestamp=$(date +%Y-%m-%dT%H:%M:%S)

    # 상태 파일 생성/업데이트
    cat > "$RETRO_DIR/state.json" << EOF
{
  "current_cycle": $cycle,
  "status": "collecting",
  "started_at": "$timestamp",
  "period_start": "$today",
  "period_end": null
}
EOF

    echo -e "${GREEN}✅ Cycle $cycle 시작됨${NC}"
    echo ""
    echo "다음 단계:"
    echo "  1. 작업 수행 (로그 자동 수집)"
    echo "  2. tsq retro collect   - 메트릭 수집"
    echo "  3. tsq retro analyze   - 패턴 분석"
    echo "  4. tsq retro report    - 리포트 생성"
    echo ""
}

# ============================================================
# 명령어: collect
# ============================================================
cmd_collect() {
    check_timsquad

    echo -e "${BLUE}📊 로그 및 메트릭 수집 중...${NC}"

    local cycle=$(get_current_cycle)
    if [[ "$cycle" == "0" ]]; then
        echo -e "${RED}❌ 활성 회고 사이클이 없습니다.${NC}"
        echo "  'tsq retro start'로 새 사이클을 시작하세요."
        exit 1
    fi

    local logs_dir="$TIMSQUAD_DIR/logs"
    local metrics_file="$RETRO_DIR/metrics/cycle-$cycle.json"
    local timestamp=$(date +%Y-%m-%dT%H:%M:%S)

    # 로그 파일 수집
    echo "  로그 파일 검색..."
    local log_count=0
    local task_count=0
    local feedback_count=0

    if [[ -d "$logs_dir" ]]; then
        log_count=$(find "$logs_dir" -name "*.log" -o -name "*.md" 2>/dev/null | wc -l | tr -d ' ')

        # 작업 로그에서 통계 추출
        if [[ -f "$logs_dir/tasks.log" ]]; then
            task_count=$(grep -c "TASK_COMPLETED" "$logs_dir/tasks.log" 2>/dev/null || echo "0")
        fi

        # 피드백 로그에서 통계 추출
        if [[ -f "$logs_dir/feedback.log" ]]; then
            feedback_count=$(wc -l < "$logs_dir/feedback.log" 2>/dev/null | tr -d ' ')
        fi
    fi

    # workspace.xml에서 완료된 작업 수집
    local workspace_file="$TIMSQUAD_DIR/state/workspace.xml"
    local completed_tasks=0
    if [[ -f "$workspace_file" ]]; then
        completed_tasks=$(grep -c "<task id=" "$workspace_file" 2>/dev/null || echo "0")
    fi

    # 기본 메트릭 JSON 생성
    cat > "$metrics_file" << EOF
{
  "cycle": $cycle,
  "collected_at": "$timestamp",
  "raw_data": {
    "log_files": $log_count,
    "task_count": $task_count,
    "feedback_count": $feedback_count,
    "completed_tasks_in_workspace": $completed_tasks
  },
  "summary": {
    "total_tasks": 0,
    "success_rate": 0,
    "avg_revision_count": 0,
    "level_3_feedback_count": 0
  },
  "agents": {},
  "feedback": {
    "total": $feedback_count,
    "by_level": {
      "level_1": 0,
      "level_2": 0,
      "level_3": 0
    }
  },
  "patterns": {
    "failure": [],
    "success": []
  },
  "status": "collected"
}
EOF

    echo -e "${GREEN}✅ 메트릭 수집 완료${NC}"
    echo ""
    echo "수집된 데이터:"
    echo "  - 로그 파일: $log_count개"
    echo "  - 작업 완료: $task_count건"
    echo "  - 피드백: $feedback_count건"
    echo ""
    echo "메트릭 파일: $metrics_file"
    echo ""
    echo "다음 단계: tsq retro analyze"
    echo ""
}

# ============================================================
# 명령어: analyze
# ============================================================
cmd_analyze() {
    check_timsquad

    echo -e "${BLUE}🔍 패턴 분석 준비 중...${NC}"

    local cycle=$(get_current_cycle)
    if [[ "$cycle" == "0" ]]; then
        echo -e "${RED}❌ 활성 회고 사이클이 없습니다.${NC}"
        exit 1
    fi

    local metrics_file="$RETRO_DIR/metrics/cycle-$cycle.json"
    if [[ ! -f "$metrics_file" ]]; then
        echo -e "${RED}❌ 메트릭 파일이 없습니다.${NC}"
        echo "  'tsq retro collect'를 먼저 실행하세요."
        exit 1
    fi

    echo ""
    echo -e "${YELLOW}⚠️  패턴 분석은 Claude를 호출합니다.${NC}"
    echo ""
    echo "분석 요청 프롬프트가 준비되었습니다."
    echo "Claude Code에서 다음을 실행하세요:"
    echo ""
    echo -e "${CYAN}@tsq-retro \"Cycle $cycle 회고 분석을 시작해주세요. 메트릭 파일: $metrics_file\"${NC}"
    echo ""
    echo "또는 수동으로:"
    echo "  1. $metrics_file 내용 확인"
    echo "  2. .timsquad/logs/ 로그 분석"
    echo "  3. 패턴 식별 및 기록"
    echo ""
}

# ============================================================
# 명령어: report
# ============================================================
cmd_report() {
    check_timsquad

    echo -e "${BLUE}📝 회고 리포트 생성 중...${NC}"

    local cycle=$(get_current_cycle)
    if [[ "$cycle" == "0" ]]; then
        echo -e "${RED}❌ 활성 회고 사이클이 없습니다.${NC}"
        exit 1
    fi

    local metrics_file="$RETRO_DIR/metrics/cycle-$cycle.json"
    local report_file="$RETRO_DIR/cycles/cycle-$cycle.md"
    local template_file="$TIMSQUAD_DIR/../templates/base/timsquad/retrospective/cycle-report.template.md"
    local timestamp=$(date +%Y-%m-%d)

    # 템플릿이 없으면 기본 템플릿 사용
    if [[ ! -f "$template_file" ]]; then
        # TIMSQUAD_ROOT에서 템플릿 찾기 (source 대신 안전한 grep 추출)
        if [[ -f "$HOME/.timsquad" ]]; then
            TIMSQUAD_ROOT=$(grep -m1 '^TIMSQUAD_ROOT=' "$HOME/.timsquad" 2>/dev/null | cut -d'=' -f2- | tr -d '"')
            if [[ -n "$TIMSQUAD_ROOT" ]]; then
                template_file="$TIMSQUAD_ROOT/templates/base/timsquad/retrospective/cycle-report.template.md"
            fi
        fi
    fi

    # 기본 리포트 생성 (템플릿 변수 치환은 Claude가 처리)
    cat > "$report_file" << EOF
---
title: "Cycle $cycle Retrospective Report"
cycle: $cycle
generated_at: $timestamp
status: draft
---

# Cycle $cycle 회고 리포트

> 이 리포트는 자동 생성된 초안입니다.
> Claude (@tsq-retro)를 호출하여 상세 내용을 채워주세요.

## 메트릭 요약

메트릭 파일: \`$metrics_file\`

## 다음 단계

1. Claude Code에서 실행:
   \`\`\`
   @tsq-retro "Cycle $cycle 리포트를 완성해주세요"
   \`\`\`

2. 리포트 검토 및 수정

3. 개선 사항 승인:
   \`\`\`
   tsq retro apply
   \`\`\`

---

**Generated by TimSquad Retrospective System**
EOF

    echo -e "${GREEN}✅ 리포트 초안 생성됨${NC}"
    echo ""
    echo "리포트 파일: $report_file"
    echo ""
    echo "리포트 완성을 위해 Claude를 호출하세요:"
    echo -e "${CYAN}@tsq-retro \"Cycle $cycle 리포트를 완성해주세요\"${NC}"
    echo ""
}

# ============================================================
# 명령어: apply
# ============================================================
cmd_apply() {
    check_timsquad

    echo -e "${BLUE}🔧 개선 사항 적용 준비...${NC}"

    local cycle=$(get_current_cycle)
    local report_file="$RETRO_DIR/cycles/cycle-$cycle.md"

    if [[ ! -f "$report_file" ]]; then
        echo -e "${RED}❌ 리포트 파일이 없습니다.${NC}"
        echo "  'tsq retro report'를 먼저 실행하세요."
        exit 1
    fi

    echo ""
    echo -e "${YELLOW}⚠️  개선 사항 적용은 사용자 승인이 필요합니다.${NC}"
    echo ""
    echo "개선 적용 프로세스:"
    echo "  1. 리포트의 '개선 조치' 섹션 확인"
    echo "  2. 각 개선 사항 검토 및 승인"
    echo "  3. Claude가 승인된 개선 사항 적용"
    echo ""
    echo "Claude Code에서 실행:"
    echo -e "${CYAN}@tsq-retro \"Cycle $cycle 개선 사항을 검토하고 적용해주세요\"${NC}"
    echo ""
}

# ============================================================
# 명령어: status
# ============================================================
cmd_status() {
    check_timsquad

    echo -e "${CYAN}📊 TimSquad Retrospective Status${NC}"
    echo ""

    local state_file="$RETRO_DIR/state.json"

    if [[ ! -f "$state_file" ]]; then
        echo "상태: 회고 사이클 없음"
        echo ""
        echo "'tsq retro start'로 새 사이클을 시작하세요."
        return
    fi

    local cycle=$(get_current_cycle)
    local status=$(grep -o '"status":"[^"]*"' "$state_file" | cut -d'"' -f4)
    local started=$(grep -o '"started_at":"[^"]*"' "$state_file" | cut -d'"' -f4)

    echo "현재 사이클: $cycle"
    echo "상태: $status"
    echo "시작일: $started"
    echo ""

    # 파일 존재 확인
    echo "파일 상태:"

    local metrics_file="$RETRO_DIR/metrics/cycle-$cycle.json"
    local report_file="$RETRO_DIR/cycles/cycle-$cycle.md"

    if [[ -f "$metrics_file" ]]; then
        echo "  ✅ 메트릭: $metrics_file"
    else
        echo "  ⏳ 메트릭: 수집 대기"
    fi

    if [[ -f "$report_file" ]]; then
        echo "  ✅ 리포트: $report_file"
    else
        echo "  ⏳ 리포트: 생성 대기"
    fi

    echo ""

    # 이전 사이클 목록
    local cycles_dir="$RETRO_DIR/cycles"
    if [[ -d "$cycles_dir" ]]; then
        local prev_cycles=$(ls -1 "$cycles_dir" 2>/dev/null | grep -E '^cycle-[0-9]+\.md$' | wc -l | tr -d ' ')
        if [[ "$prev_cycles" -gt "0" ]]; then
            echo "완료된 사이클: $prev_cycles개"
            ls -1 "$cycles_dir" | grep -E '^cycle-[0-9]+\.md$' | head -5 | while read f; do
                echo "  - $f"
            done
        fi
    fi

    echo ""
}

# ============================================================
# 메인 실행
# ============================================================

case "${1:-}" in
    start)
        cmd_start
        ;;
    collect)
        cmd_collect
        ;;
    analyze)
        cmd_analyze
        ;;
    report)
        cmd_report
        ;;
    apply)
        cmd_apply
        ;;
    status)
        cmd_status
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo "Run 'tsq retro help' for usage"
        exit 1
        ;;
esac
