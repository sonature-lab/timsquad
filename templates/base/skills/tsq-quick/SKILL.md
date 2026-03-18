---
name: tsq-quick
description: |
  Controller 경유 단일 태스크 실행. SSOT, 메모리, 현재 파이프라인 상태를 자동 참조하여
  컨텍스트를 잃지 않고 빠르게 작업을 완료한다. 풀 파이프라인(Phase-Sequence) 오버헤드 없이
  단일 태스크만 실행하므로, 기능 전체 구현이 아닌 부분 작업에 적합하다.
  Use when: "/tsq-quick", "빨리 해줘", "간단한 수정", "이것만", "버그 수정",
  "리팩토링", "메서드 추가", "API 하나 추가", "테스트 작성", "이 파일 수정",
  "다음 태스크", "태스크 13 실행", 또는 planning.md의 특정 태스크 하나를 실행할 때.
  단일 파일/모듈 범위의 코딩, 수정, 추가 작업이면 이 스킬을 사용한다.
version: "1.0.0"
tags: [tsq, quick, controller, pipeline]
user-invocable: true
---

# /tsq-quick — Controller 경유 단일 태스크

풀 파이프라인 없이 단일 태스크를 Controller 경유로 실행한다.
Controller를 경유하는 이유: SSOT/메모리/현재 상태를 주입받아야 이전 작업과 일관성을 유지할 수 있고,
Capability Token으로 서브에이전트의 변경 범위를 제한할 수 있기 때문이다.

## Protocol

1. **현재 위치 확인**: `.timsquad/state/workflow.json` → 진행 중인 Phase/Sequence/Task 파악
2. **태스크 결정**:
   - 사용자가 태스크를 지정 → 해당 태스크 실행
   - 미지정 → `workflow.json`의 다음 미완료 태스크 실행
3. **SSOT 참조**: `.timsquad/ssot-map.yaml` → 해당 태스크 관련 spec 로드
4. **메모리 참조**: `memory/` 디렉토리 읽기
5. **Controller 위임** (tsq-controller Protocol, 단일 태스크 모드):
   - Capability Token 발급
   - 에이전트 파일 + spec + methodology 조합
   - Task() 단일 호출
   - Completion Report 검증
   - Capability Token 회수
6. **로그 기록**: 최소 로그 (L1 수준)
7. **테스트 게이트**: 변경된 파일 관련 단위 테스트만 실행
8. **workflow.json 갱신**: 완료된 태스크 상태 기록

## vs /tsq-full

| 항목 | /tsq-quick | /tsq-full |
|------|-----------|-----------|
| Phase-Sequence-Task | X (단일) | O (전체) |
| Controller 경유 | O | O |
| SSOT/메모리 참조 | O | O |
| 게이트 | unit만 | unit → integration → e2e |
| Librarian 호출 | X | O |
| planning.md 필요 | X | O |

## Usage

```
/tsq-quick 로그인 버튼 색상을 파란색으로 변경
/tsq-quick UserService에 이메일 검증 메서드 추가
/tsq-quick 태스크 13 실행
/tsq-quick                  ← 다음 미완료 태스크 자동 실행
```
