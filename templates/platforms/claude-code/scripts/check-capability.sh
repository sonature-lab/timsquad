#!/usr/bin/env bash
# Hook Gate: controller capability token 검증
# PreToolUse (Write|Edit) — controller 미경유 시 차단
#
# 동작:
# 1. controller-active 파일 없으면 → deny
# 2. allowed-paths.txt에 없는 파일이면 → deny
# 3. .timsquad/ 내부 파일은 항상 허용

set -euo pipefail

STATE_DIR=".timsquad/state"
ACTIVE_FILE="$STATE_DIR/controller-active"
ALLOWED_FILE="$STATE_DIR/allowed-paths.txt"

# Read tool input from stdin
INPUT=$(cat 2>/dev/null || echo "")
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"//' | sed 's/"$//')

# No file path → allow (not a file operation)
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# .timsquad/ internal files → always allow
if [[ "$FILE_PATH" == *".timsquad/"* ]]; then
  exit 0
fi

# .claude/ internal files → always allow
if [[ "$FILE_PATH" == *".claude/"* ]]; then
  exit 0
fi

# No state directory → pipeline not active, allow (no enforcement)
if [ ! -d "$STATE_DIR" ]; then
  exit 0
fi

# Controller active check
if [ ! -f "$ACTIVE_FILE" ]; then
  # Controller not active → allow without enforcement
  # (enforcement only when pipeline is explicitly started)
  exit 0
fi

# Allowed paths check
if [ -f "$ALLOWED_FILE" ]; then
  MATCH=0
  while IFS= read -r pattern; do
    [ -z "$pattern" ] && continue
    # shellcheck disable=SC2254
    case "$FILE_PATH" in
      $pattern) MATCH=1; break ;;
    esac
  done < "$ALLOWED_FILE"

  if [ "$MATCH" -eq 0 ]; then
    # File not in allowed paths → deny
    PATTERNS=$(tr '\n' ', ' < "$ALLOWED_FILE")
    jq -n --arg msg "작업 범위 밖 파일입니다. controller가 허용한 파일만 수정할 수 있습니다. 허용 패턴: $PATTERNS" \
      '{"hookSpecificOutput":{"permissionDecision":"deny"},"systemMessage":$msg}'
    exit 0
  fi
fi

# All checks passed
exit 0
