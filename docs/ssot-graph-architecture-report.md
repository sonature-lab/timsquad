# SSOT Graph Architecture Report

**Version**: 2.0
**Date**: 2026-03-18
**Scope**: SSOT 템플릿 전수 감사 + 그래프 구조 설계 + Traceability 전략 + 실행 라이프사이클

---

## 1. Executive Summary

25개 SSOT 템플릿 전수 감사 결과, **구조적 문제 4건, 버그 3건, 개선 권장 8건**을 발견했다.
동시에 PRD 중심 그래프 구조 설계를 진행하여, 7개 문서를 Root+Sub 폴더 구조로 전환하고
A+B+C(자동생성) Traceability 전략을 확정했다.

### 핵심 결정사항

| 항목 | 결정 |
|------|------|
| 매핑 전략 | A+B+C — 양방향 인라인 링크 + tsq-trace 자동 RTM 생성 |
| 그래프 문서 | 7개 (prd, functional-spec, service-spec, ui-ux-spec, data-design, requirements, navigation-map) |
| Flat 유지 문서 | 8개 (error-codes, glossary, security-spec, planning, test-spec, state-machine, 기타) |
| 링크 문법 | 표준 markdown `[text](./path)` (GitHub/VS Code/Obsidian 모두 호환) |

---

## 2. SSOT 템플릿 감사 결과

### 2.1 전체 현황

| 구분 | 파일 수 | 컴파일 적합 | Skip 안전 |
|------|:-------:|:-----------:|:---------:|
| Base (기존 14개) | 14 | 10 PASS / 4 WARNING | 14/14 |
| Base (신규 9개) | 9 | 8 PASS / 1 WARNING | 9/9 |
| Fintech override | 2 | 2 PASS | 2/2 |

### 2.2 Critical — 즉시 수정 (3건)

#### C1. 변수 치환 버그

`substituteVariables()` (template.ts:79)는 `{{VAR}}`만 처리.
구형 6개 템플릿이 `{VAR}` 사용 중 — **치환되지 않음**.

| 미치환 파일 | 치환 정상 파일 |
|------------|--------------|
| prd, planning, requirements | glossary, functional-spec, ui-ux-spec |
| service-spec, data-design, error-codes | security-spec, test-spec, state-machine, component-map + 신규 9개 |

**수정**: 6개 파일의 `{VAR}` → `{{VAR}}` 일괄 변환.

#### C2. requiredFields 불일치 — requirements

compile-rules.ts: `requiredFields: ['ID', 'Priority']`
실제 템플릿: 컬럼명이 `우선순위` (Korean). NFR 테이블엔 Priority 컬럼 자체 없음.

**수정**: `requiredFields`를 `['ID', '우선순위']`로 변경하거나, 컴파일러 검증 로직에 alias 지원 추가.

#### C3. compile-rules.ts `data-design` 규칙 중복

Line 75-81과 Line 132-138에 동일 source `data-design` 규칙 존재.
`getCompileRules()`의 dedup이 처리하지만 코드 정리 필요.

**수정**: Line 132-138 삭제.

### 2.3 Structural — 구조 개선 (4건)

#### S1. H3 split이 비-엔드포인트 섹션 포함 (service-spec)

`splitBy: 'h3'`인데 "1. 개요" 하위 H3 (1.1 API 규칙, 1.2 공통 응답, 1.3 에러 응답)도 분할됨.
이 섹션에 Endpoint/Request/Response가 없어 requiredFields 검증 실패.

**해결**: 그래프 구조 전환 시 근본 해결 — 루트에 공통 규칙, 하위 폴더에 도메인별 API.

#### S2. H2 split이 메타데이터 섹션 포함 (전체)

`splitBy: 'h2'` 적용 파일 전부에서 "관련 문서", "변경 이력" H2가 불필요한 spec 파일로 컴파일됨.
영향: ui-ux-spec, functional-spec, state-machine, component-map, data-design.

**수정**: 컴파일러에 heading exclusion 패턴 추가 (regex: `/^(관련\s*문서|변경\s*이력)/`).

#### S3. data-design의 H2 split 의미 불일치

`splitBy: 'h2'`인데 ERD, ENUM, 마이그레이션, 백업 등 비-테이블 섹션도 분할됨.
`requiredFields: ['Fields']` — 템플릿에 `Fields` 리터럴 없음 (실제: `Column | Type | ...`).

**해결**: 그래프 구조 전환으로 근본 해결 — 루트에 ERD/ENUM/마이그레이션, 하위에 테이블별 파일.

#### S4. functional-spec의 splitBy 부적합

`splitBy: 'h2'`인데 실제 기능 상세는 H3 (FS-001, FS-002). 메타데이터 섹션이 각각 별도 spec으로 생성.

**해결**: 그래프 구조 전환으로 근본 해결 — 루트에 인덱스, 하위에 FS-XXX별 파일.

### 2.4 Content — 내용 개선 (8건)

| # | 파일 | 이슈 | 심각도 |
|---|------|------|:------:|
| N1 | compliance-matrix (base) | 금융 특화 내용(전자금융거래법, PCI DSS)이 base에 포함 → fintech와 중복 | Medium |
| N2 | audit-trail-spec (base) | 소개 문단에 "금융 규제 준수" 금융 맥락 | Low |
| N3 | deployment-spec | AWS 특화 예시만 존재, 클라우드 중립 안내 없음 | Medium |
| N4 | infra-topology | AWS 특화 (Route 53, ECS, RDS 등) | Medium |
| N5 | navigation-map | 모바일 앱 전용 (Bottom Tab, Stack Navigator) | Low |
| N6 | deployment-spec | CI/CD YAML에 `runs-on` 누락 — GitHub Actions 문법 오류 | Low |
| N7 | env-config | Local JWT_SECRET 하드코딩 예시에 보안 경고 없음 | Low |
| N8 | functional-spec, ui-ux-spec | FS-002, SCR-002가 "(위와 동일한 형식)" placeholder만 — 복사 가능한 템플릿 없음 | Medium |

### 2.5 우수 템플릿 (모범 사례)

| 파일 | 평가 |
|------|------|
| security-spec | 최고 완성도. STRIDE, OWASP, RBAC, 인시던트 대응, 310줄 |
| error-codes | requiredFields 완벽 일치, 깔끔한 구조, 예시 풍부 |
| monitoring-spec | SLI/SLO→메트릭→로깅→알림→대시보드 논리적 순서 |
| fintech overrides (2개) | base 호환 유지 + 금융 특화 충실 |

---

## 3. 그래프 구조 설계

### 3.1 설계 원칙

모든 그래프 문서는 **Root + Sub 패턴**을 따른다:

```
root.md    = 전체 그림 (교차 관계, 전역 규칙, 인덱스)
  └── sub/ = 기능 스코프 (Sub-PRD 1:1 대응)
```

Root는 컴파일 대상, Sub는 개별 컴파일 또는 참조 전용.

### 3.2 그래프 문서 7개

#### PRD (허브 노드)

```
ssot/
├── prd.md                    # 비전, 지표, 제약, 기능 인덱스
└── prd/
    ├── auth.md               # Sub-PRD: 인증/인가 기능 상세
    ├── payment.md            # Sub-PRD: 결제 기능 상세
    └── dashboard.md          # Sub-PRD: 대시보드 기능 상세
```

- Root: 프로젝트 전체 비전, 성공 지표, 제약사항, 기능 인덱스 (링크 목록)
- Sub: 기능별 Must/Should/Nice-to-Have, 관련 요건 ID, 매핑된 Task ID

#### Functional Spec (기능 상세)

```
ssot/
├── functional-spec.md        # 기능 인덱스 + 의존성 그래프 + NFR 매핑
└── functional-spec/
    ├── FS-001-login.md       # User Story, Happy/Alt/Exception Path, AC
    ├── FS-002-dashboard.md
    └── ...
```

- Root: 기능 목록 테이블, mermaid 의존성 그래프, NFR 매핑 테이블
- Sub: Sub-PRD와 1:1 대응. 사전/사후 조건, 비즈니스 규칙, Gherkin AC

#### Service Spec (API 명세)

```
ssot/
├── service-spec.md           # API 규칙, 공통 응답 형식, 에러 형식, 인증 방식
└── service-spec/
    ├── auth-api.md           # POST /auth/login, POST /auth/refresh, ...
    ├── users-api.md          # GET /users/:id, PUT /users/:id, ...
    └── ...
```

- Root: 공통 규칙만 (현재 "1. 개요" 내용). splitBy 'none'으로 컴파일
- Sub: 도메인별 엔드포인트. 각 파일이 독립 컴파일 → 기존 H3 split 문제 근본 해결

#### UI/UX Spec (화면 설계)

```
ssot/
├── ui-ux-spec.md             # 디자인 원칙, 디자인 시스템, 공통 컴포넌트, 접근성
└── ui-ux-spec/
    ├── SCR-001-login.md      # 와이어프레임, UI 요소, 인터랙션, 반응형
    ├── SCR-002-dashboard.md
    └── ...
```

- Root: 디자인 토큰, 공통 컴포넌트(네비게이션, 모달, 토스트), WCAG 기준
- Sub: 화면별 상세. 와이어프레임, 상태별 UI, 반응형 브레이크포인트

#### Data Design / ERD

```
ssot/
├── data-design.md            # 전체 ERD, ENUM 정의, 마이그레이션 정책, 백업 정책
└── data-design/
    ├── auth.md               # users, sessions, tokens 테이블 정의
    ├── payment.md            # transactions, payment_methods 테이블 정의
    └── ...
```

- Root: **전체 ERD 다이어그램** (FK 교차 관계 한눈에), ENUM 정의, 마이그레이션/백업 정책
- Sub: 기능별 테이블 정의 (Column, Index, FK). 교차 FK는 `→ [users](./auth.md#users)` 링크

#### Requirements / TRD

```
ssot/
├── requirements.md           # NFR 전체 (성능, 보안, 확장성) + FR 인덱스
└── requirements/
    ├── auth.md               # FR-AUTH-001~005
    ├── payment.md            # FR-PAY-001~010
    └── ...
```

- Root: **NFR은 루트에 유지** (기능 횡단 — "API 200ms"는 모든 기능에 적용). FR 인덱스만
- Sub: 기능별 FR 테이블. Sub-PRD와 1:1 대응

#### Navigation Map / IA

```
ssot/
├── navigation-map.md         # 전체 사이트맵/앱맵 + flow 간 전환 규칙
└── navigation-map/
    ├── auth-flow.md          # 로그인→회원가입→비밀번호찾기 flow
    ├── payment-flow.md       # 결제→확인→영수증 flow
    └── ...
```

- Root: 전체 앱 구조 (tree diagram), 글로벌 네비게이션, flow 간 전환 규칙
- Sub: 기능별 화면 흐름 + 딥링크

### 3.3 Flat 유지 문서 (8개)

| 문서 | Flat 유지 이유 |
|------|--------------|
| error-codes | 룩업 테이블. 단일 파일이 검색 효율적 |
| glossary | 사전. 분할 시 용어 검색 불편 |
| security-spec | 전역 정책. 기능별 분할 불필요 (모든 기능에 동일 적용) |
| planning | Phase-Sequence-Task 계획. 전체 일정이 한 파일에 있어야 의존성 파악 |
| test-spec | 테스트 전략은 전역. TC는 functional-spec 하위에서 관리 |
| state-machine | 엔티티 간 상태 관계를 한눈에 봐야 함 |
| deployment-spec | 인프라 설정은 전역 |
| env-config | 환경 변수는 전역 |

### 3.4 Obsidian 그래프 시각화

```
                         ┌──────────┐
                         │  prd.md  │ (허브)
                         └────┬─────┘
              ┌───────────────┼───────────────┐
        ┌─────▼─────┐  ┌─────▼─────┐  ┌──────▼──────┐
        │ prd/auth  │  │prd/payment│  │prd/dashboard│
        └──┬──┬──┬──┘  └───┬──┬────┘  └──┬──────────┘
           │  │  │          │  │          │
    ┌──────┘  │  └──────┐   │  └───┐      │
    ▼         ▼         ▼   ▼      ▼      ▼
 FS-001   req/auth  auth-api  FS-010  pay-api  FS-002
    │         │        │              │         │
    ▼         │        ▼              ▼         ▼
 SCR-001      │    error-codes   data/payment  SCR-002
    │         │                       │
    ▼         ▼                       ▼
 nav/auth  data/auth          requirements.md
  -flow                         (NFR 전역)
```

기능별 클러스터가 명확히 형성. Sub-PRD를 클릭하면 관련 spec 전체가 연결되어 보임.

---

## 4. Traceability 전략: A+B+C(자동생성)

### 4.1 개요

```
A: Sub-PRD → Task (forward inline link)
B: Plan → Sub-PRD (backward inline link)
C: tsq-trace가 A+B를 파싱해 traceability-matrix.md 자동 생성
```

### 4.2 Layer A — Sub-PRD 내 forward link

```markdown
<!-- ssot/prd/auth.md -->
# Auth Feature PRD

## Mapped Artifacts
| Type | ID | Link |
|------|----|------|
| Requirement | FR-AUTH-001~005 | [requirements/auth](../requirements/auth.md) |
| Functional Spec | FS-001 | [functional-spec/FS-001](../functional-spec/FS-001-login.md) |
| API Spec | auth-api | [service-spec/auth-api](../service-spec/auth-api.md) |
| Screen | SCR-001 | [ui-ux-spec/SCR-001](../ui-ux-spec/SCR-001-login.md) |
| Data | auth tables | [data-design/auth](../data-design/auth.md) |
| Tasks | P1-S001-T001~T003 | [planning.md](../planning.md#P1-S001) |
```

### 4.3 Layer B — Planning 내 backward link

```markdown
<!-- ssot/planning.md -->
## Phase 1: Core Infrastructure

### Sequence S001: Authentication (PRD: [prd/auth](./prd/auth.md))
| Task ID | Description | PRD Ref | FR Ref |
|---------|-------------|---------|--------|
| P1-S001-T001 | DB schema 설계 | [prd/auth#data](./prd/auth.md#data-model) | FR-AUTH-001 |
| P1-S001-T002 | Auth API 구현 | [prd/auth#api](./prd/auth.md#api) | FR-AUTH-002~003 |
| P1-S001-T003 | Login UI | [prd/auth#ui](./prd/auth.md#ui) | FR-AUTH-004 |
```

### 4.4 Layer C — 자동 생성 RTM

`tsq-trace` 스킬이 A+B 링크를 파싱하여 자동 생성:

```markdown
<!-- .timsquad/generated/traceability-matrix.md (자동 생성, 수동 편집 금지) -->
# Traceability Matrix
Generated: 2026-03-18T10:00:00Z

## Coverage Summary
| Sub-PRD | FR Count | Task Count | TC Count | Coverage |
|---------|:--------:|:----------:|:--------:|:--------:|
| auth | 5 | 3 | 12 | 100% |
| payment | 10 | 7 | 28 | 100% |
| dashboard | 3 | 2 | 0 | 0% (TC 미작성) |

## Orphan Detection
- Tasks without PRD ref: (none)
- Requirements without Task: FR-PAY-009 (P2, deferred)
- Sub-PRDs without Tasks: (none)

## Full Matrix
| Sub-PRD | Requirement | Functional Spec | API Spec | Screen | Task | Test Case |
|---------|-------------|-----------------|----------|--------|------|-----------|
| prd/auth | FR-AUTH-001 | FS-001 | auth-api#login | SCR-001 | P1-S001-T001 | TC-001-01~06 |
| prd/auth | FR-AUTH-002 | FS-001 | auth-api#refresh | SCR-001 | P1-S001-T002 | TC-001-07~09 |
| ... | ... | ... | ... | ... | ... | ... |
```

### 4.5 완전성 검증 규칙

tsq-trace가 자동 검증하는 3가지:

| 규칙 | 검증 내용 | 실패 시 |
|------|----------|--------|
| **커버리지** | 모든 Sub-PRD Must-Have 기능 → 최소 1 Task | Warning: "prd/auth의 기능 X에 매핑된 Task 없음" |
| **고아 방지** | 모든 Task → 최소 1 Sub-PRD ref | Warning: "P2-S003-T001에 PRD 참조 없음" |
| **검증 가능성** | 모든 Task → 최소 1 Test Case | Warning: "P1-S001-T003에 TC 없음" |

### 4.6 피드백 루프

```
Task 실행 중 발견 (예: "OAuth 필요")
  → Task result에 L3 피드백 기록
  → Controller가 Librarian에게 위임
  → Librarian이 Sub-PRD(prd/auth.md)에 요건 추가
  → 새 FR-AUTH-006 생성 (requirements/auth.md)
  → 새 Task 생성 (planning.md)
  → tsq-trace 재실행 → RTM 자동 업데이트
```

---

## 5. 컴파일 파이프라인 영향

### 5.1 현재 상태

compiler.ts:347-349에서 `ssotDir`의 flat `*.md` 파일만 읽음. 하위 폴더 미지원.

### 5.2 필요 변경

| 변경 | 내용 |
|------|------|
| **컴파일러 폴더 재귀** | `ssot/service-spec/auth-api.md` 같은 하위 파일도 컴파일 대상에 포함 |
| **compile-rules 확장** | 폴더 문서용 규칙 추가 (예: `service-spec/*` → 각각 독립 컴파일) |
| **heading exclusion** | "관련 문서", "변경 이력" H2를 split 대상에서 제외 |
| **ssot-map 갱신** | 하위 문서의 tier 배치 정의 |

### 5.3 컴파일 전략

| 문서 유형 | 컴파일 방식 |
|----------|-----------|
| 루트 문서 (prd.md, service-spec.md) | 기존 방식 — splitBy 'none' 또는 기존 규칙 |
| 하위 문서 (service-spec/auth-api.md) | 개별 파일로 독립 컴파일 → references/{name}.spec.md |
| Flat 문서 (error-codes.md) | 기존 방식 유지 |
| Sub-PRD (prd/auth.md) | 컴파일 제외 — 기획 문서, Librarian/planner만 직접 참조 |

---

## 6. 실행 라이프사이클

### 6.1 PRD → Plan → Execute 프로세스

```
PRD 존재
  → /tsq-grill (소크라틱 심층 인터뷰, 디자인 트리)
    → Sub-PRD 생성/보강
    → [Human Checkpoint ①: Sub-PRD 리뷰]
  → /tsq-decompose (Sub-PRD → 상세 태스크 자동 분해)
    → Phase-Sequence-Task 계획 생성
    → [Human Checkpoint ②: 계획 확인/수정]
  → 실행 시작
```

### 6.2 실행 단위별 테스트 + 로깅

```
Task 실행
  → Task 완료 → Task 로그 기록
  → Sequence 종료 → Sequence 로그 + 유닛 테스트 + 관련 테스트
  → Phase 종료 → Phase 로그 + E2E 테스트
    → 생각 과정 저장 (thinking trail)
    → Phase 메모리 업데이트
    → 세션 clear (경량화)
    → [Human Checkpoint ③: Phase 결과 리뷰]
```

### 6.3 Daemon 백업 프로세스

Daemon은 메인 세션과 병렬로 실행되며:
- L1 피드백 자동 수집
- Decision Log 기록
- 관찰자 전용 (코드 수정 불가)

### 6.4 신규 스킬 2개

#### `/tsq-grill` — 소크라틱 심층 인터뷰

Sub-PRD 작성/보강을 위한 구조화된 질문 스킬.
- 기능별 Why/What/How 디자인 트리 구성
- 모호한 요구사항 식별 및 구체화
- 결과물: 보강된 Sub-PRD + 디자인 결정 기록

#### `/tsq-decompose` — 자동 태스크 분해

Sub-PRD에서 Phase-Sequence-Task 계획을 자동 생성.
- Must-Have 기능 → 의존성 분석 → DAG 정렬
- Phase = topological layer, Sequence = parallel batch, Task = atomic unit
- 결과물: planning.md 초안 + traceability 매핑

### 6.5 Level-based Progressive Complexity

| Project Level | 그래프 문서 | 설명 |
|:---:|------|------|
| 1-2 | 없음 (전부 flat) | 소규모 프로젝트, 복잡도 최소화 |
| 3 | PRD만 (prd.md + prd/) | 기능 분리가 필요한 중간 규모 |
| 4-5 | 선택적 (PRD + 필요한 것만) | 대규모 프로젝트, 필요에 따라 확장 |

---

## 7. 구현 로드맵

| 순서 | 작업 | 영향 범위 | 상태 |
|:----:|------|----------|:----:|
| 1 | 변수 문법 통일 (`{VAR}` → `{{VAR}}`, 6개 파일) | 템플릿 | ✅ |
| 2 | compile-rules 버그 수정 (중복 제거, requiredFields) | src/lib | ✅ |
| 3 | heading exclusion 로직 추가 (컴파일러) | src/lib/compiler.ts | ✅ |
| 4 | PRD Root+Sub 템플릿 설계 + deploySSOT 하위 폴더 지원 | templates + src/lib/template.ts | ✅ |
| 5 | `/tsq-grill` 스킬 (소크라틱 심층 인터뷰) | templates/base/skills/ | ✅ |
| 6 | `/tsq-decompose` 스킬 (자동 태스크 분해) | templates/base/skills/ | ✅ |
| 7 | 컴파일러 하위 폴더 재귀 탐색 | src/lib/compiler.ts | ✅ |
| 8 | Content 이슈 수정 (N1~N8) | 템플릿 | ✅ |
| 9 | 테스트 추가 + 검증 (664 passed) | tests/ | ✅ |
| 10 | ssot-map 갱신 (하위 문서 tier 배치) | ssot-map | 🔲 |
| 11 | 나머지 6개 그래프 문서 Root+Sub 템플릿 | 템플릿 | 🔲 (v4.0+) |
| 12 | tsq-trace 스킬 신규 개발 | templates/base/skills/ | 🔲 (v4.0+) |

---

## 7. 학술적 근거

| 이론 | 적용 | 출처 |
|------|------|------|
| Hierarchical Task Decomposition | PRD > Sub-PRD > Task > Phase-Seq-Task | [GoalAct 2025](https://arxiv.org/abs/2504.16563) |
| DAG-based Planning | Phase=topological layer, Seq=parallel batch | [LLM Planning Survey](https://aclanthology.org/2025.acl-long.958.pdf) |
| Bidirectional RTM | A+B 양방향 링크, C 자동 matrix | [AI Traceability](https://aqua-cloud.io/ai-requirement-traceability/) |
| Enterprise Hierarchical Planning | Plan-then-act + hierarchical interaction | [Routine Framework](https://arxiv.org/pdf/2507.14447) |
| Continuously Updated Global Planning | L3 피드백 → Sub-PRD 업데이트 → replan | [GoalAct](https://arxiv.org/abs/2504.16563) |

---

## 8. 이론적 프레임워크 비교 분석

TimSquad SSOT Graph Architecture를 9개 주요 이론/프레임워크와 비교 분석한다.

### 8.1 분석 대상 프레임워크

| # | 프레임워크 | 분야 | 핵심 개념 |
|---|----------|------|----------|
| 1 | **Diataxis** | 문서 구조론 | 4-type: Tutorial, How-to, Reference, Explanation |
| 2 | **DITA** | 문서정보학 | Topic-based: Concept, Task, Reference + Content Reuse |
| 3 | **Zettelkasten** | 지식관리 | Atomic notes + Bidirectional linking + Emergent structure |
| 4 | **PARA** | 지식관리 | Projects, Areas, Resources, Archives (행동 가능성 기준) |
| 5 | **C4 Model** | 아키텍처 문서 | 4-level zoom: Context, Container, Component, Code |
| 6 | **arc42** | 아키텍처 문서 | 12-section template, tool-agnostic, everything optional |
| 7 | **IEEE 29148** | 요건 공학 | SRS 표준, Bidirectional Traceability, Unique ID |
| 8 | **Spec-Driven Dev** | AI 개발 방법론 | Spec-first → AI implements, 2025-2026 주류 전환 |
| 9 | **Docs-as-Code** | 개발 문서 | Git 기반, Markdown, CI/CD, PR 리뷰 |

### 8.2 비교 매트릭스

| 평가 기준 | Diataxis | DITA | Zettelkasten | PARA | C4 | arc42 | IEEE 29148 | SDD | Docs-as-Code | **TimSquad** |
|----------|:--------:|:----:|:------------:|:----:|:--:|:-----:|:----------:|:---:|:------------:|:------------:|
| 계층 구조 | - | Strong | Weak | Medium | Strong | Medium | Medium | Medium | - | **Strong** |
| 그래프/링크 | - | Weak | Strong | - | Weak | Weak | Medium | - | - | **Strong** |
| AI 에이전트 친화 | - | - | Medium | - | - | - | - | Strong | Medium | **Strong** |
| 컴파일/변환 | - | Strong | - | - | Medium | - | - | Medium | Medium | **Strong** |
| Traceability | - | Medium | Medium | - | - | Medium | Strong | Medium | - | **Strong** |
| 도구 독립성 | Medium | Weak | Strong | Strong | Medium | Strong | - | Medium | Strong | **Strong** |
| 실용성/진입 장벽 | Strong | Weak | Medium | Strong | Strong | Medium | Weak | Medium | Strong | **Medium** |

### 8.3 프레임워크별 상세 비교

---

#### (1) Diataxis — 문서 유형 분류 체계

**핵심**: 모든 문서를 4가지 유형으로 분류. 사용자의 학습 단계(doing↔studying × practical↔theoretical)에 따라 적합한 문서 유형이 다르다.

| 유형 | 목적 | 지향 |
|------|------|------|
| Tutorial | 학습 경험 | Doing + Learning |
| How-to Guide | 문제 해결 | Doing + Working |
| Reference | 기술 상세 조회 | Studying + Working |
| Explanation | 개념 이해 | Studying + Learning |

**TimSquad와 비교**:

| Diataxis 유형 | TimSquad 대응 | 일치도 |
|--------------|-------------|:------:|
| Tutorial | tsq-start 온보딩, knowledge/guides | 높음 |
| How-to Guide | Skills (tsq-coding, tsq-testing 등) | 높음 |
| Reference | SSOT compiled specs (references/) | 높음 |
| Explanation | SSOT 원본 문서 (prd, planning) | 중간 |

**차이점**: Diataxis는 "사용자(사람)" 중심 분류이고, TimSquad SSOT는 "에이전트 + 사람" 이중 소비자를 대상으로 한다. 에이전트는 Tutorial이 불필요하고 Reference만 필요. 사람은 4가지 모두 필요.

**수용할 점**: SSOT 원본 문서에 Diataxis 원칙을 적용하면 사람이 읽을 때 더 효과적.
각 Sub-PRD는 Explanation 성격, functional-spec은 Reference 성격, skill은 How-to 성격으로 이미 자연스럽게 분류되어 있다.

**수용하지 않는 점**: Diataxis는 평면 분류(4 buckets)이지 계층/그래프가 아님.
TimSquad의 Root+Sub 폴더 구조와 문서 간 링크는 Diataxis가 다루지 않는 영역.

---

#### (2) DITA — Darwin Information Typing Architecture

**핵심**: XML 기반 topic-based authoring. 세 가지 정보 유형(Concept, Task, Reference)으로 토픽을 분류하고, map으로 조합하며, conref/keyref로 콘텐츠를 재사용한다.

**TimSquad와 구조 대응**:

| DITA 개념 | TimSquad 대응 |
|----------|-------------|
| Topic (atomic unit) | Sub-document (prd/auth.md, FS-001.md) |
| Map (assembly) | Root document (prd.md = topic index) |
| Conref (content reuse) | Markdown link (`[text](./path)`) |
| Information Type | SSOT 문서 카테고리 (PRD=Concept, Spec=Reference, Skill=Task) |
| Specialization | project-types override (fintech 특화 등) |

**핵심 차이**: DITA는 XML + 전용 도구(Oxygen, DITA-OT)가 필수. 진입 장벽이 높고 개발자 친화적이지 않음.
TimSquad는 Markdown + Git으로 동일한 구조적 이점을 달성 — DITA의 "poor man's version"이 아니라 **개발자 맥락에 최적화된 변형**.

**수용할 점**:
- **Topic-based authoring**: 이미 Root+Sub 구조로 수용 완료. 각 Sub가 하나의 topic.
- **Map 개념**: Root document가 map 역할. 기능 인덱스 테이블이 DITA map에 대응.
- **Content reuse**: 공통 규칙(API 컨벤션, 디자인 토큰)을 Root에 두고 Sub에서 참조.

**수용하지 않는 점**: XML 기반 도구 체인. Markdown + Obsidian이 개발자에게 더 적합.

---

#### (3) Zettelkasten — 그래프 기반 지식 관리

**핵심**: Niklas Luhmann의 메모 상자 방법론. 원자적 노트(atomic notes) + 양방향 링크 + 창발적 구조(emergent structure). Obsidian, Logseq, Roam Research가 대표 도구.

| Zettelkasten 원칙 | TimSquad 적용 | 평가 |
|------------------|-------------|:----:|
| Atomic notes | Sub-document (FS-001, auth-api 등) | 강하게 수용 |
| Bidirectional linking | A+B 양방향 인라인 링크 | 강하게 수용 |
| Emergent structure | Root+Sub 사전 구조 + 링크로 창발 | 혼합 |
| No rigid hierarchy | Root+Sub는 사전 계층이 있음 | 부분 이탈 |
| Unique ID | FR-AUTH-001, FS-001, SCR-001 등 | 강하게 수용 |

**핵심 차이**: 순수 Zettelkasten은 **사전 구조 없이** 링크만으로 구조가 창발됨.
TimSquad는 **사전 구조(Root+Sub) + 창발적 링크**의 하이브리드.

이것은 의도적 선택이다. 소프트웨어 프로젝트 문서는 개인 지식과 달리:
- 여러 에이전트가 동시에 접근 (일관된 경로 필요)
- 컴파일러가 기계적으로 처리 (예측 가능한 구조 필요)
- 새 팀원이 빠르게 온보딩 (탐색 가능한 계층 필요)

따라서 **Structured Zettelkasten** (계층 + 그래프 하이브리드)이 적절하다.
이것은 Dendron(VS Code 기반 계층적 Zettelkasten)의 접근과 일치한다.

**수용할 점**: 원자적 노트, 양방향 링크, Unique ID — 핵심 3원칙 전부 수용.
**수용하지 않는 점**: "구조 없는 창발" — 에이전트에게는 예측 가능한 구조가 필수.

---

#### (4) PARA — Projects, Areas, Resources, Archives

**핵심**: Tiago Forte의 디지털 정리법. 정보를 **행동 가능성(actionability)** 기준으로 4단계 분류.

| PARA 계층 | 설명 | TimSquad 대응 |
|----------|------|-------------|
| Projects | 기한 있는 단기 목표 | Sub-PRD + Planning (Phase-Seq-Task) |
| Areas | 기한 없는 지속적 책임 | security-spec, deployment-spec, env-config |
| Resources | 관심 주제 참고 자료 | glossary, knowledge/, references/ |
| Archives | 비활성 항목 | 완료된 Phase 로그, ADR |

**핵심 통찰**: TimSquad의 ssot-map 4-tier 시스템과 PARA가 놀랍도록 유사하다.

| PARA | ssot-map Tier | 행동 가능성 |
|------|-------------|-----------|
| Projects | Tier 3 (task-specific) | 가장 높음 — 지금 당장 필요 |
| Areas | Tier 0 (always) | 항상 적용 — 지속적 제약 |
| Resources | Tier 1-2 (phase/sequence) | 필요 시 참조 |
| Archives | logs/, trails/ | 완료된 이력 |

**수용할 점**: **행동 가능성 기준 분류**는 이미 tier 시스템으로 구현됨.
PARA의 "Projects → Archives 자연 흐름"을 Phase 완료 시 로그 아카이빙에 적용 가능.

---

#### (5) C4 Model — 계층적 줌 아키텍처 문서

**핵심**: Simon Brown의 4-level zoom. Context → Container → Component → Code.
각 레벨이 이전 레벨의 줌인.

| C4 Level | 설명 | TimSquad 대응 |
|----------|------|-------------|
| Context | 시스템과 외부 관계 | Root PRD (전체 비전) |
| Container | 앱, DB, 서비스 | Root data-design, Root service-spec |
| Component | 컨테이너 내부 논리 모듈 | Sub-documents (auth-api, data/auth) |
| Code | 구현 상세 | Compiled specs → 에이전트 코드 생성 |

**핵심 대응**: TimSquad의 Root+Sub 구조가 **C4의 Context→Component 줌**과 정확히 일치.

```
C4 Context    = prd.md (전체 시스템)
C4 Container  = prd/auth.md (기능 영역)
C4 Component  = service-spec/auth-api.md (구체 API)
C4 Code       = compiled spec → 에이전트가 생성한 코드
```

**수용할 점**: **"줌 레벨"이라는 멘탈 모델**. Root 문서를 읽으면 전체 그림, Sub를 읽으면 상세.
이미 Root+Sub 구조로 자연스럽게 구현됨.

**차이점**: C4는 아키텍처 다이어그램 중심, TimSquad는 전체 SSOT 문서 체계.
C4의 Structurizr DSL(Diagrams-as-Code)은 TimSquad의 mermaid 다이어그램과 유사한 철학.

---

#### (6) arc42 — 12-Section 아키텍처 템플릿

**핵심**: Gernot Starke의 12개 섹션 아키텍처 문서 프레임워크. Everything optional, tool-agnostic.

| arc42 섹션 | TimSquad SSOT 매핑 |
|-----------|-------------------|
| 1. Introduction & Goals | prd.md |
| 2. Constraints | prd.md (제약사항), security-spec.md |
| 3. Context & Scope | prd.md (비전), integration-spec.md |
| 4. Solution Strategy | planning.md |
| 5. Building Block View | component-map.md, service-spec.md |
| 6. Runtime View | functional-spec.md, state-machine.md |
| 7. Deployment View | deployment-spec.md, infra-topology.md |
| 8. Crosscutting Concepts | security-spec.md, glossary.md |
| 9. Architecture Decisions | .timsquad/docs/adr/ |
| 10. Quality Requirements | requirements.md (NFR), performance-budget.md |
| 11. Risks & Technical Debt | prd.md (리스크), planning.md |
| 12. Glossary | glossary.md |

**핵심 발견**: TimSquad SSOT 문서 체계는 arc42 12개 섹션을 **모두 커버**한다.
다만 arc42는 단일 문서(또는 12개 챕터)인 반면, TimSquad는 독립 파일로 분리.

**수용할 점**: arc42의 "everything optional" 원칙은 TimSquad의 `optional` 플래그, 타입별 선택 배포와 일치.
arc42의 "순서는 읽기 최적화, 작성은 아무 순서" 원칙도 이미 적용됨 (SSOT 작성 순서는 자유).

---

#### (7) IEEE 29148 (구 IEEE 830) — 요건 명세 표준

**핵심**: SRS(Software Requirements Specification) 표준. Unique ID, Bidirectional Traceability, Verifiability.

| IEEE 29148 품질 속성 | TimSquad 구현 |
|---------------------|-------------|
| Correct | SSOT = 단일 진실 소스, Librarian만 수정 |
| Unambiguous | 컴파일된 spec이 에이전트에게 명확한 지시 |
| Complete | tsq-trace 완전성 검증 (커버리지 체크) |
| Consistent | 교차 검증 (tsq-spec, tsq-review) |
| Ranked | 우선순위 필드 (P0/P1/P2) |
| Verifiable | Gherkin AC, Test Case 매핑 |
| Modifiable | Markdown + Git |
| **Traceable** | **A+B+C 양방향 Traceability** |

**핵심 발견**: IEEE 29148의 8가지 품질 속성 중 **Traceable이 가장 중요**하며,
TimSquad의 A+B+C 전략은 이것을 **자동화** 수준으로 구현한다.

**수용할 점**: Unique ID 체계 (FR-AUTH-001, FS-001, SCR-001)는 IEEE 표준과 정확히 일치.
Forward + Backward traceability도 완전 수용.

---

#### (8) Spec-Driven Development (SDD) — AI 시대 개발 방법론

**핵심**: "Spec-first, then AI implements." 2025-2026년 주류 전환 중.
Thoughtworks Technology Radar 2025에 등재. AWS Kiro, GitHub Spec Kit, Tessl 등 도구 생태계 형성.

| SDD 원칙 | TimSquad 구현 |
|---------|-------------|
| Spec을 먼저 작성 | SSOT 문서 → 컴파일 → 에이전트 실행 |
| Spec이 AI와의 계약 | compiled spec = 에이전트 입력 계약 |
| Spec 기반 리뷰 | tsq-review, tsq-qa가 spec 대비 코드 검증 |
| Drift detection | tsq-trace 완전성 검증, compiler hash 기반 stale 감지 |

**핵심 발견**: **TimSquad는 SDD의 완전한 구현체**이다.

SDD 논문이 제시하는 3단계 성숙도:

| Level | 설명 | TimSquad |
|:-----:|------|:--------:|
| L1 | Spec-First (수동 spec → AI 구현) | 이미 달성 |
| L2 | Automated Drift Detection | compiler hash + tsq-trace로 달성 |
| L3 | Formal Verification | 미래 과제 |

METR 연구(2025)에 따르면 AI 도구 사용 시 개발자가 "20% 빠르다고 느끼지만 실제로 19% 느림."
이 gap은 **리뷰/수정 오버헤드** 때문. SDD(그리고 TimSquad)는 이 gap을 spec으로 메운다.

---

#### (9) Docs-as-Code — 문서를 코드처럼

**핵심**: 문서를 소스 코드와 동일하게 Git 관리, Markdown 작성, CI/CD 빌드, PR 리뷰.

| Docs-as-Code 원칙 | TimSquad 구현 |
|-------------------|-------------|
| Version control | `.timsquad/ssot/` = Git tracked |
| Lightweight markup | Markdown |
| CI/CD pipeline | compiler = build step |
| Review process | tsq-review, PR-based |
| Automated testing | requiredFields 검증, tsq-trace 완전성 |

**TimSquad는 Docs-as-Code를 넘어 "Docs-as-Infrastructure"**:
- 일반 Docs-as-Code: 문서를 빌드해서 **사람이 읽는** 사이트 생성
- TimSquad: 문서를 컴파일해서 **에이전트가 소비하는** spec 생성

이것이 본질적 차별점이다. 문서의 1차 소비자가 사람이 아니라 AI 에이전트.

---

### 8.4 종합 포지셔닝

```
                    사람 중심 ←──────────────────→ 에이전트 중심
                         │                              │
  계층 구조              │   arc42                      │
     ↑                  │   C4 Model                   │
     │            DITA ─┤                    ┌─────────┤
     │                  │          SDD ──────┤TimSquad │
     │           IEEE   │                    │  SSOT   │
     │          29148 ──┤                    │  Graph  │
     │                  │                    └─────────┤
     │         PARA ────┤                              │
     ↓                  │                              │
  그래프 구조    Zettel- │                              │
              kasten ───┤                              │
                         │                              │
                    읽기 최적화 ←─────────────────→ 처리 최적화
```

**TimSquad의 고유 위치**: 계층(C4/DITA) + 그래프(Zettelkasten) + 에이전트 소비(SDD) + 자동 Traceability(IEEE).
어떤 단일 프레임워크도 이 4개를 동시에 충족하지 못한다.

### 8.5 TimSquad가 각 프레임워크에서 수용한 것 / 수용하지 않은 것

| 프레임워크 | 수용 | 미수용 | 이유 |
|----------|------|--------|------|
| **Diataxis** | 4-type 분류 (skill=how-to, spec=reference) | 평면 분류만 | 계층/그래프 불필요 |
| **DITA** | Topic-based authoring, Map(=Root), Content reuse | XML 도구 체인 | 개발자 진입 장벽 |
| **Zettelkasten** | Atomic notes, Bidirectional links, Unique ID | 순수 창발 구조 | 에이전트는 예측 가능성 필요 |
| **PARA** | 행동 가능성 기준 분류 (= tier 시스템) | 개인 지식관리 맥락 | 팀/에이전트 협업 맥락 |
| **C4 Model** | 줌 레벨 (Root=Context, Sub=Component) | 다이어그램 중심 | 전체 문서 체계가 대상 |
| **arc42** | Everything optional, 12-section 커버리지 | 단일 문서 관점 | 독립 파일 분리 |
| **IEEE 29148** | Unique ID, Bidirectional Traceability, 8 품질 속성 | 형식적 SRS 문서 | Markdown + 자동화 |
| **SDD** | Spec-first, Drift detection, Spec=계약 | L3 Formal Verification | 현재 단계에서 불필요 |
| **Docs-as-Code** | Git, Markdown, CI/CD, PR review | 사람만 소비자 | 에이전트가 1차 소비자 |

### 8.6 결론

TimSquad SSOT Graph Architecture는 단일 이론의 적용이 아니라,
**9개 프레임워크의 강점을 선택적으로 조합한 하이브리드 설계**이다.

핵심 혁신은:
1. **Structured Zettelkasten**: 계층(DITA/C4) + 그래프(Zettelkasten) 하이브리드
2. **Docs-as-Infrastructure**: 문서의 1차 소비자가 AI 에이전트
3. **Automated RTM**: IEEE 29148 Traceability를 A+B+C로 자동화
4. **SDD Level 2 달성**: Spec-first + Automated Drift Detection

이 조합은 현재 어떤 기존 프레임워크나 도구에서도 제공하지 않는 고유한 포지션이다.

---

## 9. Sources

### 문서 구조론 / 정보 아키텍처
- [Diataxis Framework](https://diataxis.fr/) — Daniele Procida
- [Diataxis 분석](https://idratherbewriting.com/blog/what-is-diataxis-documentation-framework) — I'd Rather Be Writing
- [Sequin의 Diataxis 적용기](https://blog.sequinstream.com/we-fixed-our-documentation-with-the-diataxis-framework/)

### 아키텍처 문서
- [arc42 Template](https://arc42.org/overview) — Gernot Starke & Peter Hruschka
- [arc42 GitHub](https://github.com/arc42/arc42-template)
- [arc42 Documentation](https://docs.arc42.org/home/)

### AI 에이전트 / Spec-Driven Development
- [Spec-Driven Development: The Workflow Replacing "Prompt and Pray"](https://www.javacodegeeks.com/2026/03/spec-driven-developmentwith-ai-coding-agents-the-workflow-replacingprompt-and-pray.html) — Java Code Geeks, March 2026
- [Spec-Driven Development in 2025](https://www.softwareseni.com/spec-driven-development-in-2025-the-complete-guide-to-using-ai-to-write-production-code/) — SoftwareSeni
- [Thoughtworks: Spec-Driven Development](https://www.thoughtworks.com/en-us/insights/blog/agile-engineering-practices/spec-driven-development-unpacking-2025-new-engineering-practices) — Thoughtworks Technology Radar
- [AI Spec-Driven Development Workflows](https://www.augmentcode.com/guides/ai-spec-driven-development-workflows) — Augment Code
- [AI Coding Agents 2026](https://codeagni.com/blog/ai-coding-agents-2026-the-new-frontier-of-intelligent-development-workflows) — CodeAgni
- [AI Agents for Technical Writing](https://buildwithfern.com/post/technical-writing-ai-agents-devin-cursor-claude-code) — Fern, January 2026
- [10 Things Developers Want from Agentic IDEs](https://redmonk.com/kholterhoff/2025/12/22/10-things-developers-want-from-their-agentic-ides-in-2025/) — RedMonk

### LLM Agent Planning
- [GoalAct: Global Planning + Hierarchical Execution](https://arxiv.org/abs/2504.16563) — arXiv, April 2025
- [Routine: Enterprise Planning Framework](https://arxiv.org/pdf/2507.14447) — arXiv
- [Hierarchical Multi-Agent LLM Planning](https://arxiv.org/html/2602.21670) — arXiv, February 2025
- [A Modern Survey of LLM Planning Capabilities](https://aclanthology.org/2025.acl-long.958.pdf) — ACL 2025

### 요건 공학 / Traceability
- [AI Requirement Traceability Best Practices](https://aqua-cloud.io/ai-requirement-traceability/) — Aqua Cloud
- [Requirements Traceability Matrix Guide](https://www.requiment.com/requirements-traceability-matrix-rtm-guide/) — Requiment
