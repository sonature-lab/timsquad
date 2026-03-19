#!/usr/bin/env bash
# Hook Gate: controller capability token 검증 + 에이전트별 경로 제한
# PreToolUse (Write|Edit) — controller 미경유 시 차단
#
# 동작:
# 1. controller-active 파일 없으면 → deny (파이프라인 활성 시)
# 2. allowed-paths.txt에 없는 파일이면 → deny
# 3. 에이전트별 경로 제한 (librarian: src/ 차단 등)
# 4. .timsquad/ .claude/ 내부 파일은 항상 허용

set -euo pipefail

STATE_DIR=".timsquad/state"
ACTIVE_FILE="$STATE_DIR/controller-active"
ALLOWED_FILE="$STATE_DIR/allowed-paths.txt"
CONTEXT_FILE=".timsquad/.daemon/task-context.json"

# Read tool input from stdin
INPUT=$(cat 2>/dev/null || echo "")
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"//' | sed 's/"$//')

# No file path → allow (not a file operation)
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Normalize: strip leading ./ and resolve .. to prevent bypass
FILE_PATH=$(echo "$FILE_PATH" | sed 's|^\./||; s|/\./|/|g')
# Block paths containing .. (path traversal)
if echo "$FILE_PATH" | grep -q '\.\.'; then
  jq -n '{"hookSpecificOutput":{"permissionDecision":"deny"},"systemMessage":"[Security] 상대 경로(..)는 허용되지 않습니다."}'
  exit 0
fi

# .timsquad/ internal files → allow only if path STARTS with .timsquad/
if [[ "$FILE_PATH" == .timsquad/* ]]; then
  exit 0
fi

# .claude/ internal files → allow only if path STARTS with .claude/
if [[ "$FILE_PATH" == .claude/* ]]; then
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

# ── A-1: Allowed paths check (Capability Token 자동 검증) ──
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
    jq -n --arg patterns "$PATTERNS" \
      '{"hookSpecificOutput":{"permissionDecision":"deny"},"systemMessage":("[Capability Gate] 작업 범위 밖 파일입니다. controller가 허용한 파일만 수정할 수 있습니다. 허용 패턴: " + $patterns)}'
    exit 0
  fi
fi

# ── A-3: 에이전트별 경로 제한 ──
# task-context.json에서 현재 에이전트 타입 읽기
AGENT_TYPE=""
if [ -f "$CONTEXT_FILE" ]; then
  AGENT_TYPE=$(jq -r '.agent // ""' "$CONTEXT_FILE" 2>/dev/null || echo "")
fi

# Librarian: src/, lib/, app/ 수정 금지 (기록자가 코드를 수정하면 역할 위반)
if [ "$AGENT_TYPE" = "librarian" ]; then
  if echo "$FILE_PATH" | grep -qE '(^|/)src/|(^|/)lib/|(^|/)app/'; then
    jq -n '{"hookSpecificOutput":{"permissionDecision":"deny"},"systemMessage":"[Agent Gate] Librarian은 소스 코드(src/, lib/, app/)를 수정할 수 없습니다. 문서/기록 파일만 수정하세요."}'
    exit 0
  fi
fi

# QA / Architect: 읽기 전용 에이전트 — Write/Edit 자체를 차단
if [ "$AGENT_TYPE" = "qa" ] || [ "$AGENT_TYPE" = "architect" ]; then
  jq -n --arg agent "$AGENT_TYPE" '{"hookSpecificOutput":{"permissionDecision":"deny"},"systemMessage":("[Agent Gate] " + $agent + " 에이전트는 읽기 전용입니다. 파일을 수정할 수 없습니다.")}'
  exit 0
fi

# All checks passed
exit 0
