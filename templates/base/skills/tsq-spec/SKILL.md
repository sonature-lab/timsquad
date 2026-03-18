---
name: tsq-spec
description: |
  SSOT(Single Source of Truth) 문서 존재 여부를 확인하고, 미존재 시 구현 전 스펙 작성을 안내한다.
  `/tsq-spec <기능명>`으로 호출하면 해당 기능의 SSOT 문서를 찾아 상태를 보고한다.
  스펙 없이 구현하는 것을 방지하여 문서-코드 일관성을 유지한다.
version: "1.0.0"
tags: [tsq, spec, ssot, gate, documentation]
user-invocable: true
argument-hint: "[기능명] — SSOT 문서 존재 여부 확인"
---

# Spec Gate

SSOT 문서 존재 여부를 확인하여 스펙 없는 구현을 방지한다.

## Contract

- **Trigger**: `/tsq-spec` 호출 또는 구현 시작 전 자동 확인
- **Input**: `$ARGUMENTS` (기능명) 또는 미지정 시 전체 SSOT 상태
- **Output**: SSOT 상태 리포트 (존재/stale/미존재) + 권장 액션
- **Error**: SSOT 디렉토리 자체가 없을 경우 "NOT FOUND" 안내
- **Dependencies**: tsq-protocol

## Protocol

1. **SSOT 검색**: `$ARGUMENTS`로 전달된 기능명으로 `.timsquad/ssot/` 디렉토리 탐색
2. **존재 확인**: 해당 기능의 스펙 문서(PRD, 설계문서, API 스펙) 존재 여부 판단
3. **상태 판정**:
   - **존재 + 최신**: 스펙 요약 출력 + "구현 가능" 안내
   - **존재 + stale**: "스펙 갱신 필요" + `tsq compile` 재실행 안내
   - **미존재**: advisory 경고 + 스펙 작성 가이드 제공
4. **결과 리포트**: 상태 + 권장 액션을 구조화하여 출력

## Verification

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| SSOT 파일 존재 | `.timsquad/ssot/` 탐색 | 관련 문서 1개 이상 |
| stale 여부 | compile-manifest hash 비교 | hash 일치 |
| 스펙 커버리지 | 기능 키워드 매칭 | 해당 기능 언급 존재 |

## Quick Rules

### Gate 동작
- **미존재 시**: advisory 경고 (차단 아님)
  ```
  [SPEC GATE] 기능 "{name}"에 대한 SSOT 문서가 없습니다.
  스펙 먼저 작성하세요: .timsquad/ssot/{name}.md
  가이드: PRD → 설계문서 → Compiled Spec 순서
  ```
- **stale 시**: `tsq compile` 재실행 안내
  ```
  [SPEC GATE] SSOT 문서가 최신이 아닙니다. `tsq compile` 재실행 필요.
  ```
- **Phase gate에서만 실제 차단** (일반 사용 시 advisory)
- `$ARGUMENTS` 미지정 시 전체 SSOT 상태 요약
- PRD, 설계문서, API 스펙 모두 SSOT로 인정
