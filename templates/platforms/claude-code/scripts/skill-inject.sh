#!/bin/bash
# Skill Inject — UserPromptSubmit Hook
# 사용자 프롬프트를 분석하여 매칭 스킬의 Contract/Protocol/Verification을
# systemMessage로 강제 주입한다 (advisory → mandatory 전환).
#
# 기존 skill-suggest.sh를 대체 (상위 호환).
# Input: JSON via stdin (Claude Code hook protocol, .prompt 필드 포함)
# Output: JSON with systemMessage (스킬 강제 주입)

set -e

# Read hook input
INPUT=$(cat 2>/dev/null || echo "")
if [ -z "$INPUT" ]; then
  exit 0
fi

PROMPT=$(echo "$INPUT" | jq -r '.prompt // ""' 2>/dev/null || echo "")
if [ -z "$PROMPT" ] || [ "$PROMPT" = "null" ]; then
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

# Load skill rules
RULES_FILE="$PROJECT_ROOT/.claude/scripts/skill-rules.json"
if [ ! -f "$RULES_FILE" ]; then
  exit 0
fi

THRESHOLD=$(jq -r '.threshold // 2' "$RULES_FILE" 2>/dev/null || echo "2")
PROMPT_LOWER=$(echo "$PROMPT" | tr '[:upper:]' '[:lower:]')

# Match skills and collect top matches with scores
declare -a MATCH_SKILLS=()
declare -a MATCH_SCORES=()

RULE_COUNT=$(jq '.rules | length' "$RULES_FILE" 2>/dev/null || echo "0")

i=0
while [ "$i" -lt "$RULE_COUNT" ]; do
  SKILL=$(jq -r ".rules[$i].skill" "$RULES_FILE" 2>/dev/null)
  SCORE=0

  # Check if skill is deployed
  SKILL_DIR="$PROJECT_ROOT/.claude/skills/$SKILL"
  if [ ! -d "$SKILL_DIR" ]; then
    i=$((i + 1))
    continue
  fi

  # Keyword matching (3 points each)
  KW_COUNT=$(jq ".rules[$i].keywords | length" "$RULES_FILE" 2>/dev/null || echo "0")
  j=0
  while [ "$j" -lt "$KW_COUNT" ]; do
    KW=$(jq -r ".rules[$i].keywords[$j]" "$RULES_FILE" 2>/dev/null)
    if echo "$PROMPT_LOWER" | grep -qi -- "$KW" 2>/dev/null; then
      SCORE=$((SCORE + 3))
    fi
    j=$((j + 1))
  done

  # Pattern matching (5 points each)
  PAT_COUNT=$(jq ".rules[$i].patterns | length" "$RULES_FILE" 2>/dev/null || echo "0")
  k=0
  while [ "$k" -lt "$PAT_COUNT" ]; do
    PAT=$(jq -r ".rules[$i].patterns[$k]" "$RULES_FILE" 2>/dev/null)
    if [ -n "$PAT" ] && echo "$PROMPT_LOWER" | grep -qiE -- "$PAT" 2>/dev/null; then
      SCORE=$((SCORE + 5))
    fi
    k=$((k + 1))
  done

  # Threshold check
  if [ "$SCORE" -ge "$THRESHOLD" ]; then
    MATCH_SKILLS+=("$SKILL")
    MATCH_SCORES+=("$SCORE")
  fi

  i=$((i + 1))
done

# No matches
if [ ${#MATCH_SKILLS[@]} -eq 0 ]; then
  exit 0
fi

# Sort by score descending and take top 3
SORTED_INDICES=$(
  for idx in "${!MATCH_SCORES[@]}"; do
    echo "${MATCH_SCORES[$idx]} $idx"
  done | sort -rn | head -3 | awk '{print $2}'
)

# Extract Contract + Protocol + Verification sections from matched skills
INJECTION=""
CHAR_COUNT=0
MAX_CHARS=1500

for idx in $SORTED_INDICES; do
  SKILL="${MATCH_SKILLS[$idx]}"
  SKILL_FILE="$PROJECT_ROOT/.claude/skills/$SKILL/SKILL.md"

  if [ ! -f "$SKILL_FILE" ]; then
    continue
  fi

  # Extract key sections (Contract + Protocol + Verification)
  SECTIONS=$(awk '
    /^## Contract/ { capture=1; next }
    /^## Protocol/ { capture=1; next }
    /^## Verification/ { capture=1; next }
    /^## / { capture=0 }
    capture { print }
  ' "$SKILL_FILE" 2>/dev/null | head -20)

  if [ -z "$SECTIONS" ]; then
    continue
  fi

  ENTRY="[Skill: $SKILL] $SECTIONS"
  ENTRY_LEN=${#ENTRY}

  if [ $((CHAR_COUNT + ENTRY_LEN)) -gt "$MAX_CHARS" ]; then
    break
  fi

  if [ -n "$INJECTION" ]; then
    INJECTION="$INJECTION
---
$ENTRY"
  else
    INJECTION="$ENTRY"
  fi
  CHAR_COUNT=$((CHAR_COUNT + ENTRY_LEN))
done

# Output as systemMessage (mandatory injection)
if [ -n "$INJECTION" ]; then
  jq -n --arg msg "$INJECTION" '{
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      systemMessage: $msg
    }
  }'
fi

exit 0
