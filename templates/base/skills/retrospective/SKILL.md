---
name: retrospective
description: 회고 분석, 패턴 식별, 개선 제안 가이드라인
version: "1.0.0"
tags: [retrospective, analysis, improvement]
user-invocable: false
---

<skill name="retrospective">
  <purpose>프로젝트 회고를 위한 분석 프레임워크와 개선 프로세스</purpose>

  <tsq-cli priority="critical">
    <instruction>
      로그 기록, 피드백, 메트릭, 회고 등 TSQ CLI가 제공하는 기능은 반드시 CLI 커맨드를 사용하세요.
      직접 파일을 조작하지 마세요. CLI를 사용해야 구조화된 데이터가 자동 저장됩니다.
    </instruction>
    <commands>
      | 시점 | 커맨드 |
      |-----|--------|
      | 회고 시작 | `tsq retro start` |
      | Phase별 회고 | `tsq retro phase {phase}` |
      | 메트릭 수집 | `tsq retro collect` 또는 `tsq metrics collect` |
      | 로그 확인 | `tsq log list` / `tsq log today` |
      | 리포트 생성 | `tsq retro report` (GitHub Issue 포함) |
      | 로컬 리포트만 | `tsq retro report --local` |
      | 사이클 완료 | `tsq retro apply` |
    </commands>
  </tsq-cli>

  <references>
    <reference path=".timsquad/retrospective/metrics/">메트릭 데이터</reference>
    <reference path=".timsquad/logs/">작업 로그</reference>
    <reference path=".timsquad/retrospective/patterns/">기존 패턴</reference>
    <reference path=".timsquad/state/workspace.xml">작업 이력</reference>
  </references>

  <kpt-framework>
    <description>Keep-Problem-Try 회고 프레임워크</description>
    <category name="Keep">무엇이 잘 되었나? 계속해야 할 것은?</category>
    <category name="Problem">무엇이 문제였나? 장애물은?</category>
    <category name="Try">다음에 시도해볼 것은?</category>
  </kpt-framework>

  <pattern-classification>
    <failure-pattern id="FP-XXX">
      <criteria>3회 이상 반복, 작업 지연 유발, 품질 저하 원인</criteria>
    </failure-pattern>
    <success-pattern id="SP-XXX">
      <criteria>효과 검증됨, 효율성 향상, 품질 향상</criteria>
    </success-pattern>
  </pattern-classification>

  <metrics>
    | 메트릭 | 계산 방법 |
    |-------|----------|
    | 작업 수 | 완료된 작업 개수 |
    | 성공률 | (성공 작업 / 전체 작업) x 100 |
    | 평균 수정 횟수 | 총 수정 횟수 / 작업 수 |
    | 점수 | 가중 평균 (성공률 x 0.4 + (1 - 수정률) x 0.3 + 기타 x 0.3) |
  </metrics>

  <improvement-format>
    <![CDATA[
## IMP-XXX: {개선 제목}

**대상**: {에이전트/스킬}.md
**관련 패턴**: FP-XXX / SP-XXX

### 현재 문제
{문제 설명}

### 제안 변경
```diff
- 현재 내용
+ 개선된 내용
```

### 기대 효과
{개선 효과}
    ]]>
  </improvement-format>

  <report-sections>
    1. 메트릭 요약
    2. 에이전트별 성과
    3. 피드백 분석
    4. 발견된 패턴
    5. 개선 조치
    6. 다음 사이클 목표
  </report-sections>

  <principles>
    <principle>객관적 데이터 우선 - 주관적 평가보다 수치 기반</principle>
    <principle>구체적 예시 - 추상적 서술 지양</principle>
    <principle>실행 가능한 개선안 - "더 잘하자" 대신 구체적 액션</principle>
    <principle>균형 잡힌 시각 - 문제점만이 아닌 성공 사례도 포함</principle>
  </principles>

  <apply-process>
    제안된 개선 → 사용자 검토/승인 → SKILL.md 업데이트 → 템플릿 업데이트 → lessons.md 기록 → 다음 사이클에서 효과 측정
  </apply-process>
</skill>
