#!/usr/bin/env bash
# Stale Guard — PreToolUse(Write|Edit) Hook
# SSOT compile-manifest 신선도 검증
# .compile-manifest.json의 hash와 현재 SSOT 파일 hash 비교
# stale이면 systemMessage로 경고 (block 아님 — 개발 흐름 방해 최소화)

set -e

INPUT=$(cat 2>/dev/null || echo "")
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // ""' 2>/dev/null || echo "")

[ -z "$FILE_PATH" ] || [ "$FILE_PATH" = "null" ] && exit 0

# 소스 코드 파일만 대상
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx) ;;
  *) exit 0 ;;
esac

# Find project root
PROJECT_ROOT="$(pwd)"
while [ "$PROJECT_ROOT" != "/" ]; do
  [ -d "$PROJECT_ROOT/.timsquad" ] && break
  PROJECT_ROOT="$(dirname "$PROJECT_ROOT")"
done
[ ! -d "$PROJECT_ROOT/.timsquad" ] && exit 0

MANIFEST="$PROJECT_ROOT/.claude/skills/tsq-controller/references/.compile-manifest.json"
[ ! -f "$MANIFEST" ] && exit 0

# manifest의 compiledAt과 SSOT 파일 최신 수정 비교
COMPILED_AT=$(jq -r '.compiledAt // ""' "$MANIFEST" 2>/dev/null || echo "")
[ -z "$COMPILED_AT" ] && exit 0

SSOT_DIR="$PROJECT_ROOT/.timsquad/ssot"
[ ! -d "$SSOT_DIR" ] && exit 0

# SSOT 디렉토리에서 manifest 이후 수정된 파일 찾기
STALE_FILES=$(find "$SSOT_DIR" -name "*.md" -newer "$MANIFEST" -type f 2>/dev/null | head -3)

if [ -n "$STALE_FILES" ]; then
  STALE_LIST=$(echo "$STALE_FILES" | xargs -I{} basename {} | tr '\n' ', ' | sed 's/,$//')
  jq -n --arg files "$STALE_LIST" \
    '{"systemMessage":("[Stale Spec] SSOT 문서가 마지막 컴파일 이후 변경되었습니다: " + $files + ". `tsq compile`을 실행하여 spec을 갱신하세요.")}'
fi

exit 0
