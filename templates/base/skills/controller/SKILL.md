---
name: controller
description: |
  Context DI 컨테이너. 서브에이전트 위임 시 compiled spec을 의존성으로 주입.
  서브에이전트 호출, Task() 위임, 에이전트 실행 시 자동 트리거.
  Use when: "구현해줘", "테스트해줘", "리뷰해줘", "설계해줘", 서브에이전트 위임
version: "1.0.0"
tags: [controller, di, context-injection]
user-invocable: false
---

# Controller (Context DI Container)

서브에이전트에게 작업을 위임할 때 필요한 컨텍스트를 자동으로 해석하고 주입하는 컨테이너.
에이전트가 "스스로 찾아 읽기"가 아닌 "주입받아 바로 시작"하도록 보장.

## Delegation Process

서브에이전트 위임 시 반드시 이 순서를 따른다:

1. **에이전트 파일 확인**: `.claude/agents/{agent}.md` 읽기
2. **Prerequisites 파싱**: `<prerequisites>` 태그에서 필요 SSOT 목록 추출
3. **Spec Resolve**: `controller/references/`에서 해당 compiled spec 로드
4. **Phase 제약 로드**: `controller/rules/`에서 현재 phase 제약 확인
5. **Stale 체크**: `.compile-manifest.json`의 hash와 현재 SSOT hash 비교
6. **프롬프트 조합**: tsq-protocol + resolved specs + phase 제약 + 태스크 지시
7. **Task() 호출**: 조합된 프롬프트로 서브에이전트 실행

## Spec Resolution

```
에이전트 prerequisites         →  controller references/
─────────────────────────────────────────────────────────
service-spec.md               →  references/*.spec.md (endpoint별)
data-design.md                →  references/*.spec.md (entity별)
error-codes.md                →  references/error-codes.spec.md
```

필요한 spec 전체가 아닌 **태스크에 관련된 섹션만** 주입한다.
예: "로그인 API 구현" → `references/2-1-로그인.spec.md`만 주입.

## Stale Detection

Spec 주입 전 `.compile-manifest.json`을 확인한다:

- hash 일치 → 최신. 주입 진행.
- hash 불일치 → 사용자에게 `tsq compile` 재실행을 제안.
- manifest 없음 → 사용자에게 `tsq compile` 최초 실행을 안내.

## Task Prompt Template

```
[MODE: {phase}] [TASK: {task_id}] [SPEC: {primary_spec}]

[tsq-protocol 기본 규칙]

[현재 Phase 제약]
- 허용: {allowed_actions}
- 금지: {forbidden_actions}

[Compiled Spec]
{injected_spec_content}

[태스크 지시]
task_id: {task_id}
description: {description}
```

## Mode Declaration

서브에이전트는 **매 응답 첫 줄**에 모드 선언을 출력해야 한다:

```
[MODE: IMPLEMENTATION] [TASK: P3-S001-T001] [SPEC: 2-1-로그인.spec.md]
```

<mode-declaration>
  <rules>
    <must>응답 시작 시 [MODE: {phase}] [TASK: {task_id}] [SPEC: {spec}] 선언</must>
    <must>phase는 current-phase.json 기준 (planning/design/implementation/review)</must>
    <must>SPEC은 주입받은 primary spec 파일명</must>
  </rules>
  <rationale>
    컨텍스트 압축(compaction) 후에도 에이전트가 자신의 역할·제약·참조 spec을
    매 응답마다 재확인한다. Rationalization Prevention의 자연스러운 확장.
  </rationale>
</mode-declaration>

## Rationalization Prevention

<rationalization-prevention>

| 에이전트의 변명 | 현실 |
|----------------|------|
| "이 태스크는 간단해서 spec 없이 가능" | 간단함은 주관적. spec이 있으면 반드시 참조 |
| "spec이 오래된 것 같아서 직접 판단" | spec 신선도는 controller가 판단. 주입받은 spec을 따를 것 |
| "이미 비슷한 코드가 있으니 참고만 하면 됨" | 기존 코드가 spec과 일치하는지 알 수 없음. spec 기준 |
| "테스트는 나중에 한번에 돌리는 게 효율적" | 각 태스크 완료 시 테스트 통과가 완료 조건 |
| "사용자가 빨리 해달라고 했으니 절차 생략" | 절차는 품질 보장. 절차를 따르는 것이 결과적으로 빠름 |

</rationalization-prevention>

## Checklist

| Priority | Item |
|----------|------|
| CRITICAL | 서브에이전트 위임 전 spec resolve 완료 |
| CRITICAL | compiled spec의 stale 여부 확인 |
| HIGH | phase 제약이 프롬프트에 포함됨 |
| HIGH | tsq-protocol이 프롬프트에 포함됨 |
| MEDIUM | 태스크에 관련된 섹션만 선별 주입 (전체 주입 지양) |
