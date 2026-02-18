---
title: Controller Rules
category: guide
---

# Controller Rules

이 디렉토리에는 `tsq compile`로 생성된 제약 규칙 파일이 위치합니다.

## 파일 구조

```
rules/
├── completion-criteria.md     ← requirements.md에서 컴파일
└── security-constraints.md    ← security-spec.md에서 컴파일 (Level 3)
```

이 파일들은 controller가 서브에이전트에게 "무엇을 지켜야 하는지" 주입할 때 사용됩니다.
