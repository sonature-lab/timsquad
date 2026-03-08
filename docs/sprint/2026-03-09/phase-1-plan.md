# Phase 1 — Methodology + Test Gates (방법론 + 테스트 게이트) 상세 계획

**승인일**: 2026-03-09
**목표**: Init 방법론/아키텍처 선택, Controller 방법론 강제, 3단계 테스트 게이트
**대상 이슈**: #27 (M/2d), #28 (M/2d), #30 (L/3d), #32 (S/1d)
**예상 공수**: 5d (최적 병렬)
**진입 조건**: Phase 0 DoD 전체 충족

---

## 역할 배치

| 역할 | 담당 | 근거 |
|------|------|------|
| Architect | #28 방법론-컨트롤러 연동 설계 | 방법론 주입 아키텍처 결정 |
| Developer-A | #27 init 개선 | CLI 프롬프트 + config 확장 |
| Developer-B | #30 테스트 게이트 | Hook + workflow.ts 확장 |
| Developer-C | #32 rules/Hook 정비 | 문서 + 스크립트 |
| Reviewer | 교차 검증 | init 회귀, 게이트 오탐, 프롬프트 품질 |
| QA | DoD 체크리스트 | 전체 테스트 + ShellCheck + 통합 |

---

## Issue #27 — Init 개선

### 27-A. 방법론 선택 프롬프트

- **현재 상태**: `config.methodology.development` 항상 `'tdd'` 하드코딩. 선택 프롬프트 없음
- **작업**:
  1. `src/commands/init.ts`에 방법론 선택 추가:
     ```
     Development methodology:
       > TDD (Test-Driven Development)
         BDD (Behavior-Driven Development)
         None (방법론 제약 없음)
     ```
  2. `config.yaml`의 `methodology.development` 필드에 저장
  3. `-y` 옵션 시 기본값: `'tdd'`
- **검증**: `tsq init` 대화형에서 방법론 선택 → config.yaml 반영 확인

### 27-B. 아키텍처 패턴 프롬프트

- **작업**:
  1. `src/commands/init.ts`에 아키텍처 선택 추가:
     ```
     Architecture pattern:
       > Layered (전통적 계층 구조)
         Clean Architecture (의존성 역전)
         Hexagonal (포트 & 어댑터)
         None (아키텍처 제약 없음)
     ```
  2. `config.yaml`에 `methodology.architecture` 필드 추가
  3. `src/types/config.ts`에 타입 추가
- **검증**: config.yaml에 architecture 필드 저장 확인

### 27-C. Stack 인터랙티브 프롬프트

- **현재 상태**: `--stack` CLI 옵션으로만 입력 가능. 대화형 프롬프트 없음
- **작업**:
  1. init 대화형에서 Stack 입력 프롬프트 추가
  2. 쉼표 구분 자유 입력 (예: `react, node, prisma, typescript`)
  3. 빈 입력 시 스킵
- **검증**: Stack 입력 → config.yaml 반영

### 27-D. 동적 방법론 스킬 배포

- **작업**:
  1. `src/lib/skill-generator.ts`에 `getMethodologySkills()` 함수 추가:
     ```typescript
     function getMethodologySkills(config: TimsquadConfig): string[] {
       const dev = config.methodology.development;
       if (dev === 'none') return [];
       return [`methodology/${dev}`];
     }
     ```
  2. `getActiveSkills()`에서 `getMethodologySkills()` 호출하여 스킬 목록에 포함
  3. 기존 `SKILL_PRESETS`의 하드코딩 methodology 제거
- **검증**: 방법론 `none` 선택 시 methodology 스킬 미배포 확인

### 27-E. 컨트롤러 스킬 디렉토리 자동 생성

- **작업**:
  1. `tsq init` 시 controller 스킬 하위 triggers/ + delegation/ 자동 생성
  2. Phase 0의 #24에서 만든 템플릿 파일 복사
- **검증**: `tsq init` 후 `.claude/skills/controller/triggers/`, `delegation/` 존재

---

## Issue #28 — Controller 방법론 강제

### 28-A. config 읽기 + 방법론 Protocol 로드

- **현재 상태**: controller가 config.methodology 참조하지 않음
- **작업**:
  1. controller Protocol에 단계 추가:
     ```
     1. config.yaml에서 methodology.development 읽기
     2. methodology/{value}/SKILL.md 존재 확인
     3. 해당 스킬의 Protocol 섹션 추출
     ```
  2. controller SKILL.md 본문에 방법론 참조 지시 추가
- **검증**: controller가 위임 시 방법론 Protocol 포함 확인

### 28-B. 방법론별 위임 프롬프트 주입

- **작업**:
  1. TDD 위임 시: "테스트를 먼저 작성하고, 실패를 확인한 후 구현하라"
  2. BDD 위임 시: "Gherkin 시나리오를 먼저 정의하고 구현하라"
  3. None 시: 방법론 제약 없음
  4. delegation/developer.md에 방법론 주입 규칙 명시
- **검증**: 서브에이전트 프롬프트에 방법론 제약 포함 확인

### 28-C. 스킬 레벨 hooks (선택적)

- **현재 상태**: 스킬 레벨 hooks 사용 0건
- **작업**:
  1. `methodology/tdd/SKILL.md` frontmatter에 hooks 추가:
     ```yaml
     hooks:
       PreToolUse:
         - matcher: "Write|Edit"
           hooks:
             - type: prompt
               prompt: "이 파일에 대한 테스트가 먼저 작성되었는지 확인하라"
     ```
  2. TDD 스킬 활성 시에만 테스트-먼저 검증 실행
- **검증**: TDD 스킬 활성 상태에서 Write 시 prompt 주입 확인

---

## Issue #30 — 테스트 게이트

### 30-A. Task 게이트 (Unit Test)

- **현재 상태**: completion-guard.sh가 bash 실행 여부만 확인
- **작업**:
  1. completion-guard.sh 확장 — Stop 시점에 단위 테스트 실행 여부 확인
  2. 변경 파일 기반 관련 테스트 식별 (파일명 매칭: `*.test.ts`, `*.spec.ts`)
  3. 관련 테스트 미실행 시 systemMessage로 경고 주입
  4. test-strategy.md (SSOT)에서 실행 명령 참조
- **수정**: `templates/platforms/claude-code/scripts/completion-guard.sh`
- **검증**: 코드 변경 후 관련 테스트 미실행 시 경고 출력

### 30-B. Sequence 게이트 (Integration + Build)

- **현재 상태**: workflow.ts checkAndAutomate에 통합 테스트 게이트 없음
- **작업**:
  1. `src/daemon/event-queue.ts` handleSequenceComplete 확장
  2. 시퀀스 완료 시 `npm run test:integration` + `tsc --noEmit` 실행
  3. 실패 시 시퀀스 상태를 `blocked`으로 변경 + 에러 로깅
  4. 성공 시 기존 L2 생성 + 다음 시퀀스 허용
- **수정**: `src/daemon/event-queue.ts`
- **검증**: 시퀀스 완료 시 integration 테스트 실행 확인 (통합 테스트)

### 30-C. Phase 게이트 (E2E)

- **현재 상태**: buildPhaseGateData에 E2E 결과 미포함
- **작업**:
  1. `src/commands/log.ts` buildPhaseGateData 확장
  2. Phase 게이트 조건에 E2E 테스트 통과 추가
  3. `.e2e-passed` 마커 파일 읽기 → 결과 반영
  4. E2E 미실행/실패 시 `can_transition: false`
- **수정**: `src/commands/log.ts`
- **검증**: E2E 미통과 시 Phase 전환 차단 확인

### 30-D. Test Strategy SSOT 문서

- **작업**:
  1. `templates/base/ssot/test-strategy.md` 신규
  2. 구조:
     ```markdown
     ## Unit Tests
     - 대상: src/ 하위 모든 .ts 파일
     - 명령: npm run test:unit
     - 커버리지 기준: 80%

     ## Integration Tests
     - 대상: 모듈 간 연동
     - 명령: npm run test:integration
     - 실행 시점: Sequence 완료 시

     ## E2E Tests
     - 대상: 사용자 시나리오
     - 명령: npm run test:e2e
     - 실행 시점: Phase 완료 시
     ```
  3. `tsq init` 시 `.timsquad/ssot/test-strategy.md` 배치
- **검증**: 문서 존재 + compile 가능

---

## Issue #32 — .claude/rules/ + Hook 정비

### 32-A. 경로별 조건부 규칙

- **작업**:
  1. `templates/platforms/claude-code/rules/` 디렉토리 신규
  2. `api-conventions.md`:
     ```yaml
     ---
     paths:
       - "src/api/**/*.ts"
       - "src/routes/**/*.ts"
     ---
     - RESTful 네이밍 사용
     - 에러 응답 표준 형식 (code, message, details)
     ```
  3. `test-conventions.md`:
     ```yaml
     ---
     paths:
       - "tests/**/*.test.ts"
       - "**/*.spec.ts"
     ---
     - describe/it 3단계 이하
     - 테스트 데이터는 fixtures/ 사용
     ```
  4. `tsq init` 시 `.claude/rules/` 자동 배치

### 32-B. Hook Execution Order 정책 문서

- **작업**:
  1. `docs/hook-execution-order.md` 신규
  2. 전체 Hook 목록 + 실행 순서 + 충돌 규칙 명세
  3. 신규 Hook 추가 시 준수 사항

### 32-C. Skill Injection Matrix 자동 생성

- **작업**:
  1. `scripts/generate-injection-matrix.sh` 신규
  2. skill-rules.json 파싱 → 스킬 × 키워드 매트릭스 마크다운 생성
  3. `docs/skill-injection-matrix.md`에 출력

---

## 실행 순서 (Wave)

```
Wave 1-A (병렬, 2d):
  +-- #27: Init 방법론/아키텍처 (M, 2d) -- root
  +-- #32-A: .claude/rules/ (S, 0.5d) -- root
  +-- #32-B: Hook 정책 문서 (XS, 0.25d)
  +-- #32-C: Injection Matrix (XS, 0.25d)

Wave 1-B (순차, 2d):
  +-- #28: Controller 방법론 강제 (M, 2d) -- #24(Phase 0), #27 완료 후

Wave 1-C (순차, 3d):
  +-- #30-A: Task 게이트 (S, 0.5d) -- #28 완료 후
  +-- #30-B: Sequence 게이트 (M, 1d)
  +-- #30-C: Phase 게이트 (M, 1d)
  +-- #30-D: Test Strategy 문서 (S, 0.5d)

Wave 1-D (마무리, 0.5d):
  +-- Reviewer: 전체 교차 검증
  +-- QA: npm test + ShellCheck + 회귀
```

최적 병렬 실행 시: ~5d

---

## 체크리스트

### #27 DoD
- [ ] 27-A: 방법론 선택 프롬프트 (tdd/bdd/none) → config.yaml 저장
- [ ] 27-B: 아키텍처 패턴 프롬프트 → config.yaml 저장
- [ ] 27-C: Stack 인터랙티브 프롬프트
- [ ] 27-D: getMethodologySkills() + SKILL_PRESETS 하드코딩 제거
- [ ] 27-E: controller triggers/delegation 자동 생성

### #28 DoD
- [ ] 28-A: controller Protocol에 methodology 참조 단계
- [ ] 28-B: 방법론별 위임 프롬프트 (TDD/BDD/None)
- [ ] 28-C: methodology/tdd SKILL.md에 스킬 레벨 hooks (선택적)

### #30 DoD
- [ ] 30-A: Task 게이트 — completion-guard unit test 경고
- [ ] 30-B: Sequence 게이트 — workflow integration + build 체크
- [ ] 30-C: Phase 게이트 — E2E 결과 반영
- [ ] 30-D: test-strategy.md SSOT 문서 + init 배치

### #32 DoD
- [ ] 32-A: .claude/rules/ (api-conventions, test-conventions)
- [ ] 32-B: Hook Execution Order 정책 문서
- [ ] 32-C: Skill Injection Matrix 자동 생성

### 품질 게이트
- [ ] `npm test` 전체 통과
- [ ] `shellcheck` 통과
- [ ] `tsc --noEmit` 클린
- [ ] 기존 init 테스트 회귀 없음
- [ ] 기존 Hook 동작 정상

---

## 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| init 프롬프트 과다 | UX 저하 (질문이 너무 많음) | methodology/architecture는 optional, `-y` 시 기본값 |
| SKILL_PRESETS 변경 회귀 | 기존 프로젝트 스킬 누락 | 기존 preset 유지, methodology만 동적화 |
| 테스트 게이트 오탐 | 무관한 테스트 실패로 차단 | 변경 파일 기반 타겟, fail-open 옵션 |
| 스킬 레벨 hooks 지원 | Claude Code 버전별 차이 | 공식 문서 확인, 미지원 시 skip |
| Sequence 게이트 타임아웃 | integration 테스트 장시간 | 5분 타임아웃 + fail-open |
