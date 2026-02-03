#!/bin/bash

# TimSquad Feedback CLI v1.0
# 피드백 라우팅 시스템 인터페이스
#
# 사용법: tsq feedback <message>
#         echo "error" | tsq feedback

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMSQUAD_ROOT="$(dirname "$SCRIPT_DIR")"

# 피드백 라우터 스크립트 경로
ROUTER_SCRIPT="$TIMSQUAD_ROOT/templates/common/timsquad/feedback/feedback-router.sh"

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

# 프로젝트 루트로 이동
TSQ_ROOT=$(find_timsquad_root) || {
    echo "Error: TimSquad 프로젝트가 아닙니다."
    exit 1
}

export TSQ_ROOT

# 피드백 라우터 스크립트가 있으면 실행
if [[ -f "$ROUTER_SCRIPT" ]]; then
    bash "$ROUTER_SCRIPT" "$@"
elif [[ -f "$TSQ_ROOT/.timsquad/feedback/feedback-router.sh" ]]; then
    bash "$TSQ_ROOT/.timsquad/feedback/feedback-router.sh" "$@"
else
    # 간단한 폴백 구현
    echo "Warning: 피드백 라우터를 찾을 수 없습니다."
    echo "입력된 피드백: $*"
fi
