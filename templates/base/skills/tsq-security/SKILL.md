---
name: tsq-security
description: |
  보안 검토 및 취약점 탐지 가이드라인.
  OWASP Top 10, 시크릿 관리, Rate Limiting, CSRF 방지를 다룸.
  Use when: "보안 검토, 취약점, OWASP, XSS, injection, 시크릿, 인증"
version: "1.0.0"
tags: [tsq, security, owasp, vulnerability]
user-invocable: false
---

# Security Guidelines (OWASP Top 10)

보안 취약점을 사전에 방지하고 체계적으로 검토한다.

## Philosophy

- 모든 외부 입력은 검증한다 (Trust Nothing)
- 시크릿은 코드에 절대 포함하지 않는다
- 보안은 사후 점검이 아닌 설계 단계부터 고려한다

## Contract

- **Trigger**: 보안 관련 코드 변경 (인증, 권한, 입력 처리, API)
- **Input**: 변경 코드 + 보안 컨텍스트
- **Output**: OWASP 준수 코드 + 시크릿 미노출
- **Error**: 취약점 발견 시 즉시 수정 + 보안 로그
- **Dependencies**: 없음

## Protocol

1. **위협 모델링**: 공격 표면 식별
2. **구현**: OWASP 가이드 준수 코딩
3. **OWASP 체크**: Top 10 항목별 검증
4. **시크릿 스캔**: 하드코딩 시크릿 탐색

## Verification

| Check | Command | Pass Criteria |
|-------|---------|---------------|
| 셸 스크립트 | `shellcheck *.sh` | exit code 0 |
| 의존성 취약점 | `npm audit` | critical 0건 |
| 시크릿 스캔 | `bash scripts/check-secrets.sh` | 0건 |
| 입력 검증 | 수동 검증 | 모든 외부 입력 Zod 검증 |

## Resources

| Priority | Type | Resource | Description |
|----------|------|----------|-------------|
| CRITICAL | rule | [owasp-examples](rules/owasp-examples.md) | 취약점별 Bad/Good 코드 예시 |
| HIGH | script | [check-secrets](scripts/check-secrets.sh) | 하드코딩 시크릿 자동 스캔 |

## Quick Rules

### OWASP Top 10 핵심
| # | 취약점 | 방어 |
|---|--------|------|
| 1 | Injection | Parameterized Query, ORM |
| 2 | Broken Auth | bcrypt(12+), 강력한 패스워드 |
| 3 | Data Exposure | DTO로 민감 정보 제외 |
| 5 | Access Control | authenticate + authorize |
| 7 | XSS | textContent, innerHTML 금지 |

### 시크릿 관리
- **금지**: 하드코딩 (`const apiKey = 'sk-...'`)
- **필수**: 환경변수 (`process.env.API_KEY`)
