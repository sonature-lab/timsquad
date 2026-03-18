---
name: tsq-retro
description: |
  피드백 수집, KPT 회고, 개선 적용까지 전체 회고 사이클을 관리하는 스킬.
  Use when: /tsq-retro 호출 시, 피드백 기록 시, Phase 완료 후 회고 시, 패턴 분석 시,
  개선 사항 적용 시, "피드백", "회고", "개선", "retro", "feedback", "improve" 언급 시.
version: "2.0.0"
tags: [tsq, retrospective, feedback, improvement, learning]
user-invocable: true
argument-hint: "[feedback|retro|improve] — 피드백 기록 / KPT 회고 / 개선 적용"
---

# Retrospective Cycle

피드백 수집 → KPT 회고 → 개선 적용의 전체 학습 루프를 관리한다.

## Contract

- **Trigger**: `/tsq-retro`, `/tsq-retro feedback`, `/tsq-retro improve`
- **Input**: 모드에 따라 다름 (아래 Mode 참조)
- **Output**: 피드백 엔트리 / KPT 리포트 / 개선 적용 결과
- **Error**: 데이터 부족 시 수집 가능 범위 안내
- **Dependencies**: tsq-protocol

## Modes

### Mode 1: feedback — 피드백 기록

`/tsq-retro feedback "<메시지>"` 또는 작업 중 이슈 발견 시.

1. **레벨 분류**: 메시지 내용으로 L1/L2/L3 판정
   - **L1 (구현)**: 버그, 코드 품질, 테스트 누락 — 현재 Task에서 바로 수정 가능
   - **L2 (설계)**: 아키텍처 변경, API 재설계, 스키마 수정 — Sequence/Phase 수준 조정 필요
   - **L3 (기획)**: 요구사항 변경, 스펙 모순, 우선순위 재조정 — SSOT 수정 필요
2. **기록**: `.timsquad/retrospective/feedback.jsonl`에 append
   ```json
   {"ts":"ISO8601","level":1,"phase":"P2","message":"...","status":"open"}
   ```
3. **즉시 조치 판단**:
   - L1 → 현재 Task에서 수정 권고 (알림만)
   - L2 → 현재 Sequence 완료 후 Architect 검토 권고
   - L3 → Phase 완료 시 `/tsq-retro`에서 우선 다룸

상세 분류 기준은 `references/feedback-guide.md` 참조.

### Mode 2: retro — KPT 회고 (기본)

`/tsq-retro` 또는 `/tsq-retro retro`. Phase 완료 후 실행 권장.

1. **데이터 수집**:
   - `.timsquad/logs/` — 작업 로그
   - `.timsquad/retrospective/feedback.jsonl` — 수집된 피드백
   - `.timsquad/retrospective/metrics/` — 메트릭
   - `.timsquad/retrospective/patterns/` — 기존 패턴
2. **메트릭 계산**: 작업 수, 성공률, 평균 수정 횟수, 피드백 레벨별 건수
3. **KPT 분석**: Keep / Problem / Try 분류
4. **패턴 식별**: 실패 패턴(FP, 3회+ 반복) / 성공 패턴(SP, 효과 검증)
5. **리포트 작성**: `.timsquad/retrospective/retro-{phase}.md`
6. **개선 제안**: 실행 가능한 액션 아이템 도출 → 사용자 승인 대기
7. **피드백 정리**: 처리된 feedback.jsonl 엔트리를 `status: "resolved"` 처리

리포트 구성: 메트릭 요약 → 에이전트별 성과 → 피드백 분석(L1/L2/L3) → 패턴(FP/SP) → 개선 조치 → 다음 목표.

### Mode 3: improve — 개선 적용

`/tsq-retro improve`. 회고에서 승인된 개선을 실제로 적용.

1. **제안 로드**: 최근 retro 리포트에서 승인된 개선 항목 읽기
2. **대상 분류**: 개선 대상별로 분류
   - **스킬 패치**: SKILL.md 규칙/프로토콜 수정
   - **템플릿 수정**: agent.md, config.yaml 등
   - **패턴 등록**: `.timsquad/retrospective/patterns/` 에 FP/SP 기록
   - **lessons 기록**: `.timsquad/retrospective/lessons.md` 에 학습 사항 append
3. **적용**: 각 대상에 diff 형태로 변경 사항 제시 → 사용자 확인 후 적용
4. **검증**: 변경 후 `npm test` 통과 확인
5. **기록**: 적용된 개선을 lessons.md에 기록, 다음 retro에서 효과 측정

상세 절차는 `references/improve-protocol.md` 참조. 개선 제안 형식은 `references/improvement-template.md` 참조.

## Quick Rules

- **객관적 데이터 우선** — 주관적 평가보다 수치 기반
- **구체적 액션** — "더 잘하자"가 아닌 실행 가능한 행동
- **균형 잡힌 시각** — 문제점만이 아닌 성공 사례도 포함
- **점진적 개선** — 한 번에 대규모 변경보다 작은 개선을 반복
- **사용자 승인 필수** — improve 모드에서 자동 적용 금지, 반드시 확인 후 적용
