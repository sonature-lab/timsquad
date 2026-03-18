# Architecture Review — 2026-03-17

6건의 아키텍처 이슈를 코드 기반으로 검증한 결과.

## 검증 결과 요약

| # | 이슈 | 판정 | 조치 |
|---|------|------|------|
| 1 | SSOT 4-Tier 미구현 | **철회** — 4-Tier 전체 구현 확인 | 없음 |
| 2 | Daemon 가치 | **문제 없음** — Controller(동기) / Daemon(비동기) 역할 분리 명확 | 없음 |
| 3 | Phase Gate fail 전략 | **문제 없음** — fail-open(안정) + fail-closed(무결성) 혼합 전략 의도적 | 없음 |
| 4 | Feedback Routing 데드코드 | **완료** — ~900줄 유휴 코드/문서 삭제 | routing-rules.yaml, feedback-utils.ts 삭제, feedback.ts 정리 |
| 5 | tsq-audit / tsq-review 중복 | **완료** — tsq-audit으로 통합 | tsq-review 삭제, 참조 0건 확인 |
| 6 | Librarian 필요성 | **문제 없음** — Controller(오케스트레이션) / Librarian(기록) 분리 최적 | 없음 |

---

## #1. SSOT 4-Tier — 철회

**초기 판단**: T0만 구현, T1~T3 80% 미사용
**재검증 결과**: 4-Tier 전체 코드 구현 확인

- `src/types/ssot-map.ts` — 4개 tier 타입 완비
- `src/lib/ssot-map.ts` — `loadSSOTMap`, `getDocumentsForTier`, `getDocumentsForScope`, `validateSSOTMap`
- `src/lib/compiler.ts:389-413` — Tier 0 → rules/ 배치 (hook inject용)
- `ssot-map.ts:49-71` — `getDocumentsForScope('phase'|'sequence'|'task')` tier 1~3 누적 반환
- `daemon/event-queue.ts:413` — SSOT 변경 시 자동 recompile

T0는 hook 자동 주입, T1~T3는 controller `getDocumentsForScope()` 호출로 scope별 선택 주입. 의도된 설계.

---

## #2. Daemon 가치 — 문제 없음

| Controller (동기, 필수) | Daemon (비동기, 옵션) |
|---|---|
| 프로세스 강제, Gate 차단 | L1/L2/L3 로그 자동 생성 |
| Completion Report 검증 | git diff 자동 수집 |
| Capability Token 발급/회수 | 메타인덱스 인메모리 캐시 |
| 실패 = 작업 중단 | 실패 = 로그만 누락 |

Daemon 고유 기능 (대체 불가):
- L1/L2/L3 JSON 자동 생성 (수동 시 운영비 증가)
- 메타인덱스 인메모리 유지 (디스크 검색 대비 성능)
- SSOT 변경 감지 → 자동 recompile

데몬 역할 정리 완료:
- event-queue.ts 489→186줄 축소 (sequence-complete, phase-complete 핸들러 제거)
- Daemon = L1 생성 + Decision Log 수집 + SSOT recompile + 메타인덱스
- Controller = 유일한 workflow 진행자 (gate 판정, phase transition)
- Decision Log + Phase Memory 시스템 도입 (4계층 메모리)

---

## #3. Phase Gate — 문제 없음

7개 Hook의 fail 전략:

| Hook | 이벤트 | 전략 | 동작 |
|------|--------|------|------|
| phase-guard.sh | PreToolUse(Write/Edit) | Fail-closed | Phase 위반 시 deny |
| check-capability.sh | PreToolUse(Write/Edit) | Fail-closed | 범위 밖 파일 deny |
| safe-guard.sh | PreToolUse(Bash) | Fail-closed | 파괴적 명령 deny/ask |
| completion-guard.sh | Stop | Fail-closed | 테스트 미실행 block |
| build-gate.sh | Stop | Fail-closed | TS 에러 block |
| context-restore.sh | SessionStart | Fail-open | 복원 실패 시 silent |
| pre-compact.sh | PreCompact | Fail-open | 저장 실패 시 진행 |

Fail-open: 입력 없음/파일 미존재 등 시스템 오류 → allow (안정성)
Fail-closed: 정책 위반 → deny/block (무결성)

의도적 혼합 전략. Stop hook은 `stop_hook_active` 플래그로 무한루프 방지.

---

## #4. Feedback Routing 데드코드 — 완료

**조치 완료** (2026-03-17):
- `routing-rules.yaml` (353줄) 삭제
- `feedback-utils.ts` (83줄) 삭제
- `feedback.ts` 166줄 → 69줄 (실사용 타입만 잔류)
- `feedback/` 디렉토리 삭제
- `feedback-and-retrospective.md` System A 섹션 정리

검증: `grep -r "classifyFeedback\|routing-rules\|FeedbackRoutingRules" src/` → 0 결과

---

## #5. tsq-audit / tsq-review 중복 — 완료

**조치 완료** (2026-03-17):
- `tsq-review` 디렉토리 삭제
- `tsq-audit`에 리뷰 기능 통합 (self-audit + cross-review mode)
- config.ts, agent-generator.ts 참조 정리

검증: `grep -r "tsq-review" src/ templates/` → 0 결과

---

## 검증 방법

- 서브에이전트 5개 병렬 투입 (Explore, very thorough)
- 각 에이전트가 관련 소스코드, 스킬, 타입, 테스트, 문서를 교차 확인
- #1은 직접 compiler.ts, ssot-map.ts, ssot-map.template.yaml 코드 리딩으로 재검증
