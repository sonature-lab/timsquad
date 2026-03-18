---
name: tsq-grill
description: |
  Sub-PRD 작성/보강을 위한 소크라틱 심층 인터뷰 스킬.
  기능별 Why/What/How를 체계적으로 파고들어 모호한 요구사항을 구체화.
  Use when: "기능 상세화", "요구사항 인터뷰", "PRD 보강", "grill", "기능 정의",
  "Sub-PRD 작성", "기능 스펙 잡기", 또는 PRD 기능 인덱스에 빈 항목이 있을 때.
version: "1.0.0"
tags: [tsq, prd, interview, grill, requirements]
user-invocable: true
---

# /tsq-grill — 소크라틱 심층 인터뷰

PRD의 기능을 하나씩 깊이 파고들어 Sub-PRD를 작성하거나 보강하는 스킬.
"질문을 통해 답을 끌어낸다"는 소크라틱 방법론을 따른다.

## When to Use

- 새 기능의 Sub-PRD를 처음 작성할 때
- 기존 Sub-PRD의 빈 섹션을 채울 때
- 모호한 요구사항을 구체화해야 할 때
- PRD 기능 인덱스에 Link가 비어있을 때

## Process

### Phase 1: 대상 선정

1. `.timsquad/ssot/prd.md`의 기능 인덱스 테이블 읽기
2. Sub-PRD가 없거나 빈 기능 식별
3. 사용자에게 인터뷰 대상 기능 확인 (복수 선택 가능)

### Phase 2: 디자인 트리 인터뷰

기능마다 3단계 깊이로 질문한다. 한 번에 2-3개 질문, 답변 받으면 다음 깊이로.

```
Why (목적)
├── 이 기능이 없으면 사용자에게 어떤 문제가 생기나?
├── 핵심 사용자 시나리오는?
└── 성공을 어떻게 측정하나?

What (범위)
├── Must-Have vs Nice-to-Have 경계는?
├── 이 기능이 다루지 않는 것은?
├── 어떤 데이터가 필요하고 어디서 오나?
└── 기존 시스템과 연동 포인트는?

How (설계)
├── 사용자 흐름 (Happy Path → Exception Path)?
├── 상태 전환이 있다면?
├── 에러 케이스와 처리 방식은?
└── 성능/보안 고려사항은?
```

질문 방식 원칙:
- 한 번에 질문 2-3개만 (과부하 방지)
- 사용자 답변을 요약해서 확인받기 ("~라는 뜻이 맞나요?")
- 모호한 답변에는 구체적 예시로 재질문
- "모르겠다"는 답변도 유효 — 결정 보류로 기록

### Phase 3: Sub-PRD 생성

인터뷰 결과를 `.timsquad/ssot/prd/[feature].md`로 구조화:

1. `ssot/prd/_template.md` 복사
2. 인터뷰 답변으로 각 섹션 채우기
3. Mapped Artifacts는 빈 링크로 두되 구조 유지
4. 설계 결정 테이블에 인터뷰 중 나온 선택지/결정 기록

### Phase 4: PRD 인덱스 업데이트

`prd.md`의 기능 인덱스 테이블에 새 Sub-PRD 링크 추가.

## Output

- `.timsquad/ssot/prd/[feature].md` — Sub-PRD 파일
- `prd.md` 기능 인덱스 업데이트
- 인터뷰 로그: `.timsquad/logs/grill-[feature]-[date].md`

## Rules

- 사용자 답변을 임의로 해석하지 않는다 — 확인 후 기록
- "아직 모르겠다"는 TBD로 표시하되, 결정이 필요한 시점을 명시
- SSOT 외 파일 수정 금지
- Sub-PRD 생성 후 사용자에게 리뷰 요청 (Human Checkpoint)
