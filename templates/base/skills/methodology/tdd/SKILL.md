---
name: tdd
description: Test-Driven Development 방법론 가이드라인
version: "1.0.0"
tags: [tdd, methodology, testing]
user-invocable: false
---

# TDD (Test-Driven Development)

## 철학
- 테스트가 설계를 이끈다
- 작은 단계로 진행한다
- 리팩토링은 테스트가 보장한다
- 불확실할 때는 더 작은 단계로

## Red-Green-Refactor Cycle

### 1. Red (1-2min) — 실패하는 테스트 작성
- 테스트가 실패하는 것을 확인
- 한 번에 하나의 기능만 테스트
- 테스트 이름으로 의도 명확히 표현
- **금지**: 구현 코드 먼저 작성

### 2. Green (3-5min) — 테스트를 통과하는 최소 코드
- 테스트 통과만을 목표
- 가장 단순한 구현 선택
- **금지**: 미래 요구사항 미리 구현, 완벽한 코드 추구

### 3. Refactor (5-10min) — 코드 정리
- 중복 제거, 네이밍 개선, 구조 개선
- 테스트 실행하며 진행
- **금지**: 기능 변경

## Kent Beck Techniques (상세: `rules/techniques.md`)

| 기법 | 사용 시점 |
|------|----------|
| Fake It | 구현 불확실 → 하드코딩 후 일반화 |
| Triangulation | 일반화 방향 불명확 → 2+ 테스트 |
| Obvious Implementation | 구현 명확 → 바로 작성 |
| One to Many | 컬렉션 → 단일 먼저, 확장 |
| Assert First | 구조 불명확 → assertion부터 역방향 |
| Starter Test | 시작점 모름 → 가장 단순한 테스트 |
| Test Data Builder | 객체 생성 반복 → 빌더 패턴 |
| Learning Test | 새 라이브러리 → 학습 테스트 |

## SSOT 통합 워크플로우
1. `service-spec.md`에서 API 명세 확인
2. 명세 기반 테스트 케이스 작성 (Starter Test)
3. 테스트 실패 확인 (Red)
4. 명세대로 구현 (Green)
5. 리팩토링 (Refactor)
6. 삼각측량으로 엣지 케이스 추가

## Checklist
- [ ] 테스트 먼저 작성했는가
- [ ] 테스트가 실패하는 것을 확인했는가
- [ ] 최소 코드로 통과했는가
- [ ] 리팩토링 단계를 거쳤는가
- [ ] 삼각측량으로 일반화했는가
- [ ] 엣지 케이스를 테스트했는가

## 참조
- `rules/techniques.md` — 각 기법의 코드 예시
- `rules/real-world-example.md` — 로그인 기능 TDD 전체 과정 + Anti-Patterns
