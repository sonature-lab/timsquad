---
name: planning
description: 기획 및 요건 정의 가이드라인
user-invocable: false
---

<skill name="planning">
  <purpose>기획 문서 작성 및 요건 정의를 위한 가이드라인</purpose>

  <principles>
    <principle name="SSOT 구조 준수">
      상위 문서부터 작성: PRD (Why) → Planning (Overview) → Requirements (What)
      각 문서는 다음 단계의 입력이 됨
    </principle>
  </principles>

  <documents>
    <document name="prd.md">
      <role>왜 만드는지, 목표, 성공 지표</role>
      <sections>
        <section required="true">배경 및 목적: 왜 이 제품/기능이 필요한가</section>
        <section required="true">목표 사용자: 누가 사용하는가</section>
        <section required="true">핵심 가치: 어떤 문제를 해결하는가</section>
        <section required="true">성공 지표: 어떻게 성공을 측정할 것인가</section>
        <section required="true">스코프: 포함/제외 범위</section>
      </sections>
    </document>
    <document name="planning.md">
      <role>전체 계획, 마일스톤, 일정</role>
    </document>
    <document name="requirements.md">
      <role>기능/비기능 요건 목록</role>
    </document>
    <document name="functional-spec.md">
      <role>기능 시나리오, 예외처리</role>
    </document>
  </documents>

  <prd-example>
    <![CDATA[
## 1. 배경 및 목적
현재 로그인 프로세스에서 이탈률이 30%에 달함.
소셜 로그인 도입으로 가입/로그인 허들을 낮추고자 함.

## 2. 목표 사용자
- 처음 방문하는 신규 사용자
- 비밀번호를 자주 잊어버리는 사용자

## 3. 핵심 가치
- 3초 내 로그인 완료
- 비밀번호 기억 부담 제거

## 4. 성공 지표
- 로그인 이탈률 30% → 10%
- 가입 전환율 20% 향상

## 5. 스코프
포함: Google, Apple 소셜 로그인
제외: Facebook, Twitter (Phase 2)
    ]]>
  </prd-example>

  <requirements-guide>
    <classification>
      <type name="FR">기능 요건 - 시스템이 해야 하는 것</type>
      <type name="NFR">비기능 요건 - 성능, 보안, 확장성 등</type>
    </classification>
    <principles>
      <principle>SMART: Specific, Measurable, Achievable, Relevant, Time-bound</principle>
      <principle>검증 가능한 형태로 작성</principle>
      <principle>우선순위 명시 (Must/Should/Could/Won't)</principle>
    </principles>
    <template>
      <![CDATA[
| ID | 분류 | 요건 | 우선순위 | 검증 방법 |
|----|-----|-----|---------|----------|
| FR-001 | 인증 | 사용자는 이메일/비밀번호로 로그인할 수 있다 | Must | 테스트 |
| NFR-001 | 성능 | 로그인 응답 시간 < 500ms | Must | 부하 테스트 |
      ]]>
    </template>
  </requirements-guide>

  <checklist>
    <item>목표가 명확히 정의되었는가</item>
    <item>스코프가 명확히 구분되었는가</item>
    <item>모든 요건에 우선순위가 있는가</item>
    <item>요건이 검증 가능한가</item>
    <item>이해관계자 승인을 받았는가</item>
  </checklist>
</skill>
