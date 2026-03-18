---
name: tsq-protocol
description: |
  TimSquad 에이전트 공통 프로토콜. 메인세션과 서브에이전트 모두 이 프로토콜을 준수.
  로그/피드백 규칙, 작업 원칙을 정의. 자동 활성 스킬 — 직접 호출하지 마세요.
version: "2.1.0"
tags: [tsq, protocol, agent]
user-invocable: false
---

# TSQ Agent Protocol

에이전트가 TimSquad 시스템 내에서 따라야 하는 공통 프로토콜.

## Contract

- **Trigger**: 모든 에이전트 세션 (자동 활성)
- **Input**: 태스크 지시 + task-context.json
- **Output**: TSQ 프로세스 준수 작업 결과
- **Error**: 프로토콜 위반 시 경고 + 수정 안내

## Protocol — 메인세션

1. **요구사항 분석**: 사용자 요구 파악 + 모호함 해소
2. **파이프라인 판단**: 작업 복잡도에 따라 분기
   - 파이프라인 적합 → tsq-controller 스킬 경유 위임
   - 단순 작업 → 직접 수행 + 최소 로그
   - 모호 → 사용자에게 선택지 제시
3. **검증 기준 선행**: 구현 전에 테스트 or 확인 방법을 먼저 명시
4. **선택지 제시**: 요구사항에 여러 해석이 가능하면 조용히 선택하지 않음

## Protocol — 서브에이전트

1. **task-context 확인**: `.timsquad/.daemon/task-context.json` 우선 읽기
2. **제약조건 확인**: 주입된 Phase 제약 + allowed-tools 범위 확인
3. **작업 수행**: 제약 범위 내에서 태스크 실행
4. **Completion Report 출력**: 아래 형식으로 결과 보고 (**필수, 생략 불가**)

### Completion Report (필수)

서브에이전트는 작업 완료 시 **반드시** 아래 형식의 보고서를 출력해야 합니다.
Controller가 이 보고서를 검증하며, 누락 시 태스크 완료로 인정되지 않습니다.

```
## Completion Report
- Task: {태스크 설명 — 무엇을 했는지}
- Status: {pass|fail}
- Files changed: {변경된 파일 목록, 없으면 "none"}
- Tests: {passed N|failed N|skipped — 테스트 실행 결과}
- Notes: {차단 요소, 결정 사항, 또는 "none"}
```

**필드 규칙**:
| 필드 | 필수 | 허용 값 |
|------|------|---------|
| Task | Yes | 1줄 설명 |
| Status | Yes | `pass` 또는 `fail` |
| Files changed | Yes | 파일 경로 목록 또는 `none` |
| Tests | Yes | `passed N`, `failed N`, `skipped`, `N/A` |
| Notes | Yes | 텍스트 또는 `none` |

**Status 판정 기준**:
- `pass`: 모든 테스트 통과 + `tsc --noEmit` 클린 + 요구사항 충족
- `fail`: 테스트 실패, 빌드 오류, 또는 요구사항 미충족 (Notes에 사유 기록)

## Quick Rules

### 로그 기록
로그는 `.timsquad/logs/{date}-{agent}.md`에 직접 append한다.

```markdown
## {time} [{type}]
{message}
```

| type | 용도 |
|------|------|
| work | 작업 시작/완료 기록 |
| decision | 결정 근거 기록 |
| issue | 이슈/피드백 발견 |

## Decision Log

중요한 판단이 있을 때 `.timsquad/state/decisions.jsonl`에 한 줄 append한다.
모든 판단을 기록할 필요 없음 — 아래 기준에 해당할 때만.

기록 기준:
- 기술 선택 (라이브러리, 패턴, 아키텍처)
- 대안을 검토하고 하나를 선택한 경우
- 의도적으로 보류하거나 스킵한 항목
- 예상과 다른 동작을 발견한 경우
- 리스크를 인지하고 수용한 경우

형식 (JSON, 한 줄):
```
{"agent":"developer","decision":"JWT 선택","reason":"stateless, MSA 확장","alternatives":["session"],"carry_over":false}
```

| 필드 | 필수 | 설명 |
|------|------|------|
| agent | Yes | 에이전트 이름 |
| decision | Yes | 무엇을 결정했는지 (1줄) |
| reason | Yes | 왜 그렇게 했는지 (1줄) |
| alternatives | No | 검토한 대안 목록 |
| carry_over | No | 다음 Phase에서 처리 필요 시 true |
| risk | No | 인지된 리스크 |

### Forbidden
- 스펙 없이 대규모 구현 시작
- 서브에이전트 결과를 검증 없이 수용
- Phase gate 조건 미충족 시 다음 Phase 진행
- Completion Report 없이 태스크 완료 선언

### Feedback Routing
| Level | 기준 | 라우팅 |
|-------|------|--------|
| L1 | 즉시 수정 가능 (린트, 타입) | 자체 수정 |
| L2 | 설계 변경 필요 | 메인세션(PM) 보고 |
| L3 | 요구사항 오류, 스코프 변경 | 메인세션 → 사용자 승인 |
