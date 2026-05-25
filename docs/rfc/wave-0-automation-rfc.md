---
title: Wave 0 Automation + Issue Resolution Integration
status: Draft (pre-implementation)
created: 2026-05-23
related:
  - docs/improvement-plan-2026-05-22.md (Automation Layer §, Issue Resolution Integration §)
  - docs/rfc/_mini-rfc-template.md (본 RFC 의 모태)
  - docs/rfc/vnext-operational-state-runtime.md (Prime Directive)
wave: 0
scope_actions: ["A1 (#21/#31 close)", "Catalog #1 Prime Directive Lint (design)", "Catalog #2 /inspect extension (design)", "Catalog #4 Mini-RFC scaffolder (design)", "Catalog #7 issue audit/close assistant (design)"]
---

# Wave 0 Mini-RFC: Automation + Issue Resolution Integration

> 본 RFC 는 Wave 0 착수 **전에** 작성된 정렬 문서다. **구현 없음**. 설계와 evidence 정의만.

## Prime Directive Check (6 questions)

| # | 질문 | 답변 | 근거 |
|---|------|------|------|
| Q1 | Does this create a new truth source? | **no** | Wave 0 산출물 (lint report, /inspect report, scaffolded RFC, audit report) 은 전부 generated projection 또는 evidence artifact 후보. 새 ledger / state 신설 없음. |
| Q2 | Can this artifact be deleted and regenerated? | **yes** | lint/inspect report 는 재실행 시 동일 입력에 동일 출력. RFC scaffolder 산출물도 템플릿 + 인자로 결정론적. |
| Q3 | Can PASS/completed be claimed without evidence? | **no** | Wave 0 의 Exit Criteria 자체가 "issue close 가 파일:라인 evidence 로 backed 됨" + "lint 가 6 questions 누락을 block". claim-only 차단. |
| Q4 | Does this rely on agent self-report? | **no (with validator)** | A1 close 코멘트는 `rg`/`wc`/`git log` 출력으로만 evidence 인정. agent 가 "확인했다" 만으로는 close 불가. |
| Q5 | Does this make hooks the standard instead of adapter? | **no** | Prime Directive Lint 는 hook 으로 호출되지만 정책은 SSOT (`docs/rfc/_mini-rfc-template.md` 의 6 questions) 에 거주. hook = adapter. (Phase exit 시점 재확인 필요.) |
| Q6 | Does this require future MCP/daemon to be useful? | **no** | Wave 0 항목 4개 (Lint, /inspect, scaffolder, issue audit) 모두 local CLI + git/gh 만으로 동작. MCP/daemon 불필요. |

**판정**: 6/6 통과. Wave 0 진입 자격 충족.

---

## 1. Goal

**Wave 0 메타 자동화가 이후 작업의 drift 를 줄이는지 검증한다.**

가설: "Prime Directive Lint + `/inspect` extension + Mini-RFC scaffolder + issue audit 의 4건 메타 자동화가 도입되면, 이후 A1~A16 진행 중 발생하는 표현/구조/SSOT drift 가 자동으로 차단되거나 사전 감지된다."

성공 = 1주~2주 dogfood 후 drift 차단 사례 ≥ 1건 (자동 lint block 또는 inspect 가 잡은 stale 항목).

## 2. Why Now

- 직전 작업 (코덱스 6 finding 반영) 에서 plan 본문에 다수의 표현/scope drift 가 누적됐고, 사람이 일일이 잡아냈음 — 이 비용을 자동화 가능.
- Issue Resolution Integration 원칙상 A1~A3 가 첫 stabilization wave 이며, 그 안에서 Wave 0 메타 자동화가 자연스럽게 병렬 진행되어야 함.
- A4 (append-only-guard, Wave 1 트리거) 시작 전에 lint/scaffolder 가 정착되어야 A4 의 hook 자체가 Prime Directive 6 questions 통과 여부를 자동 검증할 수 있음.

## 3. External References

- [docs/rfc/_mini-rfc-template.md](_mini-rfc-template.md) — Mini-RFC 템플릿 (모태)
- [docs/improvement-plan-2026-05-22.md](../improvement-plan-2026-05-22.md) §🤖 Automation Layer L109~178 — 카탈로그 출처
- [docs/rfc/vnext-operational-state-runtime.md](vnext-operational-state-runtime.md) §3 (Generated Views), §18 (가장 중요한 목표) — Prime Directive 출처
- [GitHub Issue #21](https://github.com/sonature-lab/timsquad/issues/21) — Meta Index 스킬 레이어 연결
- [GitHub Issue #31](https://github.com/sonature-lab/timsquad/issues/31) — 후순위 보완계획 #4~#7
- (외부 사례) `/inspect` 가 evidence/event 없이 자체 claim 이 되지 않게 — Agent 감사 §6 "Hook chain dispatcher" / §7 "Convention validator" 의 wrapper 원칙 채용

## 4. Scope (this Wave)

본 Wave 에서 **설계만** 진행. 구현 금지.

- **S1. Prime Directive Lint 설계**
  - 입력: 신규 PR / commit / 신규 RFC 파일
  - 검사: 6 questions 표가 RFC 에 존재하고 모든 답변이 "no" 또는 정당화된 "yes" 인가 + 자동화 산출물이 canonical/projection/supporting 중 분류되었는가
  - 출력: lint report (generated projection — evidence 아님, claim)
- **S2. `/inspect` extension 설계**
  - 기존 `tsq-inspect` 스킬에 drift rule 추가: (a) Automation Layer 카탈로그 ↔ 실제 산출물 매핑 (b) Mini-RFC 부재 phase 가 in-progress 인지 (c) 문서 수치 drift (스킬 개수 / hook 개수 / Wave 진행 상태)
  - 출력: inspect report (generated projection)
- **S3. Mini-RFC scaffolder 설계**
  - 인터페이스: `tsq rfc new <phase>` (예: `tsq rfc new wave-0`, `tsq rfc new phase-alpha`)
  - 동작: 템플릿 복사 + frontmatter 채움 + 6 questions 표 빈칸 생성
  - 산출물: `docs/rfc/<name>-rfc.md` (canonical decision artifact)
- **S4. issue audit / close assistant 설계**
  - 입력: 이슈 번호 (예: #21)
  - 검사: 이슈 본문의 claim 을 repo 의 파일:라인 evidence 로 매칭. `rg`/`wc`/`git log` 결과 첨부
  - 출력: close 코멘트 draft + (옵션) `gh issue close` 호출
- **S5. A1 (#21 / #31 close) 실행 절차**
  - 본 RFC §11 (Exit Criteria) 와 부록 A 에서 구체화

## 5. Non-Scope (this Wave)

- ❌ 실제 script / CLI 구현 (`scripts/prime-directive-lint.sh`, `src/commands/rfc.ts`, `scripts/audit-issues.sh` 등)
- ❌ A4 `append-only-guard.sh` 구현 (Wave 1)
- ❌ A9 / A10 runtime 구현 (Wave 2)
- ❌ MCP / daemon / cross-platform adapter (Wave 3+ deferred)
- ❌ Automation Catalog 의 #5, #6, #8, #9, #10 (Wave 2~3 으로 분리됨)
- ❌ Templates Catalog 의 T2~T7 신규 작성 (Wave 1~2)
- ❌ Modules Catalog 의 M1~M7 구현

## 6. Implementation Slice

> 본 RFC 는 설계 단계. 구현 slice 는 본 RFC 채택 후 별도 PR.

| Slice | 산출물 (구현 시 작성될 것) | 소요 (예상) |
|-------|--------------------------|------------|
| S1 | `scripts/prime-directive-lint.sh` + lint spec md | 1~2일 |
| S2 | `tsq-inspect` 스킬 SKILL.md 갱신 + drift rule yaml | 1~2일 |
| S3 | `src/commands/rfc.ts` (또는 `scripts/rfc-new.sh`) | 1일 |
| S4 | `scripts/audit-issues.sh` (gh CLI + rg wrapper) | 1~2일 |
| S5 | (A1 실행, 본 RFC 부록 A 와 직접 실행) | 즉시 |

총 4~7일. Wave 0 전체 1주 이내 완료 목표.

## 7. Evidence Required

| Slice | Evidence type | Producer | Validator |
|-------|---------------|----------|-----------|
| S1 (lint) | lint report (json) — block 사례 ≥ 1건 | lint script | 사람 리뷰 + Q1~Q6 표 매칭 |
| S2 (inspect) | inspect report (json/md) — drift rule 히트 ≥ 1건 | `tsq-inspect` 확장 | (출력 자체는 claim. evidence 로 인정하려면 후속 fix PR 의 git diff 와 매칭) |
| S3 (scaffolder) | scaffolded RFC 파일 + 6 questions 표 빈칸 0건 | `tsq rfc new` | `rg "Q[1-6] \|" docs/rfc/*.md` |
| S4 (audit) | audit report + close 코멘트 + repo 파일:라인 인용 | `audit-issues.sh` | `gh issue view <N>` 후 코멘트 일치 확인 |
| S5 (A1) | gh issue view 결과가 CLOSED + 코멘트에 파일:라인 evidence | gh CLI | `gh issue list --state closed --search "21 31"` |

**원칙 강제**:
- 문서 claim 은 `wc`, `rg`, `git status`, `git log`, 파일:라인 근거로만 인정.
- `/inspect` report 는 claim 이며 evidence/event backing 없으면 truth 가 아님 (§5 Over-engineering 경고 4번과 정합).

## 8. Performance Budget

> hook/CLI 구현 전이므로 예산은 **목표치** 로만 정의. 실측은 구현 후.

| 지표 | 목표 |
|------|------|
| Prime Directive Lint 실행 (단일 PR) | < 1s |
| `/inspect` 전체 검사 (TimSquad 자기 repo) | < 5s |
| Mini-RFC scaffolder (`tsq rfc new <phase>`) | < 0.5s |
| issue audit / close 1건 (gh API + grep) | < 3s |
| Wave 0 4건 + A1 총 누적 (CI 1회) | < 30s |

## 9. Security / Policy

- **secrets handling**: lint/inspect/audit 출력에 token/key 가 박힐 위험 없음 (입력이 RFC md + 코드 grep + git log 한정). 다만 추후 audit 가 `gh api` 호출 시 token 노출 방지 — `gh` 가 표준 위치에서 token 관리하므로 직접 핸들 금지.
- **PII / sensitive data**: 본 Wave 산출물 (RFC, lint report) 에 PII 진입 가능성 없음.
- **permission boundaries**: gh CLI 의 `repo` scope 부재 (현재 토큰은 `public_repo` 만). public 리포에서는 동작하나 향후 private 화될 경우 scope refresh 필요.
- **break-glass / override mode**: Wave 0 의 lint 는 advisory (block 만 하고 우회 불가하면 마찰). `--override --reason=...` 플래그를 S1 설계에 포함.
- **redaction filter**: Wave 0 산출물은 PII 위험 없으나, 향후 Wave 1 (incident report) / Wave 2 (evidence artifact) 에 적용될 redactor (Modules M7) 의 사전 단계.

## 10. Kill Criteria

본 Wave 는 다음 조건 시 **즉시 중단**:

- **K1**. Wave 0 가 새 truth source 를 만들면 중단 (Q1 위반). 예: lint report 가 PASS/FAIL 판정을 진실로 박는 형태.
- **K2**. Mini-RFC 없이 구현이 시작되면 중단 (Wave 0 의 4건 S1~S4 중 어느 하나라도).
- **K3**. A1 close 근거 (파일:라인) 가 재현 불가하면 close 중단. draft only 로 fallback.
- **K4**. Wave 0 dogfood 1~2주에서 drift 차단 사례 0건이면 가설 실패 → 재설계.
- **K5**. lint/inspect 의 false positive 비율 ≥ 30% 이면 마찰이 가치 압도 → 단순화 후 재시작.

## 11. Exit Criteria

Wave 1 로 promote 하기 위한 조건. 모두 충족해야 함.

- **E1**. 본 RFC 가 Prime Directive 6/6 통과 (§Prime Directive Check 표) — 본 RFC 채택 시점 자동 충족.
- **E2**. A1 (#21, #31) close 여부가 **증거 기반으로 판정됨** — 본 RFC 부록 A 에 close 결과 (closed / draft only) + 파일:라인 evidence 기록.
- **E3**. 이후 Wave 0 구현 범위가 **1~3일 slice 로 쪼개짐** — §6 Implementation Slice 표가 그 분해. S1~S5 모두 ≤ 2일.
- **E4**. (구현 후 추가) Wave 0 dogfood 1~2주 → drift 차단 사례 ≥ 1건 또는 명확한 near-miss 기록.
- **E5**. (구현 후 추가) Prime Directive Lint 가 Wave 1 (A4) 의 PR 에 자동 적용되어 6 questions 표 부착 강제.

## 12. Execution Model

- **Claude Code implements** — S1~S4 각 slice 단위 PR (slice 당 1~2일).
- **Codex audits read-only** — 매 slice 완료 시점에 Prime Directive Check + Evidence Required 표 매칭 + dogfood KPI event 발생 여부 확인. 코드/문서 수정 권한 없음.
- **User decides** — Wave 1 promotion (E1~E5 충족 시) 또는 K1~K5 발동 시점에만.

## 13. Go 조건 보정 (2차 리뷰 반영)

**Wave 0 전체 동시 진행 금지**. 다음 순서로 가볍게 dogfood.

### 13.1 즉시 착수 (1차 슬라이스)

- **S3 Mini-RFC scaffolder** — 결정론적, N8 risk (scaffolded RFC = canonical truth 오분류) 사전 정책 명시 후 진행.
- **S4 issue audit / close assistant** — A1 (#21, #31) 수동 close 절차가 이미 dogfood 됨. 재현성만 자동화.

### 13.2 정의 보강 후 착수 (2차 슬라이스)

- **S1 Prime Directive Lint** — 착수 전 다음 필수:
  - "정당화된 yes" 판정 기준 (escape hatch) 정의: `Q5/Q6 답변이 "yes" 라도 phase exit 시점 재검사 조항 명시` 형식.
  - `--override --reason=...` flag + audit 로그.
  - lint spec 1쪽 문서.
- **S2 `/inspect` extension** — 착수 전 다음 필수:
  - "in-progress phase" dataset 정의 (workflow.json current_phase 기준).
  - false positive policy + soft-mandatory rollout 단계.

## 14. Dogfood KPI Event Types (N4 해소)

자동 측정 가능한 event type 4종 정의. 사람의 사후 라벨링이 아니라 자동 발생/카운팅 가능해야 함.

| Event Type | 의미 | Producer | Validator |
|------------|------|----------|-----------|
| `lint_blocked_missing_prime_directive` | Prime Directive Check 표 누락 또는 Q1~Q6 미답변으로 lint block | S1 Lint script | `gh pr list` + lint log |
| `inspect_detected_stale_claim` | `/inspect` 가 stale 문서/code claim 감지 (수치 drift, 미존재 파일 참조 등) | S2 inspect rule | inspect report json |
| `issue_audit_prevented_false_close` | audit assistant 가 evidence 부족으로 close 차단 | S4 audit script | gh issue history + audit log |
| `manual_override_with_reason` | break-glass override 발동 (lint/hook 우회) | S1/S4 override flag | override 로그 + reason 필드 |

**E4 (drift 차단 사례 ≥ 1건) 의 자동 측정 정의**: 위 4 event type 합산 ≥ 1건 (Wave 0 dogfood 1~2주 누적).

## 15. S1 "정당화된 yes" / Override 정책 (요약)

S1 구현 전 별도 short spec 으로 확장 예정. 본 RFC 에는 원칙만:

- Q1~Q4 "yes" → 무조건 block (Prime Directive 위반).
- Q5 (hook = adapter) "yes" → phase entry 시점은 advisory, phase exit 시점은 mandatory. 표현은 `"no (check at phase exit, not entry)"` 형식 허용.
- Q6 (future MCP/daemon 의존) "yes" → scope 축소 권고 + RFC 본문에 "feature flag / fallback 명시" 강제. fallback 없으면 block.
- `--override --reason=<text>` 발동 시 `manual_override_with_reason` event 발생 + audit log 7일 보관.

---

## 부록 A. A1 (#21 / #31) close comment drafts

> 실측 명령 결과를 그대로 인용한 evidence-based draft. gh CLI 권한 확인 후 본 RFC §11 E2 달성 단계에서 close 실행.

### A.1 실측 명령 (재현 가능)

```bash
# #21 evidence
rg -n "metaCache\.load|metaCache\.updateFiles|flushToDisk|class MetaCache|updateFiles" \
  src/daemon/index.ts src/daemon/meta-cache.ts

# #31 evidence
rg -n "--wave|completed_tasks|TrackedTask" \
  src/lib/workflow-state.ts src/commands/next.ts
ls templates/platforms/claude-code/scripts/*.sh
```

### A.2 실측 결과 (2026-05-23)

```
src/daemon/meta-cache.ts:35:export class MetaCache {
src/daemon/meta-cache.ts:181:  updateFiles(changedPaths: string[]): void {
src/daemon/meta-cache.ts:187:  async flushToDisk(): Promise<void> {
src/daemon/index.ts:96:    await metaCache.load();
src/daemon/index.ts:234:    metaCache.updateFiles(paths);
src/daemon/index.ts:303:    await metaCache.flushToDisk();
src/commands/next.ts:40:    .option('--wave', ...)
src/commands/next.ts:97: * tsq next --wave — 병렬 실행 가능한 독립 태스크 Wave 출력
src/lib/workflow-state.ts:9:export interface TrackedTask {
src/lib/workflow-state.ts:22:  completed_tasks: TrackedTask[];
templates/platforms/claude-code/scripts/  — 16 bash 파일 존재
```

### A.3 #21 close comment draft

```markdown
✅ Close — evidence verified against main repo (2026-05-23).

**실측 명령**:
```
rg -n "metaCache\.load|updateFiles|flushToDisk|class MetaCache" \
  src/daemon/index.ts src/daemon/meta-cache.ts
```

**파일:라인 evidence**:
- `src/daemon/meta-cache.ts:35` `class MetaCache` 정의
- `src/daemon/meta-cache.ts:181` `updateFiles(changedPaths: string[]): void` — dirty 추적 + 증분 업데이트 구현
- `src/daemon/meta-cache.ts:187` `flushToDisk()` 구현
- `src/daemon/index.ts:96` `await metaCache.load()` — 인메모리 캐시 활성화
- `src/daemon/index.ts:234` `metaCache.updateFiles(paths)` — daemon 호출
- `src/daemon/index.ts:303` `metaCache.flushToDisk()` — daemon 종료 시 flush

본 issue 의 4개 작업 (스킬 연결 설계 / `tsq mi find` 참조 / 인메모리 캐시 활성화 / `updateFiles()` 구현) 중 마지막 두 항목 = 명시적으로 코드 반영 확인됨.

**⚠ 향후 격하 예정**:
vNext Phase 2 (A11) 에서 MetaIndex 는 **on-demand analyzer cache 로 격하** 예정. 영구 meta-index 캐시는 "또 하나의 truth source" 가 되어 stale 위험이 있으며, lightweight ProjectMap + on-demand analyzer 조합으로 대체됨. 본 close 는 현재 구현 완료를 인정하되, 코드 자체는 향후 ProjectMap 도입과 함께 재구조화 대상이다.

근거: [docs/rfc/vnext-operational-state-runtime.md §8 MetaIndex 재정의](../../docs/rfc/vnext-operational-state-runtime.md), [docs/improvement-plan-2026-05-22.md A11 M2.2.6](../../docs/improvement-plan-2026-05-22.md).

Wave 0 audit 의 evidence-based close. Closed by Wave 0 Mini-RFC §11 E2.
```

### A.4 #31 close comment draft

```markdown
✅ Close — evidence partially verified against main repo (2026-05-23).

**실측 명령**:
```
rg -n "--wave|completed_tasks|TrackedTask" src/lib/workflow-state.ts src/commands/next.ts
ls templates/platforms/claude-code/scripts/*.sh
```

**파일:라인 evidence (#4~#7 각각)**:
- **#4 모델 라우팅**: 메모리 snapshot 기준 "Controller v3.0.0 하이브리드 + Model Routing" 완료 보고. 본 audit 에서 직접 grep 매칭은 약함 (`model.*routing` 0건). 에이전트 파일의 `model:` frontmatter 활용 가능성 — 향후 Wave 0 inspect 가 별도 검증.
- **#5 Meta Index**: ✅ #21 evidence 와 동일 (`src/daemon/index.ts:96, :234`, `src/daemon/meta-cache.ts:181`).
- **#6 Script 자동화 6건**: ✅ `templates/platforms/claude-code/scripts/` 에 16 bash 파일 존재 (build-gate, change-scope-guard, check-capability, completion-guard, context-restore, detect-env, phase-guard, pre-compact, safe-guard, stale-guard, subagent-start, subagent-stop, tdd-guard, validate-completion-report 외). 6개 자동화의 정확한 set 매핑은 settings.json 등록 기준으로 추가 검증 가능.
- **#7 Wave 병렬 디스패치**: ✅ `src/commands/next.ts:40` `--wave` 옵션 + `:97` 코멘트 "tsq next --wave — 병렬 실행 가능한 독립 태스크 Wave 출력" + `src/lib/workflow-state.ts:22` `completed_tasks: TrackedTask[]` 구조.

**판정**: #5, #6, #7 은 코드 evidence 강함. #4 는 memory snapshot 기반이며 직접 코드 매칭 부족. 다만 전체 4건 중 3건 evidence + plan A1 진단 일치 → close 진행. 만약 #4 의 직접 evidence 가 필요하면 별도 issue 로 재오픈 권고.

**⚠ Wave 0 정합 경고**:
본 issue 의 #5 (Meta Index) 는 vNext Phase 2 에서 격하 예정 (#21 코멘트 참조).

Wave 0 audit 의 evidence-based close. Closed by Wave 0 Mini-RFC §11 E2.
```

### A.5 Close 실행 결과 (2026-05-23 실측)

- gh auth status: ✓ `sonature-lab` 로그인, scope `public_repo` 보유 (`repo` scope 부재). public 리포 대상이라 동작 확인됨.
- **#21**: ✓ closed — comment URL https://github.com/sonature-lab/timsquad/issues/21#issuecomment-4524931990
- **#31**: ✓ closed — comment URL https://github.com/sonature-lab/timsquad/issues/31#issuecomment-4524932611
- 코멘트 본문: 본 부록 §A.3 / §A.4 draft 와 동등 (파일:라인 evidence + 격하 경고 포함).
- 실행 명령: `gh issue comment <N> --body ... && gh issue close <N>` (둘 다 성공, fallback 불필요).

---

## 부록 B. 작성 가이드 / Wave 1 진입 조건

- 본 RFC 가 채택되면 Wave 0 의 S1~S5 가 1~2일 slice 로 실행 가능.
- E1~E3 즉시 충족 가능. E4, E5 는 구현 완료 후 1~2주 dogfood 결과 누적 시 추가.
- E4, E5 미충족 시 Wave 1 (A4 append-only-guard) 진입 금지.
- Wave 0 진행 중 본 RFC 본문 직접 수정 금지. 발견 사항은 `docs/rfc/wave-0-findings.md` 에 append (RFC = canonical decision, findings = generated view — 본 템플릿 §부록 운영 규칙).
