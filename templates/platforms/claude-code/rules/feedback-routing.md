---
description: 피드백 라우팅 규칙. Level 1/2/3 분류 기준과 라우팅.
globs:
  - ".timsquad/feedback/**"
---

# 피드백 라우팅

| Level | 심각도 | 트리거 | 라우팅 | 액션 |
|-------|--------|--------|--------|------|
| L1 | Minor/Major | 테스트 실패, 린트 오류, 코드 스타일 | @tsq-developer | 수정 요청 |
| L2 | Major | API 불일치, 설계 문제, 성능 구조 | PM 직접 처리 | SSOT 수정 |
| L3 | Critical | 요구사항 오류, 비즈니스 로직, 스코프 변경 | PM → 사용자 | 승인 요청 |

## 규칙
- User 승인 없이 Level 3 변경 금지
- 모든 피드백에 Level 분류 필수
- `tsq feedback "{설명}"` 으로 기록 (직접 파일 생성 금지)
