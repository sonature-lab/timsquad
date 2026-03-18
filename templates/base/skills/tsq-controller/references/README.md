---
title: Controller References
category: reference
---

# Controller References

이 디렉토리에는 `tsq compile`로 생성된 에이전트용 spec 파일이 위치합니다.

## 사용법

```bash
tsq compile        # SSOT → spec 컴파일
tsq compile status # stale 상태 확인
```

## 파일 구조

컴파일 후 생성되는 파일 예시:

```
references/
├── 2-1-로그인.spec.md        ← service-spec.md#2.1 로그인
├── 2-2-토큰-갱신.spec.md     ← service-spec.md#2.2 토큰 갱신
├── error-codes.spec.md       ← error-codes.md (전체)
└── users.spec.md             ← data-design.md#Users
```

각 파일에는 source marker가 포함되어 원본 추적이 가능합니다:

```html
<!-- source: ssot/service-spec.md#POST-auth-login -->
<!-- ssot-hash: a3f2b1c0 -->
<!-- compiled: 2026-02-18T10:30:00Z -->
```
