---
title: Architecture Decision Record Template
category: guide
source: internal
---

# Architecture Decision Record (ADR)

아키텍처 결정을 문서화하는 ADR 작성 가이드.

## When to Write ADR

- 기술 스택 선정
- 아키텍처 패턴 결정
- 트레이드오프가 있는 결정

## Template

```markdown
# ADR-XXX: {제목}

## Status
Proposed / Accepted / Deprecated / Superseded

## Context
결정이 필요한 배경과 상황

## Decision
내린 결정과 선택한 옵션

## Consequences
### Positive
- 장점 1
- 장점 2

### Negative
- 단점 1 (완화 방안)

## Alternatives Considered
| 옵션 | 장점 | 단점 |
|-----|-----|-----|
| A | ... | ... |
| B | ... | ... |
```

## Common Pitfalls

- Status를 업데이트하지 않아 현재 유효한지 모호
- Context 없이 Decision만 기록 → 나중에 "왜 이렇게 했지?" 불명확
- Alternatives를 기록하지 않으면 나중에 같은 논의 반복
