---
description: 컨텍스트 생존 메모. 세션 압축 후 작업 연속성 유지.
globs:
  - ".timsquad/.daemon/**"
---

# 세션 컨텍스트 복원 (Session Notes)

## 자동 주입
매 턴 종료 시 `[Session]` 시스템 메시지가 자동 주입됩니다.
- 현재 턴 번호, 도구 사용 횟수, 활성 서브에이전트, 최근 수정 파일

## 압축 감지 후 대응
컨텍스트가 압축된 것 같으면 (이전 대화 내용이 요약되어 있으면):
1. `[Session]` 메시지의 턴/도구/에이전트 정보로 현재 진행 상태 파악
2. 필요 시 `.timsquad/.daemon/session-notes.jsonl`을 직접 읽어 이전 턴 이력 확인
3. 최근 수정 파일들을 Read로 다시 확인하여 작업 컨텍스트 복원
4. `.timsquad/logs/sessions/` 하위 세션 로그에서 상세 이벤트 확인 가능
