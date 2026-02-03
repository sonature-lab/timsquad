#!/bin/bash

# TimSquad 상태 확인 스크립트 v1.0
# 사용법: tsq status [options]

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m'

# 심볼
CHECK="✓"
CROSS="✗"
WARN="⚠"
ARROW="→"

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

# 도움말
show_help() {
    echo "사용법: tsq status [options]"
    echo ""
    echo "Options:"
    echo "  -a, --all       전체 상세 정보 표시"
    echo "  -s, --ssot      SSOT 문서 상태만 표시"
    echo "  -p, --phase     현재 Phase 정보만 표시"
    echo "  -m, --metrics   메트릭 요약만 표시"
    echo "  -h, --help      도움말 표시"
    echo ""
    echo "예시:"
    echo "  tsq status          # 기본 상태 표시"
    echo "  tsq status --all    # 전체 상세 정보"
    echo "  tsq status --ssot   # SSOT 문서 상태"
}

# 인자 파싱
SHOW_ALL=false
SHOW_SSOT=false
SHOW_PHASE=false
SHOW_METRICS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -a|--all)
            SHOW_ALL=true
            shift
            ;;
        -s|--ssot)
            SHOW_SSOT=true
            shift
            ;;
        -p|--phase)
            SHOW_PHASE=true
            shift
            ;;
        -m|--metrics)
            SHOW_METRICS=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# TimSquad 루트 확인
TSQ_ROOT=$(find_timsquad_root) || {
    echo -e "${RED}Error: TimSquad 프로젝트가 아닙니다.${NC}"
    echo "  tsq init으로 프로젝트를 초기화하세요."
    exit 1
}

cd "$TSQ_ROOT"

# ============================================================
# 프로젝트 기본 정보
# ============================================================
print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}         ${CYAN}TimSquad Status${NC}                   ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
    echo ""
}

print_project_info() {
    local config=".timsquad/config.yaml"

    if [[ -f "$config" ]]; then
        local name=$(grep "name:" "$config" | head -1 | sed 's/.*name: *"\?\([^"]*\)"\?.*/\1/')
        local type=$(grep "type:" "$config" | head -1 | sed 's/.*type: *"\?\([^"]*\)"\?.*/\1/')
        local level=$(grep "level:" "$config" | head -1 | sed 's/.*level: *//')

        echo -e "${CYAN}프로젝트:${NC} $name"
        echo -e "${CYAN}타입:${NC} $type | ${CYAN}레벨:${NC} $level"
    else
        echo -e "${YELLOW}$WARN config.yaml을 찾을 수 없습니다${NC}"
    fi
}

# ============================================================
# Phase 상태
# ============================================================
print_phase_status() {
    echo ""
    echo -e "${CYAN}━━━ Phase 상태 ━━━${NC}"

    local phase_file=".timsquad/state/current-phase.json"

    if [[ -f "$phase_file" ]]; then
        local current=$(grep '"current_phase"' "$phase_file" | sed 's/.*: *"\([^"]*\)".*/\1/')
        local entered=$(grep '"entered_at"' "$phase_file" | sed 's/.*: *"\([^"]*\)".*/\1/' | cut -d'T' -f1)

        echo -e "  현재 Phase: ${GREEN}$current${NC}"
        echo -e "  시작일: $entered"

        # Phase 진행률 표시
        case $current in
            planning)
                echo -e "  진행률: ${BLUE}████${GRAY}████████████████${NC} 20%"
                ;;
            design)
                echo -e "  진행률: ${BLUE}████████${GRAY}████████████${NC} 40%"
                ;;
            implementation)
                echo -e "  진행률: ${BLUE}████████████${GRAY}████████${NC} 60%"
                ;;
            testing)
                echo -e "  진행률: ${BLUE}████████████████${GRAY}████${NC} 80%"
                ;;
            deployment)
                echo -e "  진행률: ${GREEN}████████████████████${NC} 100%"
                ;;
        esac
    else
        echo -e "  ${YELLOW}$WARN Phase 정보를 찾을 수 없습니다${NC}"
    fi
}

# ============================================================
# SSOT 문서 상태
# ============================================================
print_ssot_status() {
    echo ""
    echo -e "${CYAN}━━━ SSOT 문서 상태 ━━━${NC}"

    local ssot_dir=".timsquad/ssot"
    local total=0
    local filled=0

    # 필수 문서 목록 (Level 1)
    local docs=("prd.md" "planning.md" "requirements.md" "service-spec.md" "data-design.md")

    for doc in "${docs[@]}"; do
        local path="$ssot_dir/$doc"
        total=$((total + 1))

        if [[ -f "$path" ]]; then
            # 파일 크기로 작성 여부 판단 (500바이트 이상이면 작성됨으로 간주)
            local size=$(wc -c < "$path" | tr -d ' ')
            if [[ $size -gt 500 ]]; then
                echo -e "  ${GREEN}$CHECK${NC} $doc ${GRAY}(${size}B)${NC}"
                filled=$((filled + 1))
            else
                echo -e "  ${YELLOW}$WARN${NC} $doc ${GRAY}(템플릿 상태)${NC}"
            fi
        else
            echo -e "  ${RED}$CROSS${NC} $doc ${GRAY}(없음)${NC}"
        fi
    done

    # 선택적 문서
    local optional=("glossary.md" "functional-spec.md" "ui-ux-spec.md" "test-spec.md" "security-spec.md" "deployment-spec.md" "env-config.md" "integration-spec.md")

    local opt_exists=0
    for doc in "${optional[@]}"; do
        if [[ -f "$ssot_dir/$doc" ]]; then
            opt_exists=$((opt_exists + 1))
        fi
    done

    echo ""
    echo -e "  ${CYAN}필수 문서:${NC} $filled/$total"
    echo -e "  ${CYAN}선택 문서:${NC} $opt_exists/${#optional[@]}"
}

# ============================================================
# 에이전트 상태
# ============================================================
print_agent_status() {
    echo ""
    echo -e "${CYAN}━━━ 에이전트 현황 ━━━${NC}"

    local agents_dir=".claude/agents"

    if [[ -d "$agents_dir" ]]; then
        local count=$(ls -1 "$agents_dir"/*.md 2>/dev/null | wc -l | tr -d ' ')
        echo -e "  등록된 에이전트: ${GREEN}$count${NC}개"

        # 에이전트 목록
        for agent in "$agents_dir"/*.md; do
            if [[ -f "$agent" ]]; then
                local name=$(basename "$agent" .md)
                echo -e "    ${ARROW} $name"
            fi
        done
    else
        echo -e "  ${YELLOW}$WARN 에이전트 디렉토리가 없습니다${NC}"
    fi
}

# ============================================================
# 최근 로그
# ============================================================
print_recent_logs() {
    echo ""
    echo -e "${CYAN}━━━ 최근 활동 ━━━${NC}"

    local logs_dir=".timsquad/logs"

    if [[ -d "$logs_dir" ]]; then
        # 최근 수정된 로그 파일 3개
        local recent=$(ls -1t "$logs_dir"/*.md 2>/dev/null | grep -v "_template\|_example" | head -3)

        if [[ -n "$recent" ]]; then
            while IFS= read -r log; do
                local name=$(basename "$log")
                local date=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$log" 2>/dev/null || stat -c "%y" "$log" 2>/dev/null | cut -d' ' -f1-2)
                echo -e "  ${ARROW} $name ${GRAY}($date)${NC}"
            done <<< "$recent"
        else
            echo -e "  ${GRAY}로그 없음${NC}"
        fi
    else
        echo -e "  ${YELLOW}$WARN 로그 디렉토리가 없습니다${NC}"
    fi
}

# ============================================================
# 회고 상태
# ============================================================
print_retro_status() {
    echo ""
    echo -e "${CYAN}━━━ 회고 상태 ━━━${NC}"

    local retro_dir=".timsquad/retrospective"

    if [[ -d "$retro_dir/cycles" ]]; then
        local cycle_count=$(ls -1 "$retro_dir/cycles"/*.md 2>/dev/null | wc -l | tr -d ' ')
        echo -e "  완료된 사이클: ${GREEN}$cycle_count${NC}개"

        # 현재 사이클 상태 (retrospective-state.xml에서 읽기)
        if [[ -f "$retro_dir/retrospective-state.xml" ]]; then
            local status=$(grep -o 'status="[^"]*"' "$retro_dir/retrospective-state.xml" | head -1 | sed 's/status="\([^"]*\)"/\1/')
            if [[ -n "$status" ]]; then
                echo -e "  현재 사이클 상태: $status"
            fi
        fi
    else
        echo -e "  ${GRAY}아직 회고 사이클 없음${NC}"
    fi

    # 패턴 현황
    if [[ -f "$retro_dir/patterns/failure-patterns.md" ]]; then
        local fp_count=$(grep -c "^## FP-" "$retro_dir/patterns/failure-patterns.md" 2>/dev/null || echo "0")
        echo -e "  실패 패턴: ${YELLOW}$fp_count${NC}개"
    fi

    if [[ -f "$retro_dir/patterns/success-patterns.md" ]]; then
        local sp_count=$(grep -c "^## SP-" "$retro_dir/patterns/success-patterns.md" 2>/dev/null || echo "0")
        echo -e "  성공 패턴: ${GREEN}$sp_count${NC}개"
    fi
}

# ============================================================
# 메트릭 요약
# ============================================================
print_metrics() {
    echo ""
    echo -e "${CYAN}━━━ 메트릭 요약 ━━━${NC}"

    # 간단한 통계
    local ssot_count=$(ls -1 .timsquad/ssot/*.md 2>/dev/null | wc -l | tr -d ' ')
    local agent_count=$(ls -1 .claude/agents/*.md 2>/dev/null | wc -l | tr -d ' ')
    local log_count=$(ls -1 .timsquad/logs/*.md 2>/dev/null | grep -v "_template\|_example" | wc -l | tr -d ' ')

    echo -e "  SSOT 문서: $ssot_count개"
    echo -e "  에이전트: $agent_count개"
    echo -e "  로그 파일: $log_count개"
}

# ============================================================
# 메인 실행
# ============================================================

if $SHOW_PHASE; then
    print_phase_status
    exit 0
fi

if $SHOW_SSOT; then
    print_ssot_status
    exit 0
fi

if $SHOW_METRICS; then
    print_metrics
    exit 0
fi

# 기본 또는 전체 표시
print_header
print_project_info
print_phase_status
print_ssot_status

if $SHOW_ALL; then
    print_agent_status
    print_recent_logs
    print_retro_status
    print_metrics
fi

echo ""
echo -e "${GRAY}상세 정보: tsq status --all${NC}"
echo ""
