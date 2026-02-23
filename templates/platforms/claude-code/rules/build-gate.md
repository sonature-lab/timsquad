---
description: 빌드 게이트. 변경 파일의 TypeScript 에러를 자동 감지하여 완료 차단.
globs:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---

# 빌드 게이트 (Build Gate)

## 자동 검증

매 턴 종료 시 변경된 TypeScript 파일에 대해 `tsc --noEmit`을 실행합니다.
- 변경 파일에 에러가 있으면 **완료를 차단**하고 에러 목록을 제공
- 기존 파일의 pre-existing 에러는 무시 (변경 파일만 필터링)
- `stop_hook_active` 플래그로 1회만 차단 (무한루프 방지)

## 블로킹 수신 시 대응

`[Build Gate]` 블로킹 메시지를 받으면:
1. 제시된 TypeScript 에러를 확인하세요
2. 해당 파일을 열어 에러를 수정하세요
3. 수정 후 작업을 마무리하세요

## 참고

- 전체 `tsc --noEmit` 실행 (incremental 가능)
- 변경 파일 감지: `git diff --name-only HEAD -- '*.ts' '*.tsx'`
- 타임아웃: 30초
