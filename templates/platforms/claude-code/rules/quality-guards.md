---
description: 품질 가드 시스템. 파괴적 명령 차단, 페이즈 제한, 완료 검증.
globs:
  - "**/*"
---

# 품질 가드 시스템 (Quality Guards)

## 가드 목록

### 1. Safe Guard (PreToolUse/Bash)
Bash 명령 실행 전 파괴적 명령을 차단합니다.

**차단 (DENY)**:
- `rm -rf /` — 루트 삭제
- `git push --force` (main/master) — force push
- `git reset --hard` — 커밋되지 않은 변경 유실
- `DROP TABLE`, `TRUNCATE TABLE` — 데이터 파괴
- `chmod 777` — 보안 위반

**확인 요청 (ASK)**:
- `npm publish` — 패키지 배포
- `git push` (main/master) — 메인 브랜치 push
- `rm -rf` (일반) — 재귀 삭제

### 2. Phase Guard (PreToolUse/Write|Edit)
페이즈에 따라 파일 수정을 제한합니다.

- **planning/design**: `src/`, `lib/`, `app/` 등 코드 수정 차단
- **implementation**: `.timsquad/ssot/` 직접 수정 차단

### 3. Completion Guard (Stop)
매 턴 종료 시 세션 컨텍스트를 주입하고, 필요 시 경고합니다.

- 세션 상태 (턴, 도구, 에이전트, 파일) 주입
- implementation phase에서 테스트 미실행 경고
- 컨텍스트 윈도우 85% 이상 시 경고

## 가드가 차단한 경우

1. **DENY된 경우**: 차단 사유를 확인하고 안전한 대안을 사용하세요
2. **ASK로 에스컬레이션된 경우**: 사용자에게 확인을 요청합니다
3. **Phase 제한인 경우**: 현재 페이즈에 맞는 작업을 수행하세요
