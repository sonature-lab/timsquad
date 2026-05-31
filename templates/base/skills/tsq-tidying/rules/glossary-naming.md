---
title: Glossary Naming Compliance
impact: HIGH
tags: naming, glossary, ubiquitous-language
---

# Glossary Naming Compliance

glossary.md에 정의된 Ubiquitous Language가 코드에 100% 반영되어야 한다.

## Rule

모든 export된 식별자(함수, 타입, 인터페이스, 상수)는 glossary.md의 용어를 사용해야 한다.

## Verification Process

1. glossary.md에서 정의된 용어 목록 추출
2. 변경된 파일의 exported 식별자 추출
3. 식별자가 glossary 용어를 기반으로 하는지 검증

## Examples

```markdown
# glossary.md
| 용어 | 영문 | 코드명 | 설명 |
|------|------|--------|------|
| 활성화코드 | Activation Code | activationCode | 데스크톱 앱 활성화에 사용 |
| 구독 | Subscription | subscription | 월/연 결제 구독 |
| 빌링키 | Billing Key | billingKey | 자동결제용 카드 토큰 |
```

```typescript
// FAIL: glossary 무시
export function getLicenseKey() {} // "license" 아닌 "activation"
export interface PaymentToken {} // "token" 아닌 "billingKey"

// PASS: glossary 준수
export function getActivationCode() {}
export interface BillingKey {}
```

## Scope

- 모듈 내부 private 함수: 검증 제외 (자유)
- export된 public API: 검증 필수
- 파일명: glossary 기반 권장 (강제는 아님)

## On Violation

```
WARN: Glossary 네이밍 불일치 발견
→ src/modules/auth/ports.ts:
  - getLicenseKey() → getActivationCode() (glossary: "activationCode")
→ 수정하거나 glossary.md에 새 용어 등록 필요
```
