---
title: False Positive Guard
impact: HIGH
tags: audit, false-positive, triage
---

# False Positive Guard

## FP 관리 원칙

- False Positive로 등록된 항목은 재감사 시 자동 제외
- FP 등록 시 반드시 `reason`(근거)과 `verified_by`(검증 방법) 기재
- FP Registry는 프로젝트 단위로 유지, 감사 간 누적

## FP Registry 형식

```markdown
## FP Registry

| ID | 영역 | 항목 | Reason | Verified By | 등록일 |
|----|------|------|--------|-------------|--------|
| FP-001 | Security | SQL Injection in ORM query | ORM이 parameterized query 사용 | 코드 확인 | 2026-03-08 |
| FP-002 | A11y | Missing alt on decorative SVG | 장식용 아이콘, aria-hidden 적용 | axe-core 재검증 | 2026-03-08 |
```

## 계층적 검증 (Layered Verification)

FP 판정 전 3단계 검증을 거쳐 오탐을 최소화한다.

### Layer 1: 자동화 교차 검증
- 단일 도구의 결과만으로 fail 판정하지 않음
- 가능한 경우 2개 이상 도구로 교차 확인
  - 예: eslint-plugin-security + npm audit 동시 플래그 → 높은 신뢰도
  - 예: eslint만 플래그, npm audit 무반응 → FP 후보

### Layer 2: 컨텍스트 분석
- 플래그된 코드의 실제 실행 경로 확인
- 도달 불가능한 코드 경로의 취약점 → FP 후보
- 프레임워크/라이브러리가 이미 방어하는 패턴 → FP 후보
  - 예: ORM의 parameterized query → SQL Injection FP
  - 예: React의 자동 이스케이프 → XSS FP (단, dangerouslySetInnerHTML 제외)

### Layer 3: 수동 확인
- Layer 1, 2를 통과한 FP 후보에 대해 코드를 직접 확인
- 확인 결과를 `reason`에 구체적으로 기술
- 불확실한 경우 FP로 등록하지 않고 `warning`으로 유지

## FP 등록 규칙

### 등록 가능 조건
- 3단계 검증을 모두 통과한 경우
- 구체적 근거를 `reason`에 기술할 수 있는 경우
- 검증 방법을 `verified_by`에 명시할 수 있는 경우

### 등록 불가 조건
- "나중에 확인" 또는 "아마 괜찮을 것" 같은 모호한 근거
- Critical severity 항목 (Critical은 FP 등록 전 반드시 재현 시도)
- 검증 방법을 설명할 수 없는 경우

## FP 만료 정책

| 조건 | 처리 |
|------|------|
| 코드 변경으로 해당 영역 수정됨 | FP 자동 만료 → 재검증 필요 |
| 체크리스트 기준 버전 업데이트 | FP 재검토 필요 |
| 6개월 이상 미검토 | 만료 경고 |

## 보고서 내 FP 표기

FP 항목은 보고서에 별도 섹션으로 표기한다:

```markdown
### False Positives (점수 산출 제외)

| ID | 영역 | 항목 | Reason |
|----|------|------|--------|
| FP-001 | Security | SQL Injection in ORM query | ORM parameterized query 사용 확인 |
```

- FP 항목 수가 전체 항목의 20%를 초과하면 경고
- 이는 체크리스트 자체의 정확도 문제를 시사
