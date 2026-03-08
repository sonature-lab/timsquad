# Phase 1 — Standardization & Injection (표준화 + 주입) 상세 계획

**승인일**: 2026-03-08
**목표**: 스킬 파일 표준화 (Contract/Protocol/Verification) + 강제 주입 시스템
**대상 이슈**: #20 (M/2d), #21 (L/2.5d)
**예상 공수**: 3d (최적 병렬)
**진입 조건**: Phase 0 DoD 전체 충족

---

## 역할 배치

| 역할 | 담당 | 근거 |
|------|------|------|
| Architect | #20 표준 섹션 설계, #21 주입 아키텍처 | 새 표준 도입이므로 설계 선행 |
| Developer-A | #20 스킬 표준화 | 14개 스킬 중 핵심 6개 적용 |
| Developer-B | #21 주입 시스템 | Hook 스크립트 + 신규 스킬 |
| Reviewer | 교차 검증 | 120줄 제한 준수, Hook 안정성, 프롬프트 품질 |
| QA | DoD 체크리스트 | 전체 테스트 + ShellCheck + knowledge validate |

---

## Issue #20 — 스킬 템플릿 표준화

### 아키텍처 결정 (Architect, Wave 1-A)

120줄 제한 내에서 3개 신규 섹션을 수용하기 위한 구조 설계:

**Option A**: Quick Rules + Checklist를 Verification으로 통합 (절약: ~15줄)
**Option B**: Quick Rules를 `rules/quick-rules.md`로 분리, SKILL.md에 링크만 유지 (절약: ~20줄)
**권장**: Option A — Checklist의 역할이 Verification과 겹치므로 통합이 자연스러움

### 20-A. _template/SKILL.md 표준 섹션 추가

- **현재 상태**: Philosophy, Resources, Quick Rules, Checklist 4개 섹션
- **작업**:
  1. **Contract** 섹션 추가 — 스킬 활성화 조건, 입력 요구사항, 출력 보장
  ```markdown
  ## Contract
  - **Trigger**: {스킬 활성화 조건}
  - **Input**: {필요한 입력/컨텍스트}
  - **Output**: {보장하는 출력/결과}
  - **Error**: {실패 시 행동}
  ```
  2. **Protocol** 섹션 추가 — 실행 절차 (단계별)
  ```markdown
  ## Protocol
  1. {첫 번째 단계}
  2. {두 번째 단계}
  3. {세 번째 단계}
  ```
  3. **Verification** 섹션 추가 — Checklist 통합 + 검증 명령
  ```markdown
  ## Verification
  | Check | Command | Pass Criteria |
  |-------|---------|---------------|
  | {항목} | `{실행 명령}` | exit code 0 |
  ```
  4. 기존 Checklist 섹션 제거 (Verification으로 대체)
- **검증**: 템플릿이 62줄 이하 (가이드 주석 포함), `tsq knowledge validate` 통과

### 20-B. 핵심 스킬 6개 표준 적용

대상: coding, testing, security, controller, tsq-protocol, product-audit

각 스킬에 대해:

#### coding (현재 48줄)
- Contract: 코드 작성 태스크 시 활성, 네이밍/에러핸들링 보장
- Protocol: 1) 컨벤션 확인 → 2) 구현 → 3) 린트 → 4) 리뷰
- Verification: `tsc --noEmit`, `npm run lint`, any 타입 grep
- 압축: 기존 Rules 섹션을 Quick Rules로 통합 (중복 제거)

#### testing (현재 93줄 — 120 제한 주의)
- Contract: 테스트 작성 태스크 시 활성, TDD 사이클 보장
- Protocol: 1) Red → 2) Green → 3) Refactor → 4) Coverage 확인
- Verification: `npm test`, coverage >= 80%, E2E flaky count
- 압축: E2E Stability Guide를 `references/e2e-stability.md`로 분리 (현재 인라인 ~30줄)

#### security (현재 56줄)
- Contract: 보안 관련 코드 변경 시 활성, OWASP 준수 보장
- Protocol: 1) 위협 모델링 → 2) 구현 → 3) OWASP 체크 → 4) 시크릿 스캔
- Verification: `shellcheck`, `npm audit`, secrets grep

#### controller (현재 120줄 — 한계)
- Contract: 서브에이전트 위임 시 활성, spec resolve 보장
- Protocol: 이미 Delegation Process로 존재 (재구성)
- Verification: stale check, prerequisite 존재, Task() 사용
- 압축: Mode Declaration + XML 태그 → 3줄 요약으로 압축

#### tsq-protocol (현재 52줄)
- Contract: 모든 에이전트 세션에서 활성, TSQ 프로세스 준수 보장
- Protocol: 1) task-context 확인 → 2) TSQ CLI 사용 → 3) 피드백 라우팅
- Verification: tsq log 사용 확인, 직접 파일 조작 없음

#### product-audit (현재 88줄)
- Contract: 감사 태스크 시 활성, 체계적 평가 보장
- Protocol: Phase A→B→C→D (이미 존재, 재구성)
- Verification: source 필드 존재, FP registry 최신, diff 확인

- **검증**: 6개 스킬 모두 120줄 이하, `tsq knowledge validate` 통과, `prompt-quality.test.ts` 통과

### 20-C. depends_on/conflicts_with 본문 반영

- **현재 상태**: frontmatter에만 존재, 본문에 미반영
- **작업**:
  1. Contract 섹션 내 Dependencies 서브항목으로 표시
  2. 6개 스킬의 실제 의존성 선언 검증
- **검증**: `tsq compile validate` 의존성 그래프 정상

---

## Issue #21 — 스킬 강제 주입 시스템

### 21-A. skill-inject.sh (UserPromptSubmit 강화)

- **현재 상태**: `skill-suggest.sh`가 `additionalContext`로 제안만 함
- **작업**:
  1. `skill-inject.sh` 신규 — skill-suggest.sh 로직 확장
  2. 매칭 점수 threshold 이상 스킬의 SKILL.md 핵심 내용을 `systemMessage`로 강제 주입
  3. 주입 내용: Contract + Protocol + Verification 섹션만 (전체 SKILL.md 아닌 핵심만)
  4. 토큰 예산 관리: 최대 3개 스킬, 스킬당 최대 500자
  5. 기존 `skill-suggest.sh`는 `skill-inject.sh`로 대체 (하위 호환 유지)
- **검증**: 코딩 관련 프롬프트 → coding 스킬 Contract/Verification 주입 확인 (단위 테스트)
- **생성**: `templates/platforms/claude-code/scripts/skill-inject.sh`
- **수정**: `templates/platforms/claude-code/settings.json` (UserPromptSubmit hook 교체)

### 21-B. main-session-constraints 스킬

- **현재 상태**: CLAUDE.md에 인라인된 작업 원칙 + 제약사항
- **작업**:
  1. `templates/base/skills/main-session-constraints/SKILL.md` 신규
  2. 내용: 메인세션(PM) 역할 제약, 작업 원칙, 금지사항
  3. Contract: 메인세션 시작 시 항상 활성
  4. Protocol: 1) 요구사항 분석 → 2) 스킬 확인 → 3) 위임 or 직접 수행
  5. Verification: spec 존재 확인, SCR 준수, 테스트 통과
  6. `skill-inject.sh`에서 메인세션 시 자동 매칭 (높은 우선순위)
- **검증**: `tsq knowledge validate` 통과, 기존 CLAUDE.md 작업 원칙과 일치

### 21-C. SessionStart compact 훅

- **현재 상태**: SessionStart에 `tsq daemon start` 훅만 존재
- **작업**:
  1. `templates/platforms/claude-code/scripts/context-restore.sh` 신규
  2. compact 이벤트 감지 → 핵심 컨텍스트 재주입
  3. 주입 내용: 프로젝트명, 현재 Phase, 활성 태스크, 핵심 제약 3줄
  4. `settings.json`에 SessionStart compact matcher 추가
- **검증**: compact 시뮬레이션 → 컨텍스트 재주입 확인
- **생성**: `templates/platforms/claude-code/scripts/context-restore.sh`

### 21-D. SubagentStart 프로토콜 자동 주입

- **현재 상태**: SubagentStart에 `tsq daemon notify` 훅만 존재
- **작업**:
  1. SubagentStart 훅 확장 — tsq-protocol SKILL.md 핵심 내용 주입
  2. 에이전트 frontmatter `skills:` 필드 기반으로 해당 스킬 Contract 주입
  3. 토큰 예산: 최대 1000자 (프로토콜 + 스킬 Contract)
- **검증**: 서브에이전트 시작 시 프로토콜 컨텍스트 존재 확인
- **수정**: `templates/platforms/claude-code/settings.json`

### 21-E. skill-rules.json 임계값 조정

- **현재 상태**: threshold 4 (제안 수준)
- **작업**:
  1. threshold를 2로 하향 (더 적극적 매칭)
  2. 패턴 가중치 재조정: keyword 2pt → 3pt, pattern 4pt → 5pt
  3. 신규 스킬(tsq-cli, main-session-constraints) 규칙 추가
- **검증**: 일반적 프롬프트에서 관련 스킬 90% 이상 매칭 (수동 검증)
- **수정**: `templates/platforms/claude-code/scripts/skill-rules.json`

---

## 실행 순서 (Wave)

```
Wave 1-A (병렬, 1.5d):
  +-- Architect: #20 표준 섹션 구조 설계 (0.25d)
  +-- 20-A: _template/SKILL.md 표준화 (S, 0.5d)
  +-- 21-B: main-session-constraints 스킬 초안 (S, 0.5d) -- #19 완료 후
  +-- 21-E: skill-rules.json 임계값 조정 (XS, 0.25d)

Wave 1-B (병렬, 2d):
  +-- 20-B: 핵심 스킬 6개 적용 (M, 2d) -- 20-A 완료 후
  +-- 21-A: skill-inject.sh (M, 1.5d) -- 21-E 완료 후

Wave 1-C (순차, 1d):
  +-- 21-C: context-restore.sh (S, 0.5d)
  +-- 21-D: SubagentStart 주입 (S, 0.5d)
  +-- 20-C: depends_on 본문 반영 (XS, 0.25d)

Wave 1-D (마무리, 0.5d):
  +-- Reviewer: 전체 교차 검증
  +-- QA: npm test + ShellCheck + knowledge validate + 회귀
```

최적 병렬 실행 시: ~3d

---

## 체크리스트

### #20 DoD
- [x] 20-A: _template/SKILL.md에 Contract / Protocol / Verification 섹션 (70줄)
- [x] 20-B-1: coding SKILL.md 표준 적용 (67줄)
- [x] 20-B-2: testing SKILL.md 표준 적용 (76줄, E2E → references/e2e-stability.md)
- [x] 20-B-3: security SKILL.md 표준 적용 (68줄)
- [x] 20-B-4: controller SKILL.md 표준 적용 (65줄, Mode Declaration 압축)
- [x] 20-B-5: tsq-protocol SKILL.md 표준 적용 (67줄)
- [x] 20-B-6: product-audit SKILL.md 표준 적용 (62줄)
- [x] 20-C: depends_on/conflicts_with 본문 Contract.Dependencies로 반영
- [x] `prompt-quality.test.ts` 통과 (모든 스킬 120줄 이하)

### #21 DoD
- [x] 21-A: skill-inject.sh — 매칭 스킬 systemMessage 강제 주입 (keyword 3pt, pattern 5pt)
- [x] 21-B: main-session-constraints/SKILL.md — 메인세션 제약 스킬
- [x] 21-C: context-restore.sh — compact 후 컨텍스트 재주입
- [x] 21-D: subagent-inject.sh — SubagentStart tsq-protocol 주입
- [x] 21-E: skill-rules.json 임계값 2 + main-session-constraints/tsq-cli 규칙 추가
- [x] settings.json 기존 Hook 순서 유지 + 3개 Hook append
- [x] ShellCheck 통과 (3개 신규 .sh 파일)

### 품질 게이트
- [x] `npm test` 전체 통과 (633/633)
- [x] `shellcheck` 통과
- [x] `tsc --noEmit` 클린
- [x] 기존 Hook 동작 정상 (순서 유지, append only)

---

## 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 120줄 제한 vs 3개 섹션 추가 | testing/controller 스킬 초과 | Quick Rules 압축, 상세 → rules/references 위임 |
| skill-inject.sh 5s timeout | UserPromptSubmit 지연 | jq 파이프라인 최적화, 캐시 활용 |
| systemMessage 토큰 과다 | 컨텍스트 예산 초과 | 스킬당 500자 상한, 최대 3개 스킬 |
| compact 훅 타이밍 | 데몬 start와 충돌 | matcher: compact로 정확한 이벤트 필터링 |
| 기존 skill-suggest.sh 제거 | 하위 호환 깨짐 | skill-inject.sh가 suggest 기능 포함 (상위 호환) |
