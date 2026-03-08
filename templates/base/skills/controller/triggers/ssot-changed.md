# SSOT Changed Trigger

SSOT 문서가 변경되었을 때 controller가 수행하는 행동 규칙.

## 행동

1. **자동 컴파일 확인**: 데몬이 `tsq compile build` 자동 실행했는지 확인
2. **Stale 체크**: `.compile-manifest.json` hash가 최신인지 확인
3. **영향 분석**: 변경된 SSOT 문서가 현재 작업 중인 태스크에 영향을 미치는지 판단

## 데몬 역할

- 데몬이 SSOT 파일 변경을 감지하면 `tsq compile build` 자동 실행 (기계적)
- Controller는 컴파일 결과만 확인하고, AI 판단이 필요한 문서 갱신은 Librarian에게 위임
