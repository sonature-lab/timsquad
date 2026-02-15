---
name: prisma
description: Prisma ORM 개발 가이드라인
version: "1.0.0"
tags: [prisma, orm, database]
user-invocable: false
---

# Prisma ORM Guidelines

## 철학
- Schema as SSOT — 스키마가 진실의 원천
- Type Safety — 자동 생성 타입 활용
- Migration First — 스키마 변경은 마이그레이션으로

## 마이그레이션 워크플로우

| 명령어 | 용도 |
|--------|------|
| `npx prisma migrate dev --name {name}` | 개발 환경 마이그레이션 |
| `npx prisma migrate deploy` | 프로덕션 적용 |
| `npx prisma migrate reset` | DB 초기화 + 재적용 |
| `npx prisma db push` | 빠른 프로토타이핑 (마이그레이션 없이) |
| `npx prisma generate` | 클라이언트 재생성 |

**순서**: schema.prisma 수정 → migrate dev → SQL 검토 → 커밋

## Rules

### 스키마
- 모든 모델에 `id`, `createdAt`, `updatedAt`
- 명시적 인덱스 정의 (`@@index`)
- `@@map`으로 테이블명 명시
- 관계는 명확히 정의

### 쿼리
- `select`로 필요한 필드만 조회 (성능)
- 페이지네이션 적용 (`take`, `skip`)
- 복잡한 작업은 트랜잭션 사용
- **금지**: N+1 쿼리, 무한 결과 조회

### 마이그레이션
- `migrate dev`로 개발, `migrate deploy`로 배포
- 마이그레이션 파일 커밋 필수
- **금지**: 프로덕션에서 `db push`

## Checklist
- [ ] 싱글톤 인스턴스 사용
- [ ] 마이그레이션으로 스키마 관리
- [ ] 트랜잭션으로 데이터 정합성
- [ ] select로 필요한 필드만 조회
- [ ] 인덱스 적절히 설정
- [ ] Repository 패턴 적용

## 참조
- `rules/schema-design.md` — 모델 정의, 공통 필드, 소프트 삭제 패턴
- `rules/queries.md` — 싱글톤, CRUD, Relations, 트랜잭션, Repository 패턴
