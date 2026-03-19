#!/usr/bin/env bash
# calculate-retro-metrics.sh — L1 태스크 로그 → metrics.json 집계
# Usage: bash .timsquad/scripts/calculate-retro-metrics.sh [project_root]
# Output: JSON metrics to stdout + .timsquad/retrospective/metrics/latest.json
set -euo pipefail

ROOT="${1:-.}"
LOGS_DIR="$ROOT/.timsquad/logs/tasks"
METRICS_DIR="$ROOT/.timsquad/retrospective/metrics"

if [ ! -d "$LOGS_DIR" ]; then
  echo '{"total":0,"reason":"no task logs found"}'
  exit 0
fi

# Check jq availability
if ! command -v jq &>/dev/null; then
  echo '{"error":"jq is required but not installed"}' >&2
  exit 1
fi

# Aggregate metrics from all L1 task log JSON files
metrics=$(find "$LOGS_DIR" -name '*.json' -type f | while read -r f; do
  jq -c '{
    status: (.status // "unknown"),
    agent: (.agent // "unknown"),
    duration_ms: (.duration_ms // 0),
    files_changed: ((.mechanical.files // []) | length)
  }' "$f" 2>/dev/null || true
done | jq -s '{
  total: length,
  success_count: [.[] | select(.status == "completed" or .status == "success")] | length,
  failure_count: [.[] | select(.status == "failure" or .status == "error")] | length,
  partial_count: [.[] | select(.status == "partial")] | length,
  avg_duration_ms: (if length > 0 then ([.[].duration_ms] | add / length | floor) else 0 end),
  total_files_changed: ([.[].files_changed] | add // 0),
  agent_distribution: (group_by(.agent) | map({key: .[0].agent, value: length}) | from_entries),
  success_rate: (if length > 0 then (([.[] | select(.status == "completed" or .status == "success")] | length) * 100 / length | floor) else 0 end),
  generated_at: (now | todate)
}')

# Save to file
mkdir -p "$METRICS_DIR"
echo "$metrics" | jq '.' > "$METRICS_DIR/latest.json"

echo "$metrics"
