#!/usr/bin/env bash
# count-hooks.sh — settings.json Hook 정합성 자동 점검
# Output: JSON {total_commands, scripts_referenced, orphan_scripts, missing_scripts}
set -euo pipefail

SETTINGS="templates/platforms/claude-code/settings.json"
SCRIPTS_DIR="templates/platforms/claude-code/scripts"

if [ ! -f "$SETTINGS" ]; then
  echo '{"error":"settings.json not found"}'
  exit 1
fi

# Extract all .sh script references from settings.json
referenced=$(grep -oE '[a-zA-Z_-]+\.sh' "$SETTINGS" | sort -u)

# Count total command entries
total_commands=$(python3 -c "
import json
data = json.load(open('$SETTINGS'))
hooks = data.get('hooks', {})
count = 0
for event, entries in hooks.items():
    for entry in entries:
        for h in entry.get('hooks', []):
            count += 1
print(count)
")

# Check each referenced script exists
missing=()
for script in $referenced; do
  if [ ! -f "$SCRIPTS_DIR/$script" ]; then
    missing+=("$script")
  fi
done

# Find orphan scripts (exist but not referenced, not sourced by others)
orphans=()
if [ -d "$SCRIPTS_DIR" ]; then
  for file in "$SCRIPTS_DIR"/*.sh; do
    [ ! -f "$file" ] && continue
    basename=$(basename "$file")
    if ! echo "$referenced" | grep -qF "$basename"; then
      # Check if sourced by another script
      if ! grep -rl "source.*$basename\|\..*$basename" "$SCRIPTS_DIR"/*.sh 2>/dev/null | grep -qv "$file"; then
        orphans+=("$basename")
      fi
    fi
  done
fi

# Build JSON output
if [ ${#missing[@]} -gt 0 ]; then
  missing_json=$(printf '"%s",' "${missing[@]}" | sed 's/,$//')
else
  missing_json=""
fi
if [ ${#orphans[@]} -gt 0 ]; then
  orphan_json=$(printf '"%s",' "${orphans[@]}" | sed 's/,$//')
else
  orphan_json=""
fi

echo "{\"total_commands\":$total_commands,\"scripts_referenced\":$(echo "$referenced" | wc -w | tr -d ' '),\"missing_scripts\":[${missing_json}],\"orphan_scripts\":[${orphan_json}]}"
