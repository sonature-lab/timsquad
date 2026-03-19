---
name: tsq-grill
description: |
  소크라틱 심층 인터뷰로 PRD와 Sub-PRD를 작성/보강하는 스킬.
  3모드 자동 분기: PRD 미존재 시 프로젝트 전체 인터뷰, PRD 존재 시 기능별 심층 인터뷰,
  PRD가 있지만 빈 섹션이 있으면 보강 인터뷰.
  프로젝트 시작, 아이디어 구체화, 요구사항 정리가 필요한 모든 순간에 사용한다.
  Use when: "PRD 작성", "기획", "기능 상세화", "요구사항 인터뷰", "PRD 보강", "grill",
  "기능 정의", "Sub-PRD 작성", "기능 스펙 잡기", "프로젝트 정의",
  "뭘 만들지 정리", "아이디어 구체화", "스코프 잡기", "기획서",
  또는 PRD가 없거나, PRD에 빈 섹션이 있거나, 기능 인덱스에 빈 항목이 있을 때.
  새 프로젝트를 시작하거나 기존 프로젝트의 방향을 재정리할 때도 반드시 이 스킬을 사용한다.
version: "2.1.0"
tags: [tsq, prd, interview, grill, requirements]
user-invocable: true
---

# /tsq-grill — 소크라틱 심층 인터뷰

질문을 통해 답을 끌어내는 소크라틱 방법론으로 PRD와 Sub-PRD를 작성한다.
PRD가 부실하면 그 위에 세워지는 모든 것이 부실해진다.

## Mode Detection (자동)

```
.timsquad/ssot/prd.md 존재?
├── NO  → PRD Mode (프로젝트 전체 인터뷰)
└── YES → prd.md에 빈 섹션(TBD, TODO, 빈 테이블)이 있는가?
    ├── YES → PRD Reinforce Mode (빈 섹션 보강 인터뷰)
    └── NO  → Sub-PRD Mode (기능별 인터뷰)
```

명시적 모드: `/tsq-grill prd` | `/tsq-grill sub` | `/tsq-grill` (자동)

## PRD Mode — 프로젝트 전체 인터뷰

PRD가 없거나 프로젝트 초기 단계에서 사용.

**질문 트리는 `references/interview-guide.md`를 Read하여 참조한다.**

### 인터뷰 원칙
- 질문 트리는 **가이드**이지 체크리스트가 아니다
- 이미 답변된 영역은 건너뛴다
- 한 번에 2-3개 질문만. 사용자가 부담을 느끼면 안 된다
- 프로젝트 특성에 맞는 질문을 추가한다

### 진행: Phase 1(비전) → Phase 2(스코프) → Phase 3(성공 지표) → PRD 생성 → 리뷰

PRD 생성 시 `.timsquad/ssot/prd.md`에 구조화:
비전/타겟/시장 → 기능 인덱스 테이블 → 제약사항 → KPI → Anti-scope → TBD

## PRD Reinforce Mode — 기존 PRD 보강

1. prd.md를 읽고 빈 섹션 / TBD 항목 목록을 사용자에게 제시
2. 사용자가 보강할 항목 선택
3. 해당 항목에 대해 소크라틱 인터뷰 진행
4. 결과를 prd.md에 반영
5. 사용자 리뷰 요청 (Human Checkpoint)

## Sub-PRD Mode — 기능별 인터뷰

**질문 트리는 `references/interview-guide.md`를 Read하여 참조한다.**

1. prd.md 기능 인덱스에서 Sub-PRD 미작성 기능 식별
2. 사용자에게 대상 기능 확인
3. Why → What → How 3단계 인터뷰
4. `.timsquad/ssot/prd/[feature].md` 생성
5. prd.md 기능 인덱스 업데이트

## 질문 방식 원칙 (공통)

- **한 번에 질문 2-3개만** — 질문 폭탄은 대충 답하게 만든다
- **답변을 요약해서 확인** — 에이전트 해석이 맞는지 검증
- **모호하면 구체적 예시로 재질문** — "사용자 경험 개선"은 PRD에 쓸 수 없다
- **"모르겠다"도 유효** — TBD로 기록 + 결정 시점 명시
- **가정하지 않는다** — 선택지 제시, 사용자가 고르게 한다

## Output

| Mode | 산출물 |
|------|--------|
| PRD | `.timsquad/ssot/prd.md` + 인터뷰 로그 |
| Reinforce | 보강된 `prd.md` (기존 유지, 빈 섹션만) |
| Sub-PRD | `.timsquad/ssot/prd/[feature].md` + 인덱스 업데이트 |

## Rules

- 사용자 답변을 임의로 해석하지 않는다 — 확인 후 기록
- "아직 모르겠다"는 TBD + 결정 시점 명시
- SSOT 외 파일 수정 금지
- PRD/Sub-PRD 생성 후 반드시 사용자 리뷰 요청 (Human Checkpoint)
