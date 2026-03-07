# Phase 0 — Stabilization 상세 계획

**승인일**: 2026-03-07
**목표**: E2E 기능 복원 및 핵심 자동화 정상화
**대상 이슈**: #5 (Critical, L/3d), #17 (High, XL/5d+)
**예상 공수**: 5.5d (최적 병렬)

---

## 역할 배치

| 역할 | 담당 영역 | 설명 |
|------|-----------|------|
| Architect | 설계 검증 | 변경 전 아키텍처 영향 분석, 인터페이스 계약 검증 |
| Developer | 구현 | 코드 작성, 단위 테스트 작성 |
| Reviewer | 코드 리뷰 | 구현 완료 후 교차 검증 (보안, 품질, 일관성) |
| QA | 통합/E2E 검증 | DoD 충족 여부 확인, 회귀 테스트 |

---

## Issue #5 — Process/Workflow

### 5-A. TeamCreate 에이전트 도구 실행 (Critical)
- **현재 상태**: 코드베이스에 TeamCreate 관련 코드 없음 — SDK 레벨 이슈 가능성
- **작업**:
  1. Claude Agent SDK의 `TeamCreate` / `Task()` 도구 접근 제한 조사
  2. 재현 테스트 작성 (TeamCreate -> Bash/Edit/Write 실행 시도)
  3. 해결 가능 시 수정, 불가 시 Task() fallback 경로 문서화
- **검증**: 통합 테스트 or fallback 문서 존재
- **관련 파일**: `src/daemon/index.ts` (Task proxy fallback, L115-149)

### 5-B. E2E 영향 분석 (`affected_e2e` 필드)
- **현재 상태**: `compile-rules.ts` — `affected_e2e` 필드 없음, `compiler.ts` — E2E 매핑 로직 없음
- **작업**:
  1. `CompileRule` 스키마에 `affected_e2e` 필드 추가
  2. `tsq compile` 시 변경된 spec -> `__tests__/e2e/` 파일 매핑 로직 구현
  3. 컴파일 출력에 `affected_e2e` + `e2e_action` 주입
- **검증**: 알려진 UI 파일 컴파일 시 올바른 E2E 테스트 파일 매핑 확인 (단위 테스트)
- **관련 파일**: `src/lib/compile-rules.ts`, `src/lib/compiler.ts`

### 5-C. SCR (Single Change Rule) 강제
- **현재 상태**: `controller/SKILL.md` — 텍스트 언급만 있고 프레임워크 레벨 강제 없음
- **작업**:
  1. 컨트롤러 위임 시 태스크 scope 검증 로직 추가
  2. 다중 파일 복합 태스크 감지 -> 자동 분할 + 순차 실행
- **검증**: 복합 태스크 입력 시 분할 확인 (단위 테스트)
- **관련 파일**: `src/commands/workflow.ts` (task-start, L309-341)

### 5-D. 상태 파일 동기화
- **현재 상태**: `saveWorkflowState()` 존재하나 원자적 업데이트 미보장. `set-phase` (L142-163)에서 두 파일 독립 기록
- **작업**:
  1. `setPhase()` 내 workflow.json + current-phase.json 원자적 기록 (write -> rename 패턴)
  2. 실패 시 롤백 보장
- **검증**: phase 전환 후 두 파일 일관성 확인 (통합 테스트)
- **관련 파일**: `src/lib/workflow-state.ts` (L64-81), `src/commands/workflow.ts` (L142-163)

---

## Issue #17 — Daemon/Automation

### 17-A. L2 시퀀스 로그 자동 생성
- **현재 상태**: `event-queue.ts` L205-241에 `sequence-complete` 핸들러 존재하나 실제 발동 안 됨 (24/24 `l2_created: false`)
- **작업**:
  1. 시퀀스 완료 감지 로직 디버깅 — `isSequenceComplete()` 호출 경로 추적
  2. `track-task` -> 시퀀스 완료 체크 -> L2 생성 파이프라인 수정
  3. `l2_created: true` 설정 확인
- **검증**: 시퀀스 내 모든 태스크 완료 후 L2 로그 자동 생성 확인 (통합 테스트)
- **관련 파일**: `src/daemon/event-queue.ts`, `src/lib/workflow-state.ts` (L86-90), `src/commands/workflow.ts` (L380-410)

### 17-B. L3 페이즈 로그 자동 생성
- **현재 상태**: `event-queue.ts` L245-299에 코드 존재하나 L2 미생성으로 연쇄 미작동
- **작업**:
  1. 17-A 완료 후 L3 자동 생성 경로 검증
  2. 모든 시퀀스 L2 완료 -> L3 생성 트리거 확인
- **검증**: 페이즈 내 모든 시퀀스 완료 후 L3 로그 자동 생성 (통합 테스트)
- **관련 파일**: `src/daemon/event-queue.ts` (L245-299), `src/commands/workflow.ts` (L434-447)

### 17-C. Phase Gate 강제
- **현재 상태**: `buildPhaseGateData()` 평가는 하지만 `set-phase`가 조건 미충족 시에도 전환 허용
- **작업**:
  1. `setPhase()` 내 gate 조건 평가 추가 (감사 점수, 크리티컬 이슈, 테스트 통과율, 빌드 상태)
  2. 미충족 시 전환 차단 + 진단 메시지 출력
  3. `--force` 플래그로 우회 가능하도록 (의도적 오버라이드)
- **검증**: gate 미충족 시 전환 차단 확인, `--force` 시 경고 후 통과 (단위 테스트)
- **관련 파일**: `src/commands/workflow.ts` (L142-163), `src/commands/log.ts`

### 17-D. `tsq daemon status` 명령
- **현재 상태**: 존재하지 않음. `session-state.ts`에 세션 데이터 있으나 조회 CLI 없음
- **작업**:
  1. `tsq daemon status` 서브커맨드 추가 — pid, uptime, 세션 통계, 자동화 플래그별 발동 횟수
  2. session-state.ts 데이터 + pid 파일 기반 출력
- **검증**: 데몬 실행 중 `tsq daemon status` 출력 확인 (수동 검증)
- **관련 파일**: `src/commands/daemon.ts`, `src/daemon/session-state.ts`

### 17-E. 데몬 로그 JSONL 구조화
- **현재 상태**: `jsonl-watcher.ts` 존재하나 `.daemon.log`는 비구조화 텍스트 798KB
- **작업**:
  1. 데몬 로그 출력을 JSONL 포맷으로 전환 (이벤트 타입, 타임스탬프, 결과)
  2. 기존 텍스트 로그 -> JSONL 마이그레이션 로직
- **검증**: 데몬 실행 후 로그 파일이 유효한 JSONL 형식 확인 (단위 테스트)
- **관련 파일**: `src/daemon/index.ts`, `src/daemon/jsonl-watcher.ts`

---

## 실행 순서 (Wave)

```
Wave 0-A (병렬, 2d):
  +-- 5-D: 상태 파일 동기화 (S, 0.5d) -- 독립, 빠른 win
  +-- 5-A: TeamCreate 조사 (M, 1d) -- SDK 조사 선행
  +-- 17-E: 데몬 로그 JSONL (S, 1d) -- 독립, 관측성 기반

Wave 0-B (순차, 3d):
  +-- 17-A: L2 자동 생성 (M, 2d) -- 핵심 파이프라인
  +-- 17-B: L3 자동 생성 (S, 1d) -- 17-A 완료 후

Wave 0-C (병렬, 2d):
  +-- 5-B: E2E 영향 분석 (M, 1.5d) -- 컴파일러 확장
  +-- 5-C: SCR 강제 (S, 1d) -- 컨트롤러 로직
  +-- 17-C: Phase Gate 강제 (M, 1d) -- 17-A/B 완료 후

Wave 0-D (마무리, 1d):
  +-- 17-D: daemon status 명령 (S, 0.5d)
  +-- QA: 전체 통합 검증 + 회귀 테스트
```

최적 병렬 실행 시: ~5.5d

---

## 교차 검증 프로토콜

| 단계 | 역할 | 수행 내용 |
|------|------|-----------|
| 구현 전 | Architect | 변경 대상 파일 목록 + 인터페이스 영향 분석 |
| 구현 중 | Developer | 수정 기록 CCTV -- 변경 파일/라인 자동 추적 (`git diff --stat`) |
| 구현 후 | Reviewer | 코드 리뷰 체크리스트 (보안, 타입 안전성, 에러 핸들링) |
| 검증 | QA | DoD 체크리스트 순회 + `npm test` + 회귀 확인 |
| 리마인더 | 자동 | "보안 위험은 없나요?", "기존 API 호환성은?", "에지케이스 처리?" |

---

## 체크리스트

### #5 DoD 체크리스트
- [ ] 5-A: TeamCreate 에이전트가 Bash/Edit/Write 실행 (또는 fallback 문서화)
- [ ] 5-B: `tsq compile` 출력에 `affected_e2e` 필드 포함
- [ ] 5-C: 컨트롤러가 다중 태스크 위임 거부 + 순차 분할
- [ ] 5-D: `tsq wf set-phase` 원자적 업데이트 (desync 없음)
- [ ] 단위 테스트 통과: 5-B, 5-C, 5-D
- [ ] 통합 테스트 통과: 5-A, 5-D

### #17 DoD 체크리스트
- [ ] 17-A: 시퀀스 완료 시 L2 로그 자동 생성 + `l2_created: true`
- [ ] 17-B: 페이즈 완료 시 L3 로그 자동 생성
- [ ] 17-C: `tsq wf set-phase` gate 미충족 시 차단 + 진단 메시지
- [ ] 17-D: `tsq daemon status` 출력 정상
- [ ] 17-E: 데몬 로그 JSONL 형식 검증
- [ ] 단위 테스트 통과: 17-C, 17-E
- [ ] 통합 테스트 통과: 17-A, 17-B, 17-D

### 품질 게이트
- [ ] `npm test` 전체 통과
- [ ] `npm run test:integration` 통과
- [ ] ShellCheck: 변경된 .sh 파일 통과
- [ ] 보안 리뷰: 파일 쓰기 시 path traversal 없음
- [ ] 기존 API 하위 호환성 유지

---

## 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| TeamCreate SDK 제한 해결 불가 | 5-A fallback 필요 | Task() proxy 문서화로 DoD 충족 |
| L2 미발동 원인 불명 | 17-A 장기화 | 이벤트 큐 디버그 로깅 추가 후 재추적 |
| Phase Gate 조건 정의 모호 | 17-C 기준 불명확 | 최소 기준: test pass rate >= 80%, no critical issues |
