---
title: Architecture & DB Checklist
area: "06"
tags: architecture, database, api, iso-25010
standards: ISO/IEC 25010:2023, OWASP API Security, Data Architecture Best Practices
---

# 06. Architecture & DB Checklist

## A. 코드 아키텍처 (ISO 25010:2023 기반)

| # | 항목 | Severity | 근거 |
|---|------|:--------:|------|
| A-1 | 관심사 분리 — 프레젠테이션·비즈니스·데이터 계층 분리 | HIGH | Maintainability |
| A-2 | 의존성 방향 — 상위 계층이 하위 계층에만 의존 (역방향 금지) | HIGH | Maintainability |
| A-3 | 순환 의존성 없음 — 모듈 간 순환 참조 금지 | HIGH | Maintainability |
| A-4 | 단일 책임 원칙 — 모듈/클래스당 하나의 변경 사유 | MEDIUM | Maintainability |
| A-5 | 인터페이스 분리 — 불필요한 의존성 강제 금지 | MEDIUM | Flexibility (신규) |
| A-6 | 설정 외부화 — 하드코딩된 설정값, 시크릿 금지 | HIGH | Security + Flexibility |
| A-7 | 에러 경계 — 장애 전파 차단, graceful degradation | HIGH | Reliability |

## B. API 설계

| # | 항목 | Severity | 근거 |
|---|------|:--------:|------|
| B-1 | API 버전 관리 — 명시적 버전, 이전 버전 폐기 계획 | HIGH | API9:2023 |
| B-2 | Rate limiting — 모든 API 엔드포인트에 리소스 소비 제어 | HIGH | API4:2023 |
| B-3 | 입력 검증 — content-type, 크기, 스키마 검증 | HIGH | API8:2023 |
| B-4 | 응답 최소화 — 필요한 필드만 반환 (과도한 데이터 노출 방지) | MEDIUM | API3:2023 |
| B-5 | API 인벤토리 — 모든 API, 서비스, 버전 목록 유지 | MEDIUM | API9:2023 |
| B-6 | SSRF 방지 — 서버 측 아웃바운드 URL allowlist | HIGH | API7:2023, CWE-918 |

## C. 데이터베이스

| # | 항목 | Severity | 근거 |
|---|------|:--------:|------|
| C-1 | 정규화 기준 충족 (3NF 기본, 비정규화 시 ADR 문서) | HIGH | 데이터 무결성 |
| C-2 | 인덱스 전략 — 쿼리 패턴 기반, 불필요 인덱스 없음 | HIGH | Performance |
| C-3 | N+1 쿼리 방지 — Eager loading 또는 JOIN 사용 | HIGH | Performance |
| C-4 | 마이그레이션 롤백 스크립트 존재 | HIGH | Reliability |
| C-5 | 민감 데이터 암호화 — at rest (AES-256), in transit (TLS) | CRITICAL | Security |
| C-6 | Least-privilege 접근 — 역할 기반 DB 권한 | HIGH | Security |
| C-7 | 감사 로깅 — 변조 방지 저장소 | MEDIUM | Compliance |
| C-8 | 커넥션 풀 관리 — 누수 없음, 적절한 pool size | MEDIUM | Reliability |

## D. 인프라 & 확장성

| # | 항목 | Severity | 근거 |
|---|------|:--------:|------|
| D-1 | 환경 분리 — dev/staging/production 격리 | HIGH | Safety (ISO 25010 신규) |
| D-2 | 헬스체크 엔드포인트 존재 | MEDIUM | Reliability |
| D-3 | 수평 확장 가능 설계 — stateless 서비스, 세션 외부화 | MEDIUM | Scalability |
| D-4 | 장애 복구 계획 — 백업, 복구 절차 문서화 | MEDIUM | Reliability |
