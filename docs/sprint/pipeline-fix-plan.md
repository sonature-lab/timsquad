# Pipeline Fix Plan

> 기준: `docs/sprint/pipeline-audit-report.md` (6-Agent Audit + 5-Agent Cross-Verification)
> 작성: 2026-03-18

---

## 개요

| Phase | 목표 | 항목 수 | TS 변경 | 테스트 영향 |
|-------|------|---------|---------|------------|
| **Phase 1** | 깨진 파이프라인 복구 | 9건 | 1파일 | 기존 테스트 통과 확인 |
| **Phase 2** | 안정성 강화 + 데드코드 제거 | 8건 | 2파일 | 테스트 추가 1건 |
| **Phase 3** | 정리 + 아키텍처 결정 | 4건 | 다수 | 설계 논의 필요 |

---

## Phase 1: 깨진 파이프라인 즉시 복구

> TypeScript 변경 최소화. Hook 스크립트 + SKILL.md + template 텍스트 수정 위주.
> 모든 수정 후 `npm test` + `npm run build` 통과 필수.

---

### Task 1-1: PID 경로 통일 [C-01]

**파일**: `src/lib/template.ts`
**위치**: TIMSQUAD_BLOCK 내 라인 37 근처
**현재**:
```
`.timsquad/.daemon/daemon.pid` 없으면
```
**수정**:
```
`.timsquad/.daemon.pid` 없으면
```

**검증**: `npm run build` + grep으로 `.daemon/daemon.pid` 잔존 확인

---

### Task 1-2: Phase 읽기 수정 [C-02]

**파일 1**: `templates/platforms/claude-code/scripts/pre-compact.sh`
**위치**: 라인 35~37
**현재**:
```bash
WORKFLOW_FILE="$PROJECT_ROOT/.timsquad/state/workflow.json"
...
PHASE=$(jq -r '.currentPhase // "unknown"' "$WORKFLOW_FILE" 2>/dev/null || echo "unknown")
```
**수정**:
```bash
PHASE_FILE="$PROJECT_ROOT/.timsquad/state/current-phase.json"
...
PHASE=$(jq -r '.current // .current_phase // .phase // "unknown"' "$PHASE_FILE" 2>/dev/null || echo "unknown")
```

**파일 2**: `templates/platforms/claude-code/scripts/context-restore.sh`
**위치**: 라인 40~42
**현재**:
```bash
WORKFLOW_FILE="$PROJECT_ROOT/.timsquad/state/workflow.json"
...
CURRENT_PHASE=$(jq -r '.currentPhase // "unknown"' "$WORKFLOW_FILE" 2>/dev/null || echo "unknown")
```
**수정**:
```bash
PHASE_FILE="$PROJECT_ROOT/.timsquad/state/current-phase.json"
...
CURRENT_PHASE=$(jq -r '.current // .current_phase // .phase // "unknown"' "$PHASE_FILE" 2>/dev/null || echo "unknown")
```

**참고**: `completion-guard.sh`와 `phase-guard.sh`는 이미 올바른 방식 사용 중 — 그 패턴을 따라감.

**검증**: hook 스크립트는 런타임이므로 기존 테스트 영향 없음. `grep -r 'currentPhase' templates/` 으로 잔존 확인.

---

### Task 1-3: Auto-compile 경로 수정 [C-03]

**파일**: `src/daemon/event-queue.ts`
**위치**: 라인 232
**현재**:
```typescript
const controllerDir = path.join(this.projectRoot, '.claude', 'skills', 'controller');
```
**수정**:
```typescript
const controllerDir = path.join(this.projectRoot, '.claude', 'skills', 'tsq-controller');
```

**검증**: `npm run build` + `npm test` (event-queue.test.ts 통과)

---

### Task 1-4: Hook stdin 읽기 통일 [C-04]

**파일 1**: `templates/platforms/claude-code/scripts/safe-guard.sh`
**위치**: 라인 12~14
**현재**:
```bash
read -t 1 -r line
INPUT="$line"
```
**수정**:
```bash
INPUT=$(cat 2>/dev/null || echo "")
```
그리고 이후 `echo "$INPUT" | jq ...` 사용 부분은 이미 `$INPUT`을 사용하므로 호환됨.
단, 현재 `echo "$line" | jq -r '.tool_input.command // empty'`를 사용하는 부분이 있으면 변수명을 `INPUT`으로 맞춰야 함.

**파일 2**: `templates/platforms/claude-code/scripts/phase-guard.sh`
**위치**: 라인 14~16 (동일 패턴)
**현재**:
```bash
read -t 1 -r line
INPUT="$line"
```
**수정**:
```bash
INPUT=$(cat 2>/dev/null || echo "")
```

**주의**: 두 스크립트 모두 `INPUT` 변수로 이후 jq 파싱하는지 확인 필요. 변수명이 `line`에서 `INPUT`으로 바뀌므로 이후 참조도 일괄 수정.

**검증**: 런타임 hook. 기존 테스트 영향 없음.

---

### Task 1-5: check-capability deny 포맷 수정 [C-08]

**파일**: `templates/platforms/claude-code/scripts/check-capability.sh`
**위치**: 라인 60~63
**현재**:
```bash
echo '{"permissionDecision":"deny","message":"..."}'
```
**수정**:
```bash
ALLOWED=$(cat "$ALLOWED_FILE" | tr '\n' ', ' | sed 's/,$//')
echo "{\"hookSpecificOutput\":{\"permissionDecision\":\"deny\"},\"systemMessage\":\"[Capability] 허용 경로: ${ALLOWED}\"}"
```

**참고**: `safe-guard.sh`, `phase-guard.sh`의 deny 출력 포맷과 동일하게 `hookSpecificOutput` 래퍼 사용.
JSON 내 변수 이스케이프는 `jq -n --arg`를 사용하는 것이 더 안전:
```bash
jq -n --arg msg "[Capability] 허용 경로 외 접근: $FILE_PATH" \
  '{"hookSpecificOutput":{"permissionDecision":"deny"},"systemMessage":$msg}'
```

**검증**: 런타임 hook. 기존 테스트 영향 없음.

---

### Task 1-6: check-capability stdin timeout [C-07]

**파일**: `templates/platforms/claude-code/scripts/check-capability.sh`
**위치**: 라인 17
**현재**:
```bash
INPUT=$(cat)
```
**수정**:
```bash
INPUT=$(cat 2>/dev/null || echo "")
```

Task 1-5와 같은 파일이므로 함께 수정.

**검증**: 런타임 hook.

---

### Task 1-7: Controller Delegation Rules 역할명 통일 [C-16, C-17, C-18]

**파일**: `templates/base/skills/tsq-controller/SKILL.md`

**변경 1** — Delegation Rules (라인 43~46):
**현재**:
```
**Developer** — 코드 구현 + 단위 테스트. ...
**Reviewer** — 코드 리뷰 (읽기 전용). ...
**Librarian** — Phase 종합 기록 ...
**Plan Reviewer** — 실행 계획 검증 (읽기 전용, fork 컨텍스트). ...
```
**수정**:
```
**Developer** — 코드 구현 + 단위 테스트. ...
**QA** — 코드 리뷰 + L1 피드백 (읽기 전용). 에이전트: tsq-qa.md. 도구: Read, Grep, Glob, Bash. 출력: severity별 리포트.
**Librarian** — Phase 종합 기록 ...
**Architect (Plan Review)** — 실행 계획 검증 (읽기 전용, fork 컨텍스트). 에이전트: tsq-architect.md. 도구: Read, Grep, Glob. 출력: 커버리지/의존성/크기 검증 리포트.
```

**변경 2** — P3 Workflow (라인 79~80):
이미 "QA"를 사용하므로 Delegation Rules 수정 후 일치함. 변경 불필요.

**검증**: `npm test` (prompt-quality.test.ts의 120줄 제한 확인)

---

### Task 1-8: context-restore division by zero 가드 [W-07]

**파일**: `templates/platforms/claude-code/scripts/context-restore.sh`
**위치**: 라인 72
**현재**:
```bash
if [ "$TOTAL_LINES" -gt 0 ] && [ "$((PLACEHOLDER_LINES * 100 / TOTAL_LINES))" -ge 50 ] 2>/dev/null; then
```
**수정**:
```bash
if [ "$TOTAL_LINES" -gt 0 ] 2>/dev/null; then
  PCT=$((PLACEHOLDER_LINES * 100 / TOTAL_LINES))
  if [ "$PCT" -ge 50 ] 2>/dev/null; then
    ...
  fi
fi
```

또는 더 간결하게:
```bash
if [ "${TOTAL_LINES:-0}" -gt 0 ] 2>/dev/null && [ "$((PLACEHOLDER_LINES * 100 / TOTAL_LINES))" -ge 50 ] 2>/dev/null; then
```

Task 1-2와 같은 파일이므로 함께 수정.

**검증**: 런타임 hook.

---

### Task 1-9: build-gate staged 변경 감지 [W-08]

**파일**: `templates/platforms/claude-code/scripts/build-gate.sh`
**위치**: 라인 33
**현재**:
```bash
CHANGED_TS=$(git diff --name-only --diff-filter=ACMR HEAD -- '*.ts' '*.tsx' 2>/dev/null)
```
**수정**:
```bash
CHANGED_TS=$(cd "$PROJECT_ROOT" && {
  git diff --name-only --diff-filter=ACMR HEAD -- '*.ts' '*.tsx' 2>/dev/null
  git diff --cached --name-only --diff-filter=ACMR -- '*.ts' '*.tsx' 2>/dev/null
} | sort -u)
```

**검증**: 런타임 hook.

---

### Phase 1 완료 기준

- [x] `npm run build` 성공
- [x] `npm test` 전체 통과 (667)
- [x] `grep -r '.daemon/daemon.pid' src/` → 결과 없음
- [x] `grep -r 'currentPhase' templates/` → 결과 없음
- [x] `grep -r "'controller'" src/daemon/event-queue.ts` → `tsq-controller`만 존재
- [x] `grep -r 'read -t 1' templates/platforms/claude-code/scripts/` → 결과 없음
- [x] Controller SKILL.md Delegation Rules에 QA, Architect 역할명 일치

---

## Phase 2: 안정성 강화 + 데드코드 제거

---

### Task 2-1: SIGTERM 이중 실행 방지 [C-09]

**파일**: `src/daemon/index.ts`
**위치**: gracefulStop 함수 + 시그널 핸들러 (라인 318~326)
**수정**:
```typescript
let shuttingDown = false;

async function gracefulStop() {
  if (shuttingDown) return;
  shuttingDown = true;
  // ... 기존 shutdown 로직
}
```

**검증**: `npm run build` + `npm test`

---

### Task 2-2: compiler exists() 절대경로 [C-15]

**파일**: `src/lib/compiler.ts`
**위치**: 라인 477
**현재**:
```typescript
if (await exists(srcFile) && srcFile !== compiledPath) {
```
**수정**:
```typescript
const srcAbsPath = path.join(controllerDir, srcFile);
if (await exists(srcAbsPath) && srcAbsPath !== compiledPath) {
```

**검증**: `npm run build` + `npm test` (compiler.test.ts)

---

### Task 2-3: eventLog 크기 제한 [W-11]

**파일**: `src/daemon/event-queue.ts`
**위치**: log() 메서드 (라인 84~86)
**수정**:
```typescript
private log(event: string, status: 'success' | 'error', detail?: string): void {
  this.eventLog.push({ timestamp: getTimestamp(), event, status, detail });
  if (this.eventLog.length > 1000) {
    this.eventLog = this.eventLog.slice(-500);
  }
}
```

**검증**: `npm run build` + `npm test`

---

### Task 2-4: 미등록 Hook 스크립트 삭제 [C-14]

**삭제 대상**:
- `templates/platforms/claude-code/scripts/e2e-marker.sh`
- `templates/platforms/claude-code/scripts/change-scope-guard.sh`
- `templates/platforms/claude-code/scripts/e2e-commit-gate.sh`

**사전 확인**: 이 스크립트들이 다른 곳에서 참조되는지 `grep -r` 확인.
- `e2e-commit-gate.sh`는 git pre-commit hook으로 설계 — settings.json 미등록이 의도적일 수 있음. 삭제 전 확인.

**검증**: `npm run build` + `npm test` + E2E init 테스트가 스크립트 개수 체크하는지 확인

---

### Task 2-5: 레거시 scripts/ 디렉토리 삭제

**삭제 대상**: `/Users/ericson/Dev/timsquad/scripts/` (12파일)
- npm `files` 필드에 미포함 확인 필요
- package.json `scripts` 필드에서 참조 여부 확인 필요

**검증**: `npm run build` + `npm test`

---

### Task 2-6: 레거시 install/ 디렉토리 삭제

**삭제 대상**: `/Users/ericson/Dev/timsquad/install/install.sh`

**검증**: `npm run build`

---

### Task 2-7: 테스트 정리

**파일 1**: `tests/unit/template.test.ts`
- stale mock 필드 `ACTIVE_AGENTS`, `DELEGATION_RULES` 제거

**파일 2**: `tests/unit/feedback.test.ts`
- 파일명 변경: `feedback.test.ts` → `workflow-integration.test.ts` (실제 내용에 맞게)

**검증**: `npm test` 전체 통과

---

### Task 2-8: SIGTERM 이중 실행 테스트 추가

**파일**: `tests/unit/daemon-shutdown.test.ts` (신규)
- gracefulStop 이중 호출 시 한 번만 실행되는지 검증

**검증**: `npm test`

---

### Phase 2 완료 기준

- [x] `npm run build` 성공
- [x] `npm test` 전체 통과 (667)
- [x] `change-scope-guard.sh` settings.json 등록 완료 (미등록→등록)
- [x] `scripts/` 디렉토리 삭제
- [x] `install/` 디렉토리 삭제
- [x] SIGTERM `shuttingDown` 가드 추가
- [x] eventLog 1000건 초과 시 자동 trim
- [x] template.test.ts stale mock 필드 제거

---

## Phase 3: 아키텍처 결정 + 중규모 정리

> 이 Phase는 설계 논의가 필요한 항목. 구현 전 사용자 확인 필수.

---

### Task 3-1: workflow.json 갱신 아키텍처 결정 [C-05]

**문제**: Controller 스킬이 workflow.json을 갱신하지 않아 파이프라인 진행 상태가 디스크에 없음.

**선택지**:
- **(A) Controller 스킬에 workflow.json 갱신 지시 추가**: Controller SKILL.md에 "task-complete 시 workflow.json 갱신" 프로토콜 추가. LLM이 직접 파일 쓰기. 간단하지만 LLM 의존.
- **(B) Daemon event-queue에서 자동 갱신**: task-complete 이벤트 처리 시 workflow.json 업데이트. 확실하지만 daemon이 Controller의 planning.md 구조를 알아야 함.
- **(C) 현행 유지**: idempotent resume (파일 존재 확인)로 충분하다고 판단. compact 후 복구는 phase-memory.md에 의존.

**권장**: **(A)** — Controller SKILL.md에 3줄 추가로 최소 비용 해결.

---

### Task 3-2: Meta Index 방향 결정

**문제**: 인프라 완성, 스킬 레이어 연결 끊어짐. 데몬이 IPC 서버를 띄우지만 소비자 없음.

**선택지**:
- **(A) 스킬 연결**: Controller가 Task() 위임 시 meta-index에서 관련 파일 구조를 추출하여 프롬프트에 주입. tsq-coding 등 스킬에서 `tsq mi find` 참조 추가.
- **(B) 비활성화**: daemon 부팅 시 MetaCache 로드/IPC 시작 생략. init/update에서 rebuildIndex 생략. 코드는 유지하되 실행 안 함.
- **(C) 삭제**: meta-index, ast-parser, ui-index, ui-parser, meta-cache 전부 삭제. ~1,000줄 제거.

**권장**: **(B)** — 현재 우선순위 아님. 비활성화 후 향후 필요 시 활성화.

---

### Task 3-3: 미사용 export 정리 (72개)

**방법**:
1. `utils/` 모듈 — 미사용 함수 export 키워드 제거 (내부 사용은 유지)
2. `lib/project.ts` — `getProjectStatus` 등 외부 미참조 함수 export 제거
3. `daemon/context-writer.ts` — 전체 미사용이면 파일 삭제 고려
4. `types/feedback.ts` — `PhaseRetroEntry`, `AggregatedReport` 미사용 타입 제거

**주의**: export 제거 시 테스트에서 직접 import하는 경우 확인 필요.

**검증**: `npm run build` + `npm test`

---

### Task 3-4: compiler.ts 클러스터 방향 결정

**문제**: `compiler.ts` (665줄) + `compile-rules.ts` (201줄) + `ssot-map.ts` (97줄) = ~963줄. `tsq compile` CLI 제거 후 고아. 단, `event-queue.ts`에서 dynamic import (C-03 수정 후 작동할 것).

**선택지**:
- **(A) 유지**: C-03 수정 후 auto-compile 정상 작동. SSOT 변경 시 자동 컴파일은 유용한 기능.
- **(B) 삭제**: auto-compile 기능도 제거. SSOT → Controller 주입은 스킬이 직접 읽기로 대체.

**권장**: **(A)** — C-03 수정으로 auto-compile 복구. compiler는 유지.

---

### Phase 3 완료 기준

- [x] C-05: Controller에 workflow.json 갱신 프로토콜 추가 (결정 A)
- [x] Meta Index: 메타인덱스 로드/갱신 비활성화, IPC notify는 유지 (결정 B)
- [ ] 미사용 export 정리 (72개 — 향후 별도 작업)
- [x] compiler: C-03 수정으로 auto-compile 복구, 코드 유지 (결정 A)
- [x] `npm run build` + `npm test` 전체 통과 (667)

---

## 전체 요약

| Phase | 작업 수 | 예상 변경 규모 | 의존성 |
|-------|---------|--------------|--------|
| **Phase 1** | 9 tasks | ~30줄 수정 (8파일) | 없음, 즉시 가능 |
| **Phase 2** | 8 tasks | ~30줄 수정 + 파일 삭제 | Phase 1 완료 후 |
| **Phase 3** | 4 tasks | 설계 결정 + 중규모 수정 | Phase 2 완료 후, 사용자 확인 필요 |

Phase 1~2는 순수 버그 수정으로 사용자 확인 없이 진행 가능.
Phase 3은 아키텍처 선택이 포함되어 사용자 방향 결정 필요.
