---
name: {skill-name}
description: |
  {무엇을 하는지 + 언제 사용하는지, 1024자 이하.}
  {에이전트가 이 description만 보고 스킬 필요 여부를 판단함.}
version: "1.0.0"
tags: [{tag1}, {tag2}]
user-invocable: false
---

# {Skill Title}

{1~2줄 목적 설명}

## Philosophy

- {핵심 원칙 1}
- {핵심 원칙 2}
- {핵심 원칙 3}

## Resources

| Priority | Type | Resource | Description |
|----------|------|----------|-------------|
| CRITICAL | rule | [{rule-name}](rules/{rule-name}.md) | {1줄 설명} |
| HIGH | rule | [{rule-name}](rules/{rule-name}.md) | {1줄 설명} |
| HIGH | ref | [{topic}](references/{topic}.md) | {1줄 설명} |
| MEDIUM | script | [{script}](scripts/{script}.sh) | {1줄 설명} |

## Quick Rules

### {카테고리 1}
- {규칙}
- {규칙}

### {카테고리 2}
- {규칙}
- {규칙}

## Checklist

| Priority | Item |
|----------|------|
| CRITICAL | {필수 확인 항목} |
| HIGH | {중요 확인 항목} |
| MEDIUM | {권장 확인 항목} |

<!--
스킬 작성 가이드:
- SKILL.md는 120줄 이하 인덱스 (항상 로드됨 → 컨텍스트 절약)
- 하위 디렉토리 3종:
  - rules/   → "이렇게 해라/하지 마라" (Incorrect/Correct 패턴, impact 레벨)
  - references/ → "이것을 알아라" (심층 가이드, 외부 문서)
  - scripts/   → "이것을 실행해라" (자동화, 검증, 생성)
- rules/는 Read로 온디맨드 로드, scripts/는 Bash로 실행 (토큰 0)
- "Claude가 이미 아는 것"은 넣지 말 것 → 프로젝트 컨벤션만
- description은 PRIMARY trigger — 1024자 이하
- 참조 모델: vercel-react-best-practices (SKILL.md 인덱스 + 45 rules 파일)
-->
