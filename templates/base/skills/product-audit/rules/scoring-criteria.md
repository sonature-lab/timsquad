---
title: Scoring Criteria
impact: HIGH
tags: audit, scoring, metrics
---

# Scoring Criteria

## 스코어링 원칙

- **정량 70% + 정성 30%** 가중 평균
- 정량: 자동화 도구 결과, 메트릭 측정값 (source: measured)
- 정성: 코드 리뷰, 설계 판단 (source: estimated)
- 모든 점수는 0-100 스케일

## 영역별 기본 가중치

| # | 영역 | 기본 가중치 | 조정 범위 |
|---|------|:---------:|:---------:|
| 01 | Security | 25% | 15-35% |
| 02 | Performance | 15% | 10-25% |
| 03 | SEO | 10% | 5-15% |
| 04 | Accessibility | 10% | 5-20% |
| 05 | UI/UX | 10% | 5-15% |
| 06 | Architecture & DB | 15% | 10-25% |
| 07 | Functional & Requirements | 15% | 10-25% |
| | **합계** | **100%** | |

## 프로젝트 타입별 가중치 프리셋

### Web Service (기본)
기본 가중치 그대로 사용.

### Fintech / Healthcare
| 영역 | 가중치 |
|------|:------:|
| Security | 35% |
| Performance | 10% |
| SEO | 5% |
| Accessibility | 10% |
| UI/UX | 5% |
| Architecture & DB | 20% |
| Functional & Requirements | 15% |

### E-commerce
| 영역 | 가중치 |
|------|:------:|
| Security | 20% |
| Performance | 20% |
| SEO | 15% |
| Accessibility | 10% |
| UI/UX | 15% |
| Architecture & DB | 10% |
| Functional & Requirements | 10% |

### Internal Tool / Admin
| 영역 | 가중치 |
|------|:------:|
| Security | 20% |
| Performance | 10% |
| SEO | 5% |
| Accessibility | 10% |
| UI/UX | 10% |
| Architecture & DB | 20% |
| Functional & Requirements | 25% |

## 영역별 점수 산출

### 산출 공식

```
영역 점수 = (통과 항목 수 / 적용 항목 수) × 100
```

- `skip` 항목은 적용 항목에서 제외
- `warning` 항목은 0.5점 (pass = 1점, fail = 0점)
- FP Registry 등록 항목은 적용 항목에서 제외

### Severity 가중 감점

fail 항목은 severity에 따라 추가 감점:

| Severity | 감점 배수 |
|----------|:---------:|
| Critical | ×3 |
| High | ×2 |
| Medium | ×1 |
| Low | ×0.5 |

### 종합 점수 산출

```
종합 점수 = Σ(영역 점수 × 영역 가중치)
```

## Gate 기준

| 조건 | 기준 | 미충족 시 |
|------|:----:|-----------|
| Critical 항목 | 0건 | gate 차단 (점수 무관) |
| 종합 점수 | >= 60점 | gate 차단 |
| PASS→FAIL 전환 | 0건 | gate 차단 (재감사 시) |
| estimated 비율 | < 50% | 경고 (차단 아님) |

## 등급 분류

| 등급 | 점수 범위 | 의미 |
|:----:|:---------:|------|
| A | 90-100 | 우수 — 릴리스 가능 |
| B | 75-89 | 양호 — 경미한 개선 권장 |
| C | 60-74 | 보통 — gate 통과, 개선 필요 |
| D | 40-59 | 미흡 — gate 차단, 개선 필수 |
| F | 0-39 | 불합격 — 심각한 문제 존재 |
