# Improvement Plan — 2026-03-17

Architecture Review 결과 조치가 필요한 2건(#4, #5)에 대한 개선 계획.
Issue #20 (스킬 주도 파이프라인 안정화) Phase 1 단순화와 연계.

## 개요

| 작업 | 대상 | 방향 | 영향 범위 | 난이도 |
|------|------|------|----------|--------|
| A | Feedback Routing 데드코드 삭제 | ~900줄 유휴 코드/문서 제거 | 코드 + 문서 + 타입 | 낮음 |
| B | tsq-audit / tsq-review 통합 | 2개 스킬 → 1개 통합 스킬 | 스킬 + config + 테스트 | 중간 |

---

## 작업 A: Feedback Routing 데드코드 삭제

### 배경

System A(Feedback Routing)는 설계만 되고 6개월+ 미구현 상태.
System B(Event Triggers)가 실제 동작 중이며, 필요 시 나중에 다시 설계하는 게 나음.

### 삭제 대상

| 파일 | 줄 수 | 조치 |
|------|-------|------|
| `templates/base/timsquad/feedback/routing-rules.yaml` | 353 | 파일 삭제 |
| `templates/base/timsquad/feedback/` | 디렉토리 | 빈 디렉토리면 삭제 |
| `src/lib/feedback-utils.ts` | 83 | 파일 삭제 |
| `src/types/feedback.ts` | 166 | 사용 중인 타입만 잔류, 나머지 삭제 |
| `docs/feedback-and-retrospective.md` | 285 | System A 섹션 삭제, System B(Event) 내용만 유지 |

### 단계

1. **의존성 확인**: `feedback-utils.ts`와 `feedback.ts`의 import/export 사용처 grep
2. **타입 정리**: `FeedbackEntry`, `FeedbackLevel` 등 event-queue.ts에서 실제 사용하는 타입만 남기고 `FeedbackRoutingRules`, `FeedbackTrigger`, `ClassificationResult` 등 삭제
3. **파일 삭제**: routing-rules.yaml, feedback-utils.ts
4. **문서 정리**: feedback-and-retrospective.md에서 System A 관련 섹션 제거
5. **테스트 확인**: 관련 테스트 있으면 제거, `npm test` 통과 확인
6. **export 정리**: `src/types/index.ts`에서 불필요한 re-export 제거

### 검증

```bash
npm test                          # 전체 테스트 통과
grep -r "classifyFeedback" src/   # 0 결과
grep -r "routing-rules" .         # 0 결과
grep -r "FeedbackRoutingRules" .  # 0 결과
```

---

## 작업 B: tsq-audit / tsq-review 통합

### 배경

두 스킬이 동일한 4-6가지 검증 관점(보안, 호환성, 에지, 성능)을 수행하며
차이는 "자기감사 vs 교차리뷰" 트리거 조건뿐. 사용자 혼동 유발.

### 통합 방향

**유지**: `tsq-audit` (이름, `/audit` 슬래시 커맨드)
**삭제**: `tsq-review` (디렉토리 + 관련 참조)
**통합 후 tsq-audit 역할**: 자기감사 + 교차리뷰 통합. mode 파라미터로 구분.

### 통합 후 tsq-audit 구조

```
tsq-audit/
  SKILL.md          # 통합된 감사/리뷰 스킬
```

SKILL.md 변경사항:
- description에 "코드 리뷰" 트리거 추가 ("Use when: 변경사항 감사, 코드 리뷰, PR 리뷰 시")
- Protocol에 mode 분기 추가:
  - 기본(self-audit): 변경 파일 기반 스킬 Verification 자동 실행
  - review mode: fork context에서 읽기 전용 교차 검증
- tsq-review 고유 기능 (있다면) 흡수

### 단계

1. **tsq-review SKILL.md 분석**: tsq-audit에 없는 고유 기능 식별
2. **tsq-audit SKILL.md 수정**: description, Protocol에 리뷰 기능 통합
3. **tsq-review 디렉토리 삭제**
4. **참조 업데이트**:
   - `src/types/config.ts` — CORE_SKILLS, SKILL_MAP에서 tsq-review 제거
   - `src/lib/agent-generator.ts` — reviewer 에이전트의 skills 참조 변경
   - `templates/base/agents/` — reviewer 에이전트가 tsq-review 참조하면 tsq-audit으로 변경
5. **Controller 스킬 업데이트**: Delegation Rules에서 Reviewer → tsq-audit 참조
6. **테스트 수정**: tsq-review 관련 테스트 업데이트
7. **검증**: `npm test` 통과

### 검증

```bash
npm test                          # 전체 테스트 통과
ls templates/base/skills/tsq-review  # 존재하지 않음
grep -r "tsq-review" templates/   # 0 결과
grep -r "tsq-review" src/         # 0 결과
```

---

## 실행 순서

```
A (데드코드 삭제) → B (스킬 통합) → npm test → 커밋
```

A를 먼저 실행하는 이유:
- 독립적이고 단순함 (삭제만)
- B에 영향 없음
- 코드베이스 정리 후 B 작업이 깔끔해짐

## 리스크

| 리스크 | 확률 | 완화 |
|--------|------|------|
| feedback.ts 타입이 다른 곳에서 사용 | 낮음 | grep으로 사전 확인 |
| tsq-review 고유 기능 누락 | 낮음 | SKILL.md 비교 후 통합 |
| reviewer 에이전트 동작 변경 | 중간 | agent-generator.ts 참조 갱신 확인 |

## 완료 기준

- [x] ~900줄 데드코드 삭제 완료 (routing-rules.yaml, feedback-utils.ts 삭제, feedback.ts 69줄로 정리)
- [x] tsq-audit / tsq-review → tsq-audit 단일 스킬로 통합 (tsq-review 삭제, 참조 0건)
- [x] 전체 테스트 통과 (636 tests)
- [x] SDCA 문서 반영
- [x] 스프린트 커밋에 포함 (2026-03-17)
