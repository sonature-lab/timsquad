#!/bin/bash
# tsq release - 릴리즈 태그 생성
# Usage: tsq release <version> [message]
# Example: tsq release v1.0.0 "Initial release"

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

VERSION="$1"
MESSAGE="$2"

if [ -z "$VERSION" ]; then
    # 최근 태그 확인
    LATEST=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
    echo -e "${YELLOW}최근 버전: $LATEST${NC}"
    read -p "새 버전: " VERSION

    if [ -z "$VERSION" ]; then
        echo -e "${RED}버전이 필요합니다.${NC}"
        exit 1
    fi
fi

# v 접두사 확인
if [[ ! "$VERSION" =~ ^v ]]; then
    VERSION="v$VERSION"
fi

# 메시지 없으면 입력 요청
if [ -z "$MESSAGE" ]; then
    read -p "릴리즈 메시지: " MESSAGE
    MESSAGE="${MESSAGE:-Release $VERSION}"
fi

# main 브랜치 확인
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ] && [ "$BRANCH" != "master" ]; then
    echo -e "${YELLOW}경고: 현재 $BRANCH 브랜치입니다. main/master가 아닙니다.${NC}"
    read -p "계속하시겠습니까? (y/N): " CONFIRM
    if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
        exit 0
    fi
fi

# 태그 생성
echo -e "${GREEN}태그 생성: $VERSION${NC}"
git tag -a "$VERSION" -m "$MESSAGE"

# 푸시
echo -e "${GREEN}태그 푸시 중...${NC}"
git push origin "$VERSION"

# gh CLI로 릴리즈 생성 (선택적)
if command -v gh &> /dev/null; then
    read -p "GitHub Release도 생성하시겠습니까? (y/N): " CREATE_RELEASE
    if [ "$CREATE_RELEASE" = "y" ] || [ "$CREATE_RELEASE" = "Y" ]; then
        gh release create "$VERSION" --title "$VERSION" --notes "$MESSAGE"
        echo -e "${GREEN}GitHub Release 생성 완료!${NC}"
    fi
fi

echo -e "${GREEN}릴리즈 완료: $VERSION${NC}"
