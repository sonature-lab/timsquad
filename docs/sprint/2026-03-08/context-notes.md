# Sprint Context Notes (시방서) — 2026-03-08

**작성일**: 2026-03-08
**스프린트**: Skill Injection Pipeline
**문서 목적**: 결정의 이유와 관련 자료의 위치를 기록

---

## 1. 결정 기록 (Decision Log)

### D-001: 3-Phase 구조

- **결정**: Phase 0 (기반) → Phase 1 (표준화+주입) → Phase 2 (검증 완성)
- **이유**: Slash Commands와 CLAUDE.md 경량화는 의존성 없이 즉시 가능(Phase 0). 스킬 표준화(#20)가 주입(#21)과 검증(#22)의 전제 조건. 검증 파이프라인은 주입된 스킬의 Verification 섹션에 의존
- **대안 검토**: 2-Phase (기반+표준화 / 주입+검증) 가능했으나, 표준화와 주입은 상호 의존이므로 분리 불가
- **관련 자료**: `docs/sprint/sprint-2026-03-08.md` Dependency Map

### D-002: 스킬 표준화 섹션 구조

- **결정**: Contract / Protocol / Verification 3개 섹션 추가, Checklist는 Verification으로 통합
- **이유**: Checklist의 "확인 항목"과 Verification의 "검증 명령"이 겹침. 통합 시 ~15줄 절약 → 120줄 제한 준수 가능
- **대안 검토**: Quick Rules를 rules/로 분리하는 방안도 가능하나, Quick Rules는 항상 로드되어야 하므로 SKILL.md에 유지
- **참조**: Claude Code Best Practices — "Skills are context-efficient: descriptions auto-load, full content on-demand"

### D-003: 강제 주입 방식

- **결정**: `skill-inject.sh` (UserPromptSubmit) → systemMessage로 강제 주입
- **이유**: `additionalContext`는 제안 수준, `systemMessage`는 Claude가 반드시 참조. Hook 리서치 결과 systemMessage가 컨텍스트에 직접 주입됨
- **제약**: 토큰 예산 — 최대 3개 스킬, 스킬당 500자 (총 1500자 상한)
- **대안 검토**: PreToolUse에서 차단하는 방식은 과도한 블로킹으로 DX 저하 우려
- **참조**: Claude Code Hooks Reference — UserPromptSubmit output format

### D-004: compact 대응 전략

- **결정**: PreCompact 훅 (요약 저장) + SessionStart compact 훅 (재주입) 2단계
- **이유**: 단일 단계로는 컴팩션 전 맥락을 복원할 수 없음. PreCompact에서 요약을 파일로 저장하고, compact 후 SessionStart에서 해당 파일을 읽어 재주입
- **참조**: Claude Code Hooks Guide — SessionStart matcher "compact"

### D-005: Slash Command 구현 방식

- **결정**: `templates/base/skills/` 에 `user-invocable: true` 스킬로 생성 → `tsq init` 시 `.claude/skills/`로 배포
- **이유**: 기존 스킬 생태계와 완전히 일관. #20 표준화(Contract/Protocol/Verification)가 자연스럽게 적용됨. `$ARGUMENTS`, `depends_on`, `conflicts_with` 등 스킬 인프라 전체 활용 가능. `tsq knowledge validate` 검증 대상에 자동 포함
- **대안 검토**: `.claude/commands/` 디렉토리에 단순 markdown 파일로 생성하는 방안 — 더 간단하지만 스킬 생태계와 단절되고, 표준화 섹션 미적용, validate 대상 미포함
- **참조**: Claude Code Skills Documentation — skills with `user-invocable: true` create slash commands

### D-006: /spec 차단 수준

- **결정**: Advisory 기본 (경고만), Phase gate에서만 실제 차단
- **이유**: 모든 구현 시도를 차단하면 DX 크게 저하. 경고로 인지시키고, 실제 차단은 Phase gate 시점에서 수행
- **관련 자료**: `docs/sprint/sprint-2026-03-08.md` Risks

### D-007: 기존 settings.json 보존 원칙

- **결정**: 기존 Hook 순서/타이밍 절대 변경 불가. 신규 Hook은 append만
- **이유**: 이전 스프린트에서 8개 이벤트에 10개 Hook이 안정적 동작 확인됨. 순서 변경 시 completion-guard/build-gate 연쇄 동작 깨질 위험
- **관련 자료**: `docs/sprint/upgrade-gap-analysis.md` "건드리면 안 되는 것"

---

## 2. 관련 자료 위치 (Resource Map)

### 스프린트 문서
| 파일 | 설명 |
|------|------|
| `docs/sprint/sprint-2026-03-08.md` | 스프린트 총괄 |
| `docs/sprint/2026-03-08/phase-0-plan.md` | Phase 0 상세 |
| `docs/sprint/2026-03-08/phase-1-plan.md` | Phase 1 상세 |
| `docs/sprint/2026-03-08/phase-2-plan.md` | Phase 2 상세 |
| `docs/sprint/2026-03-08/context-notes.md` | 본 문서 (시방서) |
| `docs/sprint/upgrade-gap-analysis.md` | 갭 분석 (배경) |
| `docs/sprint/work-protocol.md` | 작업 프로세스 프로토콜 (이전 스프린트, 재사용) |

### 핵심 변경 대상 파일

#### Phase 0
| 파일 | 역할 | 관련 이슈 |
|------|------|-----------|
| `templates/base/skills/spec/SKILL.md` | /spec 스킬 (신규, user-invocable) | #18 |
| `templates/base/skills/audit/SKILL.md` | /audit 스킬 (신규, user-invocable) | #18 |
| `templates/base/skills/review/SKILL.md` | /review 스킬 (신규, user-invocable) | #18 |
| `src/commands/init.ts` | 스킬 배포 확인 | #18 |
| `CLAUDE.md` | 경량화 | #19 |
| `templates/base/skills/tsq-cli/SKILL.md` | CLI 스킬 (신규) | #19 |

#### Phase 1
| 파일 | 역할 | 관련 이슈 |
|------|------|-----------|
| `templates/base/skills/_template/SKILL.md` | 표준 템플릿 | #20 |
| `templates/base/skills/coding/SKILL.md` | 표준화 | #20 |
| `templates/base/skills/testing/SKILL.md` | 표준화 | #20 |
| `templates/base/skills/security/SKILL.md` | 표준화 | #20 |
| `templates/base/skills/controller/SKILL.md` | 표준화 | #20 |
| `templates/base/skills/tsq-protocol/SKILL.md` | 표준화 | #20 |
| `templates/base/skills/product-audit/SKILL.md` | 표준화 | #20 |
| `templates/platforms/claude-code/scripts/skill-inject.sh` | 강제 주입 (신규) | #21 |
| `templates/base/skills/main-session-constraints/SKILL.md` | 메인세션 제약 (신규) | #21 |
| `templates/platforms/claude-code/scripts/context-restore.sh` | compact 복원 (신규) | #21 |
| `templates/platforms/claude-code/scripts/skill-rules.json` | 임계값 조정 | #21 |
| `templates/platforms/claude-code/settings.json` | Hook 추가 | #21 |

#### Phase 2
| 파일 | 역할 | 관련 이슈 |
|------|------|-----------|
| `templates/platforms/claude-code/scripts/completion-guard.sh` | Verification 리마인더 | #22 |
| `templates/platforms/claude-code/scripts/pre-compact.sh` | 컴팩션 전 요약 (신규) | #22 |
| `templates/base/skills/audit/SKILL.md` | 통합 실행 강화 | #22 |
| `templates/base/skills/review/SKILL.md` | 교차 리뷰 강화 | #22 |
| `templates/base/skills/spec/SKILL.md` | 차단 강화 | #22 |

---

## 3. 이슈 간 교차 참조

```
#18 <-> #22: /audit, /review, /spec 프롬프트 → Phase 2에서 강화
#19 <-> #21: CLAUDE.md 분리 → main-session-constraints 스킬로 이관
#20 <-> #21: Contract/Verification 섹션 → skill-inject.sh가 주입
#20 <-> #22: Verification 섹션 → completion-guard 리마인더
#21 <-> #22: 주입된 스킬 → 검증 파이프라인으로 연결
```

---

## 4. 미결 사항 (Open Items)

| ID | 내용 | 결정 시점 | 담당 | 상태 |
|----|------|-----------|------|------|
| O-001 | #20 표준 섹션 구조: Option A vs B | Phase 1 Wave 1-A | Architect | 미결 |
| O-002 | #21 skill-inject.sh 강제 주입 범위 (all vs top-1) | Phase 1 Wave 1-B | Developer | 미결 |
| O-003 | #22 completion-guard 스킬 목록 캐시 전략 | Phase 2 Wave 2-A | Developer | 미결 |
| O-004 | /spec 차단 강도 (advisory vs blocking) | Phase 2 Wave 2-A | PM | 미결 |

---

## 5. 외부 참조 (Research Sources)

| 소스 | 내용 | 적용 |
|------|------|------|
| Claude Code Skills Docs | `user-invocable: true` 스킬 구조, `$ARGUMENTS`, `depends_on` | #18 스킬 설계 |
| Claude Code Hooks Guide | SessionStart compact matcher, PreCompact 훅 | #21-C, #22-E |
| Claude Code Hooks Reference | UserPromptSubmit output → systemMessage vs additionalContext | #21-A 주입 방식 |
| 이전 스프린트 work-protocol.md | 리마인더 4카테고리, 교차 검증 매트릭스 | #22-B, #22-C |
| 영상 4대 시스템 | 자동 매뉴얼, 작업 기억, 품질 검사, 전문 에이전트 | 전체 스프린트 방향 |
| OWASP Top 10 | 보안 리뷰 관점 | #22-C 리뷰 관점 |
