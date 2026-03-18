---
title: Requirements Writing Guide
category: guide
source: internal
---

# Requirements Writing Guide

기능/비기능 요건 정의 및 분류 가이드.

## Classification

| 유형 | 약어 | 설명 |
|------|------|------|
| 기능 요건 | FR | 시스템이 해야 하는 것 |
| 비기능 요건 | NFR | 성능, 보안, 확장성 등 |

## SMART Principles

- **S**pecific — 구체적
- **M**easurable — 측정 가능
- **A**chievable — 달성 가능
- **R**elevant — 관련성 있음
- **T**ime-bound — 기한 있음

## Priority System (MoSCoW)

- **Must** — 반드시 포함
- **Should** — 강력 권장
- **Could** — 있으면 좋음
- **Won't** — 이번에는 제외

## Requirements Table Template

```markdown
| ID | 분류 | 요건 | 우선순위 | 검증 방법 |
|----|-----|-----|---------|----------|
| FR-001 | 인증 | 사용자는 이메일/비밀번호로 로그인할 수 있다 | Must | 테스트 |
| NFR-001 | 성능 | 로그인 응답 시간 < 500ms | Must | 부하 테스트 |
```

## Common Pitfalls

- 검증 불가능한 요건 ("빨라야 한다" → "응답 500ms 이하")
- 우선순위 미지정 → 모든 것이 Must가 됨
- 기능/비기능 미분류 → 비기능 요건 누락
