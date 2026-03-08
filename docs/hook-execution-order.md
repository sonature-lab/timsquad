# Hook Execution Order

TimSquad가 사용하는 Claude Code Hook의 실행 순서 및 충돌 규칙.

## Hook 목록

| # | Hook Event | 스크립트 | 역할 |
|---|-----------|---------|------|
| 1 | UserPromptSubmit | `skill-inject.sh` | 프롬프트 → 스킬 매칭 → systemMessage 주입 + SSOT Tier 0 주입 |
| 2 | PreToolUse | `completion-guard.sh` | Stop 시 완료 조건 확인 (테스트 실행 여부) |
| 3 | PostToolUse | (daemon sensor) | Bash 실행 로깅, 파일 변경 감지 |

## 실행 순서

```
User Prompt
  ↓
[UserPromptSubmit] skill-inject.sh
  → SSOT Tier 0 문서 (항상)
  → 매칭 스킬 Contract/Protocol (조건부)
  ↓
Agent 작업 수행
  ↓
[PreToolUse] completion-guard.sh (Stop 시)
  → 단위 테스트 실행 여부 확인
  → 미실행 시 경고 systemMessage
  ↓
[PostToolUse] daemon sensor
  → L1 로그 데이터 수집
```

## 충돌 규칙

1. **동일 이벤트 내 복수 Hook**: 순차 실행, 모든 systemMessage가 합산됨
2. **skill-inject.sh는 항상 단독**: UserPromptSubmit에 다른 Hook 추가 금지
3. **PreToolUse matcher**: 구체적 도구명 사용 (와일드카드 지양)
4. **블로킹 vs 비블로킹**: systemMessage 반환은 비블로킹 (경고), `reject` 반환은 블로킹 (차단)

## 신규 Hook 추가 시

1. 이 문서에 먼저 등록
2. 기존 Hook과 이벤트/matcher 충돌 확인
3. 성능 영향 평가 (Hook은 모든 작업에 실행됨)
4. `-y` / CI 환경에서의 동작 확인
