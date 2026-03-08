---
title: Audit Protocol
impact: HIGH
tags: audit, protocol, process
---

# Audit Protocol — 6단계 상세 절차

## Phase 1: Plan (감사 계획)

### 입력
- 프로젝트 코드베이스
- 이전 감사 리포트 (재감사 시)
- FP Registry (존재 시)

### 절차

1. **범위 결정**: 감사 대상 디렉토리, 모듈, 페이지 식별
2. **영역 선택**: 7개 영역 중 대상 선택 (전체 또는 부분)
3. **가중치 조정**: 프로젝트 타입에 따라 `scoring-criteria.md`의 가중치 조정
4. **기준 확인**: 각 영역의 체크리스트 버전 및 적용 기준 확인
5. **계획서 작성**: 아래 형식으로 작성

```markdown
## Audit Plan

- **일시**: {날짜}
- **범위**: {대상 모듈/페이지}
- **영역**: {선택된 영역 목록}
- **가중치**: {영역별 가중치}
- **도구**: {사용할 자동화 도구}
- **기준**: {gate 통과 기준}
```

6. **유저 컨펌**: 계획서를 유저에게 제시하고 승인 받은 후 진행

### 출력
- 승인된 감사 계획서

## Phase 2: Audit (감사 실행)

### 절차

1. **자동화 감사 실행** (가능한 영역)

| 영역 | 도구 | 측정 대상 |
|------|------|-----------|
| Security | eslint-plugin-security, npm audit, Snyk | 코드 패턴, 의존성 취약점 |
| Performance | Lighthouse, bundlesize | CWV, 번들 크기 |
| SEO | Lighthouse SEO, structured data validator | SEO 점수, 스키마 |
| Accessibility | axe-core, Lighthouse a11y | WCAG 위반 |
| Functional | test runner (vitest, jest, playwright) | 커버리지, 통과율 |

2. **수동 감사 실행** (자동화 불가 영역)

| 영역 | 방법 |
|------|------|
| UI/UX | Nielsen Heuristic 기반 코드 리뷰 |
| Architecture | 코드 구조, 의존성 그래프, 데이터 흐름 분석 |
| Requirements | 요구사항 ↔ 구현 ↔ 테스트 추적 |

3. **항목별 판정**

| 판정 | 의미 |
|------|------|
| pass | 기준 충족 |
| fail | 기준 미달 — severity 부여 |
| warning | 권고 사항 — 즉시 수정 불필요 |
| skip | 해당 없음 (근거 기재 필수) |

4. **source 명시**: 모든 항목에 `estimated` 또는 `measured` 표기

## Phase 3: Report (보고)

### 절차

1. 영역별 점수 산출 (`scoring-criteria.md` 기준)
2. 가중 평균으로 종합 점수 계산
3. Finding을 severity별 분류
4. 이전 감사 대비 diff 생성 (재감사 시)
5. `templates/report-template.md` 형식으로 보고서 작성

### 보고서 품질 기준
- `source` 필드 없는 항목 → 검증 실패
- `estimated` 비율 50% 초과 → 경고
- FP Registry 항목은 점수 산출에서 제외

## Phase 4: Remediation Plan (개선 계획)

### 절차

1. Finding을 severity 기준 내림차순 정렬
2. 각 finding에 대해:
   - 원인 분석
   - 수정 방법 제안 (코드 diff 포함)
   - 예상 영향 범위
   - 관련 테스트 식별
3. `templates/improvement-plan-template.md` 형식으로 작성
4. **유저 컨펌 필수** — 컨펌 없이 개선 실시 금지

### 우선순위 원칙
- Critical → 현재 Phase 내 즉시 수정
- High → 현재 Phase 내 수정
- Medium → 백로그 등록
- Low → 선택적

## Phase 5: Fix (개선 실시)

### 절차

1. 컨펌된 계획서의 항목을 순서대로 수정
2. 각 수정 후:
   - 관련 단위 테스트 실행
   - 수정이 다른 영역에 영향을 줄 경우 통합 테스트 실행
3. 전체 수정 완료 후:
   - 전체 테스트 스위트 실행 (unit + integration)
   - E2E 테스트 실행
4. 테스트 실패 시 → 수정 반복
5. 모든 테스트 통과 → Phase 6 진행

## Phase 6: Re-audit (재감사)

### 절차

1. Phase 2와 동일한 감사 절차 실행
2. 이전 결과와 항목별 diff 비교:
   - `FAIL → PASS`: 개선됨
   - `PASS → PASS`: 유지됨
   - `PASS → FAIL`: 회귀 — 즉시 대응
   - `FAIL → FAIL`: 미해결 — 원인 재분석
3. Gate 기준 충족 여부 판정:
   - 종합 점수 >= 60점
   - Critical 항목 0건
   - PASS→FAIL 전환 0건
4. Gate 통과 → 감사 완료
5. Gate 미통과 → Phase 4로 복귀
