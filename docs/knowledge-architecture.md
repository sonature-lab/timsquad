[English](knowledge-architecture.en.md) | [**한국어**](knowledge-architecture.md)

# Knowledge Architecture

## 개요

Knowledge는 에이전트/스킬이 참조하는 **구체적이고 프로젝트에 특화된 지식**이다.
Claude가 이미 아는 일반 이론/패턴이 아닌, **프로젝트 고유 결정, 구체 수치, 스택 설정, 증류된 전문 지식**만 포함한다.

### 핵심 원칙

> **"Claude가 이미 아는 것은 넣지 마라. 모르는 것만 넣어라."**

---

## 배포 모델

### npm 패키지 내 Knowledge 구조 (타입별 분리)

```
templates/common/claude/knowledge/
├── common/                         ← 모든 프로젝트 타입 공통
│   ├── checklists/
│   │   ├── security.md
│   │   ├── accessibility.md
│   │   ├── ssot-validation.md
│   │   └── architecture-review.md
│   ├── templates/
│   │   ├── task-result.md
│   │   └── sequence-report.md
│   └── conventions/
│       └── api-standards.md
├── web-service/                    ← web-service 전용
│   ├── design-system/
│   │   ├── tokens.md
│   │   ├── components.md
│   │   ├── interactions.md
│   │   └── forms.md
│   └── checklists/
│       └── accessibility.md        ← 더 상세한 프론트엔드 버전
├── api-backend/                    ← api-backend 전용
│   ├── conventions/
│   │   └── logging.md
│   └── checklists/
│       └── database-standards.md
├── fintech/                        ← fintech 전용
│   ├── domains/
│   │   └── regulations.md          ← PCI-DSS, 금융 규제
│   └── checklists/
│       └── compliance.md
├── web-app/                        ← web-app 전용
│   └── design-system/
│       └── ...
├── platform/                       ← platform 전용
│   └── infrastructure/
│       └── ...
└── infra/                          ← infra 전용
    └── infrastructure/
        └── ...
```

### 로컬 프로젝트 구조

```
tsq init --type fintech
→ common/* + fintech/* 빈 껍데기로 복사

Local .claude/knowledge/
├── checklists/security.md          ← common에서 (빈 껍데기)
├── checklists/compliance.md        ← fintech에서 (빈 껍데기)
├── templates/task-result.md        ← common에서 (빈 껍데기)
├── domains/regulations.md          ← fintech에서 (빈 껍데기)
├── conventions/api-standards.md    ← common에서 (빈 껍데기)
└── ml/custom-loss.md               ← 작업 중 로컬 생성 (채워진 것)
```

### 흐름

1. `tsq init --type {type}` 시 `common/` + `{type}/` knowledge를 병합하여 로컬에 빈 껍데기로 복사
2. 에이전트/스킬은 knowledge-refs로 참조, 작업 중 필요 시 내용을 채움
3. 프로젝트 진행 중 새 knowledge 필요 시 `distillation skill` + `tsq knowledge` CLI로 로컬 생성
4. (향후) Retrospective 시스템이 프로젝트에서 생성된 knowledge를 GitHub PR로 보내 리뷰/공유

---

## config.yaml knowledge 섹션

```yaml
knowledge:
  # 자동 선택됨 (common + type 기반)
  # common/과 해당 type/의 knowledge가 자동 포함
  sources:
    - common       # 항상 포함
    - fintech      # tsq init --type에 의해 결정

  # 프로젝트 진행 중 로컬에서 추가 생성된 knowledge
  local:
    - ml/custom-architecture
    - domains/additional-regulations
```

`tsq init --type fintech` 시:
- `common/*` → 전부 복사 (빈 껍데기)
- `fintech/*` → 전부 복사 (빈 껍데기)
- 타입별 전용 knowledge가 common과 겹치면 **타입 전용이 우선** (override)

AGENT_PRESETS과 동일한 패턴으로 동작하되, knowledge는 **디렉토리 단위**로 병합:

```typescript
// knowledge 복사 로직 (pseudo)
async function deployKnowledge(type: ProjectType, destDir: string) {
  // 1. common/ 전체 복사
  await copyKnowledgeDir('common', destDir);
  // 2. type/ 전용 복사 (common과 겹치는 파일은 override)
  await copyKnowledgeDir(type, destDir);
}
```

---

## Knowledge 유형

### 1. Curated Knowledge (npm 배포)

증류/검증 완료되어 npm 패키지에 포함. `tsq init` 시 config 기반으로 로컬에 복사.

| 카테고리 | 내용 | 대상 에이전트 |
|---------|------|-------------|
| `checklists/` | 검증용 체크리스트 (보안, 접근성, SSOT, DB, 아키텍처) | QA, Security, Architect |
| `templates/` | 출력 형식 (task-result, sequence-report) | 전체 |
| `design-system/` | 토큰, 컴포넌트 anatomy, 인터랙션, 폼 UX | Designer |
| `platforms/` | 스택별 설정 (Supabase RLS, Vercel headers 등) | Developer, Security |
| `conventions/` | API 응답 형식, 네이밍, 로깅 표준 | Developer, QA |
| `infrastructure/` | CI/CD, 모니터링 SLO, 컨테이너 | DevOps 역할 시 |
| `domains/` | 도메인 규제 (fintech, healthcare 등) | Security, Developer |

### 2. Local Knowledge (프로젝트 생성)

프로젝트 진행 중 `distillation skill`로 생성. 프로젝트 고유.

| 카테고리 | 내용 | 생성 시점 |
|---------|------|---------|
| `ml/` | ML/DL 논문 증류, 수식→코드, 하이퍼파라미터 | 프로젝트 시작 전 또는 구현 중 |
| `math/` | 프로젝트에서 쓰는 특수 수학 공식 | 구현 중 |
| `theory/` | 분산 시스템, 컴파일러 등 CS 이론 | 구현 중 |
| `mobile/` | 플랫폼 차이, 오프라인 패턴 | 모바일 프로젝트 시 |
| 프로젝트 ADR | 아키텍처 결정 기록 | Architect 시퀀스 분석 후 |

### 3. (향후) Shared Knowledge

Retrospective 시스템에서 "이 knowledge가 범용적으로 유용하다" 판단 시 GitHub PR로 올림.
리뷰/승인 후 다음 npm 버전에 curated knowledge로 포함.

```
Local knowledge → Retro 분석 → GitHub PR → 리뷰 → npm 패키지에 병합
```

---

## Knowledge 증류 (Distillation)

### Skill: `skills/knowledge-distillation/SKILL.md`

새 knowledge 생성 시 사용하는 방법론 스킬.

**프로세스:**

| 단계 | 내용 | 출력 |
|------|------|------|
| 1. 소스 식별 | 논문, 공식문서, 경험 | 소스 유형 + URL/참조 |
| 2. 핵심 추출 | "Claude가 모르는 것"만 필터링 | 핵심 기여 1~2문장 |
| 3. 수식 → 코드 | 수학 공식을 구현 가능한 코드로 변환 | Python/TS 코드 블록 |
| 4. 알고리즘 추출 | pseudo-code → 실제 코드 | 구현 가능한 코드 |
| 5. 파라미터 정리 | 논문 값 + 실험 값 | 기준/경고/위험 표 |
| 6. 비교 분석 | 기존 기법과 차이 | diff 테이블 |
| 7. 함정 식별 | 구현 시 흔한 실수, 논문에 없는 트릭 | 주의사항 리스트 |

**소스 유형별 전략:**

| 소스 | 추출 포인트 |
|------|-----------|
| 논문 (PDF/URL) | 수식, 알고리즘, 하이퍼파라미터, ablation 결과 |
| 공식 문서 | 설정 코드, 제약사항, 마이그레이션 가이드 |
| 팀 경험 | 패턴, 안티패턴, 구체 수치 기준, 트러블슈팅 |
| 기존 코드베이스 | 확립된 컨벤션, 반복 패턴, 의존성 규칙 |

### CLI: `tsq knowledge`

```bash
# 빈 템플릿으로 scaffold 생성
tsq knowledge create ml/architectures/mqa
# → .claude/knowledge/ml/architectures/mqa.md

# 필수 섹션 검증
tsq knowledge validate
# → ❌ ml/architectures/mqa.md: "수식 → 코드" 비어있음
# → ✅ checklists/security.md: 완성

# 인벤토리 확인
tsq knowledge list
# → 12 files (8 complete, 3 incomplete, 1 empty)
#    Sources: 9 from npm, 3 local
```

---

## Knowledge 파일 표준 형식

모든 knowledge 파일의 공통 구조:

```markdown
# {Knowledge 제목}

## 메타데이터
- 카테고리: {checklists | design-system | platforms | ...}
- 대상 에이전트: {developer, qa, ...}
- 소스: {npm | local}
- 버전: {semver}

## 적용 대상
- 프로젝트 타입: {web-service | api-backend | fintech | ...}
- 스택: {관련 기술 스택}

## 핵심 규칙
{Claude가 모르는, 이 프로젝트 고유의 규칙/기준}

## 구체 예시

### ✅ 올바른 패턴
\```{lang}
// 구체적인 코드 예시
\```

### ❌ 잘못된 패턴
\```{lang}
// Claude가 흔히 하는 실수
\```

## 수치 기준
| 항목 | 기준값 | 경고 | 위험 |
|------|:------:|:----:|:----:|

## 체크리스트
- [ ] {구체적 검증 항목}
```

### ML/이론 전용 추가 섹션

```markdown
## 수식 → 코드
$$L = ...$$
\```python
def compute_loss(...):
    ...
\```

## 하이퍼파라미터
| param | 논문 값 | 실험 값 | 비고 |
|-------|:------:|:------:|------|

## vs 기존 기법
| | 기존 | 이 기법 |
|--|------|--------|

## 주의사항
- {논문에 안 쓰여있지만 중요한 트릭}
```

---

## 에이전트/스킬 연동

### 에이전트 → Knowledge 참조

에이전트 .md 파일에서 knowledge를 참조하는 방식:

```xml
<knowledge-refs>
  <ref path="knowledge/checklists/security.md">스택별 보안 체크리스트</ref>
  <ref path="knowledge/platforms/supabase.md">Supabase RLS, Auth 설정</ref>
</knowledge-refs>
```

에이전트는 작업 시작 시 `<knowledge-refs>`에 명시된 파일을 읽고 참조.
Knowledge는 on-demand 로딩 (에이전트 description에 포함되지 않음 → 컨텍스트 절약).

### 스킬 구조 (Knowledge와 유사한 Progressive Disclosure)

스킬도 500줄 이상이면 knowledge와 같은 on-demand 구조 적용:

```
skills/{name}/
├── SKILL.md           ← 인덱스 (~100줄, 항상 로드)
└── rules/             ← 개별 패턴 (on-demand, knowledge와 동일 원리)
    └── {pattern}.md   ← frontmatter + Incorrect/Correct 예시
```

- **Agent**: 항상 로드 → 정체성/규칙만 (91~131줄)
- **Skill SKILL.md**: 항상 로드 → 인덱스만 (80~100줄)
- **Skill rules/**: on-demand → 상세 패턴 (20~80줄/파일)
- **Knowledge**: on-demand → 참조 데이터 (체크리스트, 표준, 템플릿)

새 스킬 생성 시: `skills/_template/` 참조 (SKILL.md + rules/_template.md)

---

## 구현 상태

### 구현 완료

| 항목 | 상태 |
|------|:----:|
| knowledge 디렉토리 구조 | ✅ |
| 기본 checklists/templates | ✅ (7개 파일) |
| 에이전트 knowledge-refs 연동 | ✅ |
| config.yaml knowledge 섹션 | ✅ |
| `tsq knowledge` CLI (create/validate/list) | ✅ |

### 향후 계획

| 항목 | 설명 |
|------|------|
| Distillation Skill | 논문/문서→Knowledge 자동 증류 |
| design-system/ knowledge 확장 | UI/UX 도메인 체크리스트 |
| Retrospective → Knowledge 연동 | 회고에서 발견된 패턴을 Knowledge로 자동 제안 |
| knowledge 버전 관리 (semver) | 사용 패턴 검증 후 도입 |

---

## 영역별 Knowledge 계획

상세: `memory/knowledge-plan.md` 참조

| Tier | 영역 | 우선순위 |
|:----:|------|:-------:|
| 1 | UI/UX Design (Claude 최약), Security (스택별) | Phase 2 |
| 2 | Frontend, Backend, DevOps (프로젝트 맞춤) | 프로젝트 시작 시 |
| 3 | Architecture ADR, Mobile | 필요 시 |
| 4 | Kernel, VM, Network | 해당 프로젝트만 |
| 특수 | ML/수학/이론 (증류 필수) | 해당 프로젝트만 |
