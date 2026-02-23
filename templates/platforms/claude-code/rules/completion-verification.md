---
description: 완료 검증 루프. 자기 보고 금지, exit code로 완료 판정.
globs:
  - "**/*"
---

# 완료 검증 루프 (Completion Verification)

## 원칙: 자기 보고 금지

"작업을 완료했습니다"라고 자체 판단하지 마세요. 객관적 증거(테스트 exit code)가 완료를 판정합니다.

## 자동 검증 (Stop Hook)

Implementation phase에서 턴이 종료될 때:
1. 세션 내 Bash 명령 실행 이력 확인
2. 테스트가 한 번도 실행되지 않았으면 **블로킹** — 강제로 테스트 실행 요구
3. `stop_hook_active` 플래그로 1회만 블로킹 (무한루프 방지)

## 블로킹 수신 시 대응

`[Completion Guard]` 블로킹 메시지를 받으면:
1. 프로젝트의 테스트 명령을 실행하세요 (`npm test`, `pytest` 등)
2. 실패한 테스트가 있으면 수정하세요
3. 모든 테스트 통과 후 작업을 마무리하세요

## 참고

- Planning/Design phase에서는 블로킹하지 않음 (코드 변경이 없으므로)
- 세션 컨텍스트(`[Session]`)는 블로킹 여부와 무관하게 항상 주입됨
