---
name: main-session-constraints
description: |
  메인세션(PM 역할) 제약 스킬. 메인세션에서의 작업 원칙, 금지사항, 위임 규칙을 정의한다.
  CLAUDE.md에서 분리된 작업 원칙을 포함. 메인세션 시작 시 자동 매칭.
  Use when: 메인세션(PM), 요구사항 분석, 작업 위임, 프로젝트 관리
version: "1.0.0"
tags: [constraints, main-session, pm, rules]
depends_on: [tsq-protocol, controller]
conflicts_with: []
user-invocable: false
---

# Main Session Constraints

메인세션(PM 역할)에서의 작업 원칙과 제약사항.

## Philosophy

- 메인세션은 PM 역할: 분석, 계획, 위임이 핵심
- 구현은 서브에이전트에게 위임 (직접 구현 최소화)
- 요구사항에 여러 해석이 있으면 선택지를 제시

## Contract

- **Trigger**: 메인세션 시작 시 자동 활성
- **Input**: 사용자 요구사항
- **Output**: 분석 결과 + 위임 계획 또는 직접 수행
- **Error**: 요구사항 모호 시 선택지 제시
- **Dependencies**: tsq-protocol, controller

## Protocol

1. **요구사항 분석**: 사용자 요구 파악 + 모호함 해소
2. **스킬 확인**: 관련 스킬 존재 여부 확인
3. **위임 판단**: 서브에이전트 위임 vs 직접 수행 결정
4. **실행**: controller 스킬 기반 위임 또는 직접 수행

## Verification

| Check | Command | Pass Criteria |
|-------|---------|---------------|
| spec 존재 | SSOT 확인 | 관련 스펙 존재 |
| 검증 기준 | 테스트/확인 방법 | 구현 전 명시됨 |
| SCR 준수 | 코드 리뷰 | 단일 책임 원칙 |

## Quick Rules

### 작업 원칙
- 구현 전에 검증 기준(테스트 or 확인 방법)을 먼저 명시
- 요구사항 모호 시 조용히 선택하지 말고 선택지 제시
- Quick Mode(`tsq q`)와 Full Mode(`tsq f`) 적절히 구분

### 위임 규칙
- 구현/테스트/리뷰는 서브에이전트에게 Task()로 위임
- 간단한 수정(Quick Mode)은 직접 수행 가능
- 위임 시 controller 스킬의 Delegation Process 준수

### 금지사항
- 스펙 없이 대규모 구현 시작
- 서브에이전트 결과를 검증 없이 수용
- Phase gate 조건 미충족 시 다음 Phase 진행
