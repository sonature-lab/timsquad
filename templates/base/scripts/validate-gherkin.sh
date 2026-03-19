#!/usr/bin/env bash
# validate-gherkin.sh — BDD feature 파일 구문 검증
# Usage: bash .timsquad/scripts/validate-gherkin.sh [features_dir]
# Output: JSON {valid, errors, total_files}
set -euo pipefail

FEATURES_DIR="${1:-features}"

if [ ! -d "$FEATURES_DIR" ]; then
  echo '{"valid":true,"errors":[],"total_files":0,"reason":"features directory not found"}'
  exit 0
fi

errors=()
total=0

while IFS= read -r file; do
  ((total++))
  line_num=0
  has_feature=false
  has_scenario=false
  in_scenario=false
  step_order=""  # track Given/When/Then order

  while IFS= read -r line; do
    ((line_num++))
    trimmed=$(echo "$line" | sed 's/^[[:space:]]*//')

    # Skip empty lines and comments
    [[ -z "$trimmed" || "$trimmed" == \#* ]] && continue

    # Feature keyword
    if [[ "$trimmed" =~ ^Feature:[[:space:]]*.+ ]]; then
      has_feature=true
      continue
    fi

    # Scenario / Scenario Outline
    if [[ "$trimmed" =~ ^(Scenario|Scenario\ Outline):[[:space:]]*.+ ]]; then
      has_scenario=true
      in_scenario=true
      step_order=""
      continue
    fi

    # Step keywords
    if [[ "$trimmed" =~ ^(Given|When|Then|And|But)[[:space:]]+ ]]; then
      keyword="${BASH_REMATCH[1]}"
      if [[ "$keyword" == "Given" ]]; then
        if [[ "$step_order" == *"Then"* ]]; then
          errors+=("{\"file\":\"$file\",\"line\":$line_num,\"msg\":\"Given after Then\"}")
        fi
        step_order+="Given "
      elif [[ "$keyword" == "When" ]]; then
        step_order+="When "
      elif [[ "$keyword" == "Then" ]]; then
        step_order+="Then "
      fi
      continue
    fi

    # Examples keyword (only valid in Scenario Outline)
    if [[ "$trimmed" =~ ^Examples: ]]; then
      continue
    fi

    # Table rows
    if [[ "$trimmed" =~ ^\| ]]; then
      continue
    fi

    # Tags
    if [[ "$trimmed" =~ ^@ ]]; then
      continue
    fi

    # Background
    if [[ "$trimmed" =~ ^Background: ]]; then
      continue
    fi

    # Rule (Gherkin 6)
    if [[ "$trimmed" =~ ^Rule:[[:space:]]*.+ ]]; then
      continue
    fi

    # Doc strings
    if [[ "$trimmed" == '"""' || "$trimmed" == '```' ]]; then
      continue
    fi

  done < "$file"

  # Validate structure
  if ! $has_feature; then
    errors+=("{\"file\":\"$file\",\"line\":1,\"msg\":\"Missing Feature keyword\"}")
  fi
  if ! $has_scenario; then
    errors+=("{\"file\":\"$file\",\"line\":1,\"msg\":\"No Scenario defined\"}")
  fi

done < <(find "$FEATURES_DIR" -name '*.feature' -type f | sort)

# Build JSON output
if [ ${#errors[@]} -eq 0 ]; then
  echo '{"valid":true,"errors":[],"total_files":'"$total"'}'
  exit 0
else
  error_json=$(printf '%s,' "${errors[@]}")
  error_json="[${error_json%,}]"
  echo '{"valid":false,"errors":'"$error_json"',"total_files":'"$total"'}'
  exit 1
fi
