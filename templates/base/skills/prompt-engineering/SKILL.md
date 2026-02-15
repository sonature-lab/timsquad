---
name: prompt-engineering
description: 프롬프트 최적화, 템플릿 관리, 회고 기반 개선 가이드라인
version: "1.0.0"
tags: [prompt, optimization, retrospective]
user-invocable: false
---

<skill name="prompt-engineering">
  <purpose>에이전트/스킬 프롬프트 최적화 및 품질 개선</purpose>

  <optimization-principles>
    <principle name="구조화">
      역할 → 페르소나 → 작업 전 필수 → 핵심 원칙 → 작업 프로세스 → 출력 형식 → 금지 사항 → 예시
    </principle>
    <principle name="명확성">
      | Bad | Good |
      |-----|------|
      | "잘 작성해" | "3문장 이내로 요약해" |
      | "좋은 코드" | "테스트 커버리지 80%" |
      | 나열만 | "필수/권장/선택" 분류 |
    </principle>
    <principle name="컨텍스트">
      프로젝트 정보, 참조 문서 경로, 제약 사항을 명시적으로 주입
    </principle>
    <principle name="예시 포함">
      Good/Bad 예시를 함께 제공하여 기대 품질 수준 명확화
    </principle>
  </optimization-principles>

  <template-format>
    <![CDATA[
---
name: {template-name}
version: 1.0.0
agent: {target-agent}
task_type: {implementation|review|analysis}
---

# {Title}

## 컨텍스트 주입
{{CONTEXT}}

## 작업 정의
{{TASK_DESCRIPTION}}

## SSOT 참조
{{SSOT_REFERENCES}}

## 출력 요구사항
{{OUTPUT_REQUIREMENTS}}

## 검증 기준
{{VALIDATION_CRITERIA}}
    ]]>
  </template-format>

  <version-management>
    | 변경 유형 | 버전 증가 | 예시 |
    |---------|----------|------|
    | 구조 변경 | Major (x.0.0) | 섹션 추가/삭제 |
    | 내용 수정 | Minor (0.x.0) | 규칙 추가, 예시 수정 |
    | 오타 수정 | Patch (0.0.x) | 단순 수정 |
  </version-management>

  <rollback-conditions>
    | 조건 | 액션 |
    |-----|------|
    | 성공률 10% 하락 | 이전 버전 롤백 |
    | Critical 피드백 발생 | 즉시 롤백 + 분석 |
    | A/B 테스트 실패 | 기존 버전 유지 |
  </rollback-conditions>

  <improvement-mapping>
    패턴 → 프롬프트 개선 매핑 프로세스:
    1. 실패/성공 패턴 식별 (회고 스킬에서)
    2. 대상 에이전트/스킬 .md 파일 특정
    3. 변경 전/후 diff 작성
    4. 기대 효과 및 검증 방법 명시
    5. 사용자 승인 후 적용
  </improvement-mapping>

  <quality-checklist>
    | 항목 | 검증 내용 |
    |-----|----------|
    | 명확성 | 모호한 표현이 없는가? |
    | 완전성 | 필요한 정보가 모두 있는가? |
    | 구조화 | 논리적 순서로 구성되었는가? |
    | 예시 | Good/Bad 예시가 있는가? |
    | 제약 | 금지 사항이 명시되었는가? |
    | 출력 | 기대 출력 형식이 정의되었는가? |
  </quality-checklist>

  <effectiveness-metrics>
    | 메트릭 | 측정 방법 | 목표 |
    |-------|----------|:----:|
    | 작업 성공률 | 성공 작업 / 전체 작업 | 90%+ |
    | 수정 횟수 | 평균 수정 횟수 | 2 미만 |
    | 피드백 레벨 | Level 2+ 피드백 비율 | 10% 미만 |
    | SSOT 정합성 | SSOT 불일치 건수 | 0 |
  </effectiveness-metrics>
</skill>
