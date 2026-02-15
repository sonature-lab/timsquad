---
description: workspace.xml 실시간 상태 관리 규칙.
globs:
  - ".timsquad/state/workspace.xml"
---

# Workspace 동기화

`.timsquad/state/workspace.xml`은 에이전트 간 실시간 상태 공유 파일입니다.

## 필수 업데이트 시점
- 작업 시작 시: `<current-task>` 업데이트
- 작업 완료 시: `<completed-tasks>`로 이동, `<pending-tasks>` 업데이트
- 에이전트 전환 시: `<handoff>` 작성
- 이슈 발생 시: `<blockers>` 추가
- 승인 필요 시: `<pending-approvals>` 추가

## 주요 노드
```
/workspace/current-task          - 현재 진행 중인 작업
/workspace/pending-tasks         - 대기 중인 작업 목록
/workspace/completed-tasks       - 완료된 작업 (최근 10개)
/workspace/handoff               - 에이전트 간 인수인계 정보
/workspace/blockers              - 블로킹 이슈
/workspace/pending-approvals     - 승인 대기 항목
```

## Handoff 프로토콜
에이전트 전환 시 `<handoff>` 섹션에 기록:
- from/to: 이전/다음 에이전트
- message: 전달 사항 (특이사항, 주의점)
- attachments: 참조할 SSOT 문서
- action-items: 해야 할 작업 목록
