#!/usr/bin/env bash
# manage-fp-registry.sh — audit False Positive 자동 필터링
# Usage: bash .timsquad/scripts/manage-fp-registry.sh [project_root]
#        bash .timsquad/scripts/manage-fp-registry.sh . add "pattern-id"
#        bash .timsquad/scripts/manage-fp-registry.sh . exclude "pattern-id"
# Output: JSON fp-registry
set -euo pipefail

ROOT="${1:-.}"
ACTION="${2:-scan}"
PATTERN_ID="${3:-}"
REGISTRY="$ROOT/.timsquad/retrospective/fp-registry.json"
RETRO_DIR="$ROOT/.timsquad/retrospective"

if ! command -v jq &>/dev/null; then
  echo '{"error":"jq is required"}' >&2
  exit 1
fi

# Initialize registry if missing
if [ ! -f "$REGISTRY" ]; then
  mkdir -p "$RETRO_DIR"
  echo '{"patterns":[],"excluded":[]}' > "$REGISTRY"
fi

case "$ACTION" in
  scan)
    # Scan retrospective cycles for repeated feedback patterns
    CYCLES_DIR="$RETRO_DIR/cycles"
    if [ ! -d "$CYCLES_DIR" ]; then
      cat "$REGISTRY"
      exit 0
    fi

    # Count feedback pattern occurrences across cycles
    pattern_counts=$(find "$CYCLES_DIR" -name '*.json' -type f -exec \
      jq -r '.problem[]? // empty' {} \; 2>/dev/null | \
      sort | uniq -c | sort -rn | head -20)

    # Update registry: patterns with 3+ occurrences → candidate FP
    while IFS= read -r line; do
      [ -z "$line" ] && continue
      count=$(echo "$line" | awk '{print $1}')
      pattern=$(echo "$line" | sed 's/^[[:space:]]*[0-9]*[[:space:]]*//')
      [ "$count" -lt 3 ] && continue

      # Add/update in registry
      existing=$(jq -r --arg p "$pattern" '.patterns[] | select(.id == $p) | .id' "$REGISTRY" 2>/dev/null)
      if [ -z "$existing" ]; then
        jq --arg p "$pattern" --argjson c "$count" \
          '.patterns += [{"id": $p, "count": $c, "last_occurrence": (now | todate)}]' \
          "$REGISTRY" > "$REGISTRY.tmp" && mv "$REGISTRY.tmp" "$REGISTRY"
      else
        jq --arg p "$pattern" --argjson c "$count" \
          '(.patterns[] | select(.id == $p)) |= (.count = $c | .last_occurrence = (now | todate))' \
          "$REGISTRY" > "$REGISTRY.tmp" && mv "$REGISTRY.tmp" "$REGISTRY"
      fi
    done <<< "$pattern_counts"

    cat "$REGISTRY"
    ;;

  add)
    [ -z "$PATTERN_ID" ] && { echo '{"error":"pattern id required"}' >&2; exit 1; }
    jq --arg p "$PATTERN_ID" \
      'if (.patterns | map(.id) | index($p)) then . else .patterns += [{"id": $p, "count": 1, "last_occurrence": (now | todate)}] end' \
      "$REGISTRY" > "$REGISTRY.tmp" && mv "$REGISTRY.tmp" "$REGISTRY"
    cat "$REGISTRY"
    ;;

  exclude)
    [ -z "$PATTERN_ID" ] && { echo '{"error":"pattern id required"}' >&2; exit 1; }
    jq --arg p "$PATTERN_ID" \
      'if (.excluded | index($p)) then . else .excluded += [$p] end' \
      "$REGISTRY" > "$REGISTRY.tmp" && mv "$REGISTRY.tmp" "$REGISTRY"
    cat "$REGISTRY"
    ;;

  *)
    echo '{"error":"unknown action: '"$ACTION"'. Use scan|add|exclude"}' >&2
    exit 1
    ;;
esac
