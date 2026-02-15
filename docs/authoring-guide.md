[English](authoring-guide.en.md) | [**한국어**](authoring-guide.md)

# TimSquad Authoring Guide

> 에이전트 프롬프트, 스킬, Knowledge 파일 작성을 위한 종합 가이드.
> 새 에이전트/스킬 생성 시 이 문서를 참조하세요.

---

## 1. 에이전트 프롬프트 설계

### 1.1 파일 위치 및 네이밍

```
templates/common/claude/agents/tsq-{역할}.md
```

- 역할은 소문자 영문 단어 하나 (예: `developer`, `qa`, `security`)
- 파일명 = `tsq-` + 역할명 + `.md`

### 1.2 필수 구조 (v3.1+)

```yaml
# Front Matter
---
name: tsq-{역할}
description: |
  TimSquad {역할} 에이전트.
  {한 줄 설명}.
  Use when: "{트리거 키워드 나열}"
model: sonnet              # sonnet (기본) | opus (고급 추론 필요 시)
tools: [Read, Write, Edit, Bash, Grep, Glob]
skills: [tsq-protocol, {도메인1}, {도메인2}]   # 필수 스킬 주입 (tsq-protocol 필수)
---
```

```xml
<agent role="{역할}">

  <!-- 1. 역할 요약 -->
  <role-summary>
    {이 에이전트의 핵심 역할과 책임 1~2줄}
  </role-summary>

  <!-- 2. 필수 참조 (SSOT, Knowledge) -->
  <prerequisites>
    - `.timsquad/.daemon/task-context.json` — 코드 탐색 시 우선 참조
    - `knowledge/checklists/{name}.md` — {설명}
    - `knowledge/platforms/{name}.md` — {설명}
  </prerequisites>

  <!-- 3~6: 역할별 선택 섹션 (아래 1.3 참조) -->

  <!-- 7. Input Contract -->
  <input-contract priority="critical">
    <required>
      <field name="task_id">태스크 ID (예: P3-S001-T001)</field>
      <field name="description">{작업 설명}</field>
      <field name="ssot_refs">참조할 SSOT 문서 (예: service-spec.md#section)</field>
    </required>
    <optional>
      <field name="{name}">{설명}</field>
    </optional>
  </input-contract>

  <!-- 8. Rules -->
  <rules>
    <must>{반드시 해야 할 것}</must>
    <must-not>{절대 하면 안 되는 것}</must-not>
  </rules>

  <!-- 9. 완료 프로토콜 -->
  <task-completion-protocol priority="critical">
    knowledge/templates/task-result.md 형식으로 리턴.
  </task-completion-protocol>

  <!-- 10. 피드백 라우팅 -->
  <feedback-routing>
    <!-- 1.6 참조 -->
  </feedback-routing>

</agent>
```

> **v3.1 변경사항**: `<mandatory-skills>` → frontmatter `skills:` 배열로 대체.
> `<persona>` 제거. TSQ CLI 프로토콜은 `tsq-protocol` 공유 스킬로 분리.
> `<file-access-rule>` → `<prerequisites>` 통합.

### 1.3 역할별 선택 섹션

에이전트 유형에 따라 필수 구조 사이에 삽입하는 추가 섹션:

| 유형 | 추가 섹션 | 용도 |
|------|----------|------|
| 구현 (developer, dba) | `<responsibilities>` | 담당 범위 |
| 검토 (architect, qa) | `<analysis-axes>`, `<role-definition>` | 검토 기준축, does/does-not |
| 전문 (security) | `<role-definition>`, `<analysis-axes>` | 분석 범위 + 보고 기준 |
| 디자인 (designer) | `<responsibilities>`, `<ui-meta-index-update>` | 담당 범위 + UI 메타 출력 |

**`<role-definition>` 예시:**
```xml
<role-definition priority="critical">
  <hierarchy>
    <position>QA Engineer (서브에이전트)</position>
    <reports-to>PM (메인세션)</reports-to>
    <scope>시퀀스 단위 리뷰</scope>
  </hierarchy>
  <does>
    <item>코드와 SSOT의 교차 검증</item>
  </does>
  <does-not>
    <item>직접 코드 수정 (피드백만 제공)</item>
  </does-not>
</role-definition>
```

**`<analysis-axes>` 예시:**
```xml
<analysis-axes>
  <axis id="1" name="시퀀스 내 일관성">태스크 간 충돌/중복 검사</axis>
  <axis id="2" name="SSOT 적합성">구현 ↔ 명세 일치 검증</axis>
  <axis id="3" name="크로스시퀀스 연속성">이전/이후 시퀀스와의 연결성</axis>
</analysis-axes>
```

### 1.4 priority 속성 규칙

| 값 | 의미 | 사용 기준 |
|----|------|----------|
| `priority="critical"` | 위반 시 결과물 무효 | input-contract, task-completion-protocol |
| `priority="high"` | 강력 권장, 위반 시 품질 저하 | prerequisites |
| (없음) | 권장사항 | role-summary, 일반 rules |

### 1.5 TSQ CLI 연동 프로토콜

> **v3.1+**: TSQ CLI 프로토콜은 `tsq-protocol` 공유 스킬로 분리되었습니다.
> 모든 에이전트가 frontmatter `skills: [tsq-protocol, ...]`로 자동 주입받으므로
> 에이전트 프롬프트에 `<tsq-cli>` 섹션을 직접 작성할 필요가 없습니다.
>
> 상세 내용: `templates/common/claude/skills/tsq-protocol/SKILL.md`

### 1.6 피드백 라우팅 설계

3단계 구조. 도메인에 맞게 triggers를 커스텀하세요.

```xml
<feedback-routing>
  <level id="1" severity="Minor">
    <triggers>{즉시 자체 수정 가능한 이슈}</triggers>
    <route>즉시 수정</route>
  </level>
  <level id="2" severity="Major">
    <triggers>{설계 변경/SSOT 수정이 필요한 이슈}</triggers>
    <route>메인세션(PM)</route>
  </level>
  <level id="3" severity="Critical">
    <triggers>{요구사항 변경/데이터 손실 위험}</triggers>
    <route>메인세션(PM) → 사용자 승인</route>
    <requires-approval>true</requires-approval>
  </level>
</feedback-routing>
```

**레벨 분류 기준:**

| 레벨 | 판단 질문 | 예시 |
|------|----------|------|
| L1 | 에이전트가 즉시 고칠 수 있는가? | 린트 오류, 타입 에러, 네이밍 위반, 누락 테스트 |
| L2 | SSOT나 설계 문서 수정이 필요한가? | API 명세 불일치, 스키마 변경 필요, 아키텍처 이슈 |
| L3 | 사용자 비즈니스 결정이 필요한가? | 요구사항 누락, 스코프 변경, 데이터 손실 위험, 컴플라이언스 |

### 1.7 Base Agent vs Overlay 구조 (설계 중, 미구현)

> **Note**: 이 섹션은 v4.0에서 도입 예정인 Composition Layer 설계입니다. 현재는 구현되지 않았으며, 향후 변경될 수 있습니다.

v4.0에서 에이전트 프롬프트는 합성(composition) 방식으로 생성될 예정이다.

#### 디렉토리 구조

```
agents/
  base/                    # 역할별 기본 프로세스 (L1)
    tsq-developer.md       # 공통 프로세스, 피드백 라우팅
  overlays/
    platform/              # 플랫폼별 프로토콜 (L2)
      claude-code.md
    domain/                # 도메인별 사고 모델 (L3)
      ml/
        _common.md         # 모든 역할 공통
        developer.md       # developer×ML (선택)
```

#### Base Agent 작성 규칙

- 플랫폼/도메인 무관한 **프로세스와 역할 정의**만 포함
- Claude Code 전용 내용(tsq wf, JSONL 등)은 platform overlay로 분리
- ML/Fintech 전용 규칙은 domain overlay로 분리

#### Overlay 파일 형식

```markdown
---
type: platform-overlay | domain-overlay
target: claude-code | ml | fintech | ...
version: 1.0.0
---

<overlay>
  <섹션 strategy="REPLACE|APPEND|MERGE|KEEP">
    내용
  </섹션>
</overlay>
```

#### 머지 전략

| strategy | 동작 | 사용 섹션 |
|----------|------|----------|
| REPLACE | base 섹션을 overlay로 교체 | role-summary, input-contract, task-completion-protocol |
| APPEND | base 섹션 끝에 overlay 추가 | rules, does-not |
| MERGE | 파일 목록 합산 (중복 제거) | prerequisites, knowledge-refs |
| KEEP | base 유지, overlay 무시 | feedback-routing |

#### Domain Overlay 작성 가이드

1. `_common.md` — 모든 역할에 적용되는 도메인 규칙 (필수)
2. `{role}.md` — 특정 역할에만 적용되는 규칙 (선택, 없으면 _common만 적용)
3. 규칙이 3줄 이하면 `_common.md`에 통합
4. role-specific 규칙이 5줄 이상이면 별도 `{role}.md` 분리

#### Platform Overlay 작성 가이드

1. 하나의 `.md` 파일에 모든 역할 공통 규칙 포함
2. `<task-completion-protocol strategy="REPLACE">` 필수 — 플랫폼별 완료 프로토콜
3. 도구/파일경로/프로토콜만 포함, 도메인 로직 금지

---

## 2. 스킬 파일 작성

### 2.1 파일 위치 및 구조 (v3.2+)

```
templates/common/claude/skills/
  {도메인}/
    {스킬명}/
      SKILL.md              # 필수 — 인덱스 (<120줄, 항상 로드)
      rules/                # 코딩 규칙 ("이렇게 해라/하지 마라")
      │ ├── _sections.md    # 선택 — 카테고리 정의 (5개+ 룰 시)
      │ └── {rule-name}.md  # 개별 규칙 (20-80줄, impact 레벨)
      references/           # 심층 가이드 ("이것을 알아라")
      │ └── {topic}.md      # 종합 가이드 (50-200줄)
      scripts/              # 실행형 자동화 ("이것을 실행해라")
        └── {verb-noun}.sh  # 셸 스크립트 (토큰 0)
```

**하위 디렉토리 역할 비교:**

| 디렉토리 | 목적 | 로딩 방식 | 예시 |
|----------|------|----------|------|
| `rules/` | "이렇게 해라/하지 마라" — Incorrect/Correct 패턴 | Read (온디맨드) | `async-parallel.md` |
| `references/` | "이것을 알아라" — 종합 지식, 외부 문서 | Read (온디맨드) | `owasp-2025-guide.md` |
| `scripts/` | "이것을 실행해라" — 검증, 생성, 분석 | Bash (온디맨드) | `check-secrets.sh` |

### 2.2 SKILL.md 필수 구조 (v3.2+)

```markdown
---
name: {skill-name}
description: |
  {무엇을 하는지 + 언제 사용하는지, 1024자 이하.}
  {에이전트가 이 description만 보고 스킬 필요 여부를 판단함.}
version: "1.0.0"
tags: [{tag1}, {tag2}]
user-invocable: false
---

# {Skill Title}

{1~2줄 목적 설명}

## Philosophy

- {핵심 원칙 1}
- {핵심 원칙 2}
- {핵심 원칙 3}

## Resources

| Priority | Type | Resource | Description |
|----------|------|----------|-------------|
| CRITICAL | rule | [{rule-name}](rules/{rule-name}.md) | {1줄 설명} |
| HIGH | ref | [{topic}](references/{topic}.md) | {1줄 설명} |
| MEDIUM | script | [{script}](scripts/{script}.sh) | {1줄 설명} |

## Quick Rules

### {카테고리 1}
- {인라인 규칙}
- {인라인 규칙}

## Checklist

| Priority | Item |
|----------|------|
| CRITICAL | {필수 확인 항목} |
| HIGH | {중요 확인 항목} |
```

> **v3.2 변경사항**: XML 래퍼 (`<skill>`) 제거 → 순수 Markdown.
> Resources 테이블이 rules/references/scripts 통합 인덱스 역할.
> frontmatter에 `version`, `tags` 추가.

### 2.3 설계 원칙

**120줄 규칙:** SKILL.md는 120줄 이하 인덱스. 항상 로드되므로 토큰 효율 우선.

**Progressive Disclosure (3단계):**
1. **frontmatter** (~100 토큰) — 스킬 목록에서 매칭 판단
2. **SKILL.md** (<2000 토큰) — 활성화 시 로드
3. **rules/references/scripts** (온디맨드) — 필요할 때만

**Priority 체계:**
- `CRITICAL` — 위반 시 결과물 거부 (Vercel impact 호환)
- `HIGH` — 강력 권장, 위반 시 품질 저하
- `MEDIUM` — 선택적 적용
- `LOW` — 참고

**참조 모델:** [vercel-react-best-practices](https://github.com/anthropics/skills) (132.9K installs, SKILL.md 인덱스 + 45 rules 파일)

### 2.4 rules/ 파일 작성법

코딩 패턴의 "해라/하지 마라"를 Incorrect/Correct 코드 예시로 가르치는 파일.

```markdown
---
title: {Rule Title}
impact: HIGH                    # CRITICAL | HIGH | MEDIUM | LOW
impactDescription: {영향도 수치}  # 예: "2-10× improvement", "200-800ms 감소"
tags: {tag1}, {tag2}
---

## {Rule Title}

**Impact: {LEVEL} ({영향도 수치})**

{왜 이 규칙이 필요한지 1~2줄}

**Incorrect ({무엇이 잘못됐는지}):**
```{lang}
// 잘못된 패턴
```

**Correct ({무엇이 올바른지}):**
```{lang}
// 올바른 패턴
```
```

**작성 기준:**
- 20~80줄 (간결하게)
- frontmatter 필수: `title`, `impact`, `tags`
- `impactDescription` 수치화 권장
- Incorrect/Correct 코드 예시 필수
- "Claude가 이미 아는 것" 생략 → 프로젝트 고유 패턴만
- 파일명: kebab-case (예: `async-parallel.md`, `error-handling.md`)

**5개 이상 룰 시 `_sections.md` 추가:** 카테고리별 인덱스로 에이전트 탐색 도움.

### 2.5 references/ 파일 작성법

에이전트가 작업 시 참고해야 할 심층 가이드, 외부 문서 요약, 마이그레이션 지침 등.

```markdown
---
title: {Reference Title}
category: guide                 # guide | api | migration | external
source: internal                # URL (외부 기반) 또는 "internal" (자체 작성)
---

# {Reference Title}

{이 레퍼런스가 다루는 주제 1~2줄}

## Key Concepts
{핵심 개념}

## Detailed Guide
{상세 가이드}

## Common Pitfalls
{흔한 실수}

## Examples
{구체적 코드/설정 예시}
```

**작성 기준:**
- 50~200줄 (심층 가이드)
- frontmatter 필수: `title`, `category`
- `source` 권장: 외부 자료 기반이면 원본 URL 기록
- rules/와 차이: 규칙이 아닌 "알아야 할 지식"
- 에이전트가 Read로 필요할 때만 로드 (온디맨드)
- 파일명: kebab-case (예: `nextjs-migration.md`, `auth-patterns.md`)

### 2.6 scripts/ 파일 작성법

에이전트가 Bash로 실행하는 자동화 스크립트. 컨텍스트에 로드되지 않으므로 토큰 부담 0.

```bash
#!/bin/bash
# @name {script-name}
# @description {이 스크립트가 하는 일 1줄}
# @args {필요한 인자 설명}
# @output {출력 형식 (text | json | exit-code)}

set -euo pipefail

PROJECT_ROOT="${1:-.}"
# 스크립트 로직...
```

**작성 기준:**
- `set -euo pipefail` 필수 (안전 실행)
- 외부 URL 호출 금지 (보안)
- 헤더 메타데이터 필수: `@name`, `@description`, `@args`, `@output`
- 파일명: `{verb}-{noun}.sh` (예: `check-secrets.sh`, `validate-schema.sh`)

### 2.7 판단 플로차트: rules vs references vs scripts

어떤 하위 디렉토리에 넣을지 판단 기준:

```
[새 콘텐츠 추가 시]
  ├─ "이것을 실행해서 결과를 확인해라" → scripts/
  ├─ "이 패턴 대신 저 패턴을 써라" (Incorrect/Correct) → rules/
  ├─ "이 주제를 깊이 알아야 한다" (가이드/참조) → references/
  └─ "3줄 이내로 요약 가능" → SKILL.md Quick Rules에 인라인
```

| 질문 | Yes → | No → |
|------|-------|------|
| 실행 가능한 스크립트인가? | `scripts/` | 다음 질문 |
| Incorrect/Correct 패턴으로 표현 가능한가? | `rules/` | 다음 질문 |
| 50줄 이상의 심층 지식인가? | `references/` | SKILL.md 인라인 |

### 2.8 외부 스킬 임포트 가이드

[skills.sh](https://skills.sh) (Vercel 운영, 58K+ 스킬) 등 외부 스킬을 도입할 때의 절차.

#### 보안 검사 프로토콜 (필수)

모든 외부 스킬 파일을 도입 전 반드시 검사:

| 위험도 | 대상 | 검사 항목 |
|--------|------|----------|
| **최고** | scripts/ | `curl`, `wget`, `eval`, `exec`, `base64 -d`, 외부 URL, 파일 시스템 조작, 환경변수 탈취, 난독화 |
| **중간** | references/, rules/ | 프롬프트 인젝션 (`ignore previous instructions`), 에이전트 행동 조작, hidden instructions |
| **낮음** | SKILL.md | `allowed-tools` 과도한 권한, description 프롬프트 인젝션 |

#### 임포트 절차

1. **소스 확인**: 설치 수, 저장소 stars, 최근 업데이트 확인
2. **전문 검토**: 모든 파일을 Read로 직접 검토
3. **보안 스캔**: 위험 패턴 Grep 자동 스캔 + 수동 확인
4. **커스터마이징**: TimSquad frontmatter/포맷 통일, 불필요 콘텐츠 제거
5. **배치**: `templates/common/claude/skills/{도메인}/` 에 배치
6. **감사 기록**: `docs/external-skill-audit.md`에 검사 결과 기록

---

## 3. Knowledge 파일 작성

### 3.1 디렉토리 구조

```
templates/common/claude/knowledge/
  checklists/       # 검증 체크리스트 (에이전트가 작업 시 참조)
  templates/        # 출력 형식 템플릿 (task-result, sequence-report)
  platforms/        # 플랫폼별 지식 (Supabase, Vercel 등)
  domains/          # 도메인별 지식 (핀테크, 의료 등)
```

### 3.2 checklists/ 작성법

```markdown
# {체크리스트 이름}

## {카테고리 1}

| 항목 | 확인 기준 | 심각도 |
|------|----------|--------|
| {체크 항목} | {구체적 확인 방법} | {Critical/Major/Minor} |
```

**핵심 원칙:**
- 각 항목은 예/아니오로 판단 가능해야 함
- 심각도(severity)를 명시해서 피드백 라우팅과 연결
- 스택 특화 섹션은 조건부로 분리 (예: `## Supabase 프로젝트`)

### 3.3 templates/ 작성법

출력 형식 템플릿은 에이전트의 `<task-completion-protocol>`에서 참조합니다.

```markdown
# {템플릿 이름}

## 구조

### Summary
{1-2줄 요약}

### Changes
| File | Change | Reason |
|------|--------|--------|
| {파일:라인} | {변경 내용} | {SSOT 근거} |

### TSQ Log Enrich
```bash
tsq log enrich {agent} --json '{...}'
```

## Few-shot Example
{구체적 완성 예시를 포함하면 에이전트 출력 품질이 크게 향상됨}
```

### 3.4 platforms/ & domains/ 작성법

`_template.md`가 표준 구조를 제공합니다:

```markdown
# {플랫폼/도메인} Reference

## 핵심 개념
{에이전트가 알아야 할 기본 지식}

## 자주 쓰는 패턴
{코드 패턴, API 사용법}

## 주의사항/함정
{흔한 실수, 안티패턴}

## 프로젝트 적용 체크리스트
- [ ] {확인 항목}
```

---

## 4. XML 태그 컨벤션

### 4.1 태그 사용 원칙

- **에이전트 프롬프트에서만** 구조적 XML 사용
- 스킬/Knowledge는 Markdown 기반 + 최소한의 XML
- HTML 태그 사용 금지 (Markdown 테이블 사용)

### 4.2 커스텀 태그 생성 규칙

| 규칙 | 설명 |
|------|------|
| 소문자 kebab-case | `<file-access-rule>`, `<task-completion-protocol>` |
| 의미 명확 | `<rules>` (O), `<r>` (X) |
| priority 속성 | critical / high / (없음) 3단계만 |
| id 속성 | 고유 식별 필요 시 (feedback level, axis) |
| 자기 설명적 | 태그명만으로 용도 파악 가능해야 함 |

### 4.3 태그 계층 규칙

```
<agent>                          # 최상위 (1개)
  <file-access-rule>             # 설정 (priority 속성)
  <mandatory-skills>             # 참조
    <skill path="...">           # 개별 스킬
  <knowledge-refs>               # 참조
    <ref path="...">             # 개별 문서
  <persona>                      # 텍스트 블록
  <input-contract>               # 구조화 데이터
    <required>/<optional>        # 필드 그룹
      <field name="...">        # 개별 필드
  <rules>                        # 리스트
    <must>/<must-not>            # 개별 규칙
  <tsq-cli>                      # 프로토콜
    <on-task-start>              # 이벤트 핸들러
    <forbidden>                  # 금지 사항
  <task-completion-protocol>     # 출력 형식
  <feedback-routing>             # 라우팅
    <level id="N" severity=".."> # 개별 레벨
</agent>
```

---

## 5. ID 체계 및 네이밍

### 5.1 ID 패턴

| 대상 | 패턴 | 예시 |
|------|------|------|
| Phase | `P{N}` | P1, P2, P3 |
| Sequence | `P{N}-S{NNN}` | P3-S001, P3-S002 |
| Task | `P{N}-S{NNN}-T{NNN}` | P3-S001-T001 |
| Feedback | `FB-{NNN}` | FB-001 |
| Blocker | `BLK-{NNN}` | BLK-001 |
| Approval | `APV-{NNN}` | APV-001 |

### 5.2 Phase 번호

| Phase | ID | 설명 |
|-------|----|------|
| Planning | P1 | PRD, 요구사항 정의 |
| Design | P2 | 아키텍처, UI/UX, DB 설계 |
| Implementation | P3 | 구현 |
| Review | P4 | QA, 코드 리뷰 |
| Security | P5 | 보안 감사 |
| Deployment | P6 | 배포 |

### 5.3 파일 네이밍

| 파일 유형 | 패턴 | 예시 |
|----------|------|------|
| 에이전트 | `tsq-{역할}.md` | `tsq-developer.md` |
| 스킬 | `{도메인}/{스킬}/SKILL.md` | `testing/tdd/SKILL.md` |
| 체크리스트 | `{도메인}-{이름}.md` | `security.md` |
| SSOT | `{영문명}.md` (kebab-case) | `service-spec.md` |
| 로그 | `{task-id}.json` | `P3-S001-T001.json` |

---

## 6. 안티패턴

새 에이전트/스킬 작성 시 피해야 할 패턴입니다.

### 6.1 에이전트 프롬프트

| 안티패턴 | 문제 | 올바른 방법 |
|---------|------|------------|
| SSOT 참조 없는 rules | 근거 없는 지시 → 환각 유발 | `<prerequisites>`로 SSOT 명시 |
| tsq-cli 섹션 누락 | 로그 미기록 → 회고 불가 | 반드시 포함 |
| input-contract 없음 | PM이 뭘 전달해야 할지 모름 | required/optional 명시 |
| feedback-routing 없음 | 이슈 발견 시 행동 기준 모호 | 3단계 반드시 정의 |
| persona 과잉 상세 | 토큰 낭비 | 3-4줄 이내 |
| 여러 역할 혼합 | 책임 모호 → 품질 저하 | 1 에이전트 = 1 역할 |

### 6.2 스킬

| 안티패턴 | 문제 | 올바른 방법 |
|---------|------|------------|
| SKILL.md 120줄 초과 | 매번 전체 로드 → 토큰 낭비 | rules/references/로 분리 |
| 추상적 규칙 ("좋은 코드를 작성하라") | 실행 불가 | 구체적 기준 (Incorrect/Correct 패턴) |
| 예시 없는 rules/ 파일 | 해석 차이 | Incorrect/Correct 코드 예시 필수 |
| 프로젝트 특화 내용 | 재사용 불가 | knowledge/로 분리 |
| rules/에 가이드성 문서 | 용도 혼동 | references/로 분리 (규칙 ≠ 지식) |
| scripts/에서 외부 URL 호출 | 보안 위험 | 로컬 실행만 허용 |
| frontmatter 없는 rules/references/ | 인덱싱 불가 | title, impact/category 필수 |

### 6.3 Knowledge

| 안티패턴 | 문제 | 올바른 방법 |
|---------|------|------------|
| 범용 지식 나열 ("REST API란...") | 모델이 이미 알고 있음 | 프로젝트 특화 규칙만 |
| 판단 불가능한 체크리스트 항목 | "성능이 좋은가?" → 기준 모호 | "응답 100ms 이하인가?" |
| 체크리스트에 심각도 누락 | 피드백 라우팅 연결 불가 | Critical/Major/Minor 명시 |

---

## 7. 새 에이전트 추가 체크리스트

새 에이전트를 만들 때 아래 항목을 순서대로 확인하세요.

### 설계 단계

- [ ] 역할이 기존 에이전트와 겹치지 않는가?
- [ ] 1 에이전트 = 1 역할 원칙을 지키는가?
- [ ] 이 역할에 필요한 스킬 파일이 존재하는가? (없으면 먼저 작성)
- [ ] 이 역할에 필요한 체크리스트가 존재하는가?

### 프롬프트 작성

- [ ] frontmatter: name, description, model, tools, `skills: [tsq-protocol, ...]`
- [ ] `<role-summary>` — 역할 요약 1~2줄
- [ ] `<prerequisites>` — task-context.json + SSOT + knowledge 참조
- [ ] 역할별 선택 섹션 (1.3 참조)
- [ ] `<input-contract>` — required/optional 필드 정의
- [ ] `<rules>` — must/must-not 최소 3개씩
- [ ] `<task-completion-protocol>` — task-result.md 참조
- [ ] `<feedback-routing>` — 3단계 (triggers + route)

### 등록

- [ ] `templates/common/claude/agents/tsq-{역할}.md` 파일 생성
- [ ] `src/types/project.ts` — `AgentType` union에 추가
- [ ] `src/types/config.ts` — `AgentsConfig`에 추가
- [ ] `src/lib/agent-generator.ts` — `AGENT_PRESETS`에 추가
- [ ] `CLAUDE.md.template` — delegation-rules에 위임 규칙 추가

### 검증

- [ ] `npm run build` 통과
- [ ] `tsq init` 시 에이전트 파일 생성 확인
- [ ] 에이전트 호출 시 input-contract 필드 제공 확인
- [ ] 완료 시 task-result.md 형식 리턴 확인
- [ ] tsq log enrich 호출 확인

---

## 8. 새 스킬 추가 체크리스트

### SKILL.md

- [ ] `templates/common/claude/skills/{도메인}/{스킬}/SKILL.md` 생성
- [ ] frontmatter: `name`, `description` (1024자 이하), `version`, `tags`, `user-invocable`
- [ ] Philosophy 섹션 — 핵심 원칙 3-5개
- [ ] Resources 테이블 — rules/references/scripts 통합 인덱스
- [ ] Quick Rules — 인라인 핵심 규칙
- [ ] Checklist — CRITICAL/HIGH/MEDIUM 확인 항목
- [ ] **120줄 이하** 유지

### 하위 디렉토리 (필요 시)

- [ ] `rules/` — 개별 규칙 (frontmatter: title, impact, tags, Incorrect/Correct 예시)
- [ ] `references/` — 심층 가이드 (frontmatter: title, category, source)
- [ ] `scripts/` — 자동화 (메타데이터 헤더: @name, @description, set -euo pipefail)
- [ ] 5개+ 룰 시 `rules/_sections.md` 카테고리 인덱스 생성

### 등록

- [ ] 에이전트 frontmatter `skills: [...]` 배열에 추가
- [ ] `src/types/config.ts` — `SkillsConfig`에 추가 (해당 시)
- [ ] `src/lib/skill-generator.ts` — `SKILL_PRESETS`에 추가 (해당 시)

### 검증

- [ ] `npm run build` 통과
- [ ] `npm run test:prompt` — frontmatter + 구조 검증 통과
- [ ] SKILL.md ≤120줄 확인
- [ ] 외부 스킬 도입 시 보안 검사 완료 (§2.8 참조)
