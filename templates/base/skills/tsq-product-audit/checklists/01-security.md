---
title: Security Checklist
area: "01"
tags: security, owasp, asvs, cwe
standards: OWASP Top 10:2025, ASVS v5.0, CWE Top 25 2025, CVSS 4.0
---

# 01. Security Checklist

## A. Access Control & Authorization

| # | 항목 | Severity | 근거 |
|---|------|:--------:|------|
| A-1 | 서버 측 접근 제어 — 모든 요청에 적용, 클라이언트 측 검증에 의존하지 않음 | CRITICAL | OWASP A01, CWE-862 |
| A-2 | Deny-by-default — 명시적 허용만 접근 가능 | CRITICAL | OWASP A01, ASVS v5 V4 |
| A-3 | 객체 수준 권한 검증 (BOLA/IDOR 방지) — 모든 API 엔드포인트 | CRITICAL | API1:2023, CWE-639 |
| A-4 | 함수 수준 권한 검증 (BFLA 방지) — admin vs user 분리 | CRITICAL | API5:2023, CWE-284 |
| A-5 | 속성 수준 권한 검증 — mass assignment / 과도한 데이터 노출 방지 | HIGH | API3:2023 |
| A-6 | CORS 명시적 allowlist — 인증 엔드포인트에 wildcard origin 금지 | HIGH | OWASP A01, CWE-352 |
| A-7 | CSRF 방어 — 상태 변경 요청에 토큰 또는 SameSite 쿠키 | HIGH | CWE-352 |
| A-8 | 경로 탐색 방지 — 파일 경로 검증 및 정규화 | HIGH | CWE-22 |

## B. Authentication & Session

| # | 항목 | Severity | 근거 |
|---|------|:--------:|------|
| B-1 | 비밀번호 정책: 최소 8자, 유출 DB 대조, 구성 규칙 강제 금지 | CRITICAL | NIST SP 800-63B, ASVS v5 V2 |
| B-2 | MFA 구현 — 피싱 저항 방식 우선 (passkeys, 하드웨어 키) | CRITICAL | NIST SP 800-63-4 |
| B-3 | JWT 검증: 만료, 발급자, 대상 확인, algorithm "none" 거부 | CRITICAL | API2:2023 |
| B-4 | 민감 작업 시 재인증 (비밀번호 변경, 결제 등) | HIGH | ASVS v5 V2 |
| B-5 | 인증 실패 시 계정 잠금 / 속도 제한 | HIGH | CWE-306 |
| B-6 | 세션 토큰: 암호학적 무작위 생성, Secure·HttpOnly·SameSite 플래그 | HIGH | ASVS v5 V3 |
| B-7 | OAuth 2.1 + PKCE 필수, implicit/hybrid flow 제거 | HIGH | OAuth 2.1 |
| B-8 | 짧은 수명 access token (5-15분) + refresh token rotation | HIGH | OAuth 2.1, ASVS v5 |

## C. Injection Prevention

| # | 항목 | Severity | 근거 |
|---|------|:--------:|------|
| C-1 | Parameterized query / prepared statement — 모든 DB 접근 | CRITICAL | CWE-89 |
| C-2 | 컨텍스트 인식 출력 인코딩 — HTML/JS/CSS 내 사용자 데이터 | CRITICAL | CWE-79 |
| C-3 | 서버 측 입력 검증 — allowlist 기반 | CRITICAL | OWASP A05, ASVS v5 V5 |
| C-4 | OS 명령 삽입 방지 — 사용자 입력 포함 쉘 명령 금지, 안전한 API 사용 | CRITICAL | CWE-78 |
| C-5 | 코드 삽입 방지 — eval() 등에 사용자 데이터 금지 | CRITICAL | CWE-94 |
| C-6 | 역직렬화 공격 방지 — 신뢰하지 않는 직렬화 데이터 거부, JSON 사용 | HIGH | CWE-502 |
| C-7 | Content Security Policy (CSP) 헤더 설정 | HIGH | OWASP A05 |
| C-8 | 파일 업로드 제한 — 타입·크기·내용 검증, 웹루트 외부 저장, 파일명 변경 | HIGH | CWE-434 |

## D. Security Misconfiguration

| # | 항목 | Severity | 근거 |
|---|------|:--------:|------|
| D-1 | 기본 자격증명, 샘플 앱, 불필요 기능 프로덕션에서 제거 | CRITICAL | OWASP A02, API8:2023 |
| D-2 | 디렉토리 목록, 스택 트레이스, 상세 오류 메시지 비활성화 | HIGH | OWASP A02 |
| D-3 | HTTPS 전면 적용 + HSTS (includeSubDomains, preload) | HIGH | OWASP A02 |
| D-4 | 보안 헤더: X-Content-Type-Options, X-Frame-Options, Referrer-Policy | MEDIUM | OWASP A02 |
| D-5 | 클라우드 스토리지/버킷 권한 최소화, IAM least-privilege | CRITICAL | OWASP A02 |

## E. Cryptography

| # | 항목 | Severity | 근거 |
|---|------|:--------:|------|
| E-1 | 민감 데이터 암호화 — 저장: AES-256, 전송: TLS 1.2+ (1.3 권장) | CRITICAL | OWASP A04 |
| E-2 | 비밀번호 해싱: Argon2id, bcrypt, scrypt (적절한 work factor) | CRITICAL | ASVS v5 V2 |
| E-3 | 민감 데이터를 로그·URL·클라이언트 저장소에 저장 금지 | HIGH | CWE-200 |
| E-4 | 보안 관련 값은 암호학적 난수 생성기 사용 | HIGH | OWASP A04 |
| E-5 | 폐기된 프로토콜 비활성화 (SSLv3, TLS 1.0/1.1, 약한 암호 스위트) | HIGH | OWASP A04 |

## F. Supply Chain

| # | 항목 | Severity | 근거 |
|---|------|:--------:|------|
| F-1 | 의존성 버전 고정 + lock 파일 + 체크섬/서명 검증 | HIGH | OWASP A03 |
| F-2 | 의존성 취약점 지속 스캔 (Dependabot, Snyk 등) | HIGH | OWASP A03 |
| F-3 | Typosquatting 및 dependency confusion 공격 모니터링 | HIGH | OWASP A03 |
| F-4 | SBOM 생성 (SPDX 또는 CycloneDX) — 빌드마다 | HIGH | CISA 2025, EU CRA |
| F-5 | 서드파티 API 무결성 검증 — upstream 무조건 신뢰 금지 | HIGH | API10:2023 |

## G. Error Handling & Logging

| # | 항목 | Severity | 근거 |
|---|------|:--------:|------|
| G-1 | 안전한 실패 — 오류 시 접근 거부, "fail open" 금지 | CRITICAL | OWASP A10 |
| G-2 | 예외 시 민감 정보 노출 방지 (스택 트레이스, 내부 경로, SQL) | HIGH | OWASP A10, CWE-200 |
| G-3 | 인증 이벤트, 접근 제어 실패, 입력 검증 실패 로깅 | HIGH | OWASP A09 |
| G-4 | 로그 무결성 보호 — 로그 삽입 방지 | MEDIUM | OWASP A09 |
