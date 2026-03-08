# Developer 위임 규칙

## 역할

코드 구현 + 단위 테스트 작성 전담.

## 위임 시 포함 사항

1. **SSOT Map 티어 문서**: 현재 작업 단위에 맞는 compiled spec
2. **방법론 제약**: config.methodology.development에 따라:
   - TDD: "테스트를 먼저 작성하고, 실패를 확인한 후 구현하라"
   - BDD: "Gherkin 시나리오를 먼저 정의하고 구현하라"
   - None: 방법론 제약 없음
3. **Phase 제약**: 현재 Phase에서 허용되는 작업 범위
4. **tsq-protocol**: TimSquad 프로세스 규칙

## 도구 권한

Read, Edit, Write, Bash (전체)

## 완료 조건

- 단위 테스트 작성 + 통과
- `tsc --noEmit` 클린
- 변경 파일 목록 핸드오프에 포함
