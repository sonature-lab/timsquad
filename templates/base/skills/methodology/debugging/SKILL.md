---
name: debugging
description: |
  체계적 디버깅 방법론.
  근본 원인 추적, defense-in-depth, 가설-실험 루프, 로그 기반 진단.
  Use when: "버그 수정, 디버깅, 에러 추적, 원인 분석, 트러블슈팅"
version: "1.0.0"
tags: [debugging, troubleshooting, methodology]
user-invocable: false
---

# Systematic Debugging

체계적 디버깅을 통해 근본 원인(root cause)을 빠르게 찾고 재발을 방지하는 방법론.

## Philosophy

- 증상이 아닌 근본 원인을 찾는다
- 가설을 세우고 실험으로 검증한다 (추측으로 코드를 수정하지 않는다)
- Defense in depth — 같은 유형의 버그가 재발하지 않도록 방어 계층을 추가한다

## Resources

| Priority | Type | Resource | Description |
|----------|------|----------|-------------|
| HIGH | ref | [root-cause-tracing](references/root-cause-tracing.md) | 5 Whys + 가설-실험 루프 상세 가이드 |

## Quick Rules

### Debugging Loop
1. **Reproduce** — 버그를 100% 재현하는 최소 조건 확보
2. **Hypothesize** — 원인 가설을 1~3개 세우고 가능성 순으로 정렬
3. **Test** — 각 가설을 실험으로 검증 (로그 추가, breakpoint, 입력 변경)
4. **Fix** — 근본 원인 수정 (증상 대응 X)
5. **Verify** — 원래 재현 조건에서 버그 사라짐 확인
6. **Prevent** — 회귀 테스트 추가, 방어 로직 보강

### Root Cause Categories
| 카테고리 | 예시 |
|---------|------|
| State | 예기치 않은 상태 변이, race condition |
| Data | 잘못된 입력, null/undefined, 타입 불일치 |
| Logic | 잘못된 조건, off-by-one, 순서 오류 |
| Environment | 설정 차이, 의존성 버전, OS 차이 |
| Integration | API 응답 변경, 타이밍, 네트워크 |

### Anti-Patterns
- **Shotgun debugging**: 여러 곳을 동시에 수정 → 원인 특정 불가
- **Print-and-pray**: console.log만 추가하고 가설 없이 실행 반복
- **Blame game**: "내 코드 문제 아닌데" → 증거 없이 외부 원인 지목

## Checklist

| Priority | Item |
|----------|------|
| CRITICAL | 재현 조건이 명확한가 |
| CRITICAL | 가설을 세운 후 수정했는가 (추측 수정 X) |
| HIGH | 근본 원인을 찾았는가 (증상 대응만 하지 않았는가) |
| HIGH | 회귀 테스트를 추가했는가 |
| MEDIUM | 같은 유형의 버그를 방지하는 방어 로직이 있는가 |
