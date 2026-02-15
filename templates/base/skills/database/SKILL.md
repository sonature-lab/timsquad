---
name: database
description: |
  데이터베이스 설계 및 운영 방법론.
  정규화/비정규화 결정, 쿼리 최적화 프로세스, 마이그레이션 안전 규칙.
  Use when: DB 설계, 스키마 변경, 쿼리 최적화, 마이그레이션
version: "1.0.0"
tags: [database, sql, migration]
user-invocable: false
---

# Database Methodology

## 정규화 기준

| 정규형 | 적용 기준 | 예외 허용 조건 |
|:-----:|---------|--------------|
| 1NF | 필수 | 없음 |
| 2NF | 필수 | 없음 |
| 3NF | 기본 적용 | 읽기 성능 요구 시 |
| BCNF | 권장 | 복잡도 증가 시 |

## 비정규화 조건

비정규화 결정 시 반드시 ADR 작성:

```markdown
## ADR-XXX: [테이블명] 비정규화 결정

### Context
- 읽기 빈도: X회/초, 쓰기 빈도: Y회/초, 조인 비용: Z ms

### Decision
[비정규화 결정 내용]

### Consequences
- 장점: 읽기 성능 N% 향상
- 단점: 데이터 중복, 갱신 이상 위험
- 대응: [트리거/애플리케이션 로직]
```

## 쿼리 최적화 프로세스

### 1. 분석

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT ...;
```

### 2. 체크리스트

| 항목 | 확인 내용 |
|-----|----------|
| Seq Scan | 대용량 테이블에 순차 스캔? |
| Index 사용 | 적절한 인덱스 사용 중? |
| Join 순서 | 작은 테이블 먼저 조인? |
| N+1 | 루프 내 쿼리 실행? |
| 불필요 컬럼 | SELECT * 사용? |

### 3. 최적화 기법

| 문제 | 해결책 |
|-----|-------|
| 느린 조인 | 인덱스 추가, 조인 순서 변경 |
| N+1 | Eager Loading, JOIN |
| 대용량 스캔 | 파티셔닝, 커버링 인덱스 |
| 동시성 | 적절한 격리 수준 |

## 마이그레이션 규칙

### 파일 명명

```
{timestamp}_{description}.sql
예: 20260203100000_create_users_table.sql
```

### 안전한 마이그레이션

| 작업 | 안전 | 위험 | 대안 |
|-----|:----:|:----:|------|
| 컬럼 추가 (NULL) | O | | |
| 컬럼 추가 (NOT NULL) | | ! | DEFAULT 값 + NULL 허용 후 변경 |
| 컬럼 삭제 | | ! | 코드 먼저 수정 -> 삭제 |
| 컬럼명 변경 | | X | 새 컬럼 추가 -> 데이터 이동 -> 삭제 |
| 인덱스 추가 | O | | CONCURRENTLY 사용 |
| 테이블 삭제 | | X | 백업 확인 필수 |

### 롤백 전략

모든 마이그레이션에 롤백 스크립트 필수:

```sql
-- Up
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
-- Down
ALTER TABLE users DROP COLUMN phone;
```
