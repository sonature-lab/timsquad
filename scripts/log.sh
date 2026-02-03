#!/bin/bash

# TimSquad 로그 관리 스크립트 v1.0
# 사용법: tsq log <command> [options]

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
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

# 도움말
show_help() {
    echo "사용법: tsq log <command> [options]"
    echo ""
    echo "Commands:"
    echo "  add <agent> <type> [message]   로그 추가"
    echo "  list [agent]                   로그 목록 표시"
    echo "  view <file>                    로그 파일 보기"
    echo "  today [agent]                  오늘 로그 보기"
    echo "  search <keyword>               로그 검색"
    echo ""
    echo "Log Types:"
    echo "  work      작업 내용"
    echo "  decision  결정 사항"
    echo "  error     에러/이슈"
    echo "  feedback  피드백"
    echo "  handoff   핸드오프"
    echo ""
    echo "Options:"
    echo "  -m, --message <msg>  로그 메시지"
    echo "  -h, --help           도움말 표시"
    echo ""
    echo "예시:"
    echo "  tsq log add planner work \"PRD 초안 작성 완료\""
    echo "  tsq log list developer"
    echo "  tsq log today"
    echo "  tsq log search \"API 설계\""
    echo ""
    echo "파이프 사용:"
    echo "  echo \"작업 내용\" | tsq log add developer work"
}

# TimSquad 루트 확인
TSQ_ROOT=$(find_timsquad_root) || {
    echo -e "${RED}Error: TimSquad 프로젝트가 아닙니다.${NC}"
    echo "  tsq init으로 프로젝트를 초기화하세요."
    exit 1
}

LOGS_DIR="$TSQ_ROOT/.timsquad/logs"
TODAY=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y-%m-%dT%H:%M:%S%z)

# ============================================================
# 로그 추가
# ============================================================
cmd_add() {
    local agent="$1"
    local type="$2"
    shift 2
    local message="$*"

    if [[ -z "$agent" || -z "$type" ]]; then
        echo -e "${RED}Error: agent와 type이 필요합니다${NC}"
        echo "  tsq log add <agent> <type> [message]"
        exit 1
    fi

    # 유효한 타입 확인
    local valid_types=("work" "decision" "error" "feedback" "handoff")
    if [[ ! " ${valid_types[@]} " =~ " ${type} " ]]; then
        echo -e "${RED}Error: 유효하지 않은 타입: $type${NC}"
        echo "  유효한 타입: ${valid_types[*]}"
        exit 1
    fi

    # 파이프에서 메시지 읽기
    if [[ -z "$message" && ! -t 0 ]]; then
        message=$(cat)
    fi

    if [[ -z "$message" ]]; then
        echo -e "${YELLOW}Warning: 메시지가 비어있습니다${NC}"
        read -p "메시지 입력: " message
    fi

    # 로그 파일 경로
    local log_file="$LOGS_DIR/${TODAY}-${agent}.md"

    # 파일이 없으면 생성
    if [[ ! -f "$log_file" ]]; then
        cat > "$log_file" << EOF
# ${agent} 작업 로그 - ${TODAY}

> 자동 생성된 로그 파일입니다.

---

EOF
    fi

    # 로그 항목 추가
    local time=$(date +%H:%M:%S)

    cat >> "$log_file" << EOF

## [$time] $type

$message

EOF

    echo -e "${GREEN}✓${NC} 로그 추가됨: $log_file"
    echo -e "  ${CYAN}Agent:${NC} $agent"
    echo -e "  ${CYAN}Type:${NC} $type"
    echo -e "  ${CYAN}Message:${NC} ${message:0:50}..."
}

# ============================================================
# 로그 목록
# ============================================================
cmd_list() {
    local agent="$1"

    echo -e "${CYAN}━━━ 로그 파일 목록 ━━━${NC}"
    echo ""

    if [[ -n "$agent" ]]; then
        # 특정 에이전트 로그만
        ls -1t "$LOGS_DIR"/*-${agent}.md 2>/dev/null | while read -r file; do
            local name=$(basename "$file")
            local size=$(wc -c < "$file" | tr -d ' ')
            local lines=$(wc -l < "$file" | tr -d ' ')
            echo -e "  ${name} ${GRAY}(${lines}줄, ${size}B)${NC}"
        done
    else
        # 모든 로그 (템플릿/예시 제외)
        ls -1t "$LOGS_DIR"/*.md 2>/dev/null | grep -v "_template\|_example" | head -20 | while read -r file; do
            local name=$(basename "$file")
            local size=$(wc -c < "$file" | tr -d ' ')
            echo -e "  ${name} ${GRAY}(${size}B)${NC}"
        done
    fi

    echo ""
    echo -e "${GRAY}전체 로그: ls $LOGS_DIR${NC}"
}

# ============================================================
# 로그 보기
# ============================================================
cmd_view() {
    local file="$1"

    if [[ -z "$file" ]]; then
        echo -e "${RED}Error: 파일명이 필요합니다${NC}"
        exit 1
    fi

    local path="$LOGS_DIR/$file"

    # .md 확장자 자동 추가
    if [[ ! "$file" == *.md ]]; then
        path="$LOGS_DIR/${file}.md"
    fi

    if [[ -f "$path" ]]; then
        cat "$path"
    else
        echo -e "${RED}Error: 파일을 찾을 수 없습니다: $path${NC}"
        exit 1
    fi
}

# ============================================================
# 오늘 로그
# ============================================================
cmd_today() {
    local agent="$1"

    echo -e "${CYAN}━━━ 오늘의 로그 (${TODAY}) ━━━${NC}"
    echo ""

    local found=false

    if [[ -n "$agent" ]]; then
        local file="$LOGS_DIR/${TODAY}-${agent}.md"
        if [[ -f "$file" ]]; then
            cat "$file"
            found=true
        fi
    else
        for file in "$LOGS_DIR"/${TODAY}-*.md; do
            if [[ -f "$file" ]]; then
                echo -e "${BLUE}=== $(basename "$file") ===${NC}"
                cat "$file"
                echo ""
                found=true
            fi
        done
    fi

    if ! $found; then
        echo -e "${GRAY}오늘 작성된 로그가 없습니다${NC}"
    fi
}

# ============================================================
# 로그 검색
# ============================================================
cmd_search() {
    local keyword="$1"

    if [[ -z "$keyword" ]]; then
        echo -e "${RED}Error: 검색어가 필요합니다${NC}"
        exit 1
    fi

    echo -e "${CYAN}━━━ 검색: \"$keyword\" ━━━${NC}"
    echo ""

    grep -r -n -i --include="*.md" "$keyword" "$LOGS_DIR" 2>/dev/null | while read -r result; do
        local file=$(echo "$result" | cut -d':' -f1)
        local line=$(echo "$result" | cut -d':' -f2)
        local content=$(echo "$result" | cut -d':' -f3-)

        local name=$(basename "$file")
        echo -e "${BLUE}$name:$line${NC}"
        echo -e "  $content"
        echo ""
    done

    local count=$(grep -r -l -i --include="*.md" "$keyword" "$LOGS_DIR" 2>/dev/null | wc -l | tr -d ' ')
    echo -e "${GRAY}총 $count개 파일에서 발견${NC}"
}

# ============================================================
# 요약 생성
# ============================================================
cmd_summary() {
    local date="${1:-$TODAY}"

    echo -e "${CYAN}━━━ 일일 요약 (${date}) ━━━${NC}"
    echo ""

    local summary=""

    for file in "$LOGS_DIR"/${date}-*.md; do
        if [[ -f "$file" ]]; then
            local agent=$(basename "$file" .md | sed "s/${date}-//")
            local work_count=$(grep -c "## \[.*\] work" "$file" 2>/dev/null || echo "0")
            local decision_count=$(grep -c "## \[.*\] decision" "$file" 2>/dev/null || echo "0")
            local error_count=$(grep -c "## \[.*\] error" "$file" 2>/dev/null || echo "0")

            echo -e "${BLUE}$agent:${NC}"
            echo -e "  작업: $work_count | 결정: $decision_count | 에러: $error_count"
            echo ""
        fi
    done
}

# ============================================================
# 메인 실행
# ============================================================

if [[ $# -eq 0 ]]; then
    show_help
    exit 0
fi

COMMAND="$1"
shift

case "$COMMAND" in
    add)
        cmd_add "$@"
        ;;
    list|ls)
        cmd_list "$@"
        ;;
    view|cat)
        cmd_view "$@"
        ;;
    today)
        cmd_today "$@"
        ;;
    search|grep)
        cmd_search "$@"
        ;;
    summary)
        cmd_summary "$@"
        ;;
    -h|--help|help)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $COMMAND${NC}"
        show_help
        exit 1
        ;;
esac
