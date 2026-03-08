---
name: controller
description: |
  Context DI 컨테이너. 서브에이전트 위임 시 compiled spec을 의존성으로 주입.
  서브에이전트 호출, Task() 위임, 에이전트 실행 시 자동 트리거.
  Use when: "구현해줘", "테스트해줘", "리뷰해줘", "설계해줘", 서브에이전트 위임
version: "1.0.0"
tags: [controller, di, context-injection]
depends_on: [tsq-protocol]
conflicts_with: []
user-invocable: false
---

# Controller (Context DI Container)

서브에이전트에게 작업을 위임할 때 컨텍스트를 자동 해석하고 주입하는 컨테이너.

## Philosophy

- "스스로 찾기"가 아닌 "주입받아 바로 시작"
- 태스크에 관련된 섹션만 선별 주입 (전체 주입 지양)
- spec 신선도는 controller가 판단

## Contract

- **Trigger**: 서브에이전트 위임 시 (구현, 테스트, 리뷰 등)
- **Input**: 에이전트 파일 + prerequisites + compiled specs
- **Output**: 조합된 프롬프트로 Task() 실행
- **Error**: spec stale 시 `tsq compile` 재실행 안내
- **Dependencies**: tsq-protocol

## Protocol

1. **Memory 참조**: `memory/` 디렉토리의 모든 .md 파일을 Read (프로젝트 결정사항)
2. **에이전트 파일 확인**: `.claude/agents/{agent}.md` 읽기
3. **Prerequisites 파싱**: `<prerequisites>` 태그에서 SSOT 목록 추출
4. **Spec Resolve**: `references/`에서 해당 compiled spec 로드
5. **Stale 체크**: `.compile-manifest.json` hash 비교
6. **프롬프트 조합**: tsq-protocol + memory + specs + phase 제약 + 지시
7. **Task() 호출**: 조합된 프롬프트로 서브에이전트 실행

## Verification

| Check | Command | Pass Criteria |
|-------|---------|---------------|
| Stale 체크 | `.compile-manifest.json` hash | 일치 |
| Prerequisites | 에이전트 파일 파싱 | 모든 spec 존재 |
| Task 사용 | 위임 방식 확인 | Task() 사용 (TeamCreate 금지) |
| Phase 제약 | 프롬프트 포함 확인 | 현재 phase 제약 포함 |

## Quick Rules

### Spec Resolution
- 에이전트 prerequisites → `references/*.spec.md`로 매핑
- 태스크 관련 섹션만 주입 (예: "로그인 API" → 로그인 spec만)

### Delegation
- **지원**: Task() — 순차 호출, 도구 실행 가능
- **금지**: TeamCreate — SDK 제한으로 도구 실행 불가

### Mode Declaration
서브에이전트 매 응답 첫 줄: `[MODE: {phase}] [TASK: {id}] [SPEC: {file}]`

### P3 Workflow
Developer(구현+테스트) → vitest → QA(L1 피드백) → L2 자동 생성.
QA 진입: developer completed + tests pass + build success.
