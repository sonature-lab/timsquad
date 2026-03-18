---
title: Verification Workflow
description: 안정성 검증 실행 워크플로우. 검증→발견→리서치→수정→재검증 사이클.
globs:
  - "**/*"
---

# Verification Workflow

## 전체 사이클

```
1. 리서치 → 2. 계획 → 3. 스킬 생성/갱신 → 4. 검증 실행 → 5. 이슈 수정 → 6. 재검증
     ↑                                                              |
     └──────────────────── 이슈 발견 시 수정 패턴 리서치 ──────────────┘
```

## Phase 1: 리서치

검증 시작 전 반드시 수행:

1. **스킬 검색**: `npx skills find "code quality verification"` 등으로 관련 스킬 탐색
2. **웹 참조**: OWASP, ShellCheck Wiki, npm security best practices 등 참조
3. **기존 스킬 확인**: `stability-verification` 스킬이 이미 있으면 갱신 여부 판단

## Phase 2: 계획

리서치 결과를 바탕으로 검증 계획 수립:

- 어떤 레이어를 실행할 것인가 (L0~L5 중 해당되는 것)
- 각 레이어의 fail policy (closed/open)
- 검증 대상 범위 (전체 프로젝트 vs 변경분)

## Phase 3: 검증 실행

`verify.sh` 또는 수동으로 각 레이어 순차 실행.

## Phase 4: 이슈 발견 시 수정 워크플로우

**중요**: 발견 즉시 수정하지 않는다. 리서치 먼저.

### 수정 프로세스

```
이슈 분류 (CRITICAL/HIGH/MEDIUM/LOW)
  → 수정 패턴 리서치
    - 스킬 검색: `npx skills find "{issue-type} prevention"`
    - 웹 검색: OWASP, ShellCheck wiki, 전문가 가이드
  → 수정 계획 수립 (리서치 기반)
  → 수정 적용
  → 해당 레이어 재검증
```

### 수정 패턴 참조

`references/security-fix-patterns.md` — 발견 빈도 높은 취약점별 수정 패턴 모음.

## Phase 5: 재검증

모든 수정 후 전체 레이어 재실행하여 regression 없음을 확인.

## 검증 시점

| 시점 | 레이어 | 범위 |
|------|--------|------|
| 커밋 전 | L0, L1 | 변경 파일 |
| 스프린트 완료 | L0~L5 | 전체 프로젝트 |
| 릴리스 전 | L0~L6 | 전체 프로젝트 |
| 보안 감사 요청 | L2 집중 | 전체 프로젝트 |
