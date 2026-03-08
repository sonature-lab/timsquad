---
paths:
  - "tests/**/*.test.ts"
  - "tests/**/*.spec.ts"
  - "**/*.test.ts"
  - "**/*.spec.ts"
---

- describe/it 중첩 3단계 이하 유지
- 테스트 데이터는 인라인 또는 fixtures/ 디렉토리 사용
- 각 테스트는 독립적 (공유 상태 금지, beforeEach에서 초기화)
- 테스트 이름은 "should + 기대 동작" 형식
- mock은 최소 범위로 사용 (외부 의존성만 mock)
