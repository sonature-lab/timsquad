# SSOT Validation Checklist

QA 에이전트가 SSOT 교차 검증 시 참조.

## 교차 검증 항목

- API 엔드포인트 일치 (service-spec.md <-> 구현 코드)
- Request/Response 형식 일치
- 에러 코드 일치 (error-codes.md <-> 구현 코드)
- 데이터 모델 일치 (data-design.md <-> 마이그레이션/스키마)
- FR-XXX ID 추적성 (requirements.md -> functional-spec.md -> test-spec.md)
- 용어 일관성 (glossary.md 기준)

## 성능 체크

- N+1 쿼리 없음
- 불필요한 데이터 로딩 없음
- 적절한 인덱스 사용
- 메모리 누수 가능성 없음
