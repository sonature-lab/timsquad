---
name: architecture
description: 아키텍처 설계 및 API 명세 가이드라인
user-invocable: false
---

<skill name="architecture">
  <purpose>시스템 아키텍처 설계 및 API 명세를 위한 가이드라인</purpose>

  <clean-architecture>
    <layers>
      <layer name="Entities" level="core">핵심 비즈니스 로직</layer>
      <layer name="Use Cases" level="application">애플리케이션 로직</layer>
      <layer name="Interface Adapters" level="adapter">컨트롤러, 프레젠터</layer>
      <layer name="Frameworks & Drivers" level="external">DB, Web, 외부 시스템</layer>
    </layers>
    <principles>
      <principle>의존성 규칙: 안쪽 레이어는 바깥쪽을 모름</principle>
      <principle>추상화: 인터페이스를 통한 의존성 역전</principle>
      <principle>단일 책임: 각 컴포넌트는 하나의 역할</principle>
    </principles>
  </clean-architecture>

  <api-design>
    <restful-principles>
      <principle>리소스 중심 URL 설계</principle>
      <principle>HTTP 메서드 적절히 사용</principle>
      <principle>일관된 응답 형식</principle>
    </restful-principles>
    <url-patterns>
      <pattern method="GET" path="/api/v1/{resource}">목록 조회</pattern>
      <pattern method="GET" path="/api/v1/{resource}/:id">단일 조회</pattern>
      <pattern method="POST" path="/api/v1/{resource}">생성</pattern>
      <pattern method="PUT" path="/api/v1/{resource}/:id">전체 수정</pattern>
      <pattern method="PATCH" path="/api/v1/{resource}/:id">부분 수정</pattern>
      <pattern method="DELETE" path="/api/v1/{resource}/:id">삭제</pattern>
    </url-patterns>
    <response-format type="success">
      <![CDATA[
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
      ]]>
    </response-format>
    <response-format type="error">
      <![CDATA[
{
  "success": false,
  "data": null,
  "error": {
    "code": "AUTH_001",
    "message": "Invalid credentials",
    "details": { ... }
  }
}
      ]]>
    </response-format>
  </api-design>

  <adr-guide>
    <when-to-write>
      <trigger>기술 스택 선정</trigger>
      <trigger>아키텍처 패턴 결정</trigger>
      <trigger>트레이드오프가 있는 결정</trigger>
    </when-to-write>
    <template>
      <![CDATA[
# ADR-XXX: {제목}

## Status
Proposed / Accepted / Deprecated / Superseded

## Context
결정이 필요한 배경과 상황

## Decision
내린 결정과 선택한 옵션

## Consequences
### Positive
- 장점 1
- 장점 2

### Negative
- 단점 1 (완화 방안)

## Alternatives Considered
| 옵션 | 장점 | 단점 |
|-----|-----|-----|
| A | ... | ... |
| B | ... | ... |
      ]]>
    </template>
  </adr-guide>

  <data-design>
    <normalization>
      <form level="1NF">원자값</form>
      <form level="2NF">부분 함수 종속 제거</form>
      <form level="3NF">이행 함수 종속 제거</form>
    </normalization>
    <index-design>
      <guideline>자주 조회되는 컬럼</guideline>
      <guideline>WHERE, JOIN, ORDER BY에 사용되는 컬럼</guideline>
      <guideline>카디널리티 고려</guideline>
    </index-design>
  </data-design>

  <checklist>
    <item>레이어 간 의존성이 올바른가</item>
    <item>API 응답 형식이 일관적인가</item>
    <item>에러 코드가 문서화되었는가</item>
    <item>주요 결정에 ADR이 있는가</item>
    <item>데이터 모델이 정규화되었는가</item>
  </checklist>
</skill>
