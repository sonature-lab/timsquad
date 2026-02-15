---
name: clean-architecture
description: Uncle Bob's Clean Architecture
aliases: [onion, ports-and-adapters-lite]
suitable-for: [web-service, api-backend, platform]
---

# Clean Architecture

<architecture name="clean">
  <philosophy>
    <principle>의존성은 항상 안쪽(도메인)으로 향한다</principle>
    <principle>비즈니스 규칙은 프레임워크에 독립적</principle>
    <principle>외부 세계(DB, UI, API)는 세부사항</principle>
    <principle>테스트 가능성이 설계의 핵심</principle>
  </philosophy>

  <layers>
    <layer name="entities" level="core">
      <description>엔터프라이즈 비즈니스 규칙. 가장 안정적인 레이어</description>
      <contains>도메인 모델, 비즈니스 규칙, Value Objects</contains>
      <depends-on>없음 (의존성 없음)</depends-on>
    </layer>

    <layer name="use-cases" level="application">
      <description>애플리케이션 비즈니스 규칙. 유스케이스 구현</description>
      <contains>서비스, 유스케이스, 포트(인터페이스)</contains>
      <depends-on>entities</depends-on>
    </layer>

    <layer name="adapters" level="interface">
      <description>외부와 내부를 연결하는 어댑터</description>
      <contains>컨트롤러, 리포지토리 구현, DTO 변환</contains>
      <depends-on>use-cases, entities</depends-on>
    </layer>

    <layer name="infrastructure" level="external">
      <description>프레임워크와 드라이버</description>
      <contains>DB, 웹 프레임워크, 외부 API 클라이언트</contains>
      <depends-on>adapters</depends-on>
    </layer>
  </layers>

  <dependency-rule>
    <rule>안쪽 레이어는 바깥쪽 레이어를 알지 못한다</rule>
    <rule>의존성 역전 원칙(DIP)으로 방향 제어</rule>
    <rule>인터페이스는 안쪽에, 구현은 바깥쪽에</rule>
  </dependency-rule>
</architecture>
