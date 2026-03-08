#!/bin/bash
# Generate Skill Injection Matrix from skill-rules.json
# Usage: ./scripts/generate-injection-matrix.sh [project-dir]
# Output: Markdown table of skill × keyword/pattern mappings

set -e

PROJECT_ROOT="${1:-.}"
RULES_FILE="$PROJECT_ROOT/.claude/scripts/skill-rules.json"

if [ ! -f "$RULES_FILE" ]; then
  echo "Error: $RULES_FILE not found" >&2
  exit 1
fi

THRESHOLD=$(jq -r '.threshold // 2' "$RULES_FILE")
RULE_COUNT=$(jq '.rules | length' "$RULES_FILE")

echo "# Skill Injection Matrix"
echo ""
echo "Generated: $(date '+%Y-%m-%d %H:%M')"
echo "Source: \`$RULES_FILE\`"
echo "Threshold: $THRESHOLD"
echo ""
echo "| Skill | Keywords | Patterns | Min Score |"
echo "|-------|----------|----------|-----------|"

i=0
while [ "$i" -lt "$RULE_COUNT" ]; do
  SKILL=$(jq -r ".rules[$i].skill" "$RULES_FILE")
  KEYWORDS=$(jq -r ".rules[$i].keywords | join(\", \")" "$RULES_FILE")
  PATTERNS=$(jq -r ".rules[$i].patterns | join(\", \")" "$RULES_FILE")

  KW_COUNT=$(jq ".rules[$i].keywords | length" "$RULES_FILE")
  PAT_COUNT=$(jq ".rules[$i].patterns | length" "$RULES_FILE")
  MAX_SCORE=$(( KW_COUNT * 3 + PAT_COUNT * 5 ))

  echo "| $SKILL | $KEYWORDS | $PATTERNS | $THRESHOLD / $MAX_SCORE |"
  i=$((i + 1))
done

echo ""
echo "**Scoring**: Keywords = 3pts each, Patterns = 5pts each"
