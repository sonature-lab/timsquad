---
name: {skill-name}
description: |
  {무엇을 하는지 + 언제 사용하는지, 1024자 이하.}
  {에이전트가 이 description만 보고 스킬 필요 여부를 판단함.}
version: "1.0.0"
tags: [{tag1}, {tag2}]
depends_on: []
conflicts_with: []
user-invocable: false
---

# {Skill Title}

{1~2줄 목적 설명}

## Philosophy

- {핵심 원칙 1}
- {핵심 원칙 2}
- {핵심 원칙 3}

## Contract

- **Trigger**: {스킬 활성화 조건}
- **Input**: {필요한 입력/컨텍스트}
- **Output**: {보장하는 출력/결과}
- **Error**: {실패 시 행동}
- **Dependencies**: {depends_on 스킬 목록 또는 "없음"}

## Protocol

1. {첫 번째 단계}
2. {두 번째 단계}
3. {세 번째 단계}

## Verification

| Check | Command | Pass Criteria |
|-------|---------|---------------|
| {항목} | `{실행 명령}` | exit code 0 |

## Resources

| Priority | Type | Resource | Description |
|----------|------|----------|-------------|
| CRITICAL | rule | [{rule-name}](rules/{rule-name}.md) | {1줄 설명} |
| HIGH | ref | [{topic}](references/{topic}.md) | {1줄 설명} |

## Quick Rules

### {카테고리 1}
- {규칙}
- {규칙}

<!--
스킬 작성 가이드:
- SKILL.md는 120줄 이하 인덱스 (항상 로드됨 → 컨텍스트 절약)
- 필수 섹션: Philosophy, Contract, Protocol, Verification, Quick Rules
- 선택 섹션: Resources (rules/references/scripts 있을 때)
- Checklist는 Verification으로 통합 (중복 제거)
- 하위 디렉토리 4종:
  - rules/      → "이렇게 해라/하지 마라" (Incorrect/Correct 패턴, impact 레벨)
  - references/ → "이것을 알아라" (심층 가이드, 외부 문서)
  - scripts/    → "이것을 실행해라" (자동화, 검증, 생성)
  - memory/     → "프로젝트에서 결정된 것" (동적, 프로젝트 진행 중 축적)
- rules/는 Read로 온디맨드 로드, scripts/는 Bash로 실행 (토큰 0)
- memory/는 스킬 활성 시 Protocol 첫 단계에서 반드시 Read
  - 프로젝트별 결정사항, 사용자 지시, 컨벤션 축적
  - git 추적 가능 → 팀 공유
  - 예: memory/conventions.md, memory/decisions.md
- "Claude가 이미 아는 것"은 넣지 말 것 → 프로젝트 컨벤션만
- description은 PRIMARY trigger — 1024자 이하
- 참조 모델: vercel-react-best-practices (SKILL.md 인덱스 + 45 rules 파일)
-->
