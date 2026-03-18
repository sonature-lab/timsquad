---
title: Query Optimization Process
impact: MEDIUM
tags: database, query, optimization, explain
---

# Query Optimization Process

## 1. 분석

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT ...;
```

## 2. 체크리스트

| 항목 | 확인 내용 |
|-----|----------|
| Seq Scan | 대용량 테이블에 순차 스캔? |
| Index 사용 | 적절한 인덱스 사용 중? |
| Join 순서 | 작은 테이블 먼저 조인? |
| N+1 | 루프 내 쿼리 실행? |
| 불필요 컬럼 | SELECT * 사용? |

## 3. 최적화 기법

| 문제 | 해결책 |
|-----|-------|
| 느린 조인 | 인덱스 추가, 조인 순서 변경 |
| N+1 | Eager Loading, JOIN |
| 대용량 스캔 | 파티셔닝, 커버링 인덱스 |
| 동시성 | 적절한 격리 수준 |
