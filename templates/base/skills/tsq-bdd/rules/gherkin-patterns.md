---
title: BDD Gherkin & Implementation Patterns
impact: HIGH
tags: bdd, gherkin, testing
---

# BDD Gherkin & Implementation Patterns

## Feature File 예시

```gherkin
Feature: 사용자 로그인
  사용자가 이메일과 비밀번호로 로그인할 수 있다

  Background:
    Given 회원가입된 사용자가 존재한다
      | email           | password  |
      | user@test.com   | password1 |

  Scenario: 올바른 자격 증명으로 로그인 성공
    Given 로그인 페이지에 접속한다
    When 이메일 "user@test.com"을 입력한다
    And 비밀번호 "password1"을 입력한다
    And 로그인 버튼을 클릭한다
    Then 대시보드 페이지로 이동한다
    And "로그인 성공" 메시지가 표시된다

  Scenario: 잘못된 비밀번호로 로그인 실패
    Given 로그인 페이지에 접속한다
    When 이메일 "user@test.com"을 입력한다
    And 비밀번호 "wrongpassword"를 입력한다
    And 로그인 버튼을 클릭한다
    Then 로그인 페이지에 머무른다
    And "이메일 또는 비밀번호가 올바르지 않습니다" 에러가 표시된다

  Scenario Outline: 다양한 잘못된 입력
    When 이메일 "<email>"을 입력한다
    And 비밀번호 "<password>"를 입력한다
    And 로그인 버튼을 클릭한다
    Then "<error>" 에러가 표시된다

    Examples:
      | email          | password | error                    |
      |                | pass     | 이메일을 입력해주세요      |
      | invalid-email  | pass     | 올바른 이메일 형식이 아닙니다 |
```

## Step Definitions (Playwright + Cucumber)

```typescript
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

Given('로그인 페이지에 접속한다', async function() {
  await this.page.goto('/login');
});

When('이메일 {string}을 입력한다', async function(email: string) {
  await this.page.fill('[data-testid="email-input"]', email);
});

When('로그인 버튼을 클릭한다', async function() {
  await this.page.click('[data-testid="login-button"]');
});

Then('대시보드 페이지로 이동한다', async function() {
  await expect(this.page).toHaveURL('/dashboard');
});

Then('{string} 메시지가 표시된다', async function(message: string) {
  await expect(this.page.locator('[data-testid="toast"]')).toContainText(message);
});
```

## API BDD (Vitest + SuperTest)

```typescript
describe('Feature: 사용자 등록 API', () => {
  describe('Scenario: 유효한 정보로 회원가입', () => {
    it('Given 유효한 사용자 정보가 있다', () => {
      ctx.userData = { email: 'new@test.com', password: 'SecurePass123!', name: '홍길동' };
    });
    it('When POST /api/users 요청을 보낸다', async () => {
      ctx.response = await request(app).post('/api/users').send(ctx.userData);
    });
    it('Then 201 상태 코드를 반환한다', () => {
      expect(ctx.response.status).toBe(201);
    });
    it('And 생성된 사용자 ID를 반환한다', () => {
      expect(ctx.response.body.data.id).toBeDefined();
    });
  });
});
```

## 디렉토리 구조

```
features/                  # Gherkin feature 파일
├── auth/login.feature
├── order/checkout.feature
step-definitions/          # 스텝 구현
├── auth.steps.ts
├── common.steps.ts
support/                   # 헬퍼, 훅
├── world.ts               # 테스트 컨텍스트
├── hooks.ts               # Before, After 훅
```

## 도구
- `cucumber-js`: JS/TS Cucumber 구현
- `playwright`: E2E 테스트 러너
- `jest-cucumber`: Jest와 Cucumber 통합
