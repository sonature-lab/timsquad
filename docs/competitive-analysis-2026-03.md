# Claude Code 하네스 프레임워크 비교 분석 리포트

> 작성일: 2026-03-19 | 분석 대상: Superpowers v5, GSD v1/v2, oh-my-claudecode (OMC), oh-my-claude-code (KaimingWan), TimSquad v3.7

---

## 1. 프레임워크 프로필 요약

| 항목 | **Superpowers** | **GSD** | **OMC** | **oh-my-claude-code (KW)** | **TimSquad** |
|------|----------------|---------|---------|---------------------------|-------------|
| 개발자 | Jesse Vincent (obra) | TÂCHES (Lex) | Yeachan-Heo | KaimingWan | sonature-lab |
| GitHub Stars | ~94k | ~35k (v1) / ~2k (v2) | ~10.3k | 소규모 | 비공개 (Open Core) |
| 철학 | "스킬 = 슈퍼파워" | "Context rot 방지" | "무기, 도구가 아닌" | "코드로 강제, 말로 강제 안 함" | "Vibe Development Framework" |
| 설치 | `/plugin install` | `npx get-shit-done-cc` | `/plugin install` | Git clone/submodule | `npx timsquad init` |
| 런타임 | Claude/Cursor/Codex/OpenCode/Gemini | Claude/Gemini/Codex/Copilot/OpenCode | Claude Code | Claude Code | CLI (`tsq`) + Claude Code |
| 버전 | v5 (2026-03) | v1 + v2 (Pi SDK) | v4.8+ | v3 (oh-my-kiro로 리네임) | v3.7.0 |
| 라이선스 | MIT | MIT | MIT | MIT | MIT (Open Core) |

---

## 2. 아키텍처 비교

### 2-1. Superpowers — "Progressive Disclosure 스킬 프레임워크"

- **구조**: 듀얼 리포 (코어 + 스킬), Anthropic 공식 마켓플레이스 등록
- **스킬**: 20+ 배틀테스트 스킬 (TDD, 디버깅, 브레인스토밍, 코드 리뷰, 병렬 에이전트)
- **핵심 패턴**: Wrapper Pattern — 슬래시 커맨드(~200B, 6줄 YAML) → 스킬(1,000+줄)
- **토큰 효율**: 3단계 Progressive Disclosure
  - 메타데이터 스캔 (~100토큰)
  - 전체 지시사항 (<5k토큰)
  - 번들 리소스 (on-demand)
- **서브에이전트**: Git Worktree 기반 격리, 태스크당 fresh 서브에이전트 + 2단계 리뷰 (스펙 → 품질)
- **모델 라우팅 (v5 신기능)**: Opus/Sonnet → 기획/리뷰, Haiku → 구현 (1/3 비용, 2x 속도)
- **TDD 강제**: 코드를 테스트 전에 작성하면 **코드를 삭제하고 테스트부터 재시작** 강제
- **Hook**: DSL(Double Shot Latte) — 인간 개입 필요 여부를 다른 Claude 인스턴스가 판단
- **보안**: Claude Code 네이티브 권한 시스템에 의존. 자체 보안 게이트 없음

**7-Phase 워크플로우**: Brainstorming → Git Worktree → Planning → Subagent Implementation → TDD → Code Review → Branch Completion

### 2-2. GSD — "Context Rot 해결사"

- **구조**: ~50 마크다운 파일 + Node CLI(`gsd-tools.cjs`, 11함수) + 2 Hooks
- **스킬**: 29 슬래시 커맨드, 12 커스텀 에이전트
- **핵심 패턴**: Atomic Task — 각 태스크를 fresh 서브에이전트(200k 토큰)에서 수행
- **작업 계층**: Milestone(출시 버전) → Slice(데모 가능 기능) → Task(단일 컨텍스트)
- **토큰 효율**: 컨텍스트 0-30%가 sweet spot, 50% 초과 시 품질 저하 인식 → 강제 분할
- **원칙**: "결정론적 로직은 코드에, 프롬프트에 넣지 마라"
- **Wave 병렬**: 독립 태스크를 Wave로 묶어 병렬 실행, 의존성 있으면 직렬
- **Hook**: 2개만 (status bar + update checker) — 극단적 최소주의
- **보안**: **`--dangerously-skip-permissions` 사용을 공식 권장** — 보안보다 생산성 우선
- **비용**: 4:1 오버헤드 (코드 1토큰당 오케스트레이션 4토큰). Max 플랜($100-200/월) 권장
- **v2**: Pi SDK 기반 독립 CLI, 컨텍스트 윈도 직접 제어, 크래시 복구, 비용 추적 대시보드

**6-Step 워크플로우**: new-project → discuss → plan → execute → verify → complete-milestone

**공인된 한계**: GSD 스스로 "현재 LLM 컨텍스트 한계에 대한 워크어라운드이지, 영구적 아키텍처 패턴이 아니다"고 인정

### 2-3. oh-my-claudecode (OMC) — "멀티에이전트 오케스트레이터"

- **구조**: 플러그인 시스템, 31 hook, 32 전문 에이전트, 40+ 스킬
- **핵심 패턴**: 5 실행 모드
  - **Team** (canonical, 멀티에이전트 분해)
  - **Autopilot** (자율 실행)
  - **Ultrapilot** (5 concurrent workers, 3-5x 속도)
  - **Ralph** (persistent verify/fix 루프)
  - **Ecomode** (토큰 절약)
- **멀티모델**: Claude + Gemini + Codex 오케스트레이션 (tmux pane, MCP 불필요)
- **모델 라우팅**: Opus → 아키텍처/분석, Sonnet → 표준, Haiku → 빠른 조회 (30-50% 절감)
- **메모리**: 3-tier (Notepad → Project Memory → Centralized State), 컨텍스트 컴팩션 생존
- **Hook**: 31개 — 가장 많음 (code-simplifier, session-end, continuation, OpenClaw 등)
- **보안**: 21개 보안 취약점 패치 이력 (SSRF, 커맨드 인젝션, prototype pollution 등). 공식 보안 모델은 미공개
- **비용**: ~$60/월 (Claude + Gemini + ChatGPT Pro 3개 플랜)

**워크플로우**: team-plan → team-prd → team-exec → team-verify → team-fix (루프)

### 2-4. oh-my-claude-code (KaimingWan) — "3-Layer Determinism"

- **구조**: oh-my-zsh 모델 — 에이전트가 매 상호작용에서 학습, 지능 축적
- **핵심 인사이트**: "소프트 프롬프트(UserPromptSubmit)는 에이전트가 반복적으로 무시함" → v3에서 Hard Gate로 전환
- **3-Layer 결정론**:
  - **L1 Commands (100%)**: `@plan`, `@execute`, `@research`, `@review` — 사용자 트리거
  - **L2 Gates (100%)**: PreToolUse hooks — 에이전트가 우회 불가
  - **L3 Feedback (~50%)**: PostToolUse/Stop hooks — 에이전트가 무시할 수 있음
- **보안**: rm -rf/sudo/curl|bash 차단, API키 스캔, **8카테고리 스킬 위협 스캔** (Snyk ToxicSkills 기반, 퍼블릭 스킬 36.82% 보안 이슈)
- **학습**: episodes.md (실수/성공 타임라인, 30건 cap, 자동 정리 및 rules 승격)
- **Ralph Loop**: Python 외부 루프 — 체크리스트 읽기 → fresh CLI 스폰 → 검증 → 실패 시 revert → 3회 정체 시 circuit-break
- **현재**: "oh-my-kiro"로 리네임 (플랫폼 전환 시사)

### 2-5. TimSquad — "5-Layer Defence-in-Depth 하네스"

- **구조**: 5-Layer 아키텍처
  1. **Hook Gate (100%)** — PreToolUse + Capability Token = 시스템 레벨 차단
  2. **Skill Protocol (90-95%)** — tsq-protocol + controller 프로세스 안내
  3. **CLAUDE.md (역할만)** — PM 역할 + Quick/Full 분기 최소 규칙
  4. **Slash Commands** — /full, /quick, /done 명시적 프로세스 선택
  5. **Audit** — PostToolUse 감사 로그 + tsq session
- **스킬**: 37개 `tsq-*` flat namespace
  - 코어: tsq-protocol, tsq-controller, tsq-daemon
  - 코딩: tsq-coding, tsq-testing, tsq-tdd, tsq-bdd, tsq-debugging, tsq-decompose, tsq-ddd
  - 웹: tsq-react, tsq-nextjs, tsq-ui, tsq-hono
  - 모바일: tsq-dart, tsq-flutter
  - DB: tsq-database, tsq-prisma
  - 설계: tsq-architecture, tsq-planning, tsq-security
  - 품질: tsq-product-audit, tsq-audit, tsq-stability
  - 회고: tsq-retro (3모드: feedback/retro/improve)
  - 슬래시: tsq-start, tsq-status, tsq-spec, tsq-quick, tsq-full, tsq-grill(PRD/Reinforce/Sub-PRD 3모드), tsq-update, tsq-delete
  - 유틸: tsq-librarian, tsq-log, tsq-prompt
- **Hook**: 14개 (Fail-closed 7 + Fail-open 7) — v3.7.1에서 8→14 확장
  - PreToolUse(Write/Edit): phase-guard → check-capability(+Agent Gate) → change-scope-guard → tdd-guard → stale-guard
  - PreToolUse(Bash): safe-guard
  - Stop: completion-guard(+Phase Gate, SSOT Gate, Decision Log 검증) → build-gate(모노레포)
  - PreCompact: pre-compact (상태 저장)
  - SessionStart: context-restore (컨텍스트 복원)
  - SubagentStart/Stop: 서브에이전트 라이프사이클 추적 + tsq next --complete 자동 호출 + Completion Report 스키마 검증
- **Capability Token 패턴**:
  - Controller 실행 → `.timsquad/state/controller-active` + `allowed-paths.txt` 생성
  - check-capability.sh가 Write/Edit 시 토큰 검증 → 없으면 차단
  - 작업 완료 → 토큰 삭제 (capability 회수)
- **에이전트 타입별 도구 제한**:
  - Developer: 풀 액세스
  - QA: Read-only (Read, Grep, Glob, Bash)
  - Librarian: src/ 쓰기 금지
  - Architect: Read-only 검증
- **change-scope-guard**: 3파일 경고 / 6파일 차단 / 100줄 경고
- **SSOT**: ssot-map.yaml로 모든 에이전트가 동일한 ground truth 참조
- **템플릿**: 7 project-type (web-service, api-backend, web-app, platform, fintech, mobile-app, infra)
- **fintech**: 멀티모델 합의 강제 (고위험 결정)
- **CLI**: 10개 커맨드 (init, update, daemon, next, plan, spec, log, status, retro, audit)
- **테스트**: 680 테스트 (vitest)
- **실전**: dugout-tours.jp — 일본 대상 한국여행 스타트업, 결제 포함, Lighthouse 95/96/100/100

---

## 3. 다각적 비교 분석

### 3-1. 보안 (Security)

| 기준 | Superpowers | GSD | OMC | KW oh-my-cc | **TimSquad** |
|------|:-:|:-:|:-:|:-:|:-:|
| PreToolUse 차단 Hook | DSL (간접) | 없음 | 일부 | L2 Hard Gate | **phase-guard + capability-check + safe-guard** |
| Capability Token (동적 권한) | 없음 | 없음 | 없음 | 없음 | **있음** |
| 파일 쓰기 제한 | 없음 | deny rules | 없음 | 작업 디렉토리 제한 | **Hook Gate (Write/Edit + allowed-paths)** |
| Bash 명령 가드 | 없음 | deny rules | 없음 | rm -rf/sudo/curl 차단 | **safe-guard.sh** |
| 서브에이전트 추적 | Worktree 격리 | 없음 | tmux 관리 | 없음 | **SubagentStart/Stop hook** |
| Fail-closed 설계 | 없음 | 없음 | 없음 | L2만 | **5개 hook Fail-closed** |
| 스킬 보안 스캔 | 없음 | 없음 | 없음 | **8카테고리 위협 스캔** | 없음 (자체 스킬만) |
| 변경 범위 제한 | 없음 | 없음 | 없음 | 없음 | **change-scope-guard** |
| 감사 로그 | 없음 | 없음 | 세션 리플레이 | episodes.md | **PostToolUse 감사 + tsq session** |
| 공식 보안 권장 | 네이티브 의존 | **skip-permissions 권장** | 패치 이력만 | Hook-first | **Defence-in-Depth** |

**평가**: TimSquad가 보안 아키텍처에서 가장 체계적. Capability Token은 업계에서도 드문 패턴(Microsoft Entra Agent ID 수준). GSD의 `--dangerously-skip-permissions` 권장은 보안 관점에서 가장 위험. KaimingWan의 "소프트 프롬프트는 무시당한다" 발견은 TimSquad의 Hook Gate 접근을 외부 데이터로 검증.

### 3-2. 프로세스 품질 (Process Quality)

| 기준 | Superpowers | GSD | OMC | KW oh-my-cc | TimSquad |
|------|:-:|:-:|:-:|:-:|:-:|
| 개발 라이프사이클 | 브레인스토밍→TDD→리뷰 | 스펙→계획→실행→검증 | 분석→계획→병렬실행→QA | 리서치→계획→실행→리뷰 | 기획→분해→코딩→테스트→감사→회고 |
| TDD 강제력 | **극강 (코드 삭제)** | 스펙 기반 | UltraQA | 없음 | tsq-tdd + tsq-bdd |
| 코드 리뷰 | 2단계 (스펙+품질) | 없음 | 리뷰 스킬 | @review 커맨드 | tsq-audit (교차 리뷰) |
| 회고/학습 | 없음 | 없음 | Learner 스킬 | **episodes.md 자동 학습** | **tsq-retro 3모드** |
| 품질 검증 | verification-before-completion | verify-work | UltraQA 사이클 | L3 auto-test | **completion-guard + build-gate** |
| 자기 감사 | 없음 | 없음 | 없음 | 없음 | **tsq-audit + tsq-product-audit** |
| SSOT 문서 관리 | 설계 문서 저장 | .planning/ 상태 | .omc/ 상태 | knowledge/INDEX.md | **ssot-map.yaml (Tiered)** |

**평가**: Superpowers는 TDD 강제력이 가장 높음 (테스트 전 코드 작성 시 삭제). GSD는 스펙 기반으로 체계적. TimSquad는 회고/학습 루프와 자기감사, SSOT 관리가 독보적.

### 3-3. 속도 / 토큰 효율 (Speed & Token Efficiency)

| 기준 | Superpowers | GSD | OMC | KW oh-my-cc | TimSquad |
|------|:-:|:-:|:-:|:-:|:-:|
| 병렬 실행 | Worktree + 병렬 디스패치 | Wave 병렬 | **Ultrapilot 5병렬** | Ralph Loop (직렬) | Controller 위임 |
| 컨텍스트 관리 | **Progressive Disclosure** | **Atomic Task (fresh 200k)** | 3-tier 메모리 | 없음 | PreCompact + context-restore |
| 모델 라우팅 | **Haiku 구현 (1/3 비용)** | 없음 | **Opus/Sonnet/Haiku** | 없음 | 없음 |
| 토큰 절약 | 3단계 프로그레시브 | 태스크 분할 | Ecomode | 없음 | 스킬 on-demand |
| 비용 | 저 (Haiku 활용) | **고 (4:1 오버헤드)** | 중 (~$60/월) | 저 | 중 |
| 컨텍스트 rot 대응 | 없음 | **핵심 기능** | 메모리 지속 | 없음 | PreCompact 방어적 |

**평가**: 속도는 OMC Ultrapilot(5x 병렬)이 최고. 토큰 비용은 Superpowers v5 모델 라우팅이 가장 효율적. GSD는 효과적이나 4:1 오버헤드로 비용 부담 큼.

### 3-4. 실전 검증 (Production Proof)

| 기준 | Superpowers | GSD | OMC | KW oh-my-cc | TimSquad |
|------|:-:|:-:|:-:|:-:|:-:|
| 커뮤니티 | **94k stars** | 35k stars | 10.3k stars | 소규모 | 비공개 |
| 실사용 | Amazon/Google/Shopify | 동일 | 활발 | 미공개 | **dugout-tours.jp** |
| 벤치마크 | chardet v7.0 (41x 속도) | 없음 | 없음 | 없음 | **Lighthouse 95/96/100/100** |
| 테스트 수 | 미공개 | 미공개 | 미공개 | 미공개 | **669 테스트** |
| 프로덕션 서비스 | 미공개 | 미공개 | 미공개 | 미공개 | **결제 포함 일본 여행 사이트** |
| 도그푸딩 | Superpowers 자체 | GSD 자체 | OMC 자체 | 자체 | **외부 실서비스 구축** |
| 프로젝트 타입 | 범용 | 범용 | 범용 | 범용 | **7 project-type 템플릿** |

**평가**: 커뮤니티 규모는 Superpowers 압도적. 실전 프로덕션 증거는 TimSquad가 가장 구체적 — 결제 시스템을 포함한 실서비스에서 Lighthouse 근만점은 프레임워크 수준의 품질 보증.

### 3-5. 확장성 / 커스터마이징

| 기준 | Superpowers | GSD | OMC | KW oh-my-cc | TimSquad |
|------|:-:|:-:|:-:|:-:|:-:|
| 마켓플레이스 | **Anthropic 공식** | 없음 | 없음 | 없음 | 없음 (Open Core) |
| 플랫폼 지원 | **7종** | 6종 | Claude Only | Claude Only | Claude (Cursor 계획) |
| 프로젝트 타입 | 범용 | 범용 | 범용 | 범용 | **7종 특화 템플릿** |
| 도메인 오버레이 | 없음 | 없음 | 없음 | 없음 | **있음 (유료, MCP)** |
| 비즈니스 모델 | 오픈소스 | 오픈소스 | 오픈소스 | 오픈소스 | **Open Core** |

---

## 4. 종합 평가 매트릭스

| 차원 | Superpowers | GSD | OMC | KW oh-my-cc | **TimSquad** |
|------|:-:|:-:|:-:|:-:|:-:|
| **보안** | C+ | D+ | C | B+ | **A** |
| **프로세스 품질** | A- | B+ | B | B+ | **A** |
| **속도** | B+ | B | **A** | C+ | B |
| **토큰 효율** | **A** | B- | B+ | C | B+ |
| **실전 검증** | A (커뮤니티) | A- | B+ | C | **A (프로덕션)** |
| **확장성** | **A** | B+ | B | B- | A- |
| **학습 곡선** | B+ | A- | B- | B | C+ |
| **엔터프라이즈 적합성** | B | C | B | B+ | **A-** |

---

## 5. TimSquad 발전 로드맵

### 5-0. 이미 완료된 개선 (2026-03-19)

#### tsq-grill v2.0 — 소크라틱 인터뷰 3모드화

| 항목 | Before (v1.0) | After (v2.0) |
|------|--------------|-------------|
| 모드 | Sub-PRD만 | **PRD / PRD Reinforce / Sub-PRD** 자동 분기 |
| PRD 작성 | tsq-planning에서 질문 3-5개 약식 | **grill PRD Mode: 소크라틱 심층 인터뷰 강제** |
| 기존 PRD 보강 | 미지원 | **PRD Reinforce Mode: 빈 섹션 감지 → 보강** |
| 질문 트리 | 고정 체크리스트 | **가이드 (프로젝트 특성별 적응)** |
| Why 설명 | Rules가 명령만 | **각 규칙에 이유 명시** |
| Description | 트리거 범위 좁음 | **pushy (아이디어 구체화, 스코프 잡기 등 커버)** |

#### tsq-start 온보딩 — 개발환경 강제 + grill 강제 연결

| 항목 | Before | After |
|------|--------|-------|
| 개발환경 | 셋업 없이 바로 SSOT 작성 | **Step 0: config.yaml 기반 테스트 프레임워크 강제 설치 (건너뛸 수 없음)** |
| PRD 작성 | 핵심 질문 3-5개 약식 인터뷰 | **Step 1: `/tsq-grill prd` 강제 호출 (건너뛸 수 없음)** |
| 프로세스 | PRD 약식 → Sub-PRD grill → 나머지 | **개발환경 → grill PRD → grill Sub-PRD → 나머지 SSOT** |
| 원칙 | "인터뷰 후 초안 생성" | **"테스트 없이 코드 없고, PRD 없이 설계 없다"** |

Step 0 도입으로 #25 이슈(Test Gate 무한 블로킹)가 근본 해결됨 — 테스트 환경이 처음부터 존재하므로 Test Gate가 항상 통과 가능.

#### CLAUDE.md Just-in-time 가이드 전환 — 러닝커브 개선

CLAUDE.md의 역할을 **게이트키퍼("온보딩부터 하세요")에서 가이드("보강할까요?")**로 전환.
`src/lib/template.ts`의 TIMSQUAD_BLOCK 수정으로 완료. 기존 파이프라인 변경 없음.

| 항목 | Before (게이트키퍼) | After (가이드) |
|------|-------------------|---------------|
| SSOT 없이 작업 지시 | "온보딩부터 하세요" (차단) | "기획서가 없습니다. 만들어볼까요?" (안내) |
| SSOT 부족한 상태로 작업 | 전체 SSOT 충족도 체크 → 차단 | **관련 스펙만** 점검 → "보강할까요?" |
| 사용자 거절 시 | 진행 불가 | **그대로 진행** (강제는 Hook이 담당) |
| 테스트 환경 미설치 | 블로킹 없이 진행 → 나중에 Test Gate 차단 | "테스트 환경이 없습니다. 설치할까요?" |

```
두 경로 공존:
  숙련자: /tsq-start → 온보딩 전체 → /tsq-full (기존과 동일)
  초심자: "결제 기능 만들어줘" → 스펙 부족 안내 → /tsq-grill → 보강 → 코딩
```

CLAUDE.md = 자동화되지 않는 파이프라인의 연결고리.
Hook = "해서는 안 되는 것" 차단. CLAUDE.md = "하면 좋은 것" 안내.
기존 프로젝트는 `tsq update`로 CLAUDE.md 블록만 교체되며 파이프라인 변경 없음.

---

### 5-1. 하이브리드 Controller 아키텍처 (최우선)

#### 문제 진단

현재 Controller는 스킬(프롬프트)이며 모든 상태 관리/프로토콜 강제를 LLM에 의존한다.
이는 TimSquad 자체 원칙 "Enforce from outside"와 모순되며, #24 이슈의 근본 원인이다.

> "소프트 프롬프트는 에이전트가 반복적으로 무시한다" — KaimingWan oh-my-claude-code v2→v3 전환 교훈

#### 설계: 결정론적 로직은 코드에, 판단은 LLM에

```
Before — 전부 스킬(프롬프트):
  protocol(스킬) → controller(스킬) → agent+skills(스킬)
  = 전 계층이 LLM 의존, 컨텍스트 rot에 취약

After — 하이브리드:
  Hook+CLI(코드)  → controller(스킬)  → agent+skills(스킬)
  ├── 상태 관리      ├── 프롬프트 구성     ├── 코딩/테스트/리뷰
  ├── 순서 강제      ├── 품질 판단         └── 도메인 판단
  ├── 게이트 검증    └── 토큰 발행
  └── trigger chain
  = 100% 신뢰       = 90-95% (충분)       = 90-95% (충분)
```

#### 구현 상세

**A. `tsq next` CLI 커맨드 신설**

```bash
tsq next                    # 다음 미완료 태스크 JSON 출력
tsq next --complete T2-1-3  # 태스크 완료 기록 → workflow.json 갱신
tsq next --phase-status     # Phase 완료 여부 + 누락 산출물 체크
```

로직: planning.md 파싱 + workflow.json 상태 비교. LLM 판단 불필요.
사용자가 직접 치는 커맨드가 아님 — Controller 스킬이 내부적으로 호출.

**B. Hook 확장**

| Hook | 추가 로직 | 해결하는 이슈 |
|------|----------|-------------|
| **SubagentStop** | `tsq next --complete` 자동 호출 → workflow.json 갱신 | Controller가 기록 잊어버리는 문제 |
| **SubagentStop** | 완료 Task 요약 1줄을 `phase-memory.md` progress 섹션에 append | Phase 중간 컨텍스트 압축 시 진행 상황 소실 방지 |
| **completion-guard (Stop)** | `tsq next --phase-status` → 산출물 누락 시 블로킹 | **#24** trigger chain 미강제 |
| **completion-guard (Stop)** | 테스트 프레임워크 감지 → 미설치 시 warning 다운그레이드 | **#25** Test Gate 무한 블로킹 |

> **phase-memory 점진적 갱신**: 기존 설계는 Phase 완료 시 Librarian이 한 번에 생성하지만,
> 긴 Phase(Task 10개+)에서 중간 컨텍스트 압축 발생 시 현재 Phase 진행 정보가 없는 문제가 있었다.
> SubagentStop에서 Task 완료마다 1줄씩 append하면, context-restore가 현재 Phase의 실시간 진행을 복원할 수 있다.
> Phase 완료 시 Librarian이 이 progress 섹션을 정리하여 최종 phase-memory HEAD를 생성한다.

**C. Controller 스킬 리팩토링**

제거 (코드로 이동):
- planning.md 읽고 다음 태스크 결정 → `tsq next`
- workflow.json 직접 갱신 → SubagentStop hook
- trigger chain 기억 → Stop hook 강제

유지 (LLM 판단 필요):
- 관련 SSOT 스펙 결정
- 서브에이전트 프롬프트 구성
- 결과 품질 평가 + 재시도 결정
- Capability Token 발행

**D. 사용자 관점 변화: 없음**

```
사용자: "/tsq-full"  ← 이것만 치면 됨, 나머지 전부 자동

내부: Controller(스킬) → tsq next(CLI) → 서브에이전트 → SubagentStop(hook)
      → tsq next --complete(자동) → 다음 태스크 → ... → Phase 게이트(hook) → Librarian 강제
```

#### 의존 관계

```
tsq next CLI ──────────────────── 핵심 (planning.md 파서)
  ├── SubagentStop hook 확장 ──── tsq next --complete 호출
  ├── completion-guard 확장 ───── tsq next --phase-status 호출
  └── Controller SKILL.md 리팩 ── tsq next 호출하도록 변경
```

---

### 5-1.5. 전체 스킬 Enforcement Gap 분석 — "밖에서 강제" 확대 적용

하이브리드 Controller(5-1)의 원칙을 전체 스킬 시스템에 확대 적용한 분석.
37개 스킬에서 **34개 enforcement gap** 발견. LLM이 "기억해서 따라야" 작동하는 소프트 규칙을
HOOK/CLI/SCRIPT로 이동시켜 시스템 강제로 전환한다.

#### 현재 vs 목표 아키텍처

```
현재 — 대부분 LLM 의존:
  Hook(시스템)      8개  → 보안 게이트만
  스킬(프롬프트)    37개 → 프로세스 + 상태 + 검증 전부
  CLI               3개  → init, update, daemon

목표 — 하이브리드:
  Hook(시스템)     ~20개 → 보안 + 프로세스 게이트 + 출력 검증
  CLI              ~11개 → 상태 관리 + 검증 + 메트릭 + 로그
  Script            ~6개 → DAG/추적성/정리 자동화
  스킬(프롬프트)    37개 → 판단 + 맥락 + 유연한 대응만 (기존 유지)
```

#### CRITICAL — 즉시 Hook으로 전환 (3건)

| 스킬 | 현재 (소프트) | Hook 전환 | 이유 |
|------|-------------|----------|------|
| **tsq-controller** | Capability Token을 LLM이 수동 확인 | PreToolUse: controller-active + allowed-paths 자동 검증 | 서브에이전트 스코프 우회 방지 |
| **tsq-protocol** | Completion Report 5필드를 LLM이 형식 확인 | Stop: Task/Status/Files/Tests/Notes 스키마 자동 검증 | 불완전한 태스크 완료 차단 |
| **tsq-librarian** | "src/ 수정 금지"가 프로즈 제약 | PreToolUse: librarian 컨텍스트에서 src/ Write/Edit 차단 | 기록자가 코드 수정하는 카테고리 위반 방지 |

#### HIGH — 신규 Hook 추가 (8건)

| 스킬 | 현재 (소프트) | Hook 전환 |
|------|-------------|----------|
| **tsq-controller** | Phase gate 통과를 LLM이 판단 | PostToolUse: 테스트 exit code 파싱 → 실패 시 자동 차단 |
| **tsq-controller** | SSOT compile-manifest 신선도를 LLM이 확인 | PreToolUse: manifest hash 비교 → stale 시 블로킹 |
| **tsq-tdd** | Red-Green-Refactor를 LLM이 기억 | PreToolUse: 구현 파일 Write 전 테스트 파일 존재 확인 |
| **tsq-testing** | 커버리지 80%/70%를 LLM이 확인 | PostToolUse: npm test 출력에서 커버리지 % 추출 → 미달 차단 |
| **tsq-librarian** | SSOT 메타데이터만 변경하라는 프로즈 규칙 | PreToolUse: Edit 시 변경이 metadata 키만인지 검증 |
| **tsq-spec** | SSOT 없이 진행해도 advisory 경고만 | Phase gate hook: Must-Have 스펙 미존재 시 블로킹 |
| **tsq-protocol** | Decision Log JSONL 형식을 LLM이 수동 작성 | Stop: decisions.jsonl 구문 검증 |
| **tsq-decompose** | DAG 순환 의존성을 LLM이 시각적 체크 | `check-circular-deps.sh` 스크립트 호출 |

#### CLI 자동화 (8건)

| 현재 (LLM 수동) | 신규 CLI | 효과 |
|----------------|---------|------|
| workflow.json LLM 직접 편집 | `tsq next --complete` | JSON 손상 방지 (5-1에서 이미 설계) |
| planning.md DAG를 LLM 검증 | `tsq plan validate` | PRD 커버리지 + DAG 무결성 자동 체크 |
| SSOT 신선도 LLM 확인 | `tsq spec check` | 자동 stale 감지 |
| L1→L2/L3 로그를 LLM 수동 집계 | `tsq log sequence/phase` | 로그 자동 집계 |
| retro 메트릭을 LLM 로그 파싱 | `tsq retro metrics` | 객관적 수치 추출 |
| drift-warnings LLM 수동 읽기 | `tsq status --drift` | 드리프트 자동 요약 |
| phase-memory LLM 파싱 | `tsq status --memory` | 구조화된 carry-over |
| audit 점수를 LLM 수동 계산 | `tsq audit score` | 7영역 정량 점수 일관성 |

#### Script 자동화 (6건)

| 현재 (LLM 수동) | 스크립트 |
|----------------|---------|
| DAG 순환 확인 | `check-circular-deps.sh` — 위상 정렬 실패 시 에러 |
| retro 메트릭 수동 파싱 | `calculate-retro-metrics.sh` — L1 로그 → metrics.json |
| PRD 추적성 테이블 수동 생성 | `generate-prd-traceability.sh` — planning.md → Mapped Artifacts |
| audit FP 레지스트리 수동 관리 | `manage-fp-registry.sh` — FP 자동 필터링 |
| trail 정리 10개 초과 수동 rm | `cleanup-trails.sh` — 자동 아카이브 정리 |
| Gherkin 구문을 LLM 판단 | `validate-gherkin.sh` — 파서 기반 검증 |

#### KEEP — LLM 판단 유지 (5건)

이 항목들은 도메인 맥락, 주관적 분석, 시나리오 이해가 필요하여 코드로 대체 불가:

- tsq-protocol 피드백 레벨 분류 (L1/L2/L3) — 도메인 맥락 판단
- tsq-retro 패턴 식별 (실패 3회+ → FP) — 주관적 분석
- tsq-decompose 태스크 단위 판단 — 에이전트 능력 이해
- tsq-tdd 리팩토링 시간 판단 — 구현 복잡도 의존
- tsq-bdd 스텝 재사용 판단 — 시나리오 의미 이해

---

### 5-2. Hook 환경 인식 기반 구축 (이슈 #25, #23 해결)

#### A. 프로젝트 환경 감지 유틸리티

```bash
scripts/detect-env.sh  (공용)
├── has_test_framework()   → vitest/jest/mocha 감지
├── find_tsc()             → 모노레포 내 tsc 위치 탐색
├── get_project_type()     → config.yaml에서 타입 읽기
└── get_current_phase()    → workflow 상태에서 현재 Phase
```

#### B. #25 수정 — Test Gate 적응화

테스트 프레임워크 미감지 시 warning 다운그레이드 + 설치 안내.
Phase 1-2에서는 warning, Phase 3+에서는 blocking.

#### C. #23 수정 — build-gate 모노레포 지원

`find_tsc()`로 정확한 tsc 경로 탐색 + `npx --no-install`.
`.claude/scripts/build-gate.local.sh` 오버라이드 패턴으로 `tsq update` 덮어쓰기 방지.

---

### 5-3. Meta Index 스킬 연결 (#21)

Controller가 `tsq next`로 태스크 정보를 받은 후 Meta Index에서 관련 파일 구조를 조회하여
서브에이전트 프롬프트에 주입. Progressive Disclosure의 인프라 역할.

- 인메모리 캐시 활성화 (`src/daemon/index.ts` 주석 해제)
- `meta-cache.ts` updateFiles() 구현
- Controller → `tsq mi find` 쿼리 통합

---

### 5-4. 경쟁 분석 기반 추가 개선

#### From Superpowers (토큰 효율 + 비용)

| # | 아이디어 | 상세 | 예상 효과 |
|---|---------|------|----------|
| 1 | **Progressive Disclosure** | 스킬 로딩을 메타데이터(~100토큰) → 지시사항(<5k) → 리소스(on-demand) 3단계로 분리 | 37개 스킬의 토큰 효율 대폭 향상 |
| 2 | **모델 라우팅** | Controller가 태스크 복잡도에 따라 모델 자동 선택 (Opus: 설계/리뷰, Haiku: 상세 스펙 구현) | 비용 60-70% 절감 |
| 3 | **커뮤니티 마켓플레이스** | timsquad-mcp 생태계의 스킬 공유 채널 | 생태계 확장 |

#### From GSD (컨텍스트 관리)

| # | 아이디어 | 상세 | 예상 효과 |
|---|---------|------|----------|
| 4 | **Atomic Task 강제 분할** | 컨텍스트 50% 초과 시 Controller가 무조건 fresh 서브에이전트로 위임 | 장시간 세션 품질 유지 |
| 5 | **Wave 병렬 패턴** | 독립 태스크를 Wave로 묶어 병렬 실행 | 처리 속도 향상 |

> 주의: GSD의 `--dangerously-skip-permissions` 접근은 채용하지 않음. Capability Token 내에서 Atomic Task 운용.
> "결정론적 로직은 코드에" 원칙은 5-1 하이브리드 Controller로 이미 반영.

#### From OMC (속도 + 메모리)

| # | 아이디어 | 상세 | 예상 효과 |
|---|---------|------|----------|
| 6 | **병렬 서브에이전트 디스패치** | Controller가 독립 태스크를 최대 N개 동시 실행 | 속도 3-5x 향상 |
| 7 | **3-tier 메모리** | Notepad(컴팩션 생존) + Project Memory + Centralized State | 장시간 세션 안정성 |

#### From KaimingWan oh-my-claude-code (보안 + 학습)

| # | 아이디어 | 상세 | 예상 효과 |
|---|---------|------|----------|
| 8 | **스킬 보안 스캔** | 8카테고리 위협 스캔 (서드파티 스킬 수용 시 필수) | 생태계 안전성 |
| 9 | **자동 교정 캡처** | correction detection hook — 사용자 교정을 자동 기록 | tsq-retro feedback 자동화 |
| 10 | **Circuit-break 패턴** | 3회 정체 시 자동 중단 | 무한 루프 방지 |

---

### 우선순위 종합

| 순위 | 항목 | 분류 | 난이도 | 해결 이슈 | 상태 |
|------|------|------|--------|----------|------|
| **0** | tsq-grill v2.0 + tsq-start 개발환경/grill 강제 + CLAUDE.md Just-in-time 가이드 | 스킬+코드 | 저 | 프로세스 품질+러닝커브 | **완료** |
| **1** | **하이브리드 Controller** (`tsq next` + hook 확장) | CLI+Hook | 중 | **#24, #25** | **완료** (e5d67a9) |
| **1.5** | **CRITICAL Hook 3건** + **Progressive Disclosure** (병렬) | Hook+스킬 | 저~중 | 보안+무결성+토큰효율 | **완료** (fadc4ea, 5f8f480) |
| **2** | Hook 환경 인식 (`detect-env.sh`) + **HIGH Hook 8건** | Hook | 중 | **#25, #23** + 프로세스 강제 | **완료** (40605b1) |
| **3** | **CLI 자동화 8건** (`tsq plan validate`, `tsq spec check` 등) | CLI | 중 | 상태관리+검증 | **완료** (ae892de) |
| **4** | 모델 라우팅 (Controller 태스크별 모델 지정) | 스킬 | 중 | 비용 절감 | 미착수 |
| **5** | Meta Index 스킬 연결 | CLI | 중 | **#21** | 미착수 |
| **6** | **Script 자동화 6건** (DAG 검증, 메트릭, 추적성 등) | Script | 저 | 수동 작업 제거 | 미착수 |
| **7** | 병렬 서브에이전트 + Wave 패턴 | 스킬+CLI | 고 | 속도 | 미착수 |
| **8** | 스킬 보안 스캔 (timsquad-mcp 대비) | CLI | 중 | 생태계 | 미착수 |

> **우선순위 조정 근거**: Progressive Disclosure를 #1.5로 병렬 승격.
> 보완계획이 강점 강화에 편중되어 약점(토큰 효율 B+) 해소를 앞당김.
> "보안은 최강이지만 비싸고 느리다"는 인식 방지.

### 의존 관계 그래프

```
#0 grill v2.0 + start 강제 + CLAUDE.md Just-in-time ✅
  ↓
#1 하이브리드 Controller (tsq next)  ←── 가장 임팩트 큼
  │
  ├── #1.5 CRITICAL Hook 3건 + Progressive Disclosure ← #1과 병렬, 단독 착수 가능
  │     ├── [Hook] Capability Token 자동 검증
  │     ├── [Hook] Completion Report 스키마 검증
  │     ├── [Hook] Librarian src/ 차단
  │     └── [스킬] Progressive Disclosure 3단계 (강점 강화 + 약점 해소 동시)
  │
  ├── #2 Hook 환경 인식 + HIGH Hook 8건 ← #1과 병렬 가능
  │     ├── detect-env.sh (#25, #23)
  │     ├── Phase gate 테스트 exit code 파싱
  │     ├── TDD: 테스트 파일 존재 확인 후 구현 Write 허용
  │     ├── 커버리지 임계치 강제
  │     ├── SSOT 스펙 존재 게이트
  │     └── Librarian 메타데이터 전용 Edit 검증
  │
  ├── #3 CLI 자동화 8건 ← #1 완료 후
  │     ├── tsq plan validate
  │     ├── tsq spec check
  │     ├── tsq log sequence/phase
  │     ├── tsq retro metrics
  │     ├── tsq status --drift/--memory
  │     └── tsq audit score
  │
  └── Controller 리팩 완료 후:
      ├── #4 모델 라우팅
      ├── #5 Meta Index 연결
      ├── #6 Script 자동화 6건 (독립 진행 가능)
      └── #7 병렬 디스패치 + Wave

#8 스킬 보안 스캔 ← timsquad-mcp 시점에 독립 진행
```

---

## 6. 보완계획 유효성 분석 (최종)

> 이 세션에서 수립한 보완계획 전체를 대상으로 세 축(약점 해소, 강점 강화, 단순화)에서 검증한다.

### 6-1. 약점 해소 검증

| 약점 (기존 평가) | 해소 항목 | 효과 | 해소 수준 |
|-----------------|----------|------|----------|
| **학습 곡선 (C+)** | CLAUDE.md Just-in-time 가이드 (완료) | "온보딩부터"→"보강할까요?" 전환 | **C+→B** (완료) |
| **속도 (B)** | 병렬 디스패치 + Wave (#7) | 최대 3-5x | B→A- (후순위) |
| **토큰 효율 (B+)** | Progressive Disclosure (#1.5 병렬 승격) + 모델 라우팅 (#4) | Haiku 활용 시 비용 60-70% 절감 | **B+→A-** (#1.5에서 조기 착수) |
| **컨텍스트 연속성 (미평가)** | phase-memory 점진적 갱신 (SubagentStop append) | Phase 중간 압축에서도 진행 상황 복원 | **신규 강점화** |

**이전 분석 대비 변화**: 토큰 효율 해소가 #1.5 병렬 승격으로 앞당겨짐. phase-memory 점진적 갱신이 추가되어 "컨텍스트 연속성"이라는 **새로운 평가 축**에서도 강점 확보. 이는 GSD의 Atomic Task(매번 fresh)와 다른 접근 — TimSquad는 "컨텍스트를 버리지 않고 이어가되, 코드가 보장한다".

### 6-2. 강점 강화 검증

| 기존 강점 | 보완 항목 | 변화 | 비고 |
|----------|----------|:----:|------|
| Capability Token + Fail-closed Hook | #1.5 CRITICAL Hook 3건 → 시스템 자동 검증 | **강화** | "프롬프트 보안"→"코드 보안" |
| 회고 학습 (tsq-retro) | CLI `tsq retro metrics` + 자동 교정 캡처 | **강화** | 객관적 수치 + 자동 피드백 |
| 자기감사 (tsq-audit) | CLI `tsq audit score` + FP 레지스트리 스크립트 | **강화** | 점수 일관성 + 재감사 노이즈 제거 |
| 7종 project-type 템플릿 | Step 0 개발환경 셋업 → 타입별 자동 구성 | **강화** | 테스트 환경까지 자동 |
| SSOT 기반 에이전트 조율 | CLI `tsq spec check` + CLAUDE.md 스펙 부족 안내 | **강화** | 시스템 감지 + 자연어 안내 이중화 |
| change-scope-guard | 변경 없음 | 유지 | |
| Lighthouse 95/96/100/100 | 직접 영향 없음 | 유지 | |

7개 중 **5개 강화, 2개 유지, 약화 0개.**

**추가 강점 발생 (보완으로 신규 생성):**

| 신규 강점 | 근거 | 경쟁 대비 |
|----------|------|----------|
| **phase-memory 점진적 갱신** | SubagentStop append → 압축 후에도 진행 복원 | GSD: 매번 fresh (연속성 없음), OMC: 3-tier 메모리 (유사하나 Hook 강제 아님) |
| **Just-in-time 스펙 안내** | CLAUDE.md가 작업별로 관련 스펙 부족 감지 → 보강 제안 | Superpowers/GSD/OMC: 없음 (전체 온보딩 or 무시) |
| **34개 소프트 규칙 → 코드 강제 전환** | Hook 20 + CLI 11 + Script 6 | 업계에서 가장 체계적인 enforcement 아키텍처 |

### 6-3. 단순화 검증

#### 사용자 관점 (외부 복잡도) — 5개 축 모두 단순화

| 항목 | Before | After | 효과 |
|------|--------|-------|------|
| 진입 | "/tsq-start 필수 → 온보딩 전체" | "아무 작업 → 필요하면 보강 안내" | 첫 사용 허들 제거 |
| PRD 작성 | 질문 3-5개 약식 → 나중에 부실 | grill 심층 인터뷰 강제 | 재작업 루프 제거 |
| 상태 추적 | 사용자가 "어디까지 했지?" 기억 | `tsq next`가 자동 복원 | 인지 부하 제거 |
| 테스트 환경 | 나중에 Test Gate 막힘 → "왜 안 돼?" | Step 0에서 자동 설치 | 좌절 경험 제거 |
| 세션 재개 | 컨텍스트 압축 후 맥락 소실 | phase-memory 점진적 복원 | "아까 뭐 하고 있었지?" 제거 |

#### 시스템 관점 (내부 복잡도) — 증가하지만 올바른 위치에

| 항목 | Before | After | 복잡도 이동 |
|------|--------|-------|-----------|
| Hook | 8개 | ~20개 | 스킬의 "규칙"이 Hook으로 이동 |
| CLI | 3개 | ~11개 | 스킬의 "상태 관리"가 CLI로 이동 |
| Script | 0개 | ~6개 | 스킬의 "검증 로직"이 Script로 이동 |
| 스킬 | 37개 | 37개 | **판단만 남음** (단순화) |
| CLAUDE.md | 17줄 | 21줄 | 미미한 증가 |

> **핵심 원리**: 복잡도 총량은 불변. 위치가 바뀐다.
> - 스킬(LLM 의존, 90-95% 신뢰, rot에 취약) → 코드(100% 신뢰, rot 무관)
> - 스킬은 **판단**에 집중: "어떤 스펙이 관련있나", "품질이 충분한가", "재시도할까"
> - 코드는 **기억과 강제**에 집중: "다음 태스크", "게이트 통과", "산출물 존재 확인"

### 6-4. 보완 후 예상 평가 매트릭스

| 차원 | SP | GSD | OMC | KW | **현재** | **보완 후** | 변화 |
|------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| **보안** | C+ | D+ | C | B+ | A | **A+** | +1 |
| **프로세스 품질** | A- | B+ | B | B+ | A | **A+** | +1 |
| **속도** | B+ | B | A | C+ | B | B+ | +0.5 |
| **토큰 효율** | A | B- | B+ | C | B+ | **A-** | +1 |
| **실전 검증** | A | A- | B+ | C | A | A | — |
| **확장성** | A | B+ | B | B- | A- | A- | — |
| **학습 곡선** | B+ | A- | B- | B | C+ | **B** | +1.5 |
| **엔터프라이즈** | B | C | B | B+ | A- | **A** | +0.5 |
| **컨텍스트 연속성** | — | — | B+ | — | C+ | **A-** | +2 (신규) |

**9개 차원 중 6개 향상, 3개 유지, 약화 0개.**
**신규 차원(컨텍스트 연속성) 추가 — A- 달성.**

### 6-5. 경쟁자별 격차 변화

| 차원 | vs Superpowers | vs GSD | vs OMC |
|------|:-------------:|:------:|:------:|
| 보안 | A+:C+ = **압도** | A+:D+ = **압도** | A+:C = **압도** |
| 프로세스 | A+:A- = 소폭 우위 | A+:B+ = 우위 | A+:B = **큰 우위** |
| 속도 | B+:B+ = 동등 | B+:B = 소폭 우위 | B+:A = **여전히 열세** |
| 토큰 | A-:A = **근접** (기존 B+:A) | A-:B- = 우위 | A-:B+ = 소폭 우위 |
| 학습곡선 | B:B+ = 근접 (기존 C+:B+) | B:A- = 소폭 열세 | B:B- = **역전** |

**가장 큰 변화**: 토큰 효율에서 Superpowers와의 격차가 **B+:A → A-:A**로 대폭 축소.
학습 곡선에서 OMC를 **역전** (B > B-).
속도에서 OMC 대비 열세는 여전 — #7(병렬 디스패치)이 해소해야 할 마지막 약점.

### 6-6. 리스크

| 리스크 | 심각도 | 대응 |
|--------|:------:|------|
| Hook 20개 유지보수 부담 | 중 | 카테고리별 모듈화 (보안 5 / 프로세스 8 / 출력검증 4 / 라이프사이클 3) |
| CLI 비대화 (3→11개) | 중 | 사용자 CLI(`init`, `update`) vs 내부 CLI(`next`, `spec`, `log`) 명확 분리. 사용자는 2개만 알면 됨 |
| phase-memory append 성능 | 저 | 1줄 append per task — I/O 무시 가능 수준 |
| 속도 약점 미해소 (#7 후순위) | 중 | OMC 대비 속도 열세 유지. #7 실행 시점을 모니터링 |
| 안 하면: #24 미해결 | **고** | 프로덕션에서 Phase 산출물 반복 누락 |
| 안 하면: 경쟁자 보안 강화 시 | **고** | 유일한 차별점(Capability Token) 소실 가능 |

**이전 분석 대비 변화**: "강점 강화 편중" 리스크가 **해소됨** — Progressive Disclosure를 #1.5로 승격하여 강점 강화와 약점 해소가 동시 진행.

### 6-7. 최종 포지셔닝

```
Superpowers: "가장 인기 있는" — 94k stars, 커뮤니티, 마켓플레이스
GSD:         "가장 체계적인" — 스펙 기반, Atomic Task, 컨텍스트 분할
OMC:         "가장 빠른"     — 5x 병렬, 멀티모델 오케스트레이션
TimSquad:    "가장 신뢰할 수 있는" — 시스템 강제 보안 + 프로세스 + 컨텍스트 연속성 + 실전 검증
```

**보완계획이 이 포지셔닝을 공고히 하는가?** 그렇다.

1. **"시스템 강제"**: 34개 소프트 규칙 → Hook/CLI/Script 전환으로 "프롬프트 신뢰"에서 "코드 신뢰"로
2. **"컨텍스트 연속성"**: phase-memory 점진적 갱신으로 GSD(매번 리셋)과 차별화
3. **"실전 검증"**: 기존 Lighthouse 95/96/100/100 + 보완으로 프레임워크 자체 완성도 향상
4. **약점 완화**: 토큰 효율 B+→A-, 학습 곡선 C+→B로 "비싸고 어렵다" 인식 해소

---

## 7. 업계 트렌드 & 시사점

### "하네스가 모델만큼 중요하다"

> "동일 모델이 하네스에 따라 78% vs 42%를 기록" — 2026년 분석

이는 TimSquad의 "Model is commodity, harness is moat" 원칙을 업계 데이터로 검증.

### "소프트 프롬프트는 무시당한다"

KaimingWan의 v2→v3 전환에서 확인: UserPromptSubmit으로 주입한 소프트 프롬프트를 에이전트가 반복적으로 무시. v3에서 Hard Gate(PreToolUse hook)로 전환 후 해결. TimSquad의 Fail-closed Hook Gate 접근이 정확한 방향임을 외부 데이터로 확인.

### Context rot은 실재하지만, 일시적 문제일 수 있다

GSD 스스로 인정: "현재 LLM 컨텍스트 한계에 대한 워크어라운드이지, 영구적 아키텍처 패턴이 아니다." 컨텍스트 윈도가 커지면 Atomic Task의 가치가 줄어들지만, TimSquad의 보안/프로세스 레이어는 컨텍스트 크기와 무관하게 가치를 유지.

### 보안은 아직 업계 공백

- GSD: skip-permissions 권장
- Superpowers: 네이티브 의존
- OMC: 21건 취약점 패치 이력 (사후 대응)
- 퍼블릭 스킬의 36.82%가 보안 이슈 (Snyk ToxicSkills 2026-02)
- CVE-2025-59536, CVE-2026-21852, CVE-2026-24887: Claude Code RCE 취약점 공개

TimSquad의 Capability Token + Fail-closed Hook Gate는 이 공백에서 **차별화된 가치 제안**.

---

## 7. 결론

### TimSquad의 차별적 우위
1. **유일한 Capability Token + Fail-closed Hook Gate** — 시스템 레벨 보안
2. **회고 학습 루프 (tsq-retro 3모드)** — 지속적 자기 개선
3. **자기감사 (tsq-audit + tsq-product-audit)** — 7영역 정량 점수
4. **7종 project-type 템플릿** — 도메인 특화
5. **SSOT 기반 에이전트 조율** — 모든 에이전트가 동일한 ground truth 참조
6. **change-scope-guard** — AI의 과도한 변경을 시스템으로 방지
7. **Lighthouse 95/96/100/100** — 프로덕션 레벨 품질 증명

### 개선 방향 요약
- **완료**: tsq-grill v2.0 (3모드) + tsq-start 개발환경/grill 강제 + CLAUDE.md Just-in-time 가이드
- **최우선**: 하이브리드 Controller (`tsq next`) + CRITICAL Hook 3건 + Progressive Disclosure 병렬
- **강제력 확대**: 34개 enforcement gap → Hook 20개 + CLI 11개 + Script 6개로 시스템 전환
- **비용**: 모델 라우팅으로 60-70% 절감
- **속도**: 병렬 서브에이전트 디스패치 + Wave 패턴
- **확장**: timsquad-mcp 생태계에서 스킬 보안 스캔 도입
- **포지셔닝**: "가장 신뢰할 수 있는" — 시스템 강제 보안 + 프로세스 + 실전 검증

---

## Sources

- [Superpowers GitHub](https://github.com/obra/superpowers) (~94k stars)
- [Superpowers 5 Blog Post](https://blog.fsck.com/2026/03/09/superpowers-5/)
- [Superpowers Complete Guide](https://www.pasqualepillitteri.it/en/news/215/superpowers-claude-code-complete-guide)
- [GSD v1 GitHub](https://github.com/gsd-build/get-shit-done) (~35k stars)
- [GSD v2 GitHub](https://github.com/gsd-build/gsd-2)
- [GSD Deep Dive (codecentric)](https://www.codecentric.de/en/knowledge-hub/blog/the-anatomy-of-claude-code-workflows-turning-slash-commands-into-an-ai-development-system)
- [GSD Beginner's Guide](https://earezki.com/ai-news/2026-03-17-the-complete-beginners-guide-to-gsd-get-shit-done-framework-for-claude-code/)
- [oh-my-claudecode GitHub](https://github.com/Yeachan-Heo/oh-my-claudecode) (~10.3k stars)
- [oh-my-claudecode Website](https://ohmyclaudecode.com/)
- [oh-my-claude-code (KaimingWan) GitHub](https://github.com/KaimingWan/oh-my-claude-code)
- [Everything Claude Code](https://github.com/affaan-m/everything-claude-code)
- [Harness Engineering 101](https://muraco.ai/en/articles/harness-engineering-claude-code-codex/)
- [Same Model, 78% vs 42%](https://natesnewsletter.substack.com/p/same-model-78-vs-42-the-harness-made)
- [Claude Code Security Hardening](https://medium.com/@emergentcap/hardening-claude-code-a-security-review-framework-and-the-prompt-that-does-it-for-you-c546831f2cec)
- [Top Claude Code Plugins 2026 (Composio)](https://composio.dev/content/top-claude-code-plugins)
- [Claude Code Must-Haves (DEV Community)](https://dev.to/valgard/claude-code-must-haves-january-2026-kem)
