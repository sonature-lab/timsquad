---
title: Rule Categories
---

# Rule Categories

규칙 파일을 카테고리별로 그룹화하는 인덱스.
SKILL.md의 Resources 테이블과 함께 에이전트의 규칙 탐색을 돕습니다.

## {Category 1} ({prefix-})

**Impact:** CRITICAL
**Description:** {이 카테고리의 규칙이 왜 중요한지}

| Rule | Description |
|------|-------------|
| [{prefix}-{name}]({prefix}-{name}.md) | {1줄 설명} |

## {Category 2} ({prefix-})

**Impact:** HIGH
**Description:** {이 카테고리의 규칙이 왜 중요한지}

| Rule | Description |
|------|-------------|
| [{prefix}-{name}]({prefix}-{name}.md) | {1줄 설명} |

<!--
_sections.md 작성 가이드:
- 5개 이상 규칙이 있는 스킬에서 사용
- Impact 순으로 카테고리 정렬 (CRITICAL → LOW)
- 파일명 prefix로 규칙 자동 분류 (예: async-, bundle-, server-)
- 참조: vercel-react-best-practices/rules/_sections.md
-->
