---
name: tsq-cli
description: |
  TimSquad CLI(tsq) 사용 가이드. 모든 TSQ 커맨드의 인덱스와 사용법을 제공한다.
  에이전트가 TSQ CLI 커맨드를 사용해야 할 때 이 스킬을 참조한다.
  상세 커맨드 레퍼런스는 references/cli-reference.md 참조.
version: "1.0.0"
tags: [tsq, cli, commands, reference]
depends_on: [tsq-protocol]
conflicts_with: []
user-invocable: false
---

# TSQ CLI Reference

TimSquad CLI 커맨드 인덱스. 상세 옵션은 `references/cli-reference.md` 참조.

## Core Commands

| Command | Description |
|---------|-------------|
| `tsq init` | 프로젝트 초기화 |
| `tsq status` | 현재 상태 확인 |
| `tsq q "task"` | Quick 모드 (간단한 작업) |
| `tsq f "task"` | Full 모드 (SSOT 기반) |
| `tsq retro` | 회고 실행 |
| `tsq metrics` | 메트릭 확인 |

## Meta Index

| Command | Description |
|---------|-------------|
| `tsq mi rebuild` | 전체 코드+UI 인덱스 재구축 |
| `tsq mi update` | 변경분만 반영 |
| `tsq mi stats` | 통계 (Health Score) |
| `tsq mi stage <file>` | semantic 데이터 추가 |
| `tsq mi query` | 인덱스 조회 |
| `tsq mi validate` | semantic 완성도 검증 |

## Log System

| Command | Description |
|---------|-------------|
| `tsq log add <agent> <type> "msg"` | 로그 추가 |
| `tsq log enrich <agent> --json` | semantic 데이터 병합 |
| `tsq log task list` | L1 태스크 로그 목록 |
| `tsq log sequence create` | L2 시퀀스 로그 생성 |
| `tsq log phase create` | L3 페이즈 로그 생성 |
| `tsq log phase gate <id>` | L3 전환 게이트 |

## Workflow

| Command | Description |
|---------|-------------|
| `tsq wf set-phase <id>` | 현재 Phase 설정 |
| `tsq wf add-sequence <id>` | 시퀀스 등록 |
| `tsq wf status` | 워크플로우 상태 |
| `tsq wf config <key> <on\|off>` | 자동화 토글 |

## Knowledge & Audit

| Command | Description |
|---------|-------------|
| `tsq knowledge validate` | 지식 파일 검증 |
| `tsq knowledge list` | 지식 파일 목록 |
| `tsq audit validate` | 감사 리포트 검증 |
| `tsq audit diff` | 감사 전후 비교 |

## Resources

| Priority | Type | Resource | Description |
|----------|------|----------|-------------|
| HIGH | ref | [cli-reference](references/cli-reference.md) | 전체 커맨드 상세 옵션 |
