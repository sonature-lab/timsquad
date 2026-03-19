#!/usr/bin/env bash
# TDD Guard — PreToolUse(Write|Edit) Hook
# 구현 파일 Write 전 대응하는 테스트 파일이 존재하는지 확인
# methodology.development = "tdd" 일 때만 활성화
#
# 이유: TDD에서 Red→Green→Refactor 순서를 강제.
# 테스트 없이 구현을 먼저 작성하면 "테스트를 나중에" 쓰게 되고 결국 안 쓴다.

set -e

INPUT=$(cat 2>/dev/null || echo "")
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // ""' 2>/dev/null || echo "")

if [ -z "$FILE_PATH" ] || [ "$FILE_PATH" = "null" ]; then
  exit 0
fi

# Find project root
PROJECT_ROOT="$(pwd)"
while [ "$PROJECT_ROOT" != "/" ]; do
  [ -d "$PROJECT_ROOT/.timsquad" ] && break
  PROJECT_ROOT="$(dirname "$PROJECT_ROOT")"
done

[ ! -d "$PROJECT_ROOT/.timsquad" ] && exit 0

# TDD methodology 확인
CONFIG="$PROJECT_ROOT/.timsquad/config.json"
if [ -f "$CONFIG" ]; then
  METHODOLOGY=$(jq -r '.methodology.development // "none"' "$CONFIG" 2>/dev/null || echo "none")
  if [ "$METHODOLOGY" != "tdd" ]; then
    exit 0
  fi
fi

# 테스트/설정 파일은 스킵
REL_PATH="${FILE_PATH#"$PROJECT_ROOT"/}"
case "$REL_PATH" in
  *.test.*|*.spec.*|*__tests__/*|*.config.*|*.d.ts) exit 0 ;;
esac

# 소스 코드 파일만 대상
if ! echo "$REL_PATH" | grep -qE '\.(ts|tsx|js|jsx)$'; then
  exit 0
fi

# 대응하는 테스트 파일 존재 확인
BASE_NAME=$(basename "$REL_PATH" | sed 's/\.[^.]*$//')
FOUND_TEST=$(find "$PROJECT_ROOT" -name "${BASE_NAME}.test.*" -o -name "${BASE_NAME}.spec.*" 2>/dev/null | head -1)

if [ -z "$FOUND_TEST" ]; then
  jq -n --arg file "$REL_PATH" --arg base "$BASE_NAME" \
    '{"systemMessage":("[TDD Gate] " + $file + "에 대응하는 테스트 파일(" + $base + ".test.*)이 없습니다. TDD: 테스트를 먼저 작성하세요.")}'
  exit 0
fi

exit 0
