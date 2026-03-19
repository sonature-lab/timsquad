---
title: Model Routing
category: reference
---

# Model Routing Reference

`config.yaml`의 `model_routing.enabled`가 `true`이면 아래 테이블에 따라 모델을 동적 선택.
`false`이면 에이전트 파일의 `model` 필드(기본값)를 그대로 사용.

## Strategy별 라우팅 테이블

| 에이전트 | 태스크 유형 | aggressive | balanced | conservative |
|---------|-----------|-----------|----------|-------------|
| **Architect** | 설계/리뷰 | sonnet | opus | opus |
| **Developer** | 복잡한 구현 (아키텍처 변경, 복잡한 비즈니스 로직) | sonnet | sonnet | opus |
| **Developer** | 일반 구현 | haiku | sonnet | sonnet |
| **Developer** | 단순 구현 (CRUD, 스캐폴딩, 보일러플레이트) | haiku | haiku | sonnet |
| **QA** | 코드 리뷰 | haiku | sonnet | opus |
| **Security** | 보안 검토 | sonnet | sonnet | opus |
| **DBA** | DB 설계/마이그레이션 | sonnet | sonnet | opus |
| **Designer** | UI/UX 설계 | haiku | sonnet | sonnet |
| **Librarian** | 문서 기록 | haiku | haiku | sonnet |

## 복잡도 판정 기준

- **복잡**: 아키텍처 결정, 다중 모듈 연동, 상태 머신, 보안 로직, 트랜잭션
- **일반**: 단일 모듈 기능 구현, API 엔드포인트, 컴포넌트 개발
- **단순**: CRUD, 설정 파일 수정, 타입 정의, 보일러플레이트, 문서 갱신

## 적용 절차

1. `config.yaml` → `model_routing` 섹션 읽기
2. `enabled: false`이면 에이전트 기본 모델 사용 → 종료
3. 태스크 설명 + phase에서 복잡도 판정 (복잡/일반/단순)
4. 라우팅 테이블에서 `strategy` 열의 모델 선택
5. 선택된 모델을 Task()의 `model` 파라미터로 전달
6. Completion Report 첫 줄에 `[MODEL: {selected}]` 표기
