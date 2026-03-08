# TimSquad v4 Architecture Proposal

> 2026-03-08 상태점검 기반 종합 개선안

## 1. 현재 진단 요약

### 3대 핵심 갭

| 갭 | 현상 | 근본 원인 |
|----|------|----------|
| **SSOT 주입 단절** | compiled spec이 생성되지만 에이전트가 안 읽음 | 주입 경로 없음. Hook도 controller도 spec을 전달하지 않음 |
| **방법론 강제 부재** | config에 tdd/bdd 설정 있으나 실제 분기 없음 | init 선택 프롬프트 없음, controller가 방법론 참조 안 함 |
| **테스트 게이트 미연결** | Task/Sequence/Phase별 테스트 강제 없음 | completion-guard는 bash 실행 여부만 확인 |

### 추가 부재 항목

- SSOT 문서 13종 중 완전 구현 1개(Phase Gate), 부분 9개, 부재 3개
- 계획 승인 루프 없음
- L1 Task 로그 수동 기록 (자동화 안 됨)

---

## 2. 제안: SSOT 문서 체계

### 2.1 문서 목록 (4개 카테고리, 13종)

#### 운영/실행 문서 (일반 프로젝트에 없는 것)

| 문서 | 목적 | 현재 상태 |
|------|------|----------|
| **Agent Behavior Spec** | 에이전트가 어떤 상황에서 어떻게 판단하는지 명세 | 분산 (각 agent.md) |
| **Skill Contract Registry** | 모든 스킬의 Contract 목록, 의존성 충돌 방지 | 분산 (36개 SKILL.md) |
| **Phase Gate Definition** | 각 Phase 진입/통과 기준 명문화 | 구현됨 (phase-checklist.yaml) |
| **Failure Mode Catalog** | 에이전트 실패 패턴과 복구 절차 | 없음 |

#### 품질/감사 문서

| 문서 | 목적 | 현재 상태 |
|------|------|----------|
| **Test Strategy** | 단위/통합/E2E 각각 무엇을 어떻게 검증하는지 | 분산 (testing SKILL.md) |
| **Audit Log Schema** | /audit 결과물의 표준 형식 | 부분 (product-audit만) |
| **FP Registry** | False Positive 누적 기록, 재감사 기준선 | 설계만 |

#### 운영 문서

| 문서 | 목적 | 현재 상태 |
|------|------|----------|
| **Runbook** | 장애/이탈 상황별 대응 절차 | 없음 |
| **Context Budget Policy** | 토큰 예산 배분 기준과 초과 시 행동 규칙 | 코드에 산재 |
| **Deprecation Policy** | 스킬 폐기/교체 기준 | 없음 |

#### TimSquad 특화

| 문서 | 목적 | 현재 상태 |
|------|------|----------|
| **SSOT Map** | 어떤 상태가 어느 파일에 저장되는지 + 티어별 주입 기준 | 코드에만 |
| **Hook Execution Order** | 훅 간 실행 순서와 충돌 규칙 명세 | settings.json만 |
| **Skill Injection Matrix** | 어떤 작업에 어떤 스킬이 주입되는지 매트릭스 | JSON만 |

### 2.2 SSOT와 체크리스트/TODO 관계

별도 체크리스트 시스템은 만들지 않는다:
- `requirements.md` → compile → `completion-criteria.md` (무엇을 해야 하는지)
- `functional-spec.md` → Gherkin 수용 조건 (언제 완료인지)
- `test-spec.md` → 테스트 명세 (어떻게 검증하는지)

SSOT가 TODO/체크리스트 역할을 겸한다.

---

## 3. 제안: SSOT Map 티어링

### 3.1 개념

SSOT 문서를 참조 빈도와 범위에 따라 4개 티어로 분류하고,
각 작업 단위(Phase/Sequence/Task)에서 필요한 문서만 선택적으로 주입한다.

```
Tier 0 (상시)    — 모든 작업에 항상 주입
Tier 1 (Phase)   — Phase 시작 시 주입, Phase 내 유지
Tier 2 (Sequence) — Sequence 범위의 문서만 주입
Tier 3 (Task)    — 개별 Task에 필요한 구체 spec만 주입
```

### 3.2 티어별 문서 배치

```yaml
# ssot-map.yaml (예시)

tier-0-always:
  description: "모든 작업에 항상 주입되는 제약 문서"
  inject_via: hook  # skill-inject.sh가 자동 주입
  documents:
    - compiled: rules/security-constraints.md
      source: ssot/security-spec.md
    - compiled: rules/completion-criteria.md
      source: ssot/requirements.md

tier-1-phase:
  description: "Phase 시작 시 controller가 주입하는 방향성 문서"
  inject_via: controller  # controller가 위임 시 포함
  documents:
    - compiled: references/prd-summary.spec.md
      source: ssot/prd.md
    - compiled: references/architecture.spec.md
      source: ssot/architecture.md
    - document: ssot/test-strategy.md
      note: "컴파일 불필요, 원본 직접 참조"

tier-2-sequence:
  description: "Sequence 범위의 기능별 문서"
  inject_via: controller  # controller가 범위 매칭 후 주입
  documents:
    - compiled: "references/{section}.spec.md"
      source: ssot/service-spec.md
      split: H3
    - compiled: "references/{entity}.spec.md"
      source: ssot/data-design.md
      split: H2

tier-3-task:
  description: "개별 Task에 필요한 구체 spec"
  inject_via: controller  # controller가 task 내용 보고 선택
  documents:
    - compiled: references/error-codes.spec.md
      source: ssot/error-codes.md
    - compiled: "references/{scenario}.spec.md"
      source: ssot/functional-spec.md
      split: H2
```

### 3.3 주입 메커니즘 분담

```
Tier 0 (상시) → skill-inject.sh Hook이 자동 주입
  - 작고 변하지 않는 제약 문서
  - 토큰 비용 낮음 (security + completion = ~300 chars)
  - 모든 프롬프트에 systemMessage로 포함

Tier 1~3 → controller가 위임 시 선택적 주입
  - controller Protocol:
    1. SSOT Map 읽기
    2. 현재 작업 단위 (phase/sequence/task) 확인
    3. 해당 티어의 compiled spec을 references/에서 로드
    4. 서브에이전트 프롬프트에 포함하여 Task() 호출
  - 토큰 절약: 필요한 문서만 선택
```

---

## 4. 제안: 개발방법론 스킬화 + 컨트롤러 강제

### 4.1 현재 문제

```
config.methodology.development = 'tdd'  ← 설정만 있음
  ↓ (연결 없음)
methodology/tdd SKILL.md  ← 스킬은 존재함
  ↓ (연결 없음)
controller  ← 방법론 참조 안 함
  ↓ (연결 없음)
서브에이전트  ← TDD 프로세스 모름
```

### 4.2 제안 흐름

```
init 시:
  사용자가 방법론 선택 (tdd / bdd / ddd / none)
  → config.yaml에 저장
  → 해당 methodology 스킬만 배포

controller Protocol 추가:
  1. config.yaml에서 methodology.development 읽기
  2. methodology/{value}/SKILL.md의 Protocol 로드
  3. 서브에이전트 위임 시 방법론 제약 포함:
     - TDD: "테스트를 먼저 작성하고, 실패를 확인한 후 구현하라"
     - BDD: "Gherkin 시나리오를 먼저 정의하고 구현하라"
     - DDD: "도메인 모델을 먼저 설계하고 구현하라"
```

### 4.3 skill-generator.ts 수정

```typescript
// 현재: 타입별 하드코딩
SKILL_PRESETS['web-service'] = ['methodology/tdd', ...]

// 변경: config.methodology.development 값에 따라 동적 배포
function getMethodologySkills(config: TimsquadConfig): string[] {
  const dev = config.methodology.development;
  if (dev === 'none') return [];
  return [`methodology/${dev}`];
}
```

---

## 5. 제안: 테스트 게이트 (방법론 무관 공통)

### 5.1 3단계 게이트

```
Task 완료 → Unit Test Gate
  - npm run test:unit (해당 파일)
  - 실패 시: completion 차단
  - Hook: completion-guard.sh 확장

Sequence 완료 → Integration + Build Gate
  - npm run test:integration
  - tsc --noEmit (전체)
  - 실패 시: 다음 Sequence 진행 차단
  - 트리거: workflow.ts checkAndAutomate 확장

Phase 완료 → E2E Gate
  - npm run test:e2e
  - 실패 시: Phase 전환 차단
  - 트리거: workflow.ts buildPhaseGateData 확장
```

### 5.2 구현 위치

| 게이트 | 트리거 | 파일 |
|--------|--------|------|
| Unit Test | Stop Hook | `completion-guard.sh` 확장 |
| Integration | Sequence 자동화 | `workflow.ts` checkAndAutomate |
| E2E | Phase Gate | `workflow.ts` buildPhaseGateData + `e2e-commit-gate.sh` 연결 |

### 5.3 Test Strategy SSOT와 연동

```
test-strategy.md (SSOT)
├── unit: { 대상, 커버리지 기준, 실행 명령 }
├── integration: { 대상, 의존성, 실행 명령 }
└── e2e: { 시나리오, 환경, 실행 명령 }
     ↓ compile
completion-guard.sh / workflow.ts가 참조
  → 어떤 테스트를 어떻게 실행할지 SSOT에서 읽음
```

---

## 6. 제안: 기록 시스템 (Librarian 하이브리드)

### 6.1 현재 문제

```
L1 Task 로그: 수동 (에이전트가 tsq log enrich 호출해야 함) → 누락 빈번
L2 Sequence: 자동 (workflow.ts) → OK
L3 Phase: 자동 (workflow.ts) → OK
```

### 6.2 하이브리드 설계

```
Task 완료
  → SubagentStop Hook이 자동 L1 기록 (토큰 비용 0)
  → bash 스크립트로 결과 파싱 → tsq log enrich 자동 호출

Sequence 완료
  → workflow.ts 자동 L2 생성 (이미 구현됨)

Phase 완료
  → Librarian 서브에이전트 호출 (가끔만, 토큰 허용)
  → 수행 내용:
    - L3 Phase 로그 품질 검토
    - SSOT Map 상태 갱신 (어떤 문서가 stale인지)
    - 다음 Phase 준비 문서 작성
    - 회고 데이터 수집
```

### 6.3 Librarian 에이전트 정의

```yaml
# tsq-librarian.md
role: "기록 전담 에이전트"
trigger: "Phase 완료 시 controller가 호출"
input: Phase 내 모든 L1/L2 로그, SSOT 현재 상태
output:
  - Phase 종합 리포트
  - SSOT 상태 갱신 (stale 감지, 커버리지 보고)
  - 다음 Phase context note
constraints:
  - 소스 코드(src/, lib/, app/ 등) 수정 금지
  - .timsquad/ 및 docs/ 내 문서 작성·갱신은 허용
  - 기록, 분석, 리포트 작성 수행
```

---

## 7. 제안: Init 개선

### 7.1 현재 Init 프롬프트

```
1. Project name
2. Project type (web-service, api-backend, ...)
3. Project level (L1, L2, L3)
4. Project domain (general-web, fintech, ...)
5. Enable automation? (Y/N)
```

### 7.2 추가 프롬프트

```
6. Development methodology (tdd / bdd / none)
   → methodology 스킬 배포 결정
   → config.yaml 반영

7. Architecture style (monolith / modular / microservice)  [선택]
   → 에이전트 프리셋 조정
   → SSOT 템플릿 분량 조정
```

### 7.3 Init 후 자동 수행

```
tsq init
  → config.yaml 생성
  → SSOT 템플릿 배치 (.timsquad/ssot/)
  → ssot-map.yaml 생성 (티어 기본값)
  → 방법론 스킬 배포
  → 첫 compile (빈 SSOT → 빈 spec, stale 없음)
  → CLAUDE.md + skills 배포
```

---

## 8. 구현 우선순위

### Tier 1 — 시스템 작동의 핵심 (SSOT 주입 경로 개통)

| 순서 | 작업 | 해결하는 갭 |
|------|------|------------|
| 1-1 | **SSOT Map + 티어링** 설계 및 ssot-map.yaml 구현 | SSOT 사용율 저조 |
| 1-2 | **controller Protocol 개선** — SSOT Map 참조 + 티어별 주입 | SSOT 주입 단절 |
| 1-3 | **skill-inject.sh 확장** — Tier 0 상시 문서 자동 주입 | 상시 제약 누락 |
| 1-4 | **Skill Contract Registry** 자동 생성 스크립트 | 스킬 충돌 방지 |

### Tier 2 — 품질 보장 (테스트 + 방법론)

| 순서 | 작업 | 해결하는 갭 |
|------|------|------------|
| 2-1 | **Init 방법론 선택** 프롬프트 + 동적 스킬 배포 | 방법론 강제 부재 |
| 2-2 | **controller 방법론 강제** — methodology 스킬 참조 + 위임 주입 | 방법론 강제 부재 |
| 2-3 | **테스트 게이트** — completion-guard + workflow.ts 확장 | 테스트 게이트 미연결 |
| 2-4 | **Test Strategy** SSOT 문서 템플릿 | 테스트 전략 부재 |

### Tier 3 — 기록 + 운영 안정성

| 순서 | 작업 | 해결하는 갭 |
|------|------|------------|
| 3-1 | **SubagentStop Hook** — L1 자동 기록 | L1 로그 수동 |
| 3-2 | **Librarian 에이전트** — Phase 종합 정리 | Phase 리포트 품질 |
| 3-3 | **Skill Injection Matrix** 문서 자동 생성 | 매칭 가시성 |
| 3-4 | **Hook Execution Order** 정책 문서 | 훅 충돌 방지 |

### Tier 4 — 장기 운영

| 순서 | 작업 | 해결하는 갭 |
|------|------|------------|
| 4-1 | **Context Budget Policy** 문서화 | 토큰 폭발 방지 |
| 4-2 | **Failure Mode Catalog + Runbook** | 장애 대응 |
| 4-3 | **Deprecation Policy** | 스킬 관리 한계 |
| 4-4 | **Agent Behavior Spec** | 의사결정 명세 |

---

## 9. 전체 아키텍처 흐름 (To-Be)

```
tsq init
  ├── 프로젝트 설정 (type, level, domain, methodology)
  ├── SSOT 템플릿 배치 + ssot-map.yaml 생성
  ├── 방법론 스킬 선택적 배포
  └── 첫 compile

사용자: SSOT 문서 작성
  └── tsq compile build (수동 또는 watch 자동)
      └── compiled spec → .claude/skills/controller/{references,rules}/

작업 시작 (프롬프트 입력)
  ├── [Hook] skill-inject.sh
  │   ├── 매칭 스킬 Contract/Protocol 주입
  │   └── Tier 0 상시 문서 주입 (security, completion-criteria)
  │
  ├── [Controller] 작업 위임
  │   ├── SSOT Map 읽기 → 현재 티어 판단
  │   ├── 해당 티어 compiled spec 로드
  │   ├── methodology 스킬 Protocol 로드
  │   ├── 프롬프트 조합: protocol + spec + methodology + 지시
  │   └── Task() 호출
  │
  ├── [서브에이전트] 작업 수행
  │   ├── [Hook] subagent-inject.sh — tsq-protocol 주입
  │   ├── 방법론대로 개발 (TDD: 테스트 먼저 등)
  │   └── 완료
  │
  ├── [Hook] SubagentStop — L1 로그 자동 기록
  │
  └── [Hook] completion-guard.sh
      ├── Unit Test 실행 확인
      ├── Build 검사
      └── 스킬 Verification 리마인드

Sequence 완료
  ├── [자동] L2 로그 생성 (workflow.ts)
  └── [Gate] Integration + Build Test

Phase 완료
  ├── [자동] L3 로그 생성 (workflow.ts)
  ├── [Gate] E2E Test
  ├── [Librarian] Phase 종합 리포트 + SSOT 상태 갱신
  └── [자동] 회고 생성 (autoRetro)
```

---

## 10. 제안: Claude Code 공식 기능 정렬

### 10.1 현재 상태

TimSquad 스킬은 Claude Code 공식 스펙에 **대체로 맞지만**, 몇 가지 정렬이 필요하다.

#### 올바르게 사용 중

| 항목 | 상태 |
|------|------|
| `.claude/skills/` 자동 발견 | 공식 지원, 정상 사용 |
| `SKILL.md` 파일명 + frontmatter | 공식 포맷 |
| `name`, `description` | 공식 필드, description으로 자동 호출 판단 |
| `user-invocable` | 공식 필드 — `/spec`, `/review`, `/audit` 정상 |
| `$ARGUMENTS` 치환 | 공식 지원 |
| Hook systemMessage | 공식 — mandatory injection |
| CLAUDE.md 자동 로드 | 공식 |

#### TimSquad 커스텀 frontmatter (Claude Code가 무시)

```yaml
version: "1.0.0"          # Claude Code 미인식 — TimSquad 자체 메타
tags: [review, quality]    # Claude Code 미인식
depends_on: [coding]       # Claude Code 미인식 — tsq compile validate에서만 사용
conflicts_with: []         # Claude Code 미인식
```

해롭지 않으나, Claude Code가 depends_on/conflicts_with를 강제하지 않는다.
TimSquad의 `skill-inject.sh`와 `tsq compile validate`에서만 활용됨.

### 10.2 활용하지 않는 공식 기능

| 공식 기능 | 설명 | 적용 대상 |
|----------|------|----------|
| **`context: fork`** | 스킬을 서브에이전트에서 격리 실행 | review, audit |
| **`allowed-tools`** | 스킬에서 사용 가능한 도구 제한 | librarian (Read-only) |
| **`argument-hint`** | UI 자동완성 힌트 | /spec, /review |
| **`model`** | 스킬별 모델 지정 | 경량 스킬에 haiku |
| **`disable-model-invocation`** | Claude 자동 호출 차단 | 위험한 스킬 |
| **`hooks` (스킬 레벨)** | 스킬별 Hook 정의 | 스킬 실행 전후 검증 |
| **`.claude/rules/*.md`** | 경로별 조건부 규칙 로딩 | API/테스트 컨벤션 |

### 10.3 적용 계획

#### A. `context: fork` — review, audit 스킬 격리

현재 review 스킬은 본문에서 "Task()로 서브에이전트 호출하라"고 지시한다.
공식 메커니즘을 사용하면 프레임워크가 자동 격리 처리한다.

```yaml
# 현재 (수동 위임)
---
name: review
user-invocable: true
---
# 본문: "Task()로 별도 컨텍스트에서 리뷰 수행"

# 개선 (공식 격리)
---
name: review
user-invocable: true
context: fork
agent: Explore
---
# 본문: 리뷰 지침만 작성 (격리는 프레임워크가 처리)
```

적용 대상:
- `review` — 교차 리뷰 (독립 판단 필요)
- `audit` — 자기 감사 (구현자와 분리)
- `librarian` — 기록 전담 (신규)

#### B. `allowed-tools` — 도구 제한으로 안전성 확보

```yaml
# librarian — 기록 전담, 소스 코드 수정 금지
# Read/Write/Edit: 로그·리포트·SSOT 상태 문서 작성 허용
# Bash: tsq CLI 호출 (tsq log, tsq compile status 등)
# 소스 코드(.ts, .tsx 등) 수정은 rules/로 차단
---
name: librarian
context: fork
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# review — 읽기 + 분석만 (코드 수정 불필요)
---
name: review
context: fork
agent: Explore
allowed-tools: Read, Grep, Glob, Bash
---
```

`allowed-tools`로 스킬 레벨에서 도구 접근을 제한한다.
- **librarian**: Write/Edit 허용 (리포트·로그 작성), 소스 코드 수정은 스킬 본문에서 금지
- **review**: Read-only (분석만, 수정 불필요)

#### C. `argument-hint` — 슬래시 커맨드 UX

```yaml
# /spec 호출 시 자동완성 힌트
---
name: spec
user-invocable: true
argument-hint: "[기능명] — SSOT 문서 존재 여부 확인"
---

# /review 호출 시
---
name: review
user-invocable: true
argument-hint: "[파일패턴] — 변경 사항 교차 리뷰"
---
```

#### D. `.claude/rules/*.md` — 경로별 조건부 규칙

현재 스킬의 `rules/` 디렉토리는 TimSquad 자체 개념이다.
Claude Code 공식 `.claude/rules/`는 **경로 패턴 기반 자동 로딩**을 지원한다.

```yaml
# .claude/rules/api-conventions.md
---
paths:
  - "src/api/**/*.ts"
  - "src/routes/**/*.ts"
---
- RESTful 네이밍 사용
- 에러 응답은 표준 형식 (code, message, details)
- 인증 필요 엔드포인트는 미들웨어 명시
```

```yaml
# .claude/rules/test-conventions.md
---
paths:
  - "tests/**/*.test.ts"
  - "**/*.spec.ts"
---
- describe/it 네스팅 3단계 이하
- 테스트 데이터는 fixtures/ 사용
- mock은 최소화, 실제 의존성 우선
```

스킬의 `rules/`와 공존 가능:
- `.claude/rules/` — **파일 경로 기반** 자동 로딩 (Claude Code 공식)
- `skills/{name}/rules/` — **스킬 활성화 시** 온디맨드 로딩 (TimSquad 자체)

#### E. 스킬 레벨 `hooks` — 스킬별 검증

```yaml
# methodology/tdd SKILL.md
---
name: tdd
hooks:
  PreToolUse:
    - matcher: "Write|Edit"
      hooks:
        - type: prompt
          prompt: "이 파일에 대한 테스트가 먼저 작성되었는지 확인하라"
---
```

전역 Hook 대신 스킬 레벨에서 정의하면, 해당 스킬이 활성화된 경우에만 실행된다.
TDD 스킬이 비활성이면 테스트-먼저 검증도 비활성 — 방법론 전환이 자연스러워진다.

### 10.4 마이그레이션 우선순위

| 순서 | 변경 | 영향 | 난이도 |
|------|------|------|--------|
| 1 | `context: fork` 적용 (review, audit) | Task() 수동 호출 제거, 격리 보장 | 낮음 |
| 2 | `argument-hint` 추가 (/spec, /review, /audit) | UX 개선 | 낮음 |
| 3 | `allowed-tools` 적용 (librarian, review) | 안전성 강화 | 낮음 |
| 4 | `.claude/rules/` 도입 (API, 테스트 컨벤션) | 경로별 자동 규칙 로딩 | 중간 |
| 5 | 스킬 레벨 `hooks` (methodology/tdd) | 방법론별 조건부 검증 | 중간 |
| 6 | `model` 필드 (경량 스킬에 haiku) | 토큰 비용 절약 | 낮음 |

---

## 11. 구현 우선순위 (종합)

### Phase A — SSOT 주입 경로 개통 + 공식 기능 정렬

| 순서 | 작업 | 해결하는 갭 |
|------|------|------------|
| A-1 | **SSOT Map + 티어링** 설계 및 ssot-map.yaml 구현 | SSOT 사용율 저조 |
| A-2 | **controller Protocol 개선** — SSOT Map 참조 + 티어별 주입 | SSOT 주입 단절 |
| A-3 | **skill-inject.sh 확장** — Tier 0 상시 문서 자동 주입 | 상시 제약 누락 |
| A-4 | **Skill Contract Registry** 자동 생성 스크립트 | 스킬 충돌 방지 |
| A-5 | `context: fork` + `allowed-tools` + `argument-hint` 적용 | 공식 기능 정렬 |

### Phase B — 품질 보장 (테스트 + 방법론)

| 순서 | 작업 | 해결하는 갭 |
|------|------|------------|
| B-1 | **Init 방법론 선택** 프롬프트 + 동적 스킬 배포 | 방법론 강제 부재 |
| B-2 | **controller 방법론 강제** — methodology 스킬 참조 + 위임 주입 | 방법론 강제 부재 |
| B-3 | **테스트 게이트** — completion-guard + workflow.ts 확장 | 테스트 게이트 미연결 |
| B-4 | **Test Strategy** SSOT 문서 템플릿 | 테스트 전략 부재 |
| B-5 | `.claude/rules/` 도입 + 스킬 레벨 `hooks` (methodology) | 경로별 규칙 + 방법론 검증 |

### Phase C — 기록 + 운영 안정성

| 순서 | 작업 | 해결하는 갭 |
|------|------|------------|
| C-1 | **SubagentStop Hook** — L1 자동 기록 | L1 로그 수동 |
| C-2 | **Librarian 에이전트** (`context: fork`, `allowed-tools`) | Phase 리포트 품질 |
| C-3 | **Skill Injection Matrix** 문서 자동 생성 | 매칭 가시성 |
| C-4 | **Hook Execution Order** 정책 문서 | 훅 충돌 방지 |

### Phase D — 장기 운영

| 순서 | 작업 | 해결하는 갭 |
|------|------|------------|
| D-1 | **Context Budget Policy** 문서화 | 토큰 폭발 방지 |
| D-2 | **Failure Mode Catalog + Runbook** | 장애 대응 |
| D-3 | **Deprecation Policy** | 스킬 관리 한계 |
| D-4 | **Agent Behavior Spec** | 의사결정 명세 |

---

## 12. 전체 아키텍처 흐름 (To-Be)

```
tsq init
  ├── 프로젝트 설정 (type, level, domain, methodology)
  ├── SSOT 템플릿 배치 + ssot-map.yaml 생성
  ├── 방법론 스킬 선택적 배포
  ├── .claude/rules/ 경로별 규칙 생성
  └── 첫 compile

사용자: SSOT 문서 작성
  └── tsq compile build (수동 또는 watch 자동)
      └── compiled spec → .claude/skills/controller/{references,rules}/

작업 시작 (프롬프트 입력)
  ├── [Hook] skill-inject.sh
  │   ├── 매칭 스킬 Contract/Protocol 주입
  │   └── Tier 0 상시 문서 주입 (security, completion-criteria)
  │
  ├── [Controller] 작업 위임
  │   ├── SSOT Map 읽기 → 현재 티어 판단
  │   ├── 해당 티어 compiled spec 로드
  │   ├── methodology 스킬 Protocol 로드
  │   ├── 프롬프트 조합: protocol + spec + methodology + 지시
  │   └── Task() 호출
  │
  ├── [서브에이전트] 작업 수행 (context: fork 격리)
  │   ├── [Hook] subagent-inject.sh — tsq-protocol 주입
  │   ├── [Hook] methodology/tdd hooks — 테스트-먼저 검증 (스킬 레벨)
  │   ├── allowed-tools 제한 적용
  │   ├── .claude/rules/ 경로별 규칙 자동 로드
  │   ├── 방법론대로 개발 (TDD: 테스트 먼저 등)
  │   └── 완료
  │
  ├── [Hook] SubagentStop — L1 로그 자동 기록
  │
  └── [Hook] completion-guard.sh
      ├── Unit Test 실행 확인
      ├── Build 검사
      └── 스킬 Verification 리마인드

Sequence 완료
  ├── [자동] L2 로그 생성 (workflow.ts)
  └── [Gate] Integration + Build Test

Phase 완료
  ├── [자동] L3 로그 생성 (workflow.ts)
  ├── [Gate] E2E Test
  ├── [Librarian] Phase 종합 리포트 + SSOT 상태 갱신
  │   (context: fork, allowed-tools: Read,Write,Edit,Grep,Glob,Bash)
  └── [자동] 회고 생성 (autoRetro)
```

---

## 13. 변경하지 않는 것

- 기존 스킬 구조 (SKILL.md + rules/ + references/ + scripts/ + memory/)
- 기존 Hook 순서 (append-only 원칙 유지)
- SSOT 컴파일러 핵심 로직 (compiler.ts, compile-rules.ts)
- 에이전트 프롬프트 구조 (agent.md + frontmatter skills)
- L2/L3 자동 로그 시스템 (workflow.ts)
- Phase Gate 시스템 (phase-checklist.yaml)
- TimSquad 자체 frontmatter (version, tags, depends_on) — Claude Code와 공존
