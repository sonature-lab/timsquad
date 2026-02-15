---
title: Root Cause Tracing Guide
category: guide
source: internal
---

# Root Cause Tracing

버그의 근본 원인을 체계적으로 추적하는 상세 가이드.

## 5 Whys Technique

증상에서 시작해 "왜?"를 반복하여 근본 원인에 도달:

```
증상: 사용자가 주문 시 500 에러 발생
Why 1: 주문 API에서 NullPointerException
Why 2: user.address가 null
Why 3: 소셜 로그인 사용자는 주소 미입력
Why 4: 주소 입력 폼이 소셜 로그인 플로우에 없음
Why 5: 소셜 로그인 기능 추가 시 주소 수집 요구사항 누락
→ 근본 원인: 요구사항 누락 (L2 피드백 대상)
```

## Hypothesis-Experiment Loop

### Step 1: Gather Evidence
```
- 에러 메시지 정확히 기록
- 스택 트레이스 분석
- 최근 변경사항 (git log, git diff) 확인
- 환경 차이 (dev vs prod) 확인
```

### Step 2: Form Hypotheses
```
가설 목록 (가능성 순):
1. [HIGH] user.address null check 누락 — 소셜 로그인 플로우 확인
2. [MEDIUM] DB migration 중 address 컬럼 누락 — 스키마 확인
3. [LOW] 캐시에 오래된 사용자 데이터 — 캐시 무효화 확인
```

### Step 3: Test Each Hypothesis
```
가설 1 테스트:
- 소셜 로그인으로 가입한 테스트 유저 생성
- 주소 없이 주문 API 호출
- 결과: NullPointerException 재현됨 → 가설 1 확인
```

### Step 4: Fix Root Cause
```
수정:
1. 주문 API에 address null 검증 추가 (즉시 방어)
2. 소셜 로그인 플로우에 주소 입력 단계 추가 (근본 원인)
3. 기존 소셜 로그인 사용자에게 주소 입력 유도 (데이터 보완)
```

### Step 5: Prevent Recurrence
```
방지:
1. 회귀 테스트: "주소 없는 사용자의 주문 시 적절한 에러 반환"
2. 필수 필드 검증 체크리스트에 "address" 추가
3. 새 로그인 방법 추가 시 "기존 필수 데이터 수집" 체크 항목 추가
```

## Common Pitfalls

- 첫 번째 "왜?"에서 멈춤 → 최소 3번은 반복
- 가설 없이 코드 수정 → 다른 곳이 깨질 위험
- 증상만 수정 (null check만 추가하고 근본 원인 방치)
- 재현 없이 수정 → 수정이 맞는지 검증 불가

## Defense in Depth

같은 유형의 버그가 다시 발생하지 않도록 여러 계층에서 방어:

| 계층 | 방어 | 예시 |
|------|------|------|
| 입력 | Zod 스키마 검증 | `z.object({ address: z.string().min(1) })` |
| 타입 | NonNullable, Required | `NonNullable<User['address']>` |
| 런타임 | 조기 에러 반환 | `if (!user.address) throw new BadRequestError(...)` |
| 테스트 | 회귀 테스트 | `it('should reject order without address')` |
| 모니터링 | 에러 알림 | Sentry, error rate alert |
