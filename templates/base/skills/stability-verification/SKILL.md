---
name: stability-verification
description: |
  프로젝트 안정성 검증 스킬. 릴리스/스프린트 완료 전 6-Layer 자동+수동 검증 수행.
  L0(정적분석) → L1(유닛테스트) → L2(보안스캔) → L3(쉘스크립트) → L4(통합) → L5(패키지).
  각 레이어는 fail-closed(기본) 또는 fail-open 정책 적용.
  사용 시점: 릴리스 전, 스프린트 완료 시, 보안 감사 요청 시.
version: "1.0.0"
tags: [verification, security, quality, release]
user-invocable: false
---

# Stability Verification

프로젝트 안정성을 6-Layer 피라미드로 검증한다. 빠르고 저렴한 검사부터 실행하여 초기 실패를 빠르게 잡는다.

## Philosophy

- **빠른 것부터**: L0(5초) → L5(30초) 순서로 실행, 첫 실패 시 멈춤
- **Fail-closed 기본**: 모든 레이어는 기본 차단, 명시적 opt-out만 허용
- **자동 + 수동 병행**: L0~L5는 스크립트 자동화, L6는 사람이 확인

## Resources

| Priority | Type | Resource | Description |
|----------|------|----------|-------------|
| CRITICAL | script | [verify.sh](scripts/verify.sh) | 전체 레이어 오케스트레이터 |
| CRITICAL | rule | [verification-layers](rules/verification-layers.md) | 6-Layer 정의 + 실패 정책 |
| HIGH | rule | [verification-workflow](rules/verification-workflow.md) | 검증 실행 워크플로우 패턴 |
| HIGH | ref | [security-fix-patterns](references/security-fix-patterns.md) | 취약점별 수정 패턴 모음 |
| MEDIUM | ref | [release-checklist](references/release-checklist.md) | L6 수동 릴리스 체크리스트 |

## Quick Rules

### 검증 실행
- `bash .claude/skills/stability-verification/scripts/verify.sh` 로 전체 실행
- `--layer L0` 으로 특정 레이어만 실행
- `--skip L3` 으로 특정 레이어 건너뛰기

### Fail Policy
- L0(정적분석), L1(유닛테스트), L5(패키지): **항상 fail-closed**
- L2(보안): critical/high = fail-closed, moderate/low = fail-open
- L3(쉘테스트), L4(통합): fail-closed, `--skip` 가능

### 이슈 발견 시 수정 워크플로우
1. 이슈 분류 (CRITICAL > HIGH > MEDIUM > LOW)
2. 수정 패턴 리서치 (스킬 검색 + 웹 참조)
3. 수정 계획 수립 (패턴 기반)
4. 수정 적용 + 재검증

## Checklist

| Priority | Item |
|----------|------|
| CRITICAL | `tsc --noEmit` 에러 0개 |
| CRITICAL | `npm run test:unit` 전체 통과 |
| CRITICAL | `execSync` 대신 `execFileSync` (커맨드 인젝션 방지) |
| HIGH | `shellcheck --severity=warning` 모든 .sh 경고 0개 |
| HIGH | `npm audit --audit-level=high` 취약점 0개 |
| HIGH | JSON 출력은 `jq -n --arg` 사용 (문자열 보간 금지) |
| HIGH | jq 호출에 `|| echo ""` fail-open 폴백 |
| MEDIUM | `npm pack --dry-run` 의도한 파일만 포함 |
| MEDIUM | `.gitignore`에 .env, *.pem, *.key 포함 |
| MEDIUM | `grep -- "$var"` 분리자 사용 |
