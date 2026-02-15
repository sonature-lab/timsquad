---
name: architecture
description: |
  아키텍처 설계 및 API 명세 가이드라인.
  Clean Architecture, RESTful API 설계, ADR, 데이터 모델링을 다룸.
  Use when: "아키텍처 설계, API 설계, ADR, 레이어 구조, 데이터 모델"
version: "1.0.0"
tags: [architecture, api, design]
user-invocable: false
---

# Architecture

시스템 아키텍처 설계 및 API 명세를 위한 가이드라인.

## Philosophy

- 의존성 규칙: 안쪽 레이어는 바깥쪽을 모름
- 추상화: 인터페이스를 통한 의존성 역전
- 단일 책임: 각 컴포넌트는 하나의 역할

## Resources

| Priority | Type | Resource | Description |
|----------|------|----------|-------------|
| HIGH | ref | [api-design](references/api-design.md) | RESTful API URL 패턴, 응답 형식 |
| HIGH | ref | [adr-template](references/adr-template.md) | ADR 작성 가이드 + 템플릿 |

## Quick Rules

### Clean Architecture Layers
| Layer | Level | 역할 |
|-------|-------|------|
| Entities | core | 핵심 비즈니스 로직 |
| Use Cases | application | 애플리케이션 로직 |
| Interface Adapters | adapter | 컨트롤러, 프레젠터 |
| Frameworks & Drivers | external | DB, Web, 외부 시스템 |

### Data Design
- 정규화: 1NF(원자값) → 2NF(부분 함수 종속 제거) → 3NF(이행 함수 종속 제거)
- 인덱스: 자주 조회되는 컬럼, WHERE/JOIN/ORDER BY 대상, 카디널리티 고려

### ADR
트레이드오프가 있는 기술 결정 시 반드시 ADR 작성. 상세 템플릿은 references/adr-template.md 참조.

## Checklist

| Priority | Item |
|----------|------|
| CRITICAL | 레이어 간 의존성이 올바른가 (안→밖만 허용) |
| CRITICAL | API 응답 형식이 일관적인가 |
| HIGH | 에러 코드가 문서화되었는가 |
| HIGH | 주요 결정에 ADR이 있는가 |
| MEDIUM | 데이터 모델이 정규화되었는가 |
