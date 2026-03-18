---
title: Improvement Application Protocol
category: reference
---

# 개선 적용 프로토콜

`/tsq-retro improve` 실행 시 상세 절차.

## 1. 제안 로드

최근 retro 리포트(`.timsquad/retrospective/retro-{phase}.md`)에서 개선 항목을 추출한다.
각 항목에는 `[승인]` / `[보류]` / `[거부]` 태그가 있어야 한다. 태그 없으면 사용자에게 승인 요청.

## 2. 대상별 적용 절차

### 스킬 패치 (SKILL.md 수정)

대상: `.claude/skills/tsq-*/SKILL.md`

1. 변경할 스킬 파일 읽기
2. diff 형태로 변경 사항 제시
3. 사용자 확인 후 적용
4. 변경 이유를 커밋 메시지에 포함

주의: Quick Rules나 Protocol 순서 변경은 다른 스킬과의 의존성 확인 필요.

### 템플릿 수정

대상: `.claude/agents/*.md`, `.timsquad/config.yaml`

1. 변경 영향 범위 확인 (해당 에이전트가 참조하는 스킬 목록)
2. diff 제시 → 사용자 확인
3. 적용 후 관련 에이전트 동작에 영향 없는지 확인

### 패턴 등록

대상: `.timsquad/retrospective/patterns/`

실패 패턴(FP) 또는 성공 패턴(SP)을 등록한다.

```markdown
## FP-{NNN}: {패턴명}

- **빈도**: {N}회 (Phase {X}, {Y}, {Z})
- **증상**: {무엇이 반복적으로 실패하는가}
- **근본 원인**: {왜 반복되는가}
- **대응**: {어떻게 방지할 것인가}
- **적용일**: {ISO8601}
```

```markdown
## SP-{NNN}: {패턴명}

- **빈도**: {N}회 검증됨
- **효과**: {어떤 개선 효과가 있었는가}
- **조건**: {이 패턴이 효과적인 조건}
- **적용일**: {ISO8601}
```

### lessons.md 기록

대상: `.timsquad/retrospective/lessons.md`

모든 개선 적용 결과를 기록한다. 다음 retro에서 효과 측정의 입력이 된다.

```markdown
## {ISO8601} — {개선 제목}

- **출처**: retro-{phase}.md IMP-{NNN}
- **변경**: {무엇을 바꿨는가}
- **기대 효과**: {무엇을 기대하는가}
- **측정 기준**: {다음 retro에서 확인할 지표}
```

## 3. 검증

적용 후 반드시 확인:

1. `npm test` — 테스트 통과
2. 변경된 스킬이 있으면 frontmatter(name, description, version) 정합성 확인
3. 패턴이 등록됐으면 patterns/ 디렉토리에 파일 존재 확인

## 4. 효과 측정 (다음 retro에서)

lessons.md의 "측정 기준"을 다음 `/tsq-retro` 실행 시 자동으로 체크한다.
개선이 효과가 있었으면 SP로 승격, 없었으면 Try 항목에 재등록.
