#!/bin/bash
# tsq sync - 원격 저장소 동기화
# Usage: tsq sync

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

BRANCH=$(git branch --show-current)

echo -e "${YELLOW}원격 저장소에서 가져오는 중...${NC}"
git fetch --all --prune

# main/master 브랜치 확인
if git show-ref --verify --quiet refs/heads/main; then
    DEFAULT_BRANCH="main"
elif git show-ref --verify --quiet refs/heads/master; then
    DEFAULT_BRANCH="master"
else
    DEFAULT_BRANCH="main"
fi

# 현재 브랜치가 main/master면 pull
if [ "$BRANCH" = "$DEFAULT_BRANCH" ]; then
    echo -e "${GREEN}$DEFAULT_BRANCH 브랜치 업데이트 중...${NC}"
    git pull --rebase origin "$DEFAULT_BRANCH"
else
    # 다른 브랜치면 main/master 기준으로 rebase
    echo -e "${GREEN}$DEFAULT_BRANCH 기준으로 rebase 중...${NC}"
    git rebase "origin/$DEFAULT_BRANCH"
fi

# 상태 표시
echo ""
echo -e "${GREEN}동기화 완료!${NC}"
echo ""
git status --short

# 원격과의 차이 표시
AHEAD=$(git rev-list --count "origin/$BRANCH..$BRANCH" 2>/dev/null || echo "0")
BEHIND=$(git rev-list --count "$BRANCH..origin/$BRANCH" 2>/dev/null || echo "0")

if [ "$AHEAD" != "0" ] || [ "$BEHIND" != "0" ]; then
    echo ""
    echo -e "${YELLOW}원격 대비: ↑$AHEAD ↓$BEHIND${NC}"
fi
