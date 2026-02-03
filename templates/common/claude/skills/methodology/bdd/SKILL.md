---
name: bdd
description: Behavior-Driven Development 가이드라인
user-invocable: false
compatible-with: [tdd, ddd]
---

<skill name="bdd">
  <purpose>비즈니스 행위 중심의 테스트 및 개발 방법론</purpose>

  <philosophy>
    <principle>비즈니스 언어로 요구사항 표현</principle>
    <principle>Given-When-Then으로 시나리오 명세</principle>
    <principle>살아있는 문서 (Living Documentation)</principle>
    <principle>개발자, QA, 기획자 간 공통 언어</principle>
  </philosophy>

  <core-concepts>
    <concept name="user-story">
      <description>사용자 관점의 기능 설명</description>
      <template>
        As a [역할]
        I want [기능]
        So that [가치/이유]
      </template>
      <example>
        As a 회원
        I want 비밀번호를 재설정
        So that 계정에 다시 접근할 수 있다
      </example>
    </concept>

    <concept name="scenario">
      <description>구체적인 행위 시나리오</description>
      <template>
        Given [사전 조건]
        When [행위]
        Then [기대 결과]
      </template>
    </concept>

    <concept name="acceptance-criteria">
      <description>인수 조건 - 기능 완료 기준</description>
    </concept>
  </core-concepts>

  <gherkin-syntax>
    <description>BDD 시나리오 작성 문법</description>

    <example type="feature-file">
      <title>로그인 기능</title>
      <code><![CDATA[
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
      | user@test.com  |          | 비밀번호를 입력해주세요    |
      ]]></code>
    </example>
  </gherkin-syntax>

  <implementation-patterns>
    <pattern name="step-definitions" language="typescript">
      <description>Gherkin 스텝을 코드로 연결</description>
      <example>
        <title>Playwright + Cucumber 예시</title>
        <code><![CDATA[
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

Given('로그인 페이지에 접속한다', async function() {
  await this.page.goto('/login');
});

When('이메일 {string}을 입력한다', async function(email: string) {
  await this.page.fill('[data-testid="email-input"]', email);
});

When('비밀번호 {string}를 입력한다', async function(password: string) {
  await this.page.fill('[data-testid="password-input"]', password);
});

When('로그인 버튼을 클릭한다', async function() {
  await this.page.click('[data-testid="login-button"]');
});

Then('대시보드 페이지로 이동한다', async function() {
  await expect(this.page).toHaveURL('/dashboard');
});

Then('{string} 메시지가 표시된다', async function(message: string) {
  await expect(this.page.locator('[data-testid="toast"]'))
    .toContainText(message);
});
        ]]></code>
      </example>
    </pattern>

    <pattern name="api-bdd" language="typescript">
      <description>API 테스트용 BDD</description>
      <example>
        <title>Vitest + SuperTest 예시</title>
        <code><![CDATA[
describe('Feature: 사용자 등록 API', () => {
  describe('Scenario: 유효한 정보로 회원가입', () => {
    it('Given 유효한 사용자 정보가 있다', () => {
      ctx.userData = {
        email: 'new@test.com',
        password: 'SecurePass123!',
        name: '홍길동'
      };
    });

    it('When POST /api/users 요청을 보낸다', async () => {
      ctx.response = await request(app)
        .post('/api/users')
        .send(ctx.userData);
    });

    it('Then 201 상태 코드를 반환한다', () => {
      expect(ctx.response.status).toBe(201);
    });

    it('And 생성된 사용자 ID를 반환한다', () => {
      expect(ctx.response.body.data.id).toBeDefined();
    });
  });
});
        ]]></code>
      </example>
    </pattern>
  </implementation-patterns>

  <bdd-vs-tdd>
    <comparison>
      <aspect name="관점">
        <tdd>개발자 관점 (코드 단위)</tdd>
        <bdd>사용자/비즈니스 관점 (행위 단위)</bdd>
      </aspect>
      <aspect name="언어">
        <tdd>기술 용어 (함수, 클래스)</tdd>
        <bdd>비즈니스 용어 (시나리오, 기능)</bdd>
      </aspect>
      <aspect name="테스트 대상">
        <tdd>단위 테스트 중심</tdd>
        <bdd>인수 테스트, E2E 중심</bdd>
      </aspect>
      <aspect name="문서화">
        <tdd>코드가 문서</tdd>
        <bdd>시나리오가 살아있는 문서</bdd>
      </aspect>
    </comparison>
    <recommendation>TDD + BDD 함께 사용 권장 (보완 관계)</recommendation>
  </bdd-vs-tdd>

  <directory-structure>
    <dir name="features">
      <description>Gherkin feature 파일</description>
      <file name="auth/login.feature" />
      <file name="auth/register.feature" />
      <file name="order/checkout.feature" />
    </dir>
    <dir name="step-definitions">
      <description>스텝 구현</description>
      <file name="auth.steps.ts" />
      <file name="order.steps.ts" />
      <file name="common.steps.ts" />
    </dir>
    <dir name="support">
      <description>헬퍼, 훅</description>
      <file name="world.ts" example="테스트 컨텍스트" />
      <file name="hooks.ts" example="Before, After 훅" />
    </dir>
  </directory-structure>

  <tools>
    <tool name="cucumber-js">JavaScript/TypeScript Cucumber 구현</tool>
    <tool name="playwright">E2E 테스트 러너</tool>
    <tool name="jest-cucumber">Jest와 Cucumber 통합</tool>
  </tools>

  <rules>
    <category name="필수">
      <must>시나리오는 비즈니스 언어로 작성</must>
      <must>Given-When-Then 형식 준수</must>
      <must>하나의 시나리오는 하나의 행위만 테스트</must>
      <must>시나리오는 독립적으로 실행 가능해야 함</must>
    </category>
    <category name="금지">
      <must-not>기술 용어를 시나리오에 노출 (CSS selector, API endpoint 등)</must-not>
      <must-not>테스트 간 상태 공유</must-not>
      <must-not>UI 구현 세부사항 시나리오에 포함</must-not>
    </category>
  </rules>

  <checklist>
    <item priority="critical">Feature 파일이 비즈니스 언어로 작성됨</item>
    <item priority="critical">Given-When-Then 형식 준수</item>
    <item priority="high">시나리오가 독립적으로 실행 가능</item>
    <item priority="high">Step Definition 재사용성 확보</item>
    <item priority="medium">Background로 공통 전제조건 추출</item>
    <item priority="medium">Scenario Outline으로 데이터 주도 테스트</item>
  </checklist>
</skill>
