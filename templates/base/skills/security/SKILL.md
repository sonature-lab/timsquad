---
name: security
description: 보안 검토 및 취약점 탐지 가이드라인
version: "1.0.0"
tags: [security, owasp, vulnerability]
user-invocable: false
---

# Security Guidelines (OWASP Top 10)

## OWASP Top 10 요약

| # | 취약점 | 핵심 방어 |
|---|--------|----------|
| 1 | Injection | Parameterized Query, ORM 사용 |
| 2 | Broken Authentication | 강력한 패스워드 정책, bcrypt(12+) |
| 3 | Sensitive Data Exposure | DTO로 민감 정보 제외, 로그 마스킹 |
| 5 | Broken Access Control | authenticate + authorize 미들웨어 |
| 6 | Security Misconfiguration | helmet(), CORS 제한 |
| 7 | XSS | textContent 사용, innerHTML 금지 |
| 8 | Insecure Deserialization | Zod 스키마 검증 |
| 9 | Known Vulnerabilities | npm audit, 정기 업데이트 |
| 10 | Insufficient Logging | 로그인 실패, 브루트포스 로깅 |

## 추가 보안 체크

### 시크릿 관리
- **금지**: 하드코딩 (`const apiKey = 'sk-...'`)
- **필수**: 환경변수 (`process.env.API_KEY`)
- **권장**: 시크릿 매니저

### Rate Limiting
- API 엔드포인트에 rate limiter 적용

### CSRF 방지
- csrf 토큰 사용

## Checklist
- [ ] SQL/NoSQL Injection 방지
- [ ] 강력한 인증 구현
- [ ] 민감 정보 보호
- [ ] 접근 제어 구현
- [ ] XSS 방지
- [ ] 입력 검증 (Zod)
- [ ] 의존성 취약점 확인
- [ ] 보안 로깅 구현
- [ ] 시크릿 안전하게 관리
- [ ] Rate Limiting 적용

## Resources

| Priority | Type | Resource | Description |
|----------|------|----------|-------------|
| CRITICAL | rule | [owasp-examples](rules/owasp-examples.md) | 취약점별 Bad/Good 코드 예시 |
| HIGH | script | [check-secrets](scripts/check-secrets.sh) | 하드코딩된 시크릿 자동 스캔 |
