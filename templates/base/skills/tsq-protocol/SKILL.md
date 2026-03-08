---
name: tsq-protocol
description: |
  TimSquad 에이전트 공통 프로토콜.
  task-context.json 우선 탐색, TSQ CLI 사용, 로그/피드백 규칙.
  자동 주입 스킬 — 직접 호출하지 마세요.
version: "1.0.0"
tags: [tsq, protocol, agent]
depends_on: []
conflicts_with: []
user-invocable: false
---

# TSQ Agent Protocol

에이전트가 TimSquad 시스템 내에서 따라야 하는 공통 프로토콜.

## Philosophy

- TSQ CLI를 통해서만 로그/피드백/커밋 수행
- task-context.json을 우선 탐색하여 불필요한 탐색 최소화
- 피드백은 반드시 Level 분류를 명시

## Contract

- **Trigger**: 모든 에이전트 세션 (자동 활성)
- **Input**: 태스크 지시 + task-context.json
- **Output**: TSQ 프로세스 준수 작업 결과
- **Error**: 프로토콜 위반 시 경고 + 수정 안내
- **Dependencies**: 없음

## Protocol

1. **task-context 확인**: `.timsquad/.daemon/task-context.json` 우선 읽기
2. **TSQ CLI 사용**: 로그/피드백/커밋 모두 CLI 경유
3. **피드백 라우팅**: Level 분류 후 적절한 대상에 전달

## Verification

| Check | Command | Pass Criteria |
|-------|---------|---------------|
| TSQ CLI 사용 | `tsq log` 사용 여부 | 직접 파일 조작 0건 |
| 피드백 Level | 피드백 내용 확인 | L1/L2/L3 분류 존재 |
| task-context | 탐색 순서 확인 | context 우선 사용 |

## Quick Rules

### CLI Commands
| 이벤트 | 커맨드 |
|--------|--------|
| 작업 시작 | `tsq log add {agent} work "TASK-XXX 시작: {설명}"` |
| 결정 기록 | `tsq log add {agent} decision "{결정 근거}"` |
| 이슈 발견 | `tsq feedback "{이슈 설명}"` |
| 작업 완료 | `tsq log add {agent} work "TASK-XXX 완료: {결과}"` |
| 커밋 | `tsq commit -m "{메시지}"` (developer/dba만) |

### Forbidden
- 직접 `.timsquad/logs/` 파일 조작 → `tsq log` 사용
- 직접 `.timsquad/feedback/` 파일 조작 → `tsq feedback` 사용
- 직접 `git commit` → `tsq commit` 사용

### Feedback Routing
| Level | 기준 | 라우팅 |
|-------|------|--------|
| L1 | 즉시 수정 가능 (린트, 타입) | 자체 수정 |
| L2 | 설계 변경 필요 | 메인세션(PM) 보고 |
| L3 | 요구사항 오류, 스코프 변경 | 메인세션 → 사용자 승인 |
