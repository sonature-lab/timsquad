---
name: feature-sliced-design
description: Feature-Sliced Design (FSD)
aliases: [fsd]
suitable-for: [web-service, platform]
target: frontend
---

# Feature-Sliced Design (FSD)

<architecture name="fsd">
  <philosophy>
    <principle>비즈니스 가치 기준 코드 분리</principle>
    <principle>낮은 결합도, 높은 응집도</principle>
    <principle>단방향 의존성 (위에서 아래로만)</principle>
    <principle>Public API를 통한 명시적 인터페이스</principle>
  </philosophy>

  <layers order="top-to-bottom">
    <layer name="app" level="1">
      <description>앱 초기화, 프로바이더, 라우팅</description>
      <can-import>pages, widgets, features, entities, shared</can-import>
    </layer>

    <layer name="pages" level="2">
      <description>라우트별 페이지 컴포넌트</description>
      <can-import>widgets, features, entities, shared</can-import>
    </layer>

    <layer name="widgets" level="3">
      <description>독립적인 UI 블록 (헤더, 사이드바 등)</description>
      <can-import>features, entities, shared</can-import>
    </layer>

    <layer name="features" level="4">
      <description>사용자 시나리오, 비즈니스 기능</description>
      <can-import>entities, shared</can-import>
    </layer>

    <layer name="entities" level="5">
      <description>비즈니스 엔티티 (User, Product, Order)</description>
      <can-import>shared</can-import>
    </layer>

    <layer name="shared" level="6">
      <description>재사용 유틸리티, UI kit, 설정</description>
      <can-import>없음</can-import>
    </layer>
  </layers>

  <slice-structure>
    <description>각 레이어 내 슬라이스 구조</description>
    <segment name="ui">React 컴포넌트</segment>
    <segment name="model">비즈니스 로직, 상태</segment>
    <segment name="api">API 호출</segment>
    <segment name="lib">유틸리티 함수</segment>
    <segment name="config">설정</segment>
    <segment name="index.ts">Public API (re-export)</segment>
  </slice-structure>

  <public-api-rule>
    <rule>모든 슬라이스는 index.ts를 통해서만 외부에 노출</rule>
    <rule>내부 구현 직접 import 금지</rule>
    <example type="good">import { UserCard } from '@/entities/user'</example>
    <example type="bad">import { UserCard } from '@/entities/user/ui/UserCard'</example>
  </public-api-rule>
</architecture>
