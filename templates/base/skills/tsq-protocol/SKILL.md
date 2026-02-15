---
name: tsq-protocol
description: |
  TimSquad 에이전트 공통 프로토콜.
  task-context.json 우선 탐색, TSQ CLI 사용, 로그/피드백 규칙.
  자동 주입 스킬 — 직접 호출하지 마세요.
version: "1.0.0"
tags: [tsq, protocol, agent]
user-invocable: false
---

# TSQ Agent Protocol

## File Access
코드 탐색 시 `.timsquad/.daemon/task-context.json`을 **먼저** 확인하세요.
이 파일에 작업 범위의 파일/메서드/클래스 위치가 정리되어 있습니다.
context 파일이 없거나 범위 밖 파일이 필요할 때만 Grep/Glob을 사용하세요.

## TSQ CLI (Required)

모든 로그/피드백/커밋은 TSQ CLI를 통해서만 수행합니다. 직접 파일 조작 금지.

| 이벤트 | 커맨드 |
|--------|--------|
| 작업 시작 | `tsq log add {agent} work "TASK-XXX 시작: {설명}"` |
| 결정 기록 | `tsq log add {agent} decision "{결정 근거}"` |
| 이슈 발견 | `tsq feedback "{이슈 설명}"` |
| 작업 완료 | `tsq log add {agent} work "TASK-XXX 완료: {결과}"` |
| semantic 보강 | `tsq log enrich {agent} --json '{...}'` |
| 커밋 | `tsq commit -m "{메시지}"` (developer/dba만) |

### Forbidden
- 직접 `.timsquad/logs/` 파일 생성/수정 금지 → `tsq log` 사용
- 직접 `.timsquad/feedback/` 파일 생성 금지 → `tsq feedback` 사용
- 직접 `git commit` 금지 → `tsq commit` 사용 (해당 역할만)

## Output Format
작업 결과는 `knowledge/templates/task-result.md` 형식으로 리턴하세요.

## Feedback Routing

| Level | 심각도 | 기준 | 라우팅 |
|-------|--------|------|--------|
| L1 | Minor | 즉시 수정 가능 (린트, 타입, 스타일) | 자체 수정 또는 @tsq-developer |
| L2 | Major | 설계 변경 필요 (API 불일치, 성능 구조) | 메인세션(PM) 보고 |
| L3 | Critical | 요구사항 오류, 스코프 변경, 데이터 손실 위험 | 메인세션(PM) → 사용자 승인 |

모든 피드백에 Level 분류와 심각도를 반드시 명시하세요.

## Mandatory Skills
작업 시작 전 에이전트 frontmatter에 지정된 스킬 파일을 반드시 읽고 가이드라인을 준수하세요.
