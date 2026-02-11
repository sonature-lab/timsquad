#!/bin/bash
# tsq commit - 커밋 메시지 자동 생성
# Usage: tsq commit [message]

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 변경사항 확인
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}변경사항이 없습니다.${NC}"
    exit 0
fi

# 메시지가 제공된 경우
if [ -n "$1" ]; then
    MESSAGE="$1"
else
    # 변경 파일 목록
    echo -e "${GREEN}변경된 파일:${NC}"
    git status --short
    echo ""

    # 사용자 입력 요청
    read -p "커밋 메시지: " MESSAGE

    if [ -z "$MESSAGE" ]; then
        echo -e "${RED}커밋 메시지가 필요합니다.${NC}"
        exit 1
    fi
fi

# 스테이징
git add -A

# 커밋
git commit -m "$MESSAGE

Co-Authored-By: TimSquad <timsquad@noreply>"

echo -e "${GREEN}커밋 완료: $MESSAGE${NC}"
