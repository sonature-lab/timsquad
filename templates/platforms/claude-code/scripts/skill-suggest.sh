#!/bin/bash
# Skill Suggest — UserPromptSubmit Hook
# 사용자 프롬프트를 분석하여 관련 스킬을 제안한다.
# 키워드/패턴 매칭 기반, advisory only (블로킹 안 함).
#
# Input: JSON via stdin (Claude Code hook protocol, .prompt 필드 포함)
# Output: JSON with additionalContext (스킬 제안)

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

THRESHOLD=$(jq -r '.threshold // 4' "$RULES_FILE" 2>/dev/null || echo "4")
PROMPT_LOWER=$(echo "$PROMPT" | tr '[:upper:]' '[:lower:]')

# Match skills
MATCHES=""
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

  # Keyword matching (2 points each)
  KW_COUNT=$(jq ".rules[$i].keywords | length" "$RULES_FILE" 2>/dev/null)
  j=0
  while [ "$j" -lt "$KW_COUNT" ]; do
    KW=$(jq -r ".rules[$i].keywords[$j]" "$RULES_FILE" 2>/dev/null)
    if echo "$PROMPT_LOWER" | grep -qi -- "$KW" 2>/dev/null; then
      SCORE=$((SCORE + 2))
    fi
    j=$((j + 1))
  done

  # Pattern matching (4 points each)
  PAT_COUNT=$(jq ".rules[$i].patterns | length" "$RULES_FILE" 2>/dev/null)
  k=0
  while [ "$k" -lt "$PAT_COUNT" ]; do
    PAT=$(jq -r ".rules[$i].patterns[$k]" "$RULES_FILE" 2>/dev/null)
    if [ -n "$PAT" ] && echo "$PROMPT_LOWER" | grep -qiE -- "$PAT" 2>/dev/null; then
      SCORE=$((SCORE + 4))
    fi
    k=$((k + 1))
  done

  # Threshold check
  if [ "$SCORE" -ge "$THRESHOLD" ]; then
    if [ -n "$MATCHES" ]; then
      MATCHES="$MATCHES, $SKILL"
    else
      MATCHES="$SKILL"
    fi
  fi

  i=$((i + 1))
done

# Output suggestion if matches found
if [ -n "$MATCHES" ]; then
  SUGGESTION="[Skill Suggest] 관련 스킬이 감지되었습니다: $MATCHES. 해당 스킬의 rules/를 참조하면 더 높은 품질의 결과를 얻을 수 있습니다."
  jq -n --arg ctx "$SUGGESTION" '{
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: $ctx
    }
  }'
fi

exit 0
