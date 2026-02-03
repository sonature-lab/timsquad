---
name: hexagonal-architecture
description: Hexagonal Architecture (Ports and Adapters)
aliases: [ports-and-adapters, onion-architecture]
suitable-for: [api-backend, platform, fintech]
target: backend
---

# Hexagonal Architecture (Ports and Adapters)

<architecture name="hexagonal">
  <philosophy>
    <principle>애플리케이션을 육각형의 중심에, 외부 세계를 가장자리에</principle>
    <principle>포트(인터페이스)로 경계 정의, 어댑터로 연결</principle>
    <principle>인바운드(Driving) vs 아웃바운드(Driven) 명확 구분</principle>
    <principle>도메인은 외부에 대해 무지해야 함</principle>
  </philosophy>

  <core-concepts>
    <concept name="port">
      <description>애플리케이션 경계의 인터페이스</description>
      <type name="inbound">외부에서 애플리케이션으로 들어오는 요청 (Use Case)</type>
      <type name="outbound">애플리케이션에서 외부로 나가는 요청 (SPI)</type>
    </concept>

    <concept name="adapter">
      <description>포트의 구체적 구현</description>
      <type name="primary">외부 → 애플리케이션 (Controller, CLI, Message Consumer)</type>
      <type name="secondary">애플리케이션 → 외부 (Repository, API Client, Message Publisher)</type>
    </concept>

    <concept name="application-core">
      <description>비즈니스 로직의 핵심. 포트로만 외부와 소통</description>
    </concept>
  </core-concepts>

  <layers>
    <layer name="domain" position="center">
      <description>비즈니스 엔티티와 규칙. 가장 안정적</description>
    </layer>

    <layer name="application" position="inner-ring">
      <description>유스케이스와 포트 정의</description>
    </layer>

    <layer name="adapters" position="outer-ring">
      <description>포트 구현. Primary + Secondary</description>
    </layer>

    <layer name="infrastructure" position="edge">
      <description>프레임워크, 설정, 조립</description>
    </layer>
  </layers>

  <dependency-flow>
    <rule>의존성은 항상 바깥에서 안으로 향함</rule>
    <rule>안쪽 레이어는 바깥쪽을 모름</rule>
    <rule>포트 = 안쪽에서 정의, 어댑터 = 바깥에서 구현</rule>
  </dependency-flow>
</architecture>
