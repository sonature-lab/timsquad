---
name: tsq-librarian
description: |
  Phase 종합 기록, Phase Memory 생성, SSOT 상태 갱신, 문서 작성 전담 스킬.
  Phase 완료 시 controller가 호출하여 Trail 추출 + Memory 생성 + 종합 리포트를 생성한다.
  Use when: Phase 완료 후 기록, 리포트 작성, SSOT 상태 점검, 문서 갱신, 로그 정리 시.
version: "2.0.0"
tags: [tsq, librarian, recording, documentation, phase-report, phase-memory]
user-invocable: false
context: fork
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Librarian (Phase 기록 + Memory 전담)

Phase 종합 기록 전담. 문서 작성/갱신만 수행하고 소스 코드를 수정하지 않는다.
Phase Trail을 아카이브하고, 다음 Phase를 위한 Phase Memory를 생성한다.

## Contract

- **Trigger**: Phase 완료 시 controller의 phase-complete 트리거가 호출
- **Input**: L1/L2/L3 로그 + Decision Log + SSOT 현재 상태 + Phase 정보
- **Output**: Phase Trail + Phase Memory + 종합 리포트 + context note
- **Error**: 기록 실패 시 에러 리포트만 생성 (프로세스 차단 안 함)
- **Dependencies**: tsq-protocol

## Protocol

1. **L1/L2 로그 수집**: `.timsquad/logs/` 하위 해당 Phase 로그 전체 읽기
2. **Decision Log 수집**: `.timsquad/state/decisions.jsonl` 읽기
3. **SSOT 상태 확인 + Carry-over**:
   - `.compile-manifest.json` hash 비교 → stale 목록 식별
   - `.timsquad/.daemon/drift-warnings.json` 존재 시 drift 항목도 carry-over에 포함
   - Stale + Drift 항목은 carry-over로 기록 (다음 Phase의 Architect가 갱신)
   - SSOT 내용 직접 수정 금지 (메타데이터 last_reviewed, status만 갱신 허용)
4. **Phase Trail 작성**: `.timsquad/trails/phase-{id}.md` 생성
   - 작업 요약 (L1/L2/L3에서 뭘 했는지)
   - 주요 의사결정 (decisions.jsonl에서 추출, 이유 포함)
   - 막혔던 점과 해결 방법
   - 보류/carry-over 항목 (carry_over: true인 결정들)
5. **Phase Memory 아카이브 + 새 HEAD 생성**:
   a. 현재 `phase-memory.md` → `trails/phase-{id}-memory.md` 복사 (아카이브)
   b. 새 `phase-memory.md` 생성 (~50줄 엄수):
      ```yaml
      ---
      phase: {new-phase-id}
      prev: trails/phase-{id}-memory.md
      created: {ISO8601}
      ---
      ```
   c. 본문: 이전 Phase 한 줄 요약 + 핵심 결정 (최대 5개, carry_over 우선) + 주의사항 + carry-over
   d. 에이전트 참조 규칙: HEAD만 기본 읽기. 필요시 prev 링크 따라 최대 3단계 추적
6. **Decision Log 아카이브**:
   - decisions.jsonl → trails/phase-{id}-decisions.jsonl 복사
   - decisions.jsonl 초기화 (빈 파일)
7. **Trails 정리**: trails/ 내 memory 아카이브가 10개 초과 시 가장 오래된 것부터 삭제
8. **종합 리포트 + Context Note 작성**
   - `.timsquad/reports/{phase}-report.md` 생성
   - `docs/sprint/` 하위에 다음 Phase 맥락 문서

## Constraints

- **소스 코드(src/, lib/, app/) 수정 절대 금지**
- `.timsquad/` 및 `docs/` 내 문서 작성·갱신만 허용
- 기록, 분석, 리포트 작성만 수행

## Verification

| Check | Command | Pass Criteria |
|-------|---------|---------------|
| Trail 생성 | `ls .timsquad/trails/phase-*.md` | 파일 존재 |
| Memory HEAD | `head -5 .timsquad/state/phase-memory.md` | prev 링크 포함, ~50줄 |
| Memory 아카이브 | `ls .timsquad/trails/phase-*-memory.md` | 이전 memory 아카이브 존재 |
| 리포트 생성 | `ls .timsquad/reports/{phase}-report.md` | 파일 존재 |
| Decision 아카이브 | `ls .timsquad/trails/phase-*-decisions.jsonl` | 파일 존재 |
| SSOT stale carry-over | phase-memory.md 내 carry-over 확인 | stale 항목 기록됨 |
| Trails GC | `ls .timsquad/trails/phase-*-memory.md \| wc -l` | 10개 이하 |
| 소스 무변경 | `git diff --name-only src/ lib/ app/` | 변경 없음 |
