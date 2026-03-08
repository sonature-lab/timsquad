# Phase Complete Trigger

Phase 내 모든 시퀀스 완료 시 controller가 수행하는 행동 규칙.

## 행동

1. **E2E 테스트**: `npm run test:e2e` 실행 확인
2. **L3 로그**: 데몬이 L3 페이즈 로그를 자동 생성했는지 확인
3. **Phase Gate**: `tsq log phase gate` 실행 → 전환 조건 확인
4. **Librarian 호출**: Phase 종합 리포트 작성을 위해 Librarian 에이전트 호출
5. **회고**: `tsq retro` 자동 실행 검토

## Librarian 호출 조건

- Phase 내 모든 시퀀스 completed
- L3 로그 생성 완료
- Phase Gate PASS

## 호출 방법

```
Librarian에게 위임 (delegation/librarian.md 참조):
- 입력: L1/L2/L3 로그, SSOT 현재 상태
- 출력: Phase 종합 리포트, SSOT stale 보고, 다음 Phase context note
```
