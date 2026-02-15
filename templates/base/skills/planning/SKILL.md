---
name: planning
description: |
  기획 및 요건 정의 가이드라인.
  PRD, 요구사항 정의, 문서 구조화, 대용량 문서 분할 전략을 다룸.
  Use when: "기획, PRD, 요구사항, 요건 정의, 스코프, 마일스톤"
version: "1.0.0"
tags: [planning, prd, requirements]
user-invocable: false
---

# Planning

기획 문서 작성 및 요건 정의를 위한 가이드라인.

## Philosophy

- SSOT 구조 준수: PRD (Why) → Planning (Overview) → Requirements (What)
- 각 문서는 다음 단계의 입력
- 검증 가능한 요건만 작성

## Resources

| Priority | Type | Resource | Description |
|----------|------|----------|-------------|
| HIGH | ref | [prd-guide](references/prd-guide.md) | PRD 작성 가이드 + 예시 |
| HIGH | ref | [requirements-guide](references/requirements-guide.md) | 요건 분류 + SMART + MoSCoW |

## Quick Rules

### SSOT Documents
| 문서 | 역할 |
|------|------|
| `prd.md` | 왜 만드는지, 목표, 성공 지표 |
| `planning.md` | 전체 계획, 마일스톤, 일정 |
| `requirements.md` | 기능/비기능 요건 목록 |
| `functional-spec.md` | 기능 시나리오, 예외처리 |

### Large Document Strategy
800줄 이상 예상 문서는 반드시 분할:
1. 목차 기반 규모 사전 추정
2. 도메인별 분할
3. 인덱스 파일에서 분할 문서 링크 유지
4. 순차 append 방식으로 섹션별 작성

### Context Verification
SSOT 템플릿 작성 시 `config.yaml` 프로젝트 설정을 먼저 확인.
프로젝트에서 실제 사용하는 서비스만 포함. 제너릭 외부 서비스를 무분별하게 채우지 않는다.

## Checklist

| Priority | Item |
|----------|------|
| CRITICAL | 목표가 명확히 정의되었는가 |
| CRITICAL | 스코프가 명확히 구분되었는가 (포함/제외) |
| HIGH | 모든 요건에 우선순위가 있는가 |
| HIGH | 요건이 검증 가능한가 (정량적 기준) |
| MEDIUM | 이해관계자 승인을 받았는가 |
