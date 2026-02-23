# TimSquad v3.4 프로세스 파이프라인 안정성 보고서

**일자**: 2026-02-23
**버전**: v3.4.0
**범위**: 22개 CLI 커맨드 + 데몬 프로세스 + 훅 파이프라인
**방법**: 8가지 정적/구조 분석 (독포딩 제외)

---

## 종합 판정: STABLE (조건부)

현재 코드베이스는 **운영 안정성 충분**, 단 장기적으로 개선해야 할 구조적 리스크 5건 존재.

**기본 지표**:
- tsc (strict): 0 에러
- Unit tests: 537 passed (12 suites)
- npm audit (prod): 0 취약점
- Build: OK

---

## 검증 방법론 (8가지)

| # | 검증 | 도구/방법 | 대상 |
|---|------|-----------|------|
| V1 | Type Safety 강화 | `tsc --exactOptionalPropertyTypes` | 타입 미스매치 |
| V2 | Floating Promises | 코드 분석 | fire-and-forget async |
| V3 | Circular Dependencies | `madge --circular` | 순환 참조 |
| V4 | Dependency Audit | `npm audit` | 취약점 |
| V5 | Error Swallowing | 코드 분석 | 빈 catch 블록 |
| V6 | Complexity Metrics | CC 계산 | 고위험 파일 |
| V7 | Race Condition / TOCTOU | 코드 분석 | 동시성 버그 |
| V8 | Fault Injection 정적 분석 | 코드 분석 | 장애 시나리오 |

---

## V1. Type Safety — `--exactOptionalPropertyTypes`

| 결과 | 상세 |
|------|------|
| **10개 타입 미스매치** | `strict: true` 통과하지만 더 엄격한 모드에서 발견 |

**Critical (데몬 경로)**:
- `daemon/entry.ts:17` — `jsonlPath: string | undefined`를 `string`에 전달
- `daemon/index.ts:253` — `baseline: undefined`를 `SubagentBaseline`에 할당
- `daemon/event-queue.ts:98` — `detail: string | undefined`를 `string`에 할당

**Non-critical**: init.ts, config.ts, log.ts, compiler.ts, meta-index.ts, ui-parser.ts, agent-generator.ts

**위험도**: **LOW** — 현재 `tsc --strict`에서 0 에러. `exactOptionalPropertyTypes`는 향후 tsconfig에 추가 권장.

---

## V2. Floating Promises — 비동기 race condition

| 결과 | 상세 |
|------|------|
| **1개 확인된 fire-and-forget** | `meta-cache.ts:248` |

```typescript
// meta-cache.ts:248
this.onNotify(event, req.params || {});  // async 함수지만 await 없음
```

`onNotify`는 `daemon/index.ts:102`에서 `async` 함수로 바인딩됨. IPC가 `{ ok: true }` 즉시 반환 → 실제 처리는 백그라운드.

**영향**: 두 IPC 알림이 빠르게 연속 도착 시 `updateSessionState()`의 read-modify-write가 race → 메트릭 카운터 유실 가능.

**위험도**: **MEDIUM** — 데이터 손실(메트릭 카운터) 가능하지만, 크래시는 아님.

---

## V3. Circular Dependencies — `madge`

| 결과 | 상세 |
|------|------|
| **2개 순환 참조** | agent-generator ↔ skill-generator ↔ template |

```
1) lib/agent-generator.js → lib/skill-generator.js → lib/template.js
2) lib/skill-generator.js → lib/template.js
```

**위험도**: **LOW** — 현재 함수 호출이 모듈 초기화 후 발생하므로 ESM 순서 문제 없음.

---

## V4. Dependency Audit — `npm audit`

| 결과 | 상세 |
|------|------|
| **15개 취약점** (9 high, 6 moderate) | **전부 devDependencies** |
| **프로덕션**: 0 취약점 | `npm audit --omit=dev` 통과 |

**위험도**: **NONE** (프로덕션).

---

## V5. Error Swallowing 분석

| 결과 | 상세 |
|------|------|
| **102개** 빈 catch 블록 | 분류: 의도적 85%, 위험 15% |

**위험 사례**:
- `event-queue.ts:226` — L2 시퀀스 로그 생성 실패 시 무음 (주석과 실제 불일치)
- `event-queue.ts:264` — phase-gate 로직 전체가 빈 catch에 감싸임
- `event-queue.ts:296` — phase 완료 후 상태 저장 실패 시 무음

**위험도**: **LOW-MEDIUM** — 자동화 파이프라인(L2/L3 로그)이 실패해도 알림 없음.

---

## V6. Complexity Metrics

| 파일 | CC | Lines | 위험 |
|------|-----|-------|------|
| `commands/log.ts` | **275** | 1632 | HIGH |
| `commands/metrics.ts` | **208** | 1109 | HIGH |
| `lib/ui-parser.ts` | **161** | 547 | HIGH |
| `commands/workflow.ts` | **124** | 696 | MEDIUM |
| `commands/retro.ts` | **122** | 1014 | MEDIUM |
| `lib/meta-index.ts` | **106** | 703 | MEDIUM |

CC > 50인 파일 15개 / 전체 62개 (24%).

**위험도**: **MEDIUM** — 현재 동작에는 문제없으나, 유지보수/변경 시 버그 유입 확률 높음.

---

## V7. Race Condition / TOCTOU 분석

| 이슈 | 위치 | 위험도 |
|------|------|--------|
| 데몬 동시 시작 (TOCTOU) | `isDaemonRunning()` → `fork()` gap | LOW |
| Session State R-M-W | `updateSessionState()` 파일 락 없음 | LOW-MEDIUM |
| PID Reuse | `process.kill(pid, 0)` false positive | LOW |

---

## V8. Fault Injection 정적 분석

| 시나리오 | 대응 | 결과 |
|----------|------|------|
| 디스크 풀 (ENOSPC) | **무방비** | 데몬 크래시 |
| config.yaml 손상 | YAML parse → exit(1) | **OK** |
| session-state.json 손상 | catch → null → 재생성 | **OK** (메트릭 유실) |
| 데몬 소켓 stale | hook catch → exit(0) | **OK** |
| .daemon.pid stale | `killZombie()` cleanup | **OK** |
| 빈 JSON 객체 | 방어 코드 존재 (이슈 #2 수정) | **OK** |

---

## 파이프라인별 안정성 요약

| 파이프라인 | 상태 | 주요 리스크 |
|-----------|------|------------|
| **init** | STABLE | 없음 |
| **status** | STABLE | 이슈 #2 수정 완료 |
| **upgrade** | STABLE | 이슈 #3 수정 완료 |
| **daemon start/stop** | STABLE | TOCTOU (낮은 확률) |
| **daemon notify (hooks)** | STABLE | floating promise |
| **daemon event-queue** | STABLE | error swallowing |
| **session** | STABLE | 없음 |
| **metrics** | STABLE | 없음 |
| **retro** | STABLE | gh 미설치 시 graceful skip |
| **log** | STABLE | 복잡도 높음 (CC:275) |
| **workflow** | STABLE | 없음 |
| **meta-index** | STABLE | 순환 참조 (현재 무해) |
| **compile** | STABLE | 없음 |
| **quick/full** | STABLE | 없음 |
| **skills** | STABLE | 없음 |
| **knowledge** | STABLE | 없음 |
| **git (pr/release/sync)** | STABLE | gh CLI 의존 |
| **watch** | STABLE | 없음 |

---

## 종합 점수

| 카테고리 | 점수 | 비고 |
|----------|------|------|
| Type Safety | 9/10 | strict 통과, exactOptionalPropertyTypes 10개 |
| Error Handling | 7/10 | 102 catch, 위험 사례 3개 |
| Concurrency | 7/10 | floating promise 1개, TOCTOU 1개 |
| Dependencies | 10/10 | prod 0 취약점 |
| Complexity | 6/10 | CC>100 파일 6개 |
| Fault Tolerance | 8/10 | ENOSPC만 미대응 |
| **종합** | **7.8/10** | **STABLE** |

---

## 향후 개선 권장 (우선순위순)

1. **P1**: `meta-cache.ts:248` onNotify에 await 추가 또는 직렬 큐 적용
2. **P2**: `event-queue.ts` 빈 catch 블록에 최소 `this.log()` 추가
3. **P3**: `log.ts` 분할 (task/sequence/phase를 별도 파일로)
4. **P4**: tsconfig에 `exactOptionalPropertyTypes: true` 추가
5. **P5**: daemon log()에 ENOSPC 방어 (try-catch + fallback)
