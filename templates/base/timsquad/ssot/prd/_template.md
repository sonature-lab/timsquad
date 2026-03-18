# [Feature Name] — Sub-PRD

**Parent PRD**: [prd.md](../prd.md)
**Created**: {{DATE}}
**Status**: Draft

---

## 1. 기능 개요

### 1.1 목적
이 기능이 해결하는 문제:

### 1.2 사용자 스토리
> As a [사용자], I want [행동] so that [가치].

---

## 2. 요구사항

### 2.1 Must Have (P0)
| ID | 요건 | 성공 기준 |
|----|------|----------|
| | | |

### 2.2 Should Have (P1)
| ID | 요건 | 성공 기준 |
|----|------|----------|
| | | |

### 2.3 Nice to Have (P2)
| ID | 요건 |
|----|------|
| | |

---

## 3. 설계 결정

| 결정 | 선택지 | 결정 사항 | 이유 |
|------|--------|----------|------|
| | | | |

---

## 4. Mapped Artifacts

| Type | ID | Link |
|------|----|------|
| Requirement | FR-XXX-001~ | [requirements/xxx](../requirements/xxx.md) |
| Functional Spec | FS-XXX | [functional-spec/FS-XXX](../functional-spec/FS-XXX.md) |
| API Spec | xxx-api | [service-spec/xxx-api](../service-spec/xxx-api.md) |
| Screen | SCR-XXX | [ui-ux-spec/SCR-XXX](../ui-ux-spec/SCR-XXX.md) |
| Data | xxx tables | [data-design/xxx](../data-design/xxx.md) |
| Tasks | P?-S???-T???~ | [planning.md](../planning.md) |

---

## 5. 수용 기준 (Acceptance Criteria)

```gherkin
Feature: [Feature Name]

  Scenario: [Happy Path]
    Given [전제 조건]
    When [행동]
    Then [결과]

  Scenario: [Exception Path]
    Given [전제 조건]
    When [예외 행동]
    Then [에러 처리]
```
