#!/bin/bash
# tsq pr - PR 생성
# Usage: tsq pr [title]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# gh CLI 확인
if ! command -v gh &> /dev/null; then
    echo -e "${RED}gh CLI가 필요합니다: brew install gh${NC}"
    exit 1
fi

# 현재 브랜치
BRANCH=$(git branch --show-current)

if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
    echo -e "${RED}main/master 브랜치에서는 PR을 생성할 수 없습니다.${NC}"
    exit 1
fi

# 원격에 푸시
echo -e "${YELLOW}원격에 푸시 중...${NC}"
git push -u origin "$BRANCH" 2>/dev/null || git push origin "$BRANCH"

# PR 제목
if [ -n "$1" ]; then
    TITLE="$1"
else
    # 브랜치 이름에서 제목 추출
    TITLE=$(echo "$BRANCH" | sed 's/[-_]/ /g' | sed 's/feature\///g' | sed 's/fix\///g')
    read -p "PR 제목 [$TITLE]: " INPUT_TITLE
    TITLE="${INPUT_TITLE:-$TITLE}"
fi

# 커밋 목록으로 본문 생성
COMMITS=$(git log main.."$BRANCH" --oneline 2>/dev/null || git log master.."$BRANCH" --oneline 2>/dev/null || echo "")

BODY="## Summary
- $TITLE

## Changes
$COMMITS

## Test Plan
- [ ] 테스트 완료

---
🤖 Generated with TimSquad"

# PR 생성
echo -e "${GREEN}PR 생성 중...${NC}"
gh pr create --title "$TITLE" --body "$BODY"

echo -e "${GREEN}PR 생성 완료!${NC}"
