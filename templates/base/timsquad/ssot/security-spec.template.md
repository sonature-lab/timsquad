---
title: "보안 명세서 (Security Specification)"
version: 1.0.0
last_updated: {{DATE}}
author: tsq-security
status: draft
project: {{PROJECT_NAME}}
required_level: 3
---

# 보안 명세서 (Security Specification)

> 시스템의 보안 요구사항, 인증/인가, 데이터 보호 정책을 정의합니다.
> Level 3 (Enterprise) 및 fintech 타입 프로젝트 필수 문서입니다.

---

## 1. 보안 개요

### 1.1 보안 원칙

| 원칙 | 설명 | 적용 |
|-----|------|------|
| 최소 권한 | 필요한 최소한의 권한만 부여 | RBAC, API 권한 |
| 심층 방어 | 다계층 보안 적용 | 네트워크, 앱, DB |
| 안전한 기본값 | 기본 설정이 안전해야 함 | 비활성화된 기능 |
| 실패 안전 | 실패 시 안전한 상태로 | 에러 처리 |
| 개방형 설계 | 알고리즘은 공개, 키만 비밀 | 표준 암호화 |

### 1.2 위협 모델 (STRIDE)

| 위협 | 설명 | 대응 |
|-----|------|------|
| **S**poofing | 신원 위조 | 강력한 인증 |
| **T**ampering | 데이터 변조 | 무결성 검증 |
| **R**epudiation | 부인 | 감사 로그 |
| **I**nformation Disclosure | 정보 유출 | 암호화 |
| **D**enial of Service | 서비스 거부 | Rate Limiting |
| **E**levation of Privilege | 권한 상승 | 권한 검증 |

---

## 2. 인증 (Authentication)

### 2.1 인증 방식

| 방식 | 용도 | 구현 |
|-----|------|------|
| JWT | API 인증 | Access Token + Refresh Token |
| Session | 웹 세션 (선택) | Redis 기반 |
| API Key | 서버 간 통신 | 헤더 기반 |
| OAuth 2.0 | 소셜 로그인 | Google, Apple 등 |

### 2.2 JWT 설정

| 항목 | 값 | 비고 |
|-----|-----|------|
| Algorithm | RS256 | 비대칭 키 사용 |
| Access Token 만료 | 15분 | 짧게 유지 |
| Refresh Token 만료 | 7일 | Rotate on use |
| Issuer | `{{PROJECT_NAME}}` | 검증 필수 |
| Audience | `{{PROJECT_NAME}}-api` | 검증 필수 |

### 2.3 비밀번호 정책

| 정책 | 요구사항 |
|-----|---------|
| 최소 길이 | 8자 이상 |
| 복잡도 | 대문자 + 소문자 + 숫자 + 특수문자 |
| 해싱 | bcrypt (cost factor: 12) |
| 재사용 금지 | 최근 5개 비밀번호 |
| 만료 | 90일 (선택적) |

### 2.4 다중 인증 (MFA)

| 방식 | 지원 | 필수 조건 |
|-----|:----:|----------|
| TOTP | ✅ | 관리자 계정 |
| SMS | ⚠️ | 대체 수단으로만 |
| Email | ✅ | 계정 복구 |

### 2.5 계정 보호

| 정책 | 설정 |
|-----|------|
| 로그인 실패 잠금 | 5회 실패 시 30분 잠금 |
| 비정상 접근 감지 | 새 기기/위치 알림 |
| 세션 관리 | 동시 세션 제한 (5개) |

---

## 3. 인가 (Authorization)

### 3.1 RBAC (Role-Based Access Control)

| 역할 | 설명 | 권한 |
|-----|------|------|
| GUEST | 비인증 사용자 | 공개 리소스만 |
| USER | 일반 사용자 | 본인 리소스 CRUD |
| MANAGER | 관리자 | 팀 리소스 관리 |
| ADMIN | 시스템 관리자 | 전체 시스템 관리 |
| SUPER_ADMIN | 최고 관리자 | 모든 권한 |

### 3.2 권한 매트릭스

| 리소스 | GUEST | USER | MANAGER | ADMIN |
|-------|:-----:|:----:|:-------:|:-----:|
| 공개 데이터 | R | R | R | CRUD |
| 본인 프로필 | - | RU | RU | CRUD |
| 타인 프로필 | - | - | R | CRUD |
| 시스템 설정 | - | - | - | RU |
| 사용자 관리 | - | - | R | CRUD |

### 3.3 API 권한

| 엔드포인트 | 필요 권한 | 추가 조건 |
|-----------|----------|----------|
| `GET /api/public/*` | 없음 | - |
| `GET /api/users/me` | USER+ | - |
| `PUT /api/users/:id` | USER+ | 본인 또는 ADMIN |
| `DELETE /api/users/:id` | ADMIN | - |
| `GET /api/admin/*` | ADMIN | - |

---

## 4. 데이터 보호

### 4.1 데이터 분류

| 분류 | 예시 | 암호화 | 접근 제어 |
|-----|------|:------:|:--------:|
| 공개 | 제품 정보 | - | - |
| 내부 | 주문 내역 | 전송 시 | 인증 필요 |
| 기밀 | 개인정보 | 저장/전송 | 권한 필요 |
| 극비 | 비밀번호, 카드정보 | 저장/전송 | 특별 권한 |

### 4.2 암호화

| 구분 | 알고리즘 | 용도 |
|-----|---------|------|
| 전송 중 (TLS) | TLS 1.3 | 모든 통신 |
| 저장 시 (대칭) | AES-256-GCM | DB 민감 필드 |
| 저장 시 (비대칭) | RSA-2048 / Ed25519 | 키 교환 |
| 해싱 | bcrypt / Argon2 | 비밀번호 |
| 토큰 서명 | RS256 | JWT |

### 4.3 민감 데이터 처리

| 데이터 | 처리 방식 | 로깅 |
|-------|----------|:----:|
| 비밀번호 | 해싱 저장 | ❌ |
| 주민번호 | 암호화 + 마스킹 | 마스킹만 |
| 카드번호 | PCI DSS 준수 | ❌ |
| 이메일 | 평문 가능 | 마스킹 |
| IP 주소 | 평문 가능 | ⭕ |

### 4.4 개인정보 마스킹

| 데이터 | 원본 | 마스킹 |
|-------|------|--------|
| 이메일 | user@example.com | u***@example.com |
| 전화번호 | 010-1234-5678 | 010-****-5678 |
| 카드번호 | 1234-5678-9012-3456 | ****-****-****-3456 |

---

## 5. API 보안

### 5.1 보안 헤더

| 헤더 | 값 | 용도 |
|-----|-----|------|
| Content-Security-Policy | `default-src 'self'` | XSS 방지 |
| X-Content-Type-Options | `nosniff` | MIME 스니핑 방지 |
| X-Frame-Options | `DENY` | Clickjacking 방지 |
| Strict-Transport-Security | `max-age=31536000` | HTTPS 강제 |
| X-XSS-Protection | `1; mode=block` | XSS 필터 |

### 5.2 Rate Limiting

| 엔드포인트 | 제한 | 윈도우 |
|-----------|:----:|:------:|
| 로그인 | 5회 | 15분 |
| 회원가입 | 3회 | 1시간 |
| 비밀번호 찾기 | 3회 | 1시간 |
| API 일반 | 100회 | 1분 |
| API 검색 | 30회 | 1분 |

### 5.3 입력 검증

| 검증 | 적용 |
|-----|------|
| XSS | 모든 입력 이스케이프 |
| SQL Injection | Parameterized Query 사용 |
| Path Traversal | 경로 정규화 |
| Command Injection | 쉘 명령 회피 |

---

## 6. 감사 (Audit)

### 6.1 감사 로그 항목

| 이벤트 | 기록 항목 | 보존 기간 |
|-------|----------|----------|
| 로그인 성공/실패 | 시간, IP, User-Agent | 1년 |
| 권한 변경 | 변경자, 대상, 이전/이후 | 영구 |
| 데이터 접근 | 시간, 사용자, 리소스 | 90일 |
| 데이터 변경 | 변경자, 이전/이후 값 | 영구 |
| 관리자 작업 | 모든 상세 | 영구 |

### 6.2 로그 포맷

```json
{
  "timestamp": "2026-02-03T10:00:00Z",
  "event_type": "LOGIN_SUCCESS",
  "user_id": "user_123",
  "ip_address": "1.2.3.4",
  "user_agent": "Mozilla/5.0...",
  "resource": "/api/auth/login",
  "details": {}
}
```

---

## 7. 컴플라이언스

### 7.1 적용 규정

| 규정 | 적용 범위 | 상태 |
|-----|----------|:----:|
| 개인정보보호법 | 개인정보 처리 | ⏳ |
| 정보통신망법 | 웹 서비스 | ⏳ |
| GDPR | EU 사용자 (해당 시) | - |
| PCI DSS | 카드 결제 (해당 시) | - |

### 7.2 준수 체크리스트

- [ ] 개인정보 수집 동의
- [ ] 개인정보 처리방침 게시
- [ ] 데이터 암호화 적용
- [ ] 접근 로그 기록
- [ ] 정기 보안 점검

---

## 8. 보안 테스트

### 8.1 OWASP Top 10 체크

| 취약점 | 대응 | 테스트 |
|-------|------|:------:|
| A01 Broken Access Control | RBAC + 권한 검증 | ✅ |
| A02 Cryptographic Failures | TLS + AES | ✅ |
| A03 Injection | Parameterized Query | ✅ |
| A04 Insecure Design | 위협 모델링 | ✅ |
| A05 Security Misconfiguration | 보안 헤더 | ✅ |
| A06 Vulnerable Components | 의존성 스캔 | ✅ |
| A07 Auth Failures | JWT + MFA | ✅ |
| A08 Data Integrity Failures | 서명 검증 | ✅ |
| A09 Security Logging | 감사 로그 | ✅ |
| A10 SSRF | URL 검증 | ✅ |

### 8.2 정기 점검

| 점검 | 주기 | 담당 |
|-----|------|------|
| 의존성 취약점 스캔 | 매일 (CI) | 자동화 |
| 코드 보안 리뷰 | PR마다 | tsq-security |
| 침투 테스트 | 분기별 | 외부 업체 |
| 보안 감사 | 연간 | 외부 업체 |

---

## 9. 인시던트 대응

### 9.1 대응 프로세스

```
발견 → 분류 → 격리 → 분석 → 복구 → 사후분석
```

### 9.2 심각도 분류

| 레벨 | 설명 | 대응 시간 |
|:----:|------|:--------:|
| P1 | 데이터 유출, 서비스 중단 | 1시간 |
| P2 | 보안 취약점 발견 | 4시간 |
| P3 | 잠재적 위험 | 24시간 |
| P4 | 개선 권고 | 1주 |

---

## 10. 관련 문서

- [서비스 명세](./service-spec.md) - API 보안 적용 대상
- [데이터 설계](./data-design.md) - 암호화 필드
- [배포 명세](./deployment-spec.md) - 인프라 보안
- [테스트 명세](./test-spec.md) - 보안 테스트

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0.0 | {{DATE}} | tsq-security | 초기 작성 |
