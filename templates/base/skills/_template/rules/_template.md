---
title: {Rule Title}
impact: HIGH                    # CRITICAL | HIGH | MEDIUM | LOW
impactDescription: {영향도 수치}  # 예: "2-10× improvement", "200-800ms 감소"
tags: {tag1}, {tag2}
---

## {Rule Title}

**Impact: {LEVEL} ({영향도 수치})**

{왜 이 규칙이 필요한지 1~2줄 설명}

**Incorrect ({무엇이 잘못됐는지}):**
```{lang}
// 잘못된 패턴
```

**Correct ({무엇이 올바른지}):**
```{lang}
// 올바른 패턴
```

<!--
규칙 파일 작성 가이드:
- 20~80줄 (간결하게)
- frontmatter 필수: title, impact, tags
- impactDescription 권장: 수치화된 영향도
- Incorrect/Correct 코드 예시 필수
- "Claude가 이미 아는 것"은 생략, 프로젝트 고유 패턴만
- 파일명: kebab-case.md (예: async-parallel.md)
-->
