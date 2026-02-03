#!/bin/bash

# TimSquad Feedback Router v1.0
# 피드백을 분석하고 적절한 담당자에게 라우팅
#
# 사용법:
#   tsq feedback <message>
#   echo "error message" | tsq feedback
#   tsq feedback --analyze <file>

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

# 도움말
show_help() {
    echo "사용법: tsq feedback [options] <message>"
    echo ""
    echo "Options:"
    echo "  -l, --level <1|2|3>    피드백 레벨 지정"
    echo "  -p, --pattern <name>   패턴 이름 지정"
    echo "  -f, --file <path>      파일에서 피드백 읽기"
    echo "  --analyze              분석만 수행 (라우팅 안함)"
    echo "  -h, --help             도움말 표시"
    echo ""
    echo "예시:"
    echo "  tsq feedback \"test failed: expected 1 but got 2\""
    echo "  tsq feedback -l 2 \"API 인터페이스 변경 필요\""
    echo "  echo \"error\" | tsq feedback"
}

# 키워드 기반 레벨 분류
classify_level() {
    local message="$1"
    local msg_lower=$(echo "$message" | tr '[:upper:]' '[:lower:]')

    # Level 3 키워드
    local level3_keywords=(
        "requirement" "scope" "stakeholder" "business logic"
        "priority" "deadline" "budget" "feature request"
        "clarification needed" "user feedback" "client"
    )

    # Level 2 키워드
    local level2_keywords=(
        "architecture" "design" "api mismatch" "schema"
        "performance" "scalability" "security" "integration"
        "ssot" "spec violation" "migration"
    )

    # Level 1 키워드
    local level1_keywords=(
        "test" "lint" "type error" "runtime" "exception"
        "formatting" "code style" "naming" "coverage"
        "bug" "fix" "typo"
    )

    # Level 3 체크
    for keyword in "${level3_keywords[@]}"; do
        if [[ "$msg_lower" == *"$keyword"* ]]; then
            echo "3"
            return
        fi
    done

    # Level 2 체크
    for keyword in "${level2_keywords[@]}"; do
        if [[ "$msg_lower" == *"$keyword"* ]]; then
            echo "2"
            return
        fi
    done

    # Level 1 체크
    for keyword in "${level1_keywords[@]}"; do
        if [[ "$msg_lower" == *"$keyword"* ]]; then
            echo "1"
            return
        fi
    done

    # 기본값
    echo "1"
}

# 패턴 감지
detect_pattern() {
    local message="$1"
    local msg_lower=$(echo "$message" | tr '[:upper:]' '[:lower:]')

    # 패턴 매핑
    if [[ "$msg_lower" == *"test"*"fail"* ]]; then
        echo "test_failure"
    elif [[ "$msg_lower" == *"lint"* || "$msg_lower" == *"eslint"* ]]; then
        echo "lint_error"
    elif [[ "$msg_lower" == *"type"*"error"* || "$msg_lower" == *"typescript"* ]]; then
        echo "type_error"
    elif [[ "$msg_lower" == *"runtime"* || "$msg_lower" == *"exception"* ]]; then
        echo "runtime_error"
    elif [[ "$msg_lower" == *"api"*"mismatch"* || "$msg_lower" == *"contract"* ]]; then
        echo "api_mismatch"
    elif [[ "$msg_lower" == *"schema"* || "$msg_lower" == *"migration"* ]]; then
        echo "schema_mismatch"
    elif [[ "$msg_lower" == *"security"* || "$msg_lower" == *"vulnerab"* ]]; then
        echo "security_vulnerability"
    elif [[ "$msg_lower" == *"requirement"* ]]; then
        echo "requirement_change"
    elif [[ "$msg_lower" == *"scope"* ]]; then
        echo "scope_creep"
    elif [[ "$msg_lower" == *"performance"* || "$msg_lower" == *"slow"* ]]; then
        echo "performance_issue"
    else
        echo "general"
    fi
}

# 라우팅 대상 결정
get_route_target() {
    local level="$1"

    case $level in
        1)
            echo "tsq-developer"
            ;;
        2)
            echo "tsq-planner (architect mode)"
            ;;
        3)
            echo "tsq-planner (planning mode) → User 승인 필요"
            ;;
        *)
            echo "tsq-developer"
            ;;
    esac
}

# 피드백 로그 저장
log_feedback() {
    local level="$1"
    local pattern="$2"
    local message="$3"
    local target="$4"

    local log_dir="$TSQ_ROOT/.timsquad/logs"
    local log_file="$log_dir/feedback.log"
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")

    mkdir -p "$log_dir"

    cat >> "$log_file" << EOF

---
timestamp: $timestamp
level: $level
pattern: $pattern
target: $target
message: |
  $message
---
EOF
}

# 메트릭 업데이트
update_metrics() {
    local level="$1"
    local pattern="$2"

    local metrics_file="$TSQ_ROOT/.timsquad/retrospective/metrics/feedback-stats.json"

    # 파일이 없으면 초기화
    if [[ ! -f "$metrics_file" ]]; then
        mkdir -p "$(dirname "$metrics_file")"
        echo '{"by_level":{"1":0,"2":0,"3":0},"by_pattern":{},"total":0}' > "$metrics_file"
    fi

    # jq가 있으면 JSON 업데이트
    if command -v jq &> /dev/null; then
        local tmp_file=$(mktemp)
        jq --arg level "$level" --arg pattern "$pattern" '
            .total += 1 |
            .by_level[$level] += 1 |
            .by_pattern[$pattern] = ((.by_pattern[$pattern] // 0) + 1)
        ' "$metrics_file" > "$tmp_file" && mv "$tmp_file" "$metrics_file"
    fi
}

# 메인 라우팅 함수
route_feedback() {
    local level="$1"
    local pattern="$2"
    local message="$3"
    local analyze_only="$4"

    local target=$(get_route_target "$level")

    echo ""
    echo -e "${CYAN}━━━ 피드백 분석 결과 ━━━${NC}"
    echo ""

    # 레벨별 색상
    case $level in
        1)
            echo -e "  레벨: ${GREEN}Level 1 (구현 수정)${NC}"
            ;;
        2)
            echo -e "  레벨: ${YELLOW}Level 2 (설계 수정)${NC}"
            ;;
        3)
            echo -e "  레벨: ${RED}Level 3 (기획 수정)${NC}"
            ;;
    esac

    echo -e "  패턴: ${BLUE}$pattern${NC}"
    echo -e "  라우팅: $target"
    echo ""
    echo -e "  메시지:"
    echo -e "  ${GRAY}$message${NC}"
    echo ""

    if [[ "$analyze_only" == "true" ]]; then
        echo -e "${YELLOW}분석 모드: 라우팅 실행하지 않음${NC}"
        return
    fi

    # 로그 저장
    log_feedback "$level" "$pattern" "$message" "$target"

    # 메트릭 업데이트
    update_metrics "$level" "$pattern"

    # Level 3인 경우 사용자 알림
    if [[ "$level" == "3" ]]; then
        echo -e "${RED}⚠ 사용자 승인이 필요합니다${NC}"
        echo ""
        echo "다음 내용을 검토해주세요:"
        echo "  - 영향 범위 분석"
        echo "  - 대안 옵션"
        echo "  - SSOT 문서 업데이트 필요 여부"
        echo ""
    fi

    echo -e "${GREEN}✓ 피드백이 기록되었습니다${NC}"
}

# ============================================================
# 메인 실행
# ============================================================

# TimSquad 루트 확인
TSQ_ROOT=$(find_timsquad_root) || {
    echo -e "${RED}Error: TimSquad 프로젝트가 아닙니다.${NC}"
    exit 1
}

# 인자 파싱
LEVEL=""
PATTERN=""
MESSAGE=""
FILE=""
ANALYZE_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -l|--level)
            LEVEL="$2"
            shift 2
            ;;
        -p|--pattern)
            PATTERN="$2"
            shift 2
            ;;
        -f|--file)
            FILE="$2"
            shift 2
            ;;
        --analyze)
            ANALYZE_ONLY=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            MESSAGE="$MESSAGE $1"
            shift
            ;;
    esac
done

# 파일에서 읽기
if [[ -n "$FILE" && -f "$FILE" ]]; then
    MESSAGE=$(cat "$FILE")
fi

# stdin에서 읽기
if [[ -z "$MESSAGE" && ! -t 0 ]]; then
    MESSAGE=$(cat)
fi

# 메시지 정리
MESSAGE=$(echo "$MESSAGE" | xargs)

if [[ -z "$MESSAGE" ]]; then
    echo -e "${RED}Error: 피드백 메시지가 필요합니다${NC}"
    show_help
    exit 1
fi

# 자동 분류 (지정되지 않은 경우)
if [[ -z "$LEVEL" ]]; then
    LEVEL=$(classify_level "$MESSAGE")
fi

if [[ -z "$PATTERN" ]]; then
    PATTERN=$(detect_pattern "$MESSAGE")
fi

# 라우팅 실행
route_feedback "$LEVEL" "$PATTERN" "$MESSAGE" "$ANALYZE_ONLY"
