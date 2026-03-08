---
paths:
  - "src/api/**/*.ts"
  - "src/routes/**/*.ts"
  - "src/controllers/**/*.ts"
---

- RESTful 네이밍 사용 (복수형 리소스, kebab-case)
- 에러 응답 표준 형식: `{ code: string, message: string, details?: unknown }`
- HTTP 상태 코드 정확히 매핑 (200/201/400/401/403/404/500)
- 요청 validation은 엔드포인트 진입 시점에서 수행
- 비즈니스 로직은 서비스 레이어에 위치 (컨트롤러에 직접 작성 금지)
