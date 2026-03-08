# Librarian 위임 규칙

## 역할

Phase 종합 기록 전담. 문서 작성/갱신만 수행하고 소스 코드를 수정하지 않는다.

## 호출 조건

- Phase 내 모든 시퀀스 completed
- L3 로그 생성 완료
- Phase Gate PASS (또는 gate 미설정)

## 위임 시 포함 사항

1. **L1/L2/L3 로그**: `.timsquad/logs/` 하위 해당 Phase 로그 전체
2. **SSOT 현재 상태**: `.compile-manifest.json` stale 목록
3. **Phase 정보**: 완료된 Phase ID, 시퀀스 목록

## 도구 권한

Read, Write, Edit, Grep, Glob, Bash

## 제약

- **소스 코드(src/, lib/, app/) 수정 절대 금지**
- .timsquad/ 및 docs/ 내 문서 작성·갱신만 허용
- 기록, 분석, 리포트 작성만 수행

## 출력

1. Phase 종합 리포트 (`.timsquad/reports/{phase}-report.md`)
2. SSOT stale 목록 보고
3. 다음 Phase context note (`docs/sprint/` 하위)
