---
name: tsq-delete
description: |
  TimSquad 프레임워크를 프로젝트에서 완전 제거. 모든 에이전트, 스킬, 훅, 룰 정리.
  Use when: /tsq-delete, "timsquad 제거", "tsq 삭제", "프레임워크 제거"
version: "1.0.0"
tags: [tsq, delete, remove, cleanup]
user-invocable: true
---

# /tsq-delete — Remove TimSquad

## Protocol

1. **사용자 확인**: 반드시 삭제 전 확인 요청
   ```
   TimSquad 프레임워크를 이 프로젝트에서 완전히 제거합니다.
   제거 대상:
   - .timsquad/ (설정, 로그, SSOT, 상태 전부)
   - .claude/skills/tsq-* (TimSquad 스킬)
   - .claude/agents/tsq-* (TimSquad 에이전트)
   - .claude/rules/ (TimSquad 룰)
   - .claude/scripts/ (TimSquad 훅 스크립트)
   - .claude/settings.json 내 TimSquad 훅
   - CLAUDE.md 내 TimSquad 블록

   보존됨:
   - CLAUDE.md (tsq 블록만 제거, 나머지 유지)
   - .claude/settings.json (tsq 훅만 제거, 나머지 유지)
   - 소스코드 (절대 변경 안 됨)

   계속하시겠습니까?
   ```

2. **제거 실행** (사용자 승인 후):

   a. **데몬 중지**:
      ```bash
      tsq daemon stop 2>/dev/null || true
      ```

   b. **스킬 제거**: `.claude/skills/tsq-*` 디렉토리 전부 삭제

   c. **에이전트 제거**: `.claude/agents/tsq-*` 파일 전부 삭제

   d. **룰 제거**: `.claude/rules/` 디렉토리 삭제

   e. **스크립트 제거**: `.claude/scripts/` 디렉토리 삭제

   f. **CLAUDE.md 정리**: `<!-- tsq:start -->` ~ `<!-- tsq:end -->` 블록 제거
      - 블록 제거 후 빈 줄 정리
      - 나머지 사용자 콘텐츠 보존

   g. **settings.json 정리**: hooks 내 tsq 관련 항목 제거
      - `.claude/scripts/` 경로 참조하는 훅 제거
      - 나머지 사용자 훅 보존

   h. **.timsquad 제거**: 전체 디렉토리 삭제 (마지막 단계)

3. **완료 보고**:
   ```
   TimSquad가 프로젝트에서 제거되었습니다.
   - 소스코드는 변경되지 않았습니다.
   - 재설치: npx timsquad init
   ```

## Safety

- 소스코드 (`src/`, `app/`, `lib/` 등)는 절대 변경하지 않음
- CLAUDE.md에서 tsq 블록만 제거, 나머지 보존
- settings.json에서 tsq 훅만 제거, 나머지 보존
- 반드시 사용자 확인 후 실행
