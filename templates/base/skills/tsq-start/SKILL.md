---
name: tsq-start
description: |
  TimSquad 파이프라인 시작. 데몬 기동, 프로토콜 활성화, 현재 상태 복원.
  초기화 직후 프로젝트는 자동으로 온보딩 모드 진입 (SSOT 문서 작성 가이드).
  Use when: 사용자가 /tsq-start로 TimSquad 파이프라인을 시작할 때.
version: "2.1.0"
tags: [tsq, pipeline, start, onboarding]
user-invocable: true
---

# /tsq-start — TimSquad Pipeline Start

## Protocol

1. **데몬 기동**: `tsq daemon start 2>/dev/null || true`
2. **현재 Phase 확인**: `.timsquad/state/current-phase.json` 읽기
3. **프로토콜 활성화**: 이후 tsq-protocol 준수, 위임은 controller 경유
4. **상태 복원**: 진행 중인 시퀀스/태스크 요약 출력
5. **온보딩 감지**: SSOT 충족도 검사 → 미충족 시 온보딩 모드
6. **안내 출력**

## 온보딩 감지 (Step 5)

`.timsquad/ssot/`의 `.md` 파일을 스캔하여 작성 완료도 판정:
- **empty**: placeholder만 존재 (50%+)
- **partial**: 일부 섹션만 작성
- **filled**: 주요 섹션 작성 완료

**진입 조건** (하나라도 해당): prd.md가 empty / required 70%+ empty / progress=0

온보딩 시 SSOT 현황을 보여주고 3가지 선택지 제시:
1. 온보딩 시작 (권장) — PRD부터 순서대로
2. 특정 문서만 작성
3. 건너뛰기

## 온보딩 프로세스

**우선순위**: 개발환경(강제) → prd(grill 강제) → Sub-PRD(grill 강제) → requirements → data-design → service-spec

**각 Step의 상세 절차는 `references/onboarding-steps.md`를 Read하여 참조한다.**

| Step | 내용 | 강제 여부 |
|------|------|:---------:|
| 0 | 테스트 프레임워크 설치 | 건너뛸 수 없음 |
| 1 | `/tsq-grill prd` — PRD 심층 인터뷰 | 건너뛸 수 없음 |
| 2 | `/tsq-grill` 반복 — Sub-PRD 작성 | 중단 가능 |
| 3 | 나머지 SSOT 문서 | 선택적 |

타입별 추가 우선 문서는 `references/onboarding-questions.md` 참조.

## 온보딩 완료 후 자동 전환

모든 SSOT 문서 filled + grill.pending 비어있으면:
1. `/tsq-decompose` 자동 안내 (Phase-Sequence-Task 생성)
2. planning.md 확정 후 정상 파이프라인 진행

## 파이프라인 분기

온보딩 완료 + planning.md 확정 후:
- **파이프라인 적합** (새 기능, API, DB, 아키텍처) → controller 경유 위임
- **단순 작업** (오타, 스타일, 1-2줄) → 직접 수행 + 최소 로그
- **모호한 경우** → 사용자에게 선택지 제시
