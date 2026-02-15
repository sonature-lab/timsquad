---
name: bdd
description: Behavior-Driven Development 가이드라인
version: "1.0.0"
tags: [bdd, methodology, testing]
user-invocable: false
compatible-with: [tdd, ddd]
---

# BDD (Behavior-Driven Development)

## 철학
- 비즈니스 언어로 요구사항 표현
- Given-When-Then으로 시나리오 명세
- 살아있는 문서 (Living Documentation)
- 개발자, QA, 기획자 간 공통 언어

## 핵심 개념

### User Story
```
As a [역할]
I want [기능]
So that [가치/이유]
```

### Scenario (Given-When-Then)
```
Given [사전 조건]
When [행위]
Then [기대 결과]
```

### Acceptance Criteria
인수 조건 — 기능 완료 기준

## BDD vs TDD

| 관점 | TDD | BDD |
|------|-----|-----|
| 시점 | 개발자 (코드 단위) | 사용자/비즈니스 (행위) |
| 언어 | 기술 용어 | 비즈니스 용어 |
| 대상 | 단위 테스트 | 인수/E2E 테스트 |
| 문서 | 코드가 문서 | 시나리오가 살아있는 문서 |

**권장**: TDD + BDD 함께 사용 (보완 관계)

## Rules

### 필수
- 시나리오는 비즈니스 언어로 작성
- Given-When-Then 형식 준수
- 하나의 시나리오는 하나의 행위만 테스트
- 시나리오는 독립적으로 실행 가능

### 금지
- 기술 용어를 시나리오에 노출 (CSS selector, API endpoint 등)
- 테스트 간 상태 공유
- UI 구현 세부사항 시나리오에 포함

## Checklist
- [ ] Feature 파일이 비즈니스 언어로 작성됨
- [ ] Given-When-Then 형식 준수
- [ ] 시나리오가 독립적으로 실행 가능
- [ ] Step Definition 재사용성 확보
- [ ] Background로 공통 전제조건 추출

## 참조
- `rules/gherkin-patterns.md` — Feature 파일, Step Definition, API BDD 예시, 디렉토리 구조
