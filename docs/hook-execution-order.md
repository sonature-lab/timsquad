# Hook Execution Order

TimSquad가 사용하는 Claude Code Hook의 실행 순서, Fail 전략, 충돌 규칙.

> **기준**: `templates/platforms/claude-code/settings.json`
> **최종 갱신**: 2026-03-18 (v3.7-dev, Pipeline Hardening)

---

## Hook 목록

| # | Hook Event | Matcher | 스크립트 | 역할 | Fail 전략 | Timeout |
|---|-----------|---------|---------|------|----------|---------|
| 1 | PreToolUse | `Bash` | `safe-guard.sh` | 파괴적 명령 차단 (`rm -rf /`, `DROP TABLE` 등) | Fail-closed | 3s |
| 2 | PreToolUse | `Write\|Edit` | `phase-guard.sh` | Phase별 파일 접근 제한 (허용 경로 외 쓰기 거부) | Fail-closed | 3s |
| 3 | PreToolUse | `Write\|Edit` | `check-capability.sh` | Capability Token 검증 (유효 토큰 없으면 거부) | Fail-closed | 3s |
| 3.5 | PreToolUse | `Write\|Edit` | `change-scope-guard.sh` | 변경 범위 추적 (3파일 경고, 6파일 차단, 100줄 경고) | Fail-open | 3s |
| 4 | Stop | — | `completion-guard.sh` | 테스트 미실행 경고 + TDD Gate + SSOT 미충족 경고 | Fail-closed | 5s |
| 5 | Stop | — | `build-gate.sh` | tsc 에러 블로킹 (빌드 실패 시 완료 차단) | Fail-closed | 30s |
| 6 | PreCompact | — | `pre-compact.sh` | 컨텍스트 압축 전 상태 저장 (Phase, 진행률 등) | Fail-open | 5s |
| 7 | SessionStart | `compact` | `context-restore.sh` | 컨텍스트 복원 + Phase Memory 주입 + SSOT 미충족 안내 | Fail-open | 5s |

> SessionStart에는 `tsq daemon start` 도 등록되어 있으나 (matcher 없음, timeout 5s), 데몬 부트스트랩이므로 Hook 흐름에 영향 없음.

---

## 실행 순서

```
User Prompt
  |
  v
Agent가 도구 호출 결정
  |
  +-- [PreToolUse / Bash] safe-guard.sh
  |     -> 파괴적 명령이면 reject (도구 실행 차단)
  |
  +-- [PreToolUse / Write|Edit] phase-guard.sh -> check-capability.sh -> change-scope-guard.sh
  |     -> 순차 실행: phase-guard → check-capability → change-scope-guard
  |     -> phase-guard/check-capability reject 시 도구 실행 차단
  |     -> change-scope-guard: 6파일 초과 시 차단, 3파일/100줄 초과 시 경고
  |
  v
도구 실행 (Bash, Write, Edit 등)
  |
  v
Agent가 작업 완료를 선언 (Stop)
  |
  +-- [Stop] completion-guard.sh
  |     -> 1a. 테스트 미실행 시 deny (완료 차단, 재작업 유도)
  |     -> 1b. TDD Gate: 소스 변경 + 테스트 미변경 시 deny (refactor-only 우회 가능)
  |     -> 4. SSOT 미충족 시 systemMessage 경고 (/tsq-start 안내)
  |
  +-- [Stop] build-gate.sh
  |     -> tsc 빌드 에러 시 deny (완료 차단)
  |
  v
작업 완료
  :
  : (컨텍스트가 커지면 Compact 발생)
  :
  +-- [PreCompact] pre-compact.sh
  |     -> Phase, 진행률, 체크리스트 상태를 파일에 저장
  |
  v
Compact 실행 (컨텍스트 압축)
  |
  +-- [SessionStart / compact] context-restore.sh
        -> 저장된 Phase Memory 주입, 작업 연속성 확보
        -> SSOT 미충족 시 /tsq-start 안내 메시지 포함
```

---

## Fail 전략

| 전략 | 동작 | 적용 Hook |
|------|------|----------|
| **Fail-closed** | 스크립트 오류 또는 정책 위반 시 **deny/reject** (도구 실행 또는 완료 차단) | safe-guard, phase-guard, check-capability, completion-guard, build-gate |
| **Fail-open** | 스크립트 오류 시 **allow** (시스템 장애가 작업을 막지 않음) | pre-compact, context-restore |

**원칙**: 보안/품질 게이트는 Fail-closed, 부가 기능(상태 저장/복원)은 Fail-open.

---

## 삭제된 Hook

아래 Hook은 더 이상 사용하지 않는다.

| 스크립트 | 이전 역할 | 삭제 사유 |
|---------|----------|----------|
| `skill-inject.sh` | 프롬프트에 스킬 매칭 + SSOT 주입 | Claude Code 네이티브 스킬 자동 제안으로 대체 |
| `skill-suggest.sh` | 스킬 추천 | 동일 사유 |
| `subagent-inject.sh` | 서브에이전트 주입 | Controller 스킬로 통합 |

---

## 충돌 규칙

1. **동일 이벤트 + 동일 matcher 내 복수 Hook**: 배열 순서대로 순차 실행, 앞 Hook이 reject하면 뒤 Hook은 실행되지 않음
2. **PreToolUse matcher는 구체적 도구명 사용**: 와일드카드 지양 (`Bash`, `Write|Edit` 등 명시)
3. **reject vs systemMessage**: `reject` 반환은 블로킹(도구 차단), `systemMessage` 반환은 비블로킹(경고만)
4. **Stop Hook의 deny**: 에이전트 완료를 차단하고 재작업을 유도

---

## 신규 Hook 추가 시

1. 이 문서에 먼저 등록 (Hook 목록 테이블 갱신)
2. 기존 Hook과 이벤트/matcher 충돌 확인
3. Fail 전략 결정 (보안/품질 = closed, 부가 기능 = open)
4. Timeout 설정 (기본 3~5s, 빌드 등 무거운 작업은 30s 이내)
5. `settings.json`에 반영 후 `-y` / CI 환경에서의 동작 확인
