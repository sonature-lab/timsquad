#!/bin/bash
# Build Gate — Stop Hook
# 변경된 TypeScript 파일에 tsc 에러가 있으면 완료를 차단한다.
# 변경 파일만 필터링하여 기존 에러는 무시.
#
# Input: JSON via stdin (Claude Code hook protocol)
# Output: JSON with decision (block) or empty

set -e

# ── 0. Stop hook loop prevention ──
INPUT=$(cat 2>/dev/null || echo "")
STOP_HOOK_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false' 2>/dev/null || echo "false")
if [ "$STOP_HOOK_ACTIVE" = "true" ]; then
  exit 0
fi

# Find project root
PROJECT_ROOT="$(pwd)"
while [ "$PROJECT_ROOT" != "/" ]; do
  if [ -d "$PROJECT_ROOT/.timsquad" ]; then
    break
  fi
  PROJECT_ROOT="$(dirname "$PROJECT_ROOT")"
done

if [ ! -d "$PROJECT_ROOT/.timsquad" ]; then
  exit 0
fi

# ── 1. Get changed TypeScript files ──
cd "$PROJECT_ROOT"
CHANGED_TS=$(git diff --name-only --diff-filter=ACMR HEAD -- '*.ts' '*.tsx' 2>/dev/null || echo "")

# No TypeScript files changed → pass
if [ -z "$CHANGED_TS" ]; then
  exit 0
fi

# ── 2. Run tsc --noEmit ──
TSC_OUTPUT=$(npx tsc --noEmit 2>&1 || true)

# tsc passed → allow stop
if [ -z "$TSC_OUTPUT" ]; then
  exit 0
fi

# ── 3. Filter errors to changed files only ──
RELEVANT_ERRORS=""
while IFS= read -r file; do
  # tsc 에러 형식: src/foo.ts(12,5): error TS2345: ...
  FILE_ERRORS=$(echo "$TSC_OUTPUT" | grep -F -- "$file" 2>/dev/null || true)
  if [ -n "$FILE_ERRORS" ]; then
    RELEVANT_ERRORS="${RELEVANT_ERRORS}${FILE_ERRORS}
"
  fi
done <<< "$CHANGED_TS"

# No errors in changed files → pre-existing errors, ignore
if [ -z "$RELEVANT_ERRORS" ]; then
  exit 0
fi

# ── 4. Block with error details ──
# 에러 수 계산
ERROR_COUNT=$(echo "$RELEVANT_ERRORS" | grep -c "error TS" 2>/dev/null || echo "0")

REASON="[Build Gate] 변경된 파일에 TypeScript 에러 ${ERROR_COUNT}개가 있습니다. 수정 후 완료하세요.

${RELEVANT_ERRORS}"

jq -n --arg reason "$REASON" '{"decision": "block", "reason": $reason}'
exit 0
