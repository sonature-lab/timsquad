#!/usr/bin/env bash
# generate-prd-traceability.sh — planning.md ↔ PRD 추적성 매트릭스 생성
# Usage: bash .timsquad/scripts/generate-prd-traceability.sh [project_root]
# Output: .timsquad/reports/traceability-matrix.md
set -euo pipefail

ROOT="${1:-.}"
PRD="$ROOT/.timsquad/ssot/prd.md"
PLANNING="$ROOT/.timsquad/ssot/planning.md"
REPORT_DIR="$ROOT/.timsquad/reports"
OUTPUT="$REPORT_DIR/traceability-matrix.md"

if [ ! -f "$PRD" ]; then
  echo '{"status":"skip","reason":"prd.md not found"}'
  exit 0
fi

if [ ! -f "$PLANNING" ]; then
  echo '{"status":"skip","reason":"planning.md not found"}'
  exit 0
fi

mkdir -p "$REPORT_DIR"

# Extract PRD feature sections (## headings)
prd_features=()
while IFS= read -r line; do
  if [[ "$line" =~ ^##[[:space:]]+(.+) ]]; then
    prd_features+=("${BASH_REMATCH[1]}")
  fi
done < "$PRD"

# Extract planning tasks with their phase/sequence context
declare -A task_map
current_phase=""
current_seq=""

while IFS= read -r line; do
  if [[ "$line" =~ ^##[[:space:]]+Phase.*\(([A-Z][0-9]+)\) ]]; then
    current_phase="${BASH_REMATCH[1]}"
  elif [[ "$line" =~ ^##[[:space:]]+.+\(([A-Z][0-9]+-S[0-9]+)\) ]]; then
    current_seq="${BASH_REMATCH[1]}"
  elif [[ "$line" =~ ^###[[:space:]]+(.+)\(([A-Z][0-9]+-S[0-9]+-T[0-9]+)\) ]]; then
    task_title="${BASH_REMATCH[1]}"
    task_id="${BASH_REMATCH[2]}"
    task_map["$task_id"]="$current_phase | $current_seq | $task_title"
  fi
done < "$PLANNING"

# Generate traceability matrix
{
  echo "# PRD Traceability Matrix"
  echo ""
  echo "> Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo ""
  echo "| PRD Feature | Mapped Tasks | Coverage |"
  echo "|-------------|-------------|----------|"

  mapped=0
  total=${#prd_features[@]}

  for feature in "${prd_features[@]}"; do
    # Find tasks that reference this feature (case-insensitive partial match)
    feature_lower=$(echo "$feature" | tr '[:upper:]' '[:lower:]')
    matching_tasks=""

    for task_id in "${!task_map[@]}"; do
      task_lower=$(echo "${task_map[$task_id]}" | tr '[:upper:]' '[:lower:]')
      if [[ "$task_lower" == *"$feature_lower"* ]] || [[ "$feature_lower" == *"$task_lower"* ]]; then
        matching_tasks+="$task_id "
      fi
    done

    if [ -n "$matching_tasks" ]; then
      echo "| $feature | $(echo "$matching_tasks" | xargs | tr ' ' ', ') | Mapped |"
      ((mapped++))
    else
      echo "| $feature | — | **Unmapped** |"
    fi
  done

  echo ""
  if [ "$total" -gt 0 ]; then
    coverage=$((mapped * 100 / total))
    echo "**Coverage:** $mapped / $total ($coverage%)"
  else
    echo "**Coverage:** No PRD features found"
  fi
} > "$OUTPUT"

echo '{"status":"ok","output":"'"$OUTPUT"'","features":'"$total"',"mapped":'"$mapped"'}'
