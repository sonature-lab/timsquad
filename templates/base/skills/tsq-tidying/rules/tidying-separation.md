---
title: Tidying Commit Separation
impact: CRITICAL
tags: tidying, git, commit-hygiene
---

# Tidying Commit Separation

Kent Beck의 "Tidy First?" 핵심 원칙: Tidying과 Behavior Change는 절대 같은 커밋에 섞지 않는다.

## Rule

| 커밋 타입 | 포함 가능 | 포함 불가 |
|----------|----------|----------|
| `tidy:` | 네이밍 변경, guard clause, dead code 제거, 포매팅, import 정리 | 새 기능, 버그 수정, API 변경 |
| `feat:` / `fix:` | 기능 로직 변경 | 순수 정리 작업 |

## Workflow

```
1. feat: 구현 완료 (동작하는 코드)
2. tidy: Guard Clauses 정리
3. tidy: Dead Code 제거
4. tidy: 네이밍 glossary 맞춤
   ↑ 각각 독립 커밋 (revert 가능)
```

## Detection (위반 감지)

변경된 파일에서 다음이 동시에 존재하면 FAIL:

| Tidying 신호 | Behavior Change 신호 |
|-------------|---------------------|
| 변수/함수 rename만 있는 라인 | 새로운 로직 추가 |
| 조건문 역전 (guard clause) | 새로운 분기 추가 |
| 미사용 import/변수 제거 | 새로운 import 추가 (기능용) |
| 빈 줄 추가/제거 (chunking) | 새로운 함수 정의 |

## Exception

다음 경우만 혼합 허용:
- rename이 새 기능의 일부인 경우 (예: 인터페이스 변경에 따른 구현체 rename)
- 파일 이동 + 해당 파일의 소규모 수정

## On Violation

```
FAIL: Tidying과 Behavior Change가 같은 변경에 섞여 있습니다.
→ 조치: 변경사항을 분리하여 별도 커밋으로 나누세요.
  1. 먼저 tidy: 커밋 (정리만)
  2. 그 다음 feat:/fix: 커밋 (기능 변경만)
```
