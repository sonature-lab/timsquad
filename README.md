# TimSquad

**AI Agent Development Process Framework**

> **"AI 시대의 소프트웨어 개발 표준 프로세스"** — SSOT 기반 문서 체계, 최적화된 에이전트 롤, 회고적 학습을 통해 지속적으로 개선되는 고품질 소프트웨어 생성 프레임워크

```
최적화된 롤 정의 + 고도화된 스킬 + 회고적 학습 = 지속적으로 개선되는 고품질 결과물
```

---

## Why TimSquad?

| | oh-my-* | **TimSquad** |
|---|---------|------------|
| 철학 | "Zero learning curve" | **"체계를 세우면 더 잘 된다"** |
| 의사결정 | LLM이 알아서 | **개발자가 컨트롤** |
| 우선순위 | 속도 | **품질 + 일관성** |
| 반복 작업 | LLM이 처리 | **프로그램이 처리 (토큰 절약)** |
| 학습 | 없음 | **회고적 학습으로 지속 개선** |

**For developers who want structure, not magic.**

### 타겟 사용자

- 체계적인 프로세스를 원하는 시니어 개발자
- 1인 CTO / 테크 리드 (혼자서 팀 수준의 품질 필요)
- 문서화와 일관성을 중시하는 개발자

### NOT for

- "알아서 해줘" 원하는 사람 → oh-my-claudecode 추천
- 코딩만 빠르게 하고 싶은 사람 → Claude Code 그냥 사용

### 토큰 효율성

> **"LLM은 생각하는 일에만, 반복 작업은 프로그램에게"**

| 작업 | oh-my-* 방식 | TimSquad 방식 | 절약률 |
|-----|-------------|--------------|-------|
| 피드백 분류 | LLM 판단 | YAML 규칙 | **100%** |
| 로그 저장 | "저장해" 프롬프트 | bash 파이프 | **100%** |
| 에이전트 선택 | LLM 오케스트레이터 | 프로그램 스케줄러 | **100%** |
| 메트릭 수집 | LLM 분석 | jq + bash | **100%** |
| 품질 경고 | LLM 판단 | threshold 체크 | **100%** |
| **전체** | 100% | 40-60% | **40-60% 절약** |

---

## 설치

### npm (권장)

```bash
# 전역 설치
npm install -g timsquad

# 또는 npx로 직접 실행
npx timsquad init
```

### Git Clone

```bash
git clone https://github.com/sonature-lab/timsquad.git
cd timsquad
npm install && npm run build && npm link
```

**요구사항:**
- Node.js >= 18.0.0
- [Claude Code](https://claude.ai/claude-code) (에이전트 실행 환경)
- Git (선택 - `tsq commit`, `tsq pr` 등)
- GitHub CLI `gh` (선택 - 회고 Issue, Improvement 분석)

---

## 빠른 시작

### 1. 프로젝트 초기화

```bash
# 대화형 초기화
tsq init

# 비대화형
tsq init -n my-app -t web-service -l 2 -y
```

### 2. 생성되는 구조

```
my-app/
├── CLAUDE.md                      # PM 역할 정의 (에이전트 지시사항)
├── .gitignore                     # TimSquad 맞춤 설정
├── .claude/
│   ├── settings.json              # Claude Code 훅 설정
│   ├── agents/                    # 8개 전문 에이전트
│   │   ├── tsq-planner.md         # 기획/설계 (Opus)
│   │   ├── tsq-developer.md       # 코드 구현 (Sonnet)
│   │   ├── tsq-qa.md              # 검증/리뷰
│   │   ├── tsq-security.md        # 보안 검토
│   │   ├── tsq-dba.md             # DB 설계
│   │   ├── tsq-designer.md        # UI/UX 설계
│   │   ├── tsq-prompter.md        # 프롬프트 최적화
│   │   └── tsq-retro.md           # 회고 분석
│   ├── hooks/                     # 이벤트 자동화
│   │   ├── event-logger.sh        # 이벤트 로깅
│   │   ├── auto-worklog.sh        # 작업 로그 자동 생성
│   │   └── auto-metrics.sh        # 메트릭 자동 수집
│   └── skills/                    # 도메인별 스킬셋
│       ├── backend/node/
│       ├── frontend/(react, nextjs)/
│       ├── database/prisma/
│       ├── methodology/(tdd, bdd, ddd)/
│       └── ...
└── .timsquad/
    ├── config.yaml                # 프로젝트 설정
    ├── ssot/                      # SSOT 문서 (최대 14개)
    ├── process/                   # 워크플로우 정의
    ├── state/                     # 상태 관리 (phase, workspace)
    ├── knowledge/                 # 프로젝트 지식 베이스
    ├── feedback/                  # 피드백 저장소
    ├── logs/                      # 작업 로그
    └── retrospective/             # 회고 데이터
```

### 3. Claude Code에서 작업

```bash
claude                            # Claude Code 실행

# PM(CLAUDE.md)이 자동으로 작업을 분류하고 에이전트에 위임
@tsq-planner "PRD 작성 시작해줘"
@tsq-developer "로그인 API 구현해줘"
@tsq-qa "코드 리뷰해줘"
```

### 4. CLI로 작업 관리

```bash
tsq status                        # 현재 상태 확인
tsq q "버튼 색상 변경"              # Quick 모드 (간단한 작업)
tsq f "결제 기능 추가"              # Full 모드 (SSOT 검증)
tsq log today                     # 오늘 작업 로그
```

---

## 핵심 개념

### SSOT (Single Source of Truth)

모든 에이전트가 참조하는 단일 문서 체계. 프로젝트 레벨에 따라 필수 문서 수가 결정됩니다:

| 레벨 | 설명 | 필수 문서 | 대상 |
|------|------|----------|------|
| **Level 1** (MVP) | 최소 문서, 빠른 개발 | PRD, Planning, Requirements, Service Spec, Data Design (5개) | 사이드 프로젝트, PoC |
| **Level 2** (Standard) | 균형 잡힌 문서화 | Level 1 + Glossary, Functional Spec, UI/UX Spec, Error Codes, Env Config, Test Spec (11개) | 일반 프로젝트, 스타트업 |
| **Level 3** (Enterprise) | 완전한 문서화 + 추적성 | Level 2 + Deployment Spec, Integration Spec, Security Spec (14개) | 엔터프라이즈, fintech |

### 분수(Fountain) 모델

SSOT는 순차적 의존성, 실제 작업은 병렬 실행:

```
SSOT (순차: PRD → 기획 → 설계)
         │
    ┌────┼────┐
    ↓    ↓    ↓
  화면  요건  API    ← 병렬 작업
    │    │    │
    └────┼────┘
         ↓
    ERD + 구현 (병렬)
         ↓
      QA/Test
         │
    ┌────┼────┐
    ↓    ↓    ↓
  L1   L2   L3      ← 피드백 라우팅
         ↓
   회고적 학습 → 템플릿/프롬프트 자동 개선
```

### 프로젝트 타입

| 타입 | 설명 | 추가 필수 문서 |
|------|------|--------------|
| `web-service` | SaaS, 풀스택 웹 서비스 | UI/UX Spec |
| `web-app` | BaaS 기반 (Supabase/Firebase) | UI/UX Spec, Data Design |
| `api-backend` | API 서버, 마이크로서비스 | - |
| `platform` | 프레임워크, SDK | Integration Spec, Glossary |
| `fintech` | 거래소, 결제 (Level 3 강제) | Security Spec, Error Codes, Deployment Spec |
| `infra` | DevOps, 자동화 | Deployment Spec, Env Config |

---

## 에이전트 시스템

PM(CLAUDE.md)이 총괄하며, 작업 유형에 따라 전문 에이전트에게 위임합니다:

| 에이전트 | 모델 | 역할 | 도구 |
|----------|------|------|------|
| **PM** (CLAUDE.md) | Opus | 총괄 관리, 작업 분류, SSOT 관리 | 전체 |
| `@tsq-planner` | Opus | 기획, 아키텍처, API 설계 | Read, Write, Edit, Bash, Grep, Glob, WebSearch |
| `@tsq-developer` | Sonnet | 코드 구현, 테스트, 리팩토링 | Read, Write, Edit, Bash, Grep, Glob |
| `@tsq-qa` | Sonnet | 코드 리뷰, 테스트 검증 | Read, Bash, Grep, Glob |
| `@tsq-security` | Sonnet | 보안 리뷰, 취약점 분석 | Read, Bash, Grep, Glob |
| `@tsq-dba` | Sonnet | DB 설계, 쿼리 최적화 | Read, Write, Edit, Bash |
| `@tsq-designer` | Sonnet | UI/UX 설계 | Read, Write, Edit |
| `@tsq-prompter` | Sonnet | 프롬프트 최적화 | Read, Write, Edit, Grep |
| `@tsq-retro` | Sonnet | 회고 분석, 학습 | Read, Write, Grep, Glob |

### 위임 규칙

```
기획/PRD/아키텍처  → @tsq-planner
코드/테스트/리팩토링 → @tsq-developer (SSOT 필수)
코드 리뷰/검증     → @tsq-qa
보안 검토          → @tsq-security
기타              → PM이 직접 처리
```

### Workspace 동기화

에이전트 간 작업 상태는 `.timsquad/state/workspace.xml`로 실시간 공유됩니다:

```xml
<workspace>
  <current-task>로그인 API 구현</current-task>
  <completed-tasks>...</completed-tasks>
  <blockers>...</blockers>
  <handoff-notes>...</handoff-notes>
</workspace>
```

---

## CLI 명령어 상세

### 프로젝트 관리

```bash
tsq init                              # 프로젝트 초기화
tsq init -n my-app -t web-service -l 2 -y  # 비대화형
tsq status                            # 프로젝트 상태 확인
tsq status --ssot                     # SSOT 문서 상태만
tsq status --phase                    # 현재 Phase만
tsq status --metrics                  # 메트릭만
tsq status --all                      # 전체 상세
```

### 작업 모드

```bash
# Quick 모드 - 간단한 작업 (SSOT 검증 생략)
tsq q "버튼 색상을 파란색으로 변경"
tsq quick "오타 수정"

# Full 모드 - 본격 작업 (SSOT 검증 포함)
tsq f "사용자 인증 기능 추가"
tsq full "결제 모듈 구현"
```

**Quick vs Full 판단 기준:**

| | Quick (`tsq q`) | Full (`tsq f`) |
|---|---|---|
| SSOT 검증 | 생략 | 필수 |
| 라우팅 | `@tsq-developer` 직행 | `@tsq-planner` 경유 |
| 적합한 작업 | CSS 수정, 오타, 간단한 버그 | 새 기능, API 변경, DB 변경 |
| 복잡도 판단 | 자동 (키워드 분석) | - |
| 로그 위치 | `logs/quick/` | `logs/{date}-planner.md` |

Quick 모드는 작업 복잡도를 자동 분석합니다. "API 변경", "DB 스키마", "인증" 등 복잡한 키워드가 감지되면 Full 모드 전환을 제안합니다.

### 작업 로그

```bash
tsq log add developer work "인증 모듈 구현 완료"
tsq log add qa decision "E2E 테스트 프레임워크로 Playwright 선택"
tsq log add developer error "Prisma migration 실패"
tsq log list                          # 로그 파일 목록
tsq log list developer                # 특정 에이전트만
tsq log today                         # 오늘 로그
tsq log today developer               # 오늘 특정 에이전트 로그
tsq log view 2026-02-13-developer.md  # 특정 파일
tsq log search "인증"                  # 키워드 검색
tsq log summary                       # 오늘 요약
tsq log summary 2026-02-10            # 특정 날짜 요약
```

**로그 타입:**

| 타입 | 설명 | 예시 |
|------|------|------|
| `work` | 수행한 작업 | "로그인 API 구현 완료" |
| `decision` | 내린 결정 | "JWT 대신 세션 방식 채택" |
| `error` | 발생한 에러 | "DB connection timeout" |
| `feedback` | 피드백 기록 | "API 응답 형식 변경 필요" |
| `handoff` | 작업 인수인계 | "보안 검토 필요 → @tsq-security" |

#### 로그 압축 (`tsq log compact`)

오래된 로그를 압축하여 디스크를 절약합니다:

```bash
tsq log compact                   # 기본 30일 이상 로그 압축
tsq log compact --days 14         # 14일 이상 로그 압축
tsq log compact --dry-run         # 미리보기 (실제 삭제 안 함)
```

**압축 방식:**
- **세션 JSONL** → 월별 summary JSON으로 통합 (이벤트 수, 도구 사용, 실패율 등 통계 보존)
- **작업 로그 MD** → 월별 archive MD로 병합
- 원본 파일은 삭제되어 디스크 절약
- `--dry-run`으로 먼저 확인 후 실행 권장

### Git 연동

```bash
tsq commit                           # 대화형 커밋
tsq commit -m "feat: 로그인 추가"     # 메시지 지정
tsq commit -a -m "fix: 버그 수정"     # 전체 스테이지 + 커밋
tsq pr                               # Pull Request 생성
tsq sync                             # fetch + rebase
tsq release                          # 태그 + GitHub Release
```

### SSOT 감시

```bash
tsq watch start    # SSOT 파일 변경 감시 시작
tsq watch stop     # 감시 중지
tsq watch status   # 감시 상태 확인
```

`.timsquad/ssot/` 디렉토리의 변경을 실시간 감지하여 `ssot-changes.log`에 기록합니다.

### 세션 관리

```bash
tsq session list                 # 세션 목록
tsq session view <id>            # 세션 상세
```

---

## 피드백 시스템

### 피드백 라우팅

피드백을 3단계로 분류하여 적절한 담당자에게 자동 전달합니다:

```bash
tsq feedback "테스트 실패: login API 404 에러"      # → Level 1
tsq feedback "API 응답 구조가 프론트와 안 맞음"       # → Level 2
tsq feedback "결제 기능 스펙 변경 필요"              # → Level 3
```

```
Level 1 (구현 수정) → @tsq-developer  → 승인 불필요, 즉시 수정
Level 2 (설계 수정) → @tsq-planner    → SSOT 업데이트 필요
Level 3 (기획 수정) → 사용자          → 승인 필수
```

### 자동 분류 트리거 (15종)

| Level | 트리거 | 키워드 예시 |
|-------|--------|-----------|
| **1** (구현) | `test_failure` | 테스트 실패, test fail |
| **1** | `lint_error` | lint, eslint, prettier |
| **1** | `type_error` | 타입 에러, type error, TS2304 |
| **1** | `runtime_error` | 런타임 에러, crash, 500, timeout |
| **1** | `code_style_violation` | 코드 스타일, convention |
| **2** (설계) | `architecture_issue` | 아키텍처, 구조 변경, 레이어 |
| **2** | `api_mismatch` | API 불일치, 인터페이스, 스펙 |
| **2** | `performance_problem` | 성능, 느림, N+1, 메모리 |
| **2** | `scalability_concern` | 확장성, 스케일링, 부하 |
| **2** | `security_vulnerability` | 보안, 취약점, XSS, SQL injection |
| **3** (기획) | `requirement_ambiguity` | 요구사항 모호, 스펙 불명확 |
| **3** | `scope_change` | 범위 변경, 추가 기능, 일정 변경 |
| **3** | `business_logic_error` | 비즈니스 로직, 정책, 규칙 |
| **3** | `feature_request` | 기능 요청, 새 기능 |
| **3** | `stakeholder_feedback` | 피드백, 리뷰 결과, 고객 의견 |

### 피드백 저장

```
.timsquad/
├── logs/{date}-feedback.md          # 사람이 읽는 로그
└── feedback/
    ├── FB-0001.json                 # 구조화 데이터 (회고 집계용)
    ├── FB-0002.json
    └── phase-planning-2026-02-13.json  # Phase KPT 회고
```

**FB JSON 구조:**
```json
{
  "id": "FB-0001",
  "timestamp": "2026-02-13T10:30:00Z",
  "type": "user-feedback",
  "level": 1,
  "trigger": "test_failure",
  "message": "login API 404 에러",
  "routeTo": "developer",
  "tags": ["api", "testing"]
}
```

### 자동 피드백 생성

Claude Code 세션 종료 시 도구 실패가 **3회 이상**이면 `auto-worklog.sh`가 자동으로 `FB-XXXX.json`을 생성합니다:

```json
{
  "id": "FB-0005",
  "type": "auto-feedback",
  "level": 1,
  "trigger": "tool_failure",
  "message": "세션 abc123에서 도구 실패 5회 감지. 실패 도구: Bash(3) Edit(2)",
  "routeTo": "developer",
  "tags": ["auto-detected", "tool_failure", "abc123"]
}
```

수동 개입 없이 문제 패턴이 자동으로 축적되어 회고 시 분석됩니다.

---

## 회고 시스템 (Retrospective)

TimSquad의 핵심 차별점인 **회고적 학습 파이프라인**입니다. 축적된 데이터를 분석하여 에이전트 프롬프트, SSOT 템플릿, 워크플로우를 지속적으로 개선합니다.

### 전체 파이프라인

```
[Claude Code 세션]
        │
        ▼
[Hook 자동화] ─── event-logger.sh ──→ 이벤트 JSONL 기록
   (토큰 0)                │
                           ├──→ auto-worklog.sh ──→ 작업 로그 + 품질 경고 + 자동 피드백
                           └──→ auto-metrics.sh ──→ 누적 메트릭 갱신
        │
        ▼
[피드백 축적] ─── tsq feedback ──→ FB-XXXX.json (수동)
                  auto-worklog ──→ FB-XXXX.json (자동, 실패 3회+)
                  tsq retro phase ──→ phase-{name}-{date}.json (KPT)
        │
        ▼
[회고 사이클] ─── tsq retro auto ──→ 수집 → 분석 → 리포트 → 적용
        │                              │
        │                              ├──→ cycle-N.md (리포트)
        │                              ├──→ GitHub Issue (retro-feedback 라벨)
        │                              └──→ 피드백 아카이브
        │
        ▼
[개선 분석] ─── tsq improve fetch ──→ GitHub Issue 수집
                tsq improve analyze ──→ 패턴 분석 + 개선 제안
                tsq improve summary ──→ 결과 확인
        │
        ▼
[적용] ──→ 에이전트 프롬프트 개선
           SSOT 템플릿 최적화
           워크플로우 조정
           피드백 라우팅 정확도 향상
```

### Phase 회고 (KPT)

개발 단계별로 KPT(Keep-Problem-Try) 프레임워크 회고를 실행합니다:

```bash
tsq retro phase planning          # planning 단계 회고
tsq retro phase implementation    # implementation 단계 회고
tsq retro phase review            # review 단계 회고
tsq retro phase security          # security 단계 회고
tsq retro phase deployment        # deployment 단계 회고
```

대화형으로 진행:
```
? Keep (잘 된 것) 추가: SSOT 문서 기반 구현으로 일관성 확보
? 더 추가? (y/n): n
? Problem (문제점) 추가: API 스펙 변경이 프론트에 자동 전파 안 됨
? 더 추가? (y/n): n
? Try (다음에 시도) 추가: API 변경 시 프론트 자동 알림 추가
? 더 추가? (y/n): n
✓ Phase retrospective saved
```

저장: `.timsquad/feedback/phase-{phase}-{date}.json`

### 회고 사이클 (수동)

5단계로 구성된 전체 회고 사이클:

```bash
tsq retro start     # 1. 새 사이클 시작
tsq retro collect   # 2. 로그 및 메트릭 수집
tsq retro analyze   # 3. 패턴 분석
tsq retro report    # 4. 리포트 생성 + GitHub Issue
tsq retro apply     # 5. 개선 적용 (피드백 아카이브)
tsq retro status    # 현재 사이클 상태 확인
```

**상태 전이:**
```
idle → collecting → analyzing → reporting → applying → idle
```

각 단계는 중간에 중단해도 이어서 진행할 수 있습니다.

### 자동 회고 (`tsq retro auto`)

위 5단계를 원클릭으로 자동 실행합니다:

```bash
tsq retro auto              # 전체 자동 실행
tsq retro auto --local      # GitHub Issue 생성 생략
```

**실행 흐름:**
```
[1/4] Cycle 3 started
[2/4] Metrics collected (15 logs, 4 agents)
[3/4] Analysis skipped (programmatic mode)
[4/4] Cycle 3 completed
  → Improvement analysis 자동 실행 중...
  → Improvement analysis completed
  결과 확인: tsq improve summary
```

**자동으로 수행하는 작업:**
1. 새 사이클 시작 (또는 기존 사이클 이어서 진행)
2. 로그 파일 수집 + 에이전트별 통계 생성
3. Phase 회고 + 피드백 데이터 집계 리포트 생성
4. GitHub Issue 자동 생성 (라벨: `retro-feedback`)
5. 처리된 피드백 아카이브 (`feedback/` → `archive-cycle-N/`)
6. `tsq improve fetch` + `tsq improve analyze` 자동 연결

### 개선 분석 (`tsq improve`)

회고에서 생성된 GitHub Issue를 분석하여 개선 패턴을 도출합니다:

```bash
tsq improve fetch                # retro-feedback 라벨 Issue 수집
tsq improve fetch --limit 50     # 최대 50개 수집
tsq improve fetch --repo org/repo  # 특정 레포
tsq improve analyze              # 패턴 분석 + 개선 제안
tsq improve summary              # 결과 확인
```

**분석 패턴 카테고리:**

| 카테고리 | 설명 | 개선 대상 |
|---------|------|----------|
| `agent-prompt` | 에이전트 지시/역할 개선 | `.claude/agents/*.md` |
| `ssot-template` | SSOT 템플릿 최적화 | `.timsquad/ssot/*.md` |
| `workflow` | 단계/전환 프로세스 개선 | `.timsquad/process/` |
| `feedback-routing` | 피드백 분류 정확도 향상 | 라우팅 규칙 |
| `config` | 프로젝트 설정 옵션 | `config.yaml` |
| `tooling` | CLI/명령어 UX 개선 | CLI 코드 |

저장: `.timsquad-improve/` 디렉토리

### 회고 리포트 구조

`tsq retro report` 또는 `tsq retro auto`가 생성하는 리포트:

```markdown
# Retrospective Report - Cycle 3

## Summary
- Phase Retros: 3건
- Feedbacks: 12건 (L1: 8, L2: 3, L3: 1)

## By Level
### Level 1 (구현 수정) - 8건
- 테스트 실패 관련 3건
- 타입 에러 관련 2건
- 도구 실패 자동 감지 3건

### Level 2 (설계 수정) - 3건
- API 스펙 불일치 2건
- 성능 이슈 1건

### Level 3 (기획 수정) - 1건
- 요구사항 변경 1건

## By Phase
### Implementation
- Keep: TDD 적용으로 버그 조기 발견
- Problem: API 스펙 변경이 프론트에 전파 안 됨
- Try: API 변경 시 자동 알림 추가

## Top Issues
1. API 스펙 불일치 (3회 반복)
2. 테스트 커버리지 미달 (2회 반복)
```

---

## 메트릭 시스템

### 수집 및 조회

```bash
tsq metrics collect              # 메트릭 수집
tsq metrics collect --days 7     # 최근 7일만 수집
tsq metrics summary              # 최신 메트릭 요약
tsq metrics trend                # 기간별 트렌드 비교
tsq metrics trend --n 5          # 최근 5개 기간 비교
tsq metrics export               # JSON 내보내기
tsq metrics export --output report.json
```

### 수집 항목

**프로세스 메트릭:**

| 항목 | 설명 |
|------|------|
| Log Activity | 에이전트별 로그 파일 빈도 |
| Decision Ratio | 의사결정 로그 비율 |
| Error Rate | 에러 로그 비율 |

**피드백 메트릭:**

| 항목 | 설명 |
|------|------|
| Total Feedback | 총 피드백 수 |
| Level 1/2/3 | 레벨별 분포 |

**SSOT 건강도:**

| 항목 | 설명 |
|------|------|
| Completion Rate | SSOT 문서 작성 완료율 (%) |
| Filled / Total | 작성된 문서 수 / 필수 문서 수 |

**세션 & 토큰 메트릭:**

| 항목 | 설명 | 기준 |
|------|------|------|
| Tool Efficiency | 도구 성공률 (%) | 90%+ 정상 |
| Cache Hit Rate | 프롬프트 캐시 적중률 | **80%+ 우수** / 60-80% 보통 / **<60% 주의** |
| Output Tokens/Turn | 턴당 평균 출력 토큰 | - |
| CLI Adoption | Bash에서 tsq CLI 사용률 (%) | 높을수록 자동화 활용 |

### 자동 메트릭 수집 (`auto-metrics.sh`)

Claude Code 세션 종료 시 자동으로 세션 JSONL을 분석하여 `.timsquad/retrospective/metrics/latest.json`에 누적합니다. **토큰 비용 0**.

누적 수집 항목:
- 총 세션 수, 총 이벤트 수
- 도구 사용 횟수, 실패 횟수
- 서브에이전트 호출 횟수
- 토큰 (Input, Output, Cache Create, Cache Read)
- 파생 지표: Tool Efficiency, Cache Hit Rate, CLI Adoption

### 품질 경고 (Quality Alerts)

`auto-worklog.sh`가 세션 종료 시 자동으로 threshold를 검사합니다:

| 경고 | 조건 | 의미 | 조치 |
|------|------|------|------|
| Tool Failure Rate | > 10% | 도구 실패 과다 | 에이전트 프롬프트, 권한 설정 점검 |
| Cache Hit Rate | < 60% | 캐시 비효율 | CLAUDE.md, 에이전트 프롬프트 구조 검토 |

경고 발생 시: `.timsquad/logs/{date}-alerts.md`에 자동 기록

```markdown
# Quality Alerts - 2026-02-13

> TimSquad 자동 품질 경고 - threshold 초과 시 자동 생성

- **[10:45:00]** Tool Failure Rate 15% (> 10%) - 세션 `abc123`
  - 도구 실패 6/40회. 에이전트 프롬프트나 권한 설정 점검
- **[14:30:00]** Cache Hit Rate 45% (< 60%) - 세션 `def456`
  - 프롬프트 구조 불안정. CLAUDE.md 또는 에이전트 프롬프트 검토
```

---

## 자동화 파이프라인

### Claude Code Hook 아키텍처

Claude Code 세션 이벤트에 반응하는 3개의 훅 스크립트:

```
SessionStart ───────→ event-logger.sh (세션 시작 로깅)
PostToolUse ────────→ event-logger.sh (도구 사용 기록)
PostToolUseFailure ─→ event-logger.sh (도구 실패 + 에러 기록)
SubagentStart ──────→ event-logger.sh (서브에이전트 시작)
SubagentStop ───────→ event-logger.sh (서브에이전트 종료)
Stop ───────────────→ event-logger.sh (에이전트 중단)

SessionEnd ─────────→ event-logger.sh ─┬→ auto-worklog.sh (작업 로그 자동 생성)
                                       │    ├→ 품질 경고 (threshold 체크)
                                       │    └→ 자동 피드백 (실패 3회+)
                                       └→ auto-metrics.sh (누적 메트릭 갱신)
```

**모든 자동화는 토큰 비용 0** — bash + jq를 사용한 순수 파일 I/O

### event-logger.sh

세션의 모든 이벤트를 JSONL 형식으로 기록:

```jsonl
{"timestamp":"10:30:00","event":"SessionStart","session":"abc123"}
{"timestamp":"10:30:05","event":"PostToolUse","tool":"Read","session":"abc123"}
{"timestamp":"10:30:10","event":"PostToolUseFailure","tool":"Bash","error":"permission denied","session":"abc123"}
{"timestamp":"10:35:00","event":"SubagentStart","subagent_type":"developer","session":"abc123"}
{"timestamp":"10:40:00","event":"SubagentStop","session":"abc123"}
{"timestamp":"10:45:00","event":"SessionEnd","session":"abc123","total_usage":{"input_tokens":125000,"output_tokens":8500}}
```

저장: `.timsquad/logs/sessions/{date}-{session-id}.jsonl`

### auto-worklog.sh

세션 종료 시 JSONL을 분석하여 사람이 읽을 수 있는 작업 로그를 자동 생성합니다:

```markdown
## Session abc123 (2026-02-13 10:30)
| 항목 | 값 | 설명 |
|------|---|------|
| Tool Uses | 45 | PostToolUse 이벤트 수 |
| Failures | 2 | PostToolUseFailure 이벤트 수 |
| Subagents | 3 | 서브에이전트 호출 수 |
| Duration | ~15min | 세션 추정 시간 |
| Input Tokens | 125,000 | 프롬프트 입력 토큰 |
| Output Tokens | 8,500 | 모델 출력 토큰 |
| Cache Hit Rate | 82% | 80%+ 우수 / 60-80% 보통 / <60% 주의 |

### Top Tools
Read(15) Edit(12) Bash(8) Grep(5) Glob(3) Write(2)
```

### auto-metrics.sh

세션 JSONL을 분석하여 `latest.json`에 누적 메트릭을 갱신합니다. 기존 데이터에 새 세션 데이터를 더하는 방식으로, 여러 세션에 걸친 트렌드를 추적합니다.

---

## 아키텍처 템플릿

`tsq init` 시 포함되는 아키텍처 참조 문서:

| 패턴 | 설명 | 적합한 타입 |
|------|------|-----------|
| **Hexagonal** (Ports & Adapters) | 외부 의존성 격리 | api-backend, platform |
| **FSD** (Feature-Sliced Design) | 프론트엔드 기능 단위 분리 | web-app, web-service |
| **Clean Architecture** | 계층 분리, 의존성 역전 | 범용 |

추가로 CQRS, Event Sourcing, Repository 패턴 참조 파일도 포함됩니다.

---

## 설정

`.timsquad/config.yaml`:

```yaml
project:
  name: "my-app"
  type: web-service
  level: 2

agents:
  planner:
    model: opus
  developer:
    model: sonnet
  qa:
    model: sonnet

methodology:
  development: tdd
  process: agile
  branching: github-flow
```

---

## 프로젝트 구조

```
timsquad/
├── bin/                        # CLI 진입점
│   └── tsq.js
├── src/
│   ├── index.ts                # 명령어 등록
│   ├── commands/               # CLI 명령어 구현
│   │   ├── init.ts             # 프로젝트 초기화
│   │   ├── status.ts           # 상태 확인
│   │   ├── log.ts              # 로그 관리 + 압축
│   │   ├── retro.ts            # 회고 시스템 (수동/자동)
│   │   ├── feedback.ts         # 피드백 라우팅
│   │   ├── metrics.ts          # 메트릭 수집/트렌드
│   │   ├── quick.ts            # Quick 모드
│   │   ├── full.ts             # Full 모드
│   │   ├── watch.ts            # SSOT 감시
│   │   ├── improve.ts          # 개선 분석
│   │   ├── session.ts          # 세션 관리
│   │   └── git/                # Git 명령어
│   │       ├── commit.ts
│   │       ├── pr.ts
│   │       ├── release.ts
│   │       └── sync.ts
│   ├── lib/                    # 핵심 라이브러리
│   ├── types/                  # TypeScript 타입
│   └── utils/                  # 유틸리티
├── templates/                  # 프로젝트 타입별 템플릿
│   ├── common/                 # 공통 (에이전트, 훅, 스킬, SSOT)
│   ├── web-service/
│   ├── web-app/
│   ├── api-backend/
│   ├── platform/
│   ├── fintech/
│   └── infra/
├── scripts/                    # 레거시 셸 스크립트
├── docs/
│   └── PRD.md                  # 상세 기획 문서
└── install/
```

---

## Theoretical Background

| 이론/논문 | 핵심 개념 | TimSquad 적용 |
|---------|---------|--------------|
| **Agentsway** (2025) | Prompting Agent, Retrospective Learning | 프롬프트 최적화, 회고적 학습 |
| **ACM TOSEM** (2025) | Competency Mapping | 역량 프레임워크, 성과 지표 |
| **Agentic SE** (2025) | AGENT.md, Meta-Prompt Files | 계층화된 메타-프롬프트 구조 |
| **FRAME** (2025) | Feedback-Driven Refinement | 레벨별 피드백 라우팅 |

---

## Roadmap

- [x] **Phase 0 (MVP)** - common 템플릿, 기본 에이전트, CLI
- [x] **Phase 1** - 자동화 파이프라인, 회고 시스템, 메트릭 고도화
- [ ] **Phase 2** - Plugin 배포, MCP 서버, 멀티 LLM 지원

---

## Contributing

기여를 환영합니다!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Related Projects

- [Anthropic Skills](https://github.com/anthropics/skills)
- [Superpowers](https://github.com/obra/superpowers)

---

**TimSquad v2.1** - AI Agent Development Process Framework
