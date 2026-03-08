---
name: retrospective
description: |
  회고 분석, 패턴 식별, 개선 제안 가이드라인.
  Use when: tsq retro 명령 실행 시, Phase 완료 후 회고 수집 시, 패턴 분석이 필요할 때,
  KPT 프레임워크로 피드백 정리할 때, 메트릭 기반 개선 방안을 도출할 때.
version: "1.0.0"
tags: [retrospective, analysis, improvement]
user-invocable: false
---

# Retrospective

프로젝트 회고를 위한 분석 프레임워크와 개선 프로세스.

## TSQ CLI 사용

로그, 피드백, 메트릭, 회고는 CLI 커맨드를 사용한다.
직접 파일을 조작하면 구조화된 데이터가 깨질 수 있다.

| 시점 | 커맨드 |
|-----|--------|
| 회고 시작 | `tsq retro start` |
| Phase별 회고 | `tsq retro phase {phase}` |
| 메트릭 수집 | `tsq retro collect` 또는 `tsq metrics collect` |
| 로그 확인 | `tsq log list` / `tsq log today` |
| 리포트 생성 | `tsq retro report` (GitHub Issue 포함) |
| 로컬 리포트만 | `tsq retro report --local` |
| 사이클 완료 | `tsq retro apply` |

## 데이터 소스

| 경로 | 내용 |
|------|------|
| `.timsquad/retrospective/metrics/` | 메트릭 데이터 |
| `.timsquad/logs/` | 작업 로그 |
| `.timsquad/retrospective/patterns/` | 기존 패턴 |

## KPT 프레임워크

- **Keep**: 무엇이 잘 되었나? 계속해야 할 것은?
- **Problem**: 무엇이 문제였나? 장애물은?
- **Try**: 다음에 시도해볼 것은?

## 패턴 분류

- **실패 패턴 (FP)**: 3회 이상 반복, 작업 지연 유발, 품질 저하 원인
- **성공 패턴 (SP)**: 효과 검증됨, 효율성 향상, 품질 향상

## 메트릭

| 메트릭 | 계산 방법 |
|-------|----------|
| 작업 수 | 완료된 작업 개수 |
| 성공률 | (성공 작업 / 전체 작업) x 100 |
| 평균 수정 횟수 | 총 수정 횟수 / 작업 수 |

## 리포트 구성

1. 메트릭 요약
2. 에이전트별 성과
3. 피드백 분석
4. 발견된 패턴
5. 개선 조치
6. 다음 사이클 목표

## 원칙

- **객관적 데이터 우선** — 주관적 평가보다 수치 기반. 데이터가 있어야 개선 효과를 측정할 수 있다.
- **구체적 예시** — 추상적 서술 지양. "더 잘하자"가 아닌 실행 가능한 액션.
- **균형 잡힌 시각** — 문제점만이 아닌 성공 사례도 포함.

## 개선 적용 흐름

제안된 개선 → 사용자 검토/승인 → SKILL.md 업데이트 → 템플릿 업데이트 → lessons.md 기록 → 다음 사이클에서 효과 측정

개선 제안 형식은 `references/improvement-template.md` 참조.
