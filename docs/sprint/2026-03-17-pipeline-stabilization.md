# Sprint: 스킬 주도 파이프라인 안정화 (#20)

> 2026-03-17 | 관련: #18(Closed), #19(Closed), #20(Open)

## 목표

프롬프트 의존(soft) → Hook+스킬(hard) 강제로 전환.
CLAUDE.md 최소화, 네이티브 기능 최대 활용, 움직이는 부품 절반으로 감소.

## 전후 비교

| | Before | After |
|---|---|---|
| CLAUDE.md | ~80줄 전용 템플릿 | ~10줄 주입 블록 (기존 파일 유지) |
| 프로세스 스킬 | 4개 + 7개 분산 파일 | 2개 (controller, tsq-protocol) |
| 스킬 주입 | 커스텀 skill-inject.sh | 네이티브 SKILL.md description 매칭 |
| Hook 스크립트 | 13개 | ~7개 |
| 강제 메커니즘 | soft (프롬프트) | hard (hook gate + capability token) |
| CLI tsq f/q | 텍스트 출력만 | 제거 (슬래시 커맨드 대체) |
| 진입점 | tsq f / tsq q | /start → 자동 프로토콜 활성화 |

---

## Phase 1: 단순화 (빼기)

### 1-1. CLAUDE.md → 주입 블록 방식 전환

**변경**: CLAUDE.md.template 전체 생성 → `<!-- tsq:start/end -->` 마커 주입

```markdown
<!-- tsq:start -->
## TimSquad

- TimSquad 파이프라인 사용 시 `/start`로 시작
- 요구사항에 여러 해석이 가능하면 선택지를 제시
- 구현 전에 검증 기준을 먼저 명시
<!-- tsq:end -->
```

**구현**:
- `src/lib/template.ts`: `injectTimsquadBlock()` 함수 추가
  - 기존 CLAUDE.md 있으면 → 마커 사이 교체 (없으면 상단 삽입)
  - CLAUDE.md 없으면 → 마커 블록만으로 새 파일 생성
- `tsq upgrade` → 마커 사이만 교체, 사용자 영역 보존
- CLAUDE.md.template → 삭제 (더 이상 전용 템플릿 불필요)

### 1-2. 불필요한 스킬/파일 제거

| 대상 | 조치 |
|------|------|
| `main-session-constraints/SKILL.md` | 삭제 (CLAUDE.md + tsq-protocol로 흡수) |
| 모든 스킬의 `depends_on` 필드 | 제거 (공식 미존재) |
| `controller/triggers/` 4개 파일 | controller SKILL.md Protocol에 통합 후 삭제 |
| `controller/delegation/` 3개 파일 | controller SKILL.md Protocol에 통합 후 삭제 |

### 1-3. CLI 명령어 정리

| CLI | 조치 |
|-----|------|
| `tsq f` / `tsq full` | 제거 |
| `tsq q` / `tsq quick` | 제거 |
| 관련 src/commands/ 코드 | 삭제 |
| tsq-cli 스킬 레퍼런스 | 해당 항목 제거 |

### 1-4. Hook 스크립트 정리

**제거**:
| 스크립트 | 이유 |
|---------|------|
| `skill-inject.sh` | Claude Code 네이티브 자동 제안으로 대체 |
| `skill-suggest.sh` | skill-inject.sh와 중복, 네이티브 대체 |
| `skill-rules.json` | skill-inject.sh 종속, 함께 제거 |
| `subagent-inject.sh` | skills: frontmatter 프리로드로 대체 |

**유지**:
| 스크립트 | 이유 |
|---------|------|
| `safe-guard.sh` | 파괴적 명령 차단 (토큰 0, 대체 불가) |
| `build-gate.sh` | tsc 에러 블로킹 (LLM 개입 없이 강제) |
| `completion-guard.sh` | 테스트 미실행 경고 |
| `pre-compact.sh` | 컨텍스트 요약 저장 |
| `context-restore.sh` | 컨텍스트 복원 |

**검증 필요** (Phase 1에서 판단):
| 스크립트 | 질문 |
|---------|------|
| `phase-guard.sh` | Phase 관리 단순화 후에도 필요한가? |
| `change-scope-guard.sh` | 유용하지만 과도한 차단 발생 여부 확인 |
| PostToolUse/Failure daemon notify | 데몬이 실제 활용하는지 검증 |

### Phase 1 완료 조건
- [x] CLAUDE.md 주입 방식 동작 확인 (tsq init + tsq update)
- [x] main-session-constraints 삭제, depends_on 전수 제거
- [x] triggers/delegation → controller 통합
- [x] tsq f/q CLI 제거 + 테스트 통과
- [x] 제거 대상 Hook 스크립트 삭제 + settings.json 정리
- [x] 기존 테스트 전부 통과 (`npm test`)

---

## Phase 2: 강화 (넣기)

### 2-1. /start 슬래시 커맨드 (진입점)

```yaml
# .claude/skills/start/SKILL.md
---
name: start
description: TimSquad 파이프라인 시작 — 프로토콜 활성화 및 데몬 기동
user-invocable: true
---
```

동작:
1. `tsq daemon start` 실행
2. tsq-protocol 활성화 선언
3. 현재 Phase 확인 + 상태 복원
4. "TimSquad 파이프라인 활성화됨. 작업을 지시해주세요." 출력

### 2-2. tsq-protocol 개편

```yaml
# .claude/skills/tsq-protocol/SKILL.md
---
name: tsq-protocol
description: TimSquad 에이전트 공통 프로토콜 — 메인/서브 공통 규약
user-invocable: false
---
```

내용 분기:
- **메인 세션**: 작업 분석 → 파이프라인 여부 확인 → Yes면 /controller 위임
- **서브에이전트**: 주입된 제약조건 확인 → allowed-tools 범위 작업 → structured report 출력

### 2-3. Controller 스킬 통합 개편

triggers/delegation 통합 + Capability Token:

```markdown
## Protocol
1. SSOT Map 참조
2. Capability Token 발급
   - .timsquad/.state/controller-active 생성
   - .timsquad/.state/allowed-paths.txt 작성
3. 서브에이전트 위임
   - skills: [tsq-protocol, {domain-skill}] 프리로드
   - allowed-tools 설정
4. 완료 시 trigger 실행 (통합)
   - task-complete: unit test 게이트
   - sequence-complete: 통합 테스트 + 문서 갱신 체크
   - phase-complete: e2e + Librarian + 회고
5. Capability Token 회수
```

### 2-4. Hook Gate 구현

controller SKILL.md에 hooks 내장:

```yaml
hooks:
  PreToolUse:
    - matcher: "Write|Edit"
      hooks:
        - type: command
          command: ".timsquad/hooks/check-capability.sh"
```

`check-capability.sh` 동작:
- `controller-active` 없으면 → deny + "controller를 거치세요"
- `allowed-paths.txt`에 없는 파일 → deny + "작업 범위 밖"
- `.timsquad/` 내부 → 항상 허용

### 2-5. Skills frontmatter 현대화

모든 스킬에 네이티브 frontmatter 적용:

```yaml
---
name: coding
description: 코드 작성 가이드 — 패턴, 스타일, 리팩토링
user-invocable: false
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---
```

### 2-6. Rules paths 조건부 로드

상시 로드 vs 조건부 분리:

**상시 로드** (paths 없음):
- quality-guards.md
- reporting-format.md

**조건부** (paths 추가):
```yaml
# test-conventions.md
---
paths:
  - "**/*.test.ts"
  - "**/*.spec.ts"
  - "tests/**/*"
---
```

```yaml
# api-conventions.md
---
paths:
  - "src/api/**/*"
  - "src/routes/**/*"
---
```

### 2-7. settings.json Hook 정리

제거된 스크립트 반영 + 신규 이벤트 활용:

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Bash", "hooks": [{ "type": "command", "command": "bash .claude/scripts/safe-guard.sh" }] }
    ],
    "Stop": [
      { "hooks": [{ "type": "command", "command": "bash .claude/scripts/completion-guard.sh" }] },
      { "hooks": [{ "type": "command", "command": "bash .claude/scripts/build-gate.sh" }] }
    ],
    "PreCompact": [
      { "hooks": [{ "type": "command", "command": "bash .claude/scripts/pre-compact.sh" }] }
    ],
    "SessionStart": [
      { "matcher": "compact", "hooks": [{ "type": "command", "command": "bash .claude/scripts/context-restore.sh" }] }
    ]
  }
}
```

### Phase 2 완료 조건
- [x] /tsq-start 슬래시 커맨드 동작 확인
- [x] tsq-protocol 메인/서브 분기 동작 (v2.1)
- [x] controller 통합 Protocol + capability token 발급/회수 (v2.1)
- [x] Hook Gate: check-capability.sh 배치 완료
- [x] 모든 스킬 tsq-* flat namespace로 현대화 (35개)
- [x] Rules paths 조건부 로드 확인
- [x] settings.json 정리 완료
- [x] CLI→스킬 전환: /tsq-status, /tsq-log, /tsq-update, /tsq-delete
- [x] 전체 CLI 정리: init + update + daemon만 유지
- [x] 662 테스트 전부 통과

---

## Phase 3: 로깅/문서 갱신 안정화 (#19 해소)

### 3-1. 동기/비동기 분리 확정

| | 동기 (스킬 + Hook) | 비동기 (데몬) |
|---|---|---|
| 역할 | 프로세스 강제 | 관찰/기록 |
| 실패 시 | 작업 중단 (deny) | 영향 없음 |
| 필수? | Yes | No |

### 3-2. sequence-complete 문서 갱신 체크

controller의 sequence-complete trigger에 추가:
- ROADMAP, STATUS, PROGRESS, CHANGELOG 상태 확인
- stale이면 PM에게 갱신 안내 (또는 Librarian 경량 호출)

### 3-3. 서브에이전트 completion report 표준화

tsq-protocol이 강제하는 출력 형식:
```
## Completion Report
- Task: {description}
- Status: {pass/fail}
- Files changed: {list}
- Tests: {passed/failed/skipped}
- Notes: {any blockers or decisions}
```

### Phase 3 완료 조건
- [x] sequence-complete 시 문서 갱신 체크 동작 — controller trigger + daemon checkDocumentStaleness
- [x] 서브에이전트 completion report 출력 확인 — tsq-protocol v2.1 필수 형식 + controller 검증 스텝
- [x] 데몬 비동기 로깅 정상 동작 (죽어도 메인 영향 없음) — 동기/비동기 역할 분리 명문화
- [ ] 전체 e2e: /start → 작업 → 완료 → 문서 갱신 → 로그 확인 (실제 프로젝트 적용 시 검증)

---

## 작업 순서

```
Phase 1 (빼기) ✅
  1-1. CLAUDE.md 주입 방식 전환 (<!-- tsq:start/end --> 마커)
  1-2. 스킬/파일 제거 (main-session-constraints, depends_on, triggers, delegation)
  1-3. 전체 CLI 제거 (tsq f/q + status/log/retro/feedback/watch 등 14개)
  1-4. Hook 스크립트 정리 (skill-inject, skill-suggest, subagent-inject 등)
  → 테스트 통과 확인

Phase 2 (넣기) ✅
  2-1. /tsq-start 슬래시 커맨드
  2-2. tsq-protocol v2.1 (메인/서브 분기 + Completion Report 필수화)
  2-3. controller v2.1 (통합 + capability token + Report 검증)
  2-4. Hook Gate (check-capability.sh)
  2-5. 스킬 tsq-* flat namespace (35개), CLI→스킬 전환
  2-6. Rules paths 조건부 로드
  2-7. settings.json 정리 + /tsq-update, /tsq-delete 추가
  2-8. lib 추출: log-utils.ts, feedback-utils.ts (daemon 의존성 해소)
  → 662 테스트 통과

Phase 3 (안정화) ✅
  3-1. 동기/비동기 분리 명문화 (controller = 동기 강제, daemon = 비동기 관찰)
  3-2. sequence-complete 문서 갱신 체크 (controller trigger + daemon staleness check)
  3-3. completion report 표준화 (tsq-protocol 필수 5필드 + controller 검증)
  → 662 테스트 통과, e2e 실전 검증은 프로젝트 적용 시
```
