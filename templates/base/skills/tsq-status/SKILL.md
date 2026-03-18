---
name: tsq-status
description: |
  프로젝트 현재 상태 확인. Phase, 시퀀스, SSOT, 에이전트 상태를 요약 보고.
  Use when: /tsq-status, "현재 상태", "프로젝트 상태", "어디까지 했나"
version: "1.0.0"
tags: [tsq, status, report]
user-invocable: true
---

# /tsq-status — Project Status Report

## Protocol

1. **Phase 확인**: `.timsquad/state/current-phase.json` 읽기
2. **Phase Memory**: `.timsquad/state/phase-memory.md` 존재 시 carry-over / 주의사항 추출
3. **SSOT 상태**: `.timsquad/ssot/` 디렉토리의 문서 존재/작성 여부 확인
4. **워크플로우 상태**: `.timsquad/state/workflow.json` 읽기 (활성 시퀀스, 완료 Phase)
5. **최근 로그**: `.timsquad/logs/` 에서 최근 활동 요약
6. **세션 메트릭**: `.timsquad/.daemon/session-state.json` 읽기 → tokenInput/tokenOutput/tokenCacheRead 추출
7. **SSOT Drift**: `.timsquad/.daemon/drift-warnings.json` 존재 시 미갱신 문서 목록 추출
8. **요약 출력**:
   ```
   ## Project Status
   - Phase: {current} ({progress}%)
   - SSOT: {filled}/{total} documents
   - Active sequences: {list or none}
   - Carry-over: {items from phase-memory or "none"}
   - Tokens (est): {input + output} (cache hit: {cacheRead / (input + cacheRead) * 100}%)
   - SSOT Drift: {count} documents outdated ({list}) 또는 "none"
   - Last activity: {date — summary}
   ```
