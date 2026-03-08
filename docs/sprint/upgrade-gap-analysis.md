# Upgrade Gap Analysis — 스킬 주입 기반 파이프라인 강화

**작성일**: 2026-03-08
**목적**: 현재 TimSquad 구조와 업그레이드 방향 간 갭 분석
**배경**: AI 에이전트 제어 시스템 고도화 (지시사항 망각/이탈 방지, SSOT 대용량 컨텍스트 정교화)

---

## 갭 분석 테이블

| 항목 | 현재 상태 | 갭 | 변경 필요 파일 | 예상 공수 |
|------|-----------|-----|---------------|-----------|
| **CLAUDE.md 경량화** | 83줄, CLI 레퍼런스가 대부분(40줄). 구조 설명·작업 원칙 포함. 이미 비교적 경량이지만 CLI 전체 명령어 목록이 인라인으로 포함 | CLI 레퍼런스를 별도 스킬/ref로 분리 필요. 핵심 개념 설명도 스킬로 위임 가능. 현재 ~83줄 → 목표 ~30줄 인덱스 | `CLAUDE.md`, 신규 `skills/tsq-cli/SKILL.md` + `references/` | 0.5d |
| **스킬 파일 표준화** | 14개 스킬 존재. 현재 섹션: Philosophy, Resources, Quick Rules, Checklist. 템플릿(`_template/SKILL.md`)에 Contract / Protocol / Verification / Dependencies 섹션 없음. `depends_on`/`conflicts_with`는 frontmatter에만 존재하고 본문엔 미반영 | **Contract** (입출력 계약), **Protocol** (실행 절차), **Verification** (자기검증 방법) 섹션이 전체 14개 스킬에 부재. 현재 Checklist가 Verification 역할을 일부 대행하지만 검증 명령/exit code 기준이 없음 | `_template/SKILL.md` + 14개 SKILL.md 전체 | 2~3d |
| **스킬 주입 파이프라인** | `skill-suggest.sh` (UserPromptSubmit)가 키워드 매칭으로 스킬 제안만 함. controller가 서브에이전트에 spec 주입. 그러나 메인세션 제약은 규칙 파일(rules/*.md)로만 존재하고, 서브에이전트 프로토콜도 `tsq-protocol` 스킬을 에이전트 frontmatter `skills:` 필드로 수동 선언 | 제안(advisory) → **강제 주입(mandatory)** 전환 필요. skill-suggest.sh는 `additionalContext`로만 전달, 읽기를 강제하지 않음. 메인세션에 대한 제약 스킬이 별도로 없음 (CLAUDE.md에 인라인). 서브에이전트 시작 시 프로토콜 스킬 자동 로드 메커니즘 부재 | `skill-suggest.sh`, `settings.json`, 신규 `skills/main-session-constraints/SKILL.md`, 신규 `scripts/skill-inject.sh` | 2d |
| **검증 프로세스 강화** | `completion-guard.sh` (Stop hook)이 테스트 미실행 블로킹. `build-gate.sh`가 빌드 검증. `e2e-commit-gate.sh`가 E2E 마커 검증. 그러나 스킬 단위 자기검증은 없음. `/audit` 커맨드는 `tsq audit`로 CLI에 존재하지만 slash command가 아닌 CLI 명령 | 각 스킬의 Verification 섹션 → 자동 실행 파이프라인 연결 부재. 작업 완료 후 "이 스킬의 체크리스트를 모두 확인했는가?"를 강제하는 메커니즘 없음. `/audit`가 Claude Code slash command로 등록되어 있지 않음 | 스킬 Verification 섹션 (위 항목과 연동), 신규 `/audit` slash command, `completion-guard.sh` 확장 | 1.5d |
| **Slash Commands** | 현재 0개. 모든 스킬이 `user-invocable: false`. `tsq` CLI 명령은 있지만 Claude Code의 `/command` 형태로 등록된 것 없음 | `/spec`, `/audit`, `/review` 3개 신규 필요. Claude Code의 custom slash command = `.claude/commands/` 디렉토리의 markdown 파일 | 신규 `.claude/commands/spec.md`, `.claude/commands/audit.md`, `.claude/commands/review.md` | 1d |

---

## 영상 4대 시스템 vs TimSquad 매핑

| 영상 시스템 | TimSquad 대응 | 충족도 | 갭 |
|------------|--------------|--------|-----|
| **자동 매뉴얼 시스템** (Hook으로 매뉴얼 강제 읽기) | `skill-suggest.sh` (제안만), rules/*.md (자동 로드) | **60%** | 제안→강제 전환 필요. 매뉴얼 경량화(목차+챕터)는 스킬 구조로 이미 설계됨 |
| **작업 기억 시스템** (Plan/Context/Todo) | `session-notes.jsonl`, `task-context.json`, 데몬의 컨텍스트 주입 | **70%** | Plan 문서 자동 생성·저장 프로세스 미정형. 컨텍스트 노트가 수동 |
| **자동 품질 검사** (수정기록/완료검사/리마인더) | `completion-guard.sh`, `build-gate.sh`, `change-scope-guard.sh` | **75%** | 스킬별 자기검증 미구현. 보안 리마인더 같은 도메인별 리마인더 없음 |
| **전문 에이전트 시스템** (역할분담/상세보고/교차리뷰) | 6개 에이전트 정의, HandoffPayload, controller spec 주입 | **80%** | 교차 리뷰 에이전트(`/review`)가 없음. 보고서 구조가 스킬로 강제되지 않음 |

---

## 주의사항

### 건드리면 안 되는 것

1. **`settings.json` Hook 구조** — 현재 8개 이벤트에 10개 Hook이 안정적으로 동작 중. Hook 추가는 OK지만 기존 Hook의 순서·타이밍을 변경하면 completion-guard/build-gate 연쇄 동작이 깨질 수 있음
2. **에이전트 frontmatter의 `skills:` 필드** — controller가 이 필드를 파싱해서 스킬을 주입하는 파이프라인. 필드 이름이나 구조를 바꾸면 `tsq compile` + controller 전체가 영향받음
3. **SKILL.md 120줄 제한** — `prompt-quality.test.ts`가 강제. 새 섹션(Contract/Protocol/Verification) 추가 시 기존 내용 압축 필수. 무작정 추가하면 테스트 실패

### 가장 먼저 해야 할 것 (의존성 없이 바로 시작 가능)

**Slash Commands 추가** (`/spec`, `/audit`, `/review`)
- `.claude/commands/` 디렉토리에 markdown 파일만 생성하면 됨
- 기존 코드·스킬·Hook 변경 없음
- 즉시 사용 가능하고 가장 높은 체감 효과

---

## 실행 계획 (3단계)

### 1단계: Slash Commands + CLAUDE.md 경량화 (1d)

- `/spec`, `/audit`, `/review` 3개 커맨드 생성
- CLAUDE.md에서 CLI 레퍼런스를 `tsq-cli` 스킬로 분리, 본문을 30줄 인덱스로 축소
- **효과**: 지시사항 이탈 방지의 첫 관문 (`/spec` 없으면 구현 차단) + 컨텍스트 예산 절약

### 2단계: 스킬 템플릿 표준화 + 주입 강화 (2~3d)

- `_template/SKILL.md`에 Contract / Protocol / Verification 섹션 추가
- 기존 핵심 스킬 5~6개에 우선 적용 (coding, testing, security, controller, tsq-protocol, product-audit)
- `skill-suggest.sh` → `skill-inject.sh`로 진화: 매칭된 스킬의 SKILL.md를 `systemMessage`로 강제 주입
- **효과**: 매뉴얼 강제 읽기 + 자기검증 기반 마련

### 3단계: 검증 파이프라인 완성 (1.5d)

- `completion-guard.sh` 확장: Stop 시점에 활성 스킬의 Verification 섹션 체크리스트를 리마인더로 주입
- `/audit` 커맨드가 `tsq audit validate` + 스킬 Verification 통합 실행
- `/review` 커맨드가 별도 에이전트로 교차 리뷰 수행
- **효과**: "완료 = 자기검증 통과"가 시스템적으로 강제됨

---

## 총 공수

- 순차: 4.5~5.5d
- 병렬: ~3d

## 핵심 인사이트

현재 TimSquad는 영상의 4대 시스템 **인프라가 대부분 갖춰져 있지만**, "제안(advisory)"에서 "강제(mandatory)"로의 전환이 핵심 갭이다. 스킬 파일에 Contract/Protocol/Verification을 추가하고, Hook이 이를 강제 주입·검증하는 구조로 바꾸면 "95점 에이스" 수준에 도달할 수 있다.
