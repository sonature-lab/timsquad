# Phase 2 — Recording + Integration (기록 + 통합) 상세 계획

**승인일**: 2026-03-09
**목표**: Librarian 에이전트, SSOT 자동 컴파일, 전체 파이프라인 통합 검증
**대상 이슈**: #29 (M/2d), #31 (S/1d), #33 (M/2d)
**예상 공수**: 4d (최적 병렬)
**진입 조건**: Phase 0 + Phase 1 DoD 전체 충족

---

## 역할 배치

| 역할 | 담당 | 근거 |
|------|------|------|
| Architect | #29 Librarian 설계 | 에이전트 역할 경계 + 권한 설계 |
| Developer-A | #29 Librarian 구현 | 에이전트 + 스킬 파일 작성 |
| Developer-B | #31 데몬 SSOT 감시 | daemon FileWatcher 확장 |
| QA | #33 통합 검증 | E2E 시나리오 + 회귀 테스트 |
| Reviewer | 전체 교차 검증 | 권한 분리, 성능, 회귀 |

---

## Issue #29 — Librarian 에이전트

### 29-A. 에이전트 프롬프트 생성

- **현재 상태**: Librarian 에이전트/스킬 없음
- **작업**:
  1. `templates/base/agents/tsq-librarian.md` 신규
  2. 역할: Phase 종합 기록 전담
  3. frontmatter:
     ```yaml
     ---
     name: tsq-librarian
     description: "Phase 종합 기록 전담 에이전트"
     skills:
       - librarian
       - tsq-protocol
     ---
     ```
  4. 본문:
     - 입력: Phase 내 모든 L1/L2 로그, SSOT 현재 상태
     - 출력: Phase 종합 리포트, SSOT 상태 갱신, 다음 Phase context note
     - 제약: 소스 코드(src/, lib/, app/) 수정 금지, .timsquad/ 및 docs/ 내 문서만 작성·갱신
- **검증**: 에이전트 파일 존재 + `tsq init` 시 `.claude/agents/` 배포

### 29-B. Librarian 스킬 생성

- **작업**:
  1. `templates/base/skills/librarian/SKILL.md` 신규
  2. frontmatter:
     ```yaml
     ---
     name: librarian
     description: "Phase 종합 기록, SSOT 상태 갱신, 문서 작성 전담"
     context: fork
     allowed-tools: Read, Write, Edit, Grep, Glob, Bash
     ---
     ```
  3. Contract:
     - Trigger: Phase 완료 시 controller가 호출
     - Input: L1/L2/L3 로그, SSOT 현재 상태
     - Output: Phase 종합 리포트, SSOT stale 보고, context note
     - Error: 기록 실패 시 에러 리포트만 생성 (프로세스 차단 안 함)
  4. Protocol:
     1. L1/L2 로그 수집 → 2. SSOT 상태 확인 (stale 여부) → 3. 종합 리포트 작성 → 4. context note 생성
  5. Verification:
     - 리포트 파일 생성 확인
     - SSOT stale 목록 출력
     - src/ 파일 변경 없음 확인
- **검증**: SKILL.md 120줄 이하 + `prompt-quality.test.ts` 통과

### 29-C. controller delegation 연동

- **작업**:
  1. `delegation/librarian.md` (Phase 0 #24-C에서 생성) 내용 검증
  2. controller triggers/phase-complete.md에 Librarian 호출 지시 추가
  3. 호출 조건: Phase 내 모든 시퀀스 completed + L3 로그 생성 완료
- **검증**: controller가 Phase 완료 시 Librarian 호출 지시 포함 확인

### 29-D. 소스 코드 수정 금지 규칙

- **작업**:
  1. `.claude/rules/librarian-constraints.md` 신규:
     ```yaml
     ---
     paths:
       - ".timsquad/**"
       - "docs/**"
     ---
     Librarian 에이전트가 이 경로에서 작업할 때:
     - 문서 작성/갱신 허용
     - 소스 코드(src/, lib/, app/) 수정 절대 금지
     ```
  2. `tsq init` 시 `.claude/rules/` 배포에 포함
- **검증**: rules 파일 존재

---

## Issue #31 — SSOT 자동 컴파일

### 31-A. FileWatcher SSOT 경로 추가

- **현재 상태**: FileWatcher가 소스 코드만 감시 (meta-index용)
- **작업**:
  1. `src/daemon/file-watcher.ts` 또는 `src/daemon/index.ts`에 SSOT 경로 추가
  2. 감시 대상: `.timsquad/ssot/**/*.md`
  3. 변경 감지 시 `source-changed` 이벤트 대신 별도 `ssot-changed` 이벤트 타입 추가
  4. DaemonEvent에 `{ type: 'ssot-changed'; paths: string[] }` 추가
- **수정**: `src/daemon/event-queue.ts` (DaemonEvent 타입), `src/daemon/index.ts` (watcher 설정)
- **검증**: SSOT 파일 변경 시 이벤트 발생 확인

### 31-B. 자동 컴파일 실행

- **작업**:
  1. event-queue.ts에 `handleSSOTChanged()` 핸들러 추가
  2. `tsq compile build` execFile 호출
  3. 디바운스 적용 (2초) — 연속 저장 시 마지막 1회만
  4. 컴파일 결과를 eventLog에 기록
  5. 실패 시 에러 로깅 (프로세스 차단 안 함)
- **수정**: `src/daemon/event-queue.ts`
- **검증**: SSOT 파일 저장 → 2초 후 compile 자동 실행 확인

### 31-C. 기존 소스 감시와 공존

- **작업**:
  1. FileWatcher가 SSOT 경로와 소스 코드 경로를 모두 감시
  2. 경로 패턴으로 이벤트 타입 분기:
     - `.timsquad/ssot/` → `ssot-changed`
     - `src/`, `lib/`, etc. → `source-changed` (기존)
  3. 기존 meta-index 업데이트 로직에 영향 없음
- **검증**: 소스 코드 변경 → meta-index 업데이트 (기존), SSOT 변경 → compile (신규)

---

## Issue #33 — 통합 검증

### 33-A. 시나리오 A — Init → SSOT → Compile → 방법론 강제

- **작업**:
  1. `tsq init --type web-service` 실행 (방법론 tdd 선택)
  2. `.timsquad/ssot/` 에 SSOT 문서 작성
  3. `tsq compile build` 실행
  4. compiled spec이 ssot-map.yaml 티어에 따라 올바른 위치에 생성 확인
  5. controller 위임 시 TDD 방법론 제약 + 해당 티어 spec 포함 확인
- **검증**: 전체 흐름 정상 동작 (수동 시나리오 or 통합 테스트)

### 33-B. 시나리오 B — 데몬 SSOT 감지 → 자동 Compile → Tier 0 주입

- **작업**:
  1. 데몬 실행 상태에서 `.timsquad/ssot/` 파일 수정
  2. 2초 디바운스 후 `tsq compile build` 자동 실행 확인
  3. 다음 프롬프트에서 Tier 0 문서가 systemMessage에 포함 확인
- **검증**: 자동 compile + Tier 0 주입 동작

### 33-C. 시나리오 C — Task → Sequence → Phase 테스트 게이트 + Librarian

- **작업**:
  1. Task 완료 → completion-guard Unit Test 경고 확인
  2. Sequence 완료 → Integration + Build 게이트 실행 확인
  3. Phase 완료 → E2E 게이트 + Librarian 호출 조건 확인
  4. Librarian 호출 시 Phase 종합 리포트 생성 확인
- **검증**: 3단계 게이트 + Librarian 호출 정상

### 33-D. 전체 회귀 테스트

- **작업**:
  1. `npm test` — 전체 단위 테스트 통과
  2. `npm run test:integration` — 통합 테스트 통과
  3. `shellcheck templates/platforms/claude-code/scripts/*.sh` — 전체 통과
  4. `tsc --noEmit` — 타입 체크 클린
  5. 이전 스프린트(03-07, 03-08) 기능 회귀 없음:
     - Hook 시스템 정상 (skill-inject, completion-guard, build-gate)
     - 스킬 표준화 (Contract/Protocol/Verification) 유지
     - 데몬 L1/L2/L3 자동화 유지
- **검증**: 전체 통과

---

## 실행 순서 (Wave)

```
Wave 2-A (병렬, 2d):
  +-- #29: Librarian 에이전트 (M, 2d) -- #26(Phase 0) 완료 후
  +-- #31: SSOT 자동 컴파일 (S, 1d) -- 독립 (데몬 작업)

Wave 2-B (순차, 2d):
  +-- #33-A: 시나리오 A (S, 0.5d) -- #30, #29 완료 후
  +-- #33-B: 시나리오 B (S, 0.5d) -- #31 완료 후
  +-- #33-C: 시나리오 C (M, 0.5d)
  +-- #33-D: 전체 회귀 (S, 0.5d)

Wave 2-C (마무리):
  +-- Reviewer: 전체 교차 검증
  +-- QA: 최종 품질 게이트
```

최적 병렬 실행 시: ~4d

---

## 체크리스트

### #29 DoD
- [ ] 29-A: tsq-librarian.md 에이전트 프롬프트
- [ ] 29-B: librarian/SKILL.md (context:fork, allowed-tools, 120줄 이하)
- [ ] 29-C: controller delegation/triggers 연동
- [ ] 29-D: librarian-constraints.md 규칙 (소스 코드 수정 금지)

### #31 DoD
- [ ] 31-A: FileWatcher SSOT 경로 감시 + ssot-changed 이벤트
- [ ] 31-B: handleSSOTChanged → tsq compile build 자동 실행 (2초 디바운스)
- [ ] 31-C: 소스 코드 감시와 공존 (meta-index 무관)

### #33 DoD
- [ ] 33-A: Init → SSOT → Compile → 방법론 강제 시나리오 통과
- [ ] 33-B: 데몬 SSOT 감지 → 자동 Compile → Tier 0 주입 시나리오 통과
- [ ] 33-C: Task/Sequence/Phase 테스트 게이트 + Librarian 시나리오 통과
- [ ] 33-D: npm test + integration + shellcheck + tsc 전체 통과, 회귀 없음

### 품질 게이트
- [ ] `npm test` 전체 통과
- [ ] `npm run test:integration` 통과
- [ ] `shellcheck` 통과
- [ ] `tsc --noEmit` 클린
- [ ] 이전 스프린트 기능 회귀 없음
- [ ] 보안 리뷰: SSOT 경로 검증 (path traversal 방지)

---

## 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Librarian 토큰 비용 | Phase당 서브에이전트 비용 | Phase 완료 시만 호출 (빈도 매우 낮음) |
| SSOT 감시 + 소스 감시 chokidar 충돌 | watcher 안정성 | 단일 watcher, 경로 패턴 분기 |
| 자동 compile 무한 루프 | compile 결과가 SSOT 경로에 쓰여 재트리거 | compiled spec은 `.claude/skills/` 경로 → SSOT 경로 밖 |
| 통합 시나리오 복잡도 | 검증 시간 초과 | 시나리오별 독립 실행, 핵심 경로만 검증 |
| context:fork Librarian 격리 | Write/Edit 권한 제한 | allowed-tools에 명시적 포함, 공식 문서 확인 |

---

## 완료 후 v4 아키텍처 충족도 (목표)

| 영역 | Sprint 전 | 목표 | 핵심 변경 |
|------|-----------|------|-----------|
| SSOT 주입 | 0% (단절) | **90%** | ssot-map 티어링 + controller 주입 + Tier 0 Hook |
| 방법론 강제 | 0% (하드코딩) | **85%** | init 선택 + controller 방법론 주입 + 스킬 레벨 hooks |
| 테스트 게이트 | 0% (미연결) | **80%** | 3단계 게이트 (Task/Sequence/Phase) |
| 기록 시스템 | 70% (L2/L3 자동) | **90%** | Librarian Phase 리포트 + SSOT 상태 갱신 |
| Claude Code 정렬 | 50% | **85%** | context:fork + allowed-tools + argument-hint + rules/ |
