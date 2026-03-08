# Phase 0 — SSOT Infrastructure (SSOT 인프라) 상세 계획

**승인일**: 2026-03-09
**목표**: SSOT Map 티어링 + Controller 주입 경로 개통 + Claude Code 공식 기능 정렬
**대상 이슈**: #23 (M/2d), #24 (M/2d), #25 (S/1d), #26 (S/1d)
**예상 공수**: 3d (최적 병렬)
**진입 조건**: 이전 스프린트(2026-03-08, Skill Injection Pipeline) 완료

---

## 역할 배치

| 역할 | 담당 | 근거 |
|------|------|------|
| Architect | #23 스키마 설계, #24 controller 구조 | SSOT 티어링은 아키텍처 결정 선행 필요 |
| Developer-A | #23 구현, #25 Hook 확장 | SSOT 컴파일 경로 전체 |
| Developer-B | #24 controller 스킬, #26 공식 기능 | 스킬 파일 작업 |
| Reviewer | 교차 검증 | 스키마 일관성, Hook 안정성 |
| QA | DoD 체크리스트 | 전체 테스트 + ShellCheck |

---

## Issue #23 — SSOT Map 티어링

### 23-A. ssot-map.yaml 스키마 설계

- **현재 상태**: SSOT Map 개념 없음. compiled spec은 생성되지만 티어링/주입 경로 미정의
- **작업**:
  1. `ssot-map.yaml` 스키마 설계 (4-tier)
  ```yaml
  tier-0-always:
    inject_via: hook  # skill-inject.sh가 systemMessage로 주입
    documents:
      - compiled: rules/security-constraints.md
        source: ssot/security-spec.md
      - compiled: rules/completion-criteria.md
        source: ssot/requirements.md

  tier-1-phase:
    inject_via: controller
    documents:
      - compiled: references/prd-summary.spec.md
        source: ssot/prd.md
      - compiled: references/architecture.spec.md
        source: ssot/architecture.md

  tier-2-sequence:
    inject_via: controller
    documents:
      - compiled: "references/{section}.spec.md"
        source: ssot/service-spec.md
        split: H3

  tier-3-task:
    inject_via: controller
    documents:
      - compiled: "references/{scenario}.spec.md"
        source: ssot/functional-spec.md
        split: H2
  ```
  2. TypeScript 타입 정의 (`src/types/ssot-map.ts`)
  3. 로드/파싱 유틸리티 (`src/lib/ssot-map.ts`)
- **검증**: 스키마 타입 체크 + 예시 YAML 파싱 단위 테스트

### 23-B. 기본 템플릿 생성

- **작업**:
  1. `templates/base/ssot-map.yaml` — 프로젝트 타입별 기본 문서 배치
  2. 프로젝트 타입별 변형: web-service는 api-contract 포함, fintech는 compliance 포함
  3. `tsq init` 시 자동 배치 (`.timsquad/ssot-map.yaml`)
- **검증**: `tsq init --type web-service` 후 ssot-map.yaml 존재 + 올바른 내용

### 23-C. tsq compile 통합

- **작업**:
  1. `tsq compile build`가 ssot-map.yaml 읽기
  2. 티어별 대상 SSOT 문서 확인 → compiled spec 생성
  3. Tier 0 문서는 `rules/`에, Tier 1-3은 `references/`에 배치
  4. compile-manifest에 티어 정보 포함
- **검증**: compile 후 ssot-map.yaml의 모든 문서에 대한 compiled spec 존재

---

## Issue #24 — Controller Protocol 개선

### 24-A. SSOT Map 참조 Protocol 추가

- **현재 상태**: controller SKILL.md에 SSOT Map 참조 없음. 위임 시 spec 미포함
- **작업**:
  1. controller Protocol에 단계 추가:
     - "SSOT Map 읽기 → 현재 작업 단위 판단 → 해당 티어 spec 로드"
  2. 위임 프롬프트에 compiled spec 포함 지시
  3. 토큰 예산 가이드: 티어별 최대 500자
- **검증**: controller가 위임 시 해당 티어 spec을 프롬프트에 포함하는지 확인

### 24-B. triggers/ 디렉토리 신규

- **작업**:
  1. `templates/base/skills/controller/triggers/` 신규
  2. `ssot-changed.md` — SSOT 변경 시 행동 규칙 (라이브러리안 호출 or 재컴파일)
  3. `task-complete.md` — 태스크 완료 시 테스트 게이트 + L1 확인
  4. `sequence-complete.md` — 시퀀스 완료 시 통합테스트 + L2
  5. `phase-complete.md` — 페이즈 완료 시 e2e + L3 + Librarian
- **검증**: controller SKILL.md에서 triggers/ 참조 + 파일 존재

### 24-C. delegation/ 디렉토리 신규

- **작업**:
  1. `templates/base/skills/controller/delegation/` 신규
  2. `librarian.md` — 라이브러리안 호출 규칙 + 권한 (Write/Edit 허용, src/ 금지)
  3. `developer.md` — 개발자 위임 규칙 (방법론 포함, 테스트 요구)
  4. `reviewer.md` — 리뷰어 위임 규칙 (Read-only, 6관점)
- **검증**: delegation/ 파일 존재 + controller Protocol에서 참조

---

## Issue #25 — skill-inject.sh Tier 0 확장

### 25-A. Tier 0 상시 문서 주입

- **현재 상태**: skill-inject.sh가 매칭 스킬의 Contract/Protocol만 주입
- **작업**:
  1. skill-inject.sh에 Tier 0 주입 로직 추가
  2. `.timsquad/ssot-map.yaml`의 `tier-0-always.documents` 읽기
  3. 각 `compiled` 경로의 파일 내용을 systemMessage에 추가
  4. 토큰 예산: Tier 0 합계 500자 이하 (초과 시 경고 로깅)
  5. ssot-map.yaml 미존재 시 graceful skip
- **검증**: Tier 0 문서 존재 시 systemMessage에 포함 확인 (단위 테스트)
- **수정**: `templates/platforms/claude-code/scripts/skill-inject.sh`

---

## Issue #26 — Claude Code 공식 기능 정렬

### 26-A. context: fork + allowed-tools

- **현재 상태**: 36개 스킬 중 `context: fork` 0개, `allowed-tools` 0개
- **작업**:
  1. `review/SKILL.md` frontmatter 변경:
     ```yaml
     context: fork
     agent: Explore
     allowed-tools: Read, Grep, Glob, Bash
     ```
  2. `audit/SKILL.md` frontmatter 변경:
     ```yaml
     context: fork
     allowed-tools: Read, Grep, Glob, Bash
     ```
  3. review 본문에서 "Task()로 서브에이전트 호출" 지시 제거 (프레임워크가 격리)
- **검증**: frontmatter 필드 존재 + 본문 일관성

### 26-B. argument-hint

- **작업**:
  1. `spec/SKILL.md`: `argument-hint: "[기능명] — SSOT 문서 존재 여부 확인"`
  2. `review/SKILL.md`: `argument-hint: "[파일패턴] — 변경 사항 교차 리뷰"`
  3. `audit/SKILL.md`: `argument-hint: "[대상] — 변경 파일 자기감사"`
- **검증**: frontmatter에 argument-hint 존재

---

## 실행 순서 (Wave)

```
Wave 0-A (병렬, 2d):
  +-- Architect: #23-A 스키마 설계 (0.5d)
  +-- 23-B: 기본 템플릿 (S, 0.5d)
  +-- 26-A: context:fork + allowed-tools (S, 0.5d)
  +-- 26-B: argument-hint (XS, 0.25d)

Wave 0-B (병렬, 2d):
  +-- 23-C: tsq compile 통합 (M, 1d) -- 23-A 완료 후
  +-- 24-A: Controller Protocol (S, 0.5d)
  +-- 24-B: triggers/ (S, 0.5d)
  +-- 24-C: delegation/ (S, 0.5d)

Wave 0-C (순차, 1d):
  +-- 25-A: skill-inject.sh Tier 0 (S, 1d) -- 23-C 완료 후
  +-- Reviewer: 교차 검증
  +-- QA: npm test + ShellCheck + 회귀
```

최적 병렬 실행 시: ~3d

---

## 체크리스트

### #23 DoD
- [ ] 23-A: ssot-map.yaml 스키마 + TypeScript 타입 + 파서
- [ ] 23-B: templates/base/ssot-map.yaml 기본 템플릿 + tsq init 배치
- [ ] 23-C: tsq compile build가 ssot-map.yaml 기반 compiled spec 생성

### #24 DoD
- [ ] 24-A: controller Protocol에 SSOT Map 참조 + 티어별 주입 단계
- [ ] 24-B: triggers/ 디렉토리 (ssot-changed, task/sequence/phase-complete)
- [ ] 24-C: delegation/ 디렉토리 (librarian, developer, reviewer)

### #25 DoD
- [ ] 25-A: skill-inject.sh가 Tier 0 문서를 systemMessage에 주입

### #26 DoD
- [ ] 26-A: review + audit에 context:fork, allowed-tools 적용
- [ ] 26-B: spec/review/audit에 argument-hint 추가

### 품질 게이트
- [ ] `npm test` 전체 통과
- [ ] `shellcheck` 통과
- [ ] `tsc --noEmit` 클린
- [ ] `prompt-quality.test.ts` 통과
- [ ] 기존 Hook 동작 정상 (순서 유지, append only)

---

## 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| ssot-map.yaml 스키마 과설계 | 구현 지연 | 최소 스키마 (4 tier, flat 구조) |
| compile 통합 시 기존 compiler 깨짐 | 회귀 | 기존 compile 로직 보존, ssot-map은 추가 경로 |
| Tier 0 토큰 예산 초과 | 컨텍스트 비대 | 500자 hard limit + 로깅 |
| context:fork 지원 여부 | 격리 미작동 | 최신 Claude Code 확인, fallback Task() 유지 |
