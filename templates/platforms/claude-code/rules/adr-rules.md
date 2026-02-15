---
description: ADR (Architecture Decision Record) 작성 규칙.
globs:
  - ".timsquad/ssot/ADR-*"
---

# ADR (Architecture Decision Record)

## 작성 트리거
- 기술 스택 선택/변경
- 아키텍처 패턴 결정
- 외부 서비스 연동 방식 결정
- 데이터 모델 중요 결정 (비정규화 등)

## 형식
```markdown
## ADR-XXX: {결정 제목}

### Context
{결정이 필요한 배경}

### Decision
{결정 내용}

### Consequences
- 장점: ...
- 단점: ...
- 대응: ...
```

## 저장 위치
`.timsquad/ssot/ADR-XXX.md`
