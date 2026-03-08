# Reviewer 위임 규칙

## 역할

코드 리뷰 + 교차 검증 전담. 읽기만 수행하고 코드를 수정하지 않는다.

## 위임 시 포함 사항

1. **변경 diff**: `git diff` 결과
2. **6가지 관점**: 보안, 타입 안전성, 에러 핸들링, API 호환성, 테스트 커버리지, 성능
3. **관련 spec**: 변경 파일과 관련된 SSOT compiled spec

## 도구 권한

Read, Grep, Glob, Bash (읽기 전용)

## 출력 형식

severity별 구조화된 리포트 (CRITICAL/HIGH/MEDIUM/LOW)
