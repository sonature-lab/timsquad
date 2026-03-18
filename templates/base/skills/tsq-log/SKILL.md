---
name: tsq-log
description: |
  작업 로그 관리. 로그 추가, 조회, 시퀀스/Phase 로그 생성.
  Use when: /tsq-log, "로그 추가", "작업 기록", "로그 확인", "L1 로그", "L2 로그"
version: "1.0.0"
tags: [tsq, log, recording]
user-invocable: true
---

# /tsq-log — Work Log Management

## Protocol

### 로그 추가 (`/tsq-log add <message>`)
1. 현재 날짜/시간 + 에이전트명 + 메시지로 로그 엔트리 생성
2. `.timsquad/logs/{date}-{agent}.md`에 append
3. 타입 자동 분류: work, decision, issue

### 로그 조회 (`/tsq-log` or `/tsq-log list`)
1. `.timsquad/logs/` 최근 로그 파일 목록 출력
2. 오늘 날짜 로그가 있으면 내용 요약

### 시퀀스 로그 (`/tsq-log sequence <id>`)
1. 해당 시퀀스의 L1 로그를 수집
2. L2 시퀀스 로그 생성 (`.timsquad/logs/sequences/`)

### Phase 로그 (`/tsq-log phase <id>`)
1. 해당 Phase의 L2 로그를 수집
2. L3 Phase 로그 생성 (`.timsquad/logs/phases/`)
