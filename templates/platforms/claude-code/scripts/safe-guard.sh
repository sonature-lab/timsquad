#!/bin/bash
# Safe Guard — PreToolUse Hook (Bash)
# Blocks or escalates destructive shell commands.
#
# Input: JSON via stdin (Claude Code hook protocol)
# Output: JSON with permissionDecision (allow/deny/ask)

set -e

# Read hook input from stdin (non-blocking)
INPUT=""
if read -t 1 -r line; then
  INPUT="$line"
fi

# Fail-open: no input → allow
if [ -z "$INPUT" ]; then
  echo '{"hookSpecificOutput":{"permissionDecision":"allow"}}'
  exit 0
fi

# Extract command from tool input
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null || echo "")

if [ -z "$COMMAND" ] || [ "$COMMAND" = "null" ]; then
  echo '{"hookSpecificOutput":{"permissionDecision":"allow"}}'
  exit 0
fi

# ── DENY: Hard block (exit 0 + permissionDecision deny) ──

# Root deletion
if echo "$COMMAND" | grep -qE 'rm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+|.*--force\s+)/*$|rm\s+-rf\s+/\s'; then
  echo '{"hookSpecificOutput":{"permissionDecision":"deny"},"systemMessage":"[Safe Guard] 루트 디렉토리 삭제 명령이 차단되었습니다."}'
  exit 0
fi

# git push --force to main/master
if echo "$COMMAND" | grep -qiE 'git\s+push\s+.*--force.*\s+(main|master)|git\s+push\s+-f\s+.*\s+(main|master)'; then
  echo '{"hookSpecificOutput":{"permissionDecision":"deny"},"systemMessage":"[Safe Guard] main/master 브랜치에 force push가 차단되었습니다. 일반 push를 사용하세요."}'
  exit 0
fi

# git reset --hard
if echo "$COMMAND" | grep -qE 'git\s+reset\s+--hard'; then
  echo '{"hookSpecificOutput":{"permissionDecision":"deny"},"systemMessage":"[Safe Guard] git reset --hard가 차단되었습니다. 커밋되지 않은 변경사항이 유실될 수 있습니다."}'
  exit 0
fi

# SQL destructive operations
if echo "$COMMAND" | grep -qiE 'DROP\s+(TABLE|DATABASE|SCHEMA)|TRUNCATE\s+TABLE'; then
  echo '{"hookSpecificOutput":{"permissionDecision":"deny"},"systemMessage":"[Safe Guard] 파괴적 SQL 명령이 차단되었습니다. 데이터 유실 위험이 있습니다."}'
  exit 0
fi

# chmod 777
if echo "$COMMAND" | grep -qE 'chmod\s+777'; then
  echo '{"hookSpecificOutput":{"permissionDecision":"deny"},"systemMessage":"[Safe Guard] chmod 777이 차단되었습니다. 최소 권한 원칙을 따르세요."}'
  exit 0
fi

# ── ASK: Escalate to user confirmation ──

# npm publish
if echo "$COMMAND" | grep -qE 'npm\s+publish'; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"npm publish는 패키지를 공개 배포합니다. 계속하시겠습니까?"}}'
  exit 0
fi

# git push to main/master (non-force)
if echo "$COMMAND" | grep -qiE 'git\s+push\s+.*\s+(main|master)|git\s+push\s+(main|master)'; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"main/master 브랜치에 push합니다. 계속하시겠습니까?"}}'
  exit 0
fi

# rm -rf (non-root, general)
if echo "$COMMAND" | grep -qE 'rm\s+(-[a-zA-Z]*r[a-zA-Z]*f|.*-rf)\s'; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"재귀적 삭제 명령입니다. 대상을 확인해주세요."}}'
  exit 0
fi

# ── Default: allow ──
echo '{"hookSpecificOutput":{"permissionDecision":"allow"}}'
