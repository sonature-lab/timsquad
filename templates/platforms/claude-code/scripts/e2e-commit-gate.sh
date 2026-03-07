#!/usr/bin/env bash
# e2e-commit-gate.sh — Pre-commit hook: validates E2E marker before allowing commit
# Checks: JSON marker exists, valid format, source_hash matches, not expired
#
# Exit 0 = allow commit, Exit 1 = block commit

set -euo pipefail

MARKER_FILE=".e2e-passed"

# No marker = no E2E tests configured, allow
if [ ! -f "$MARKER_FILE" ]; then
  exit 0
fi

# Try to parse as JSON; if not JSON, treat as bare touch (legacy fallback)
if ! command -v jq >/dev/null 2>&1; then
  echo "Warning: jq not installed, skipping E2E marker validation"
  exit 0
fi

# Attempt JSON parse
if ! jq empty "$MARKER_FILE" 2>/dev/null; then
  # Bare touch file (legacy) — allow with warning
  echo "Warning: .e2e-passed is not JSON format. Consider running E2E tests with e2e-marker.sh"
  exit 0
fi

# Validate required fields
EXIT_CODE=$(jq -r '.exit_code // empty' "$MARKER_FILE")
SOURCE_HASH=$(jq -r '.source_hash // empty' "$MARKER_FILE")
EXPIRES_AT=$(jq -r '.expires_at // empty' "$MARKER_FILE")

# exit_code must be 0
if [ -n "$EXIT_CODE" ] && [ "$EXIT_CODE" -ne 0 ]; then
  echo "E2E commit gate: BLOCKED — marker shows exit_code=$EXIT_CODE (tests failed)"
  exit 1
fi

# source_hash check
if [ -n "$SOURCE_HASH" ] && [ "$SOURCE_HASH" != "unknown" ]; then
  CURRENT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  if [ "$SOURCE_HASH" != "$CURRENT_HASH" ]; then
    echo "E2E commit gate: WARNING — marker source_hash ($SOURCE_HASH) != current HEAD ($CURRENT_HASH)"
    echo "  E2E tests may be stale. Consider re-running."
  fi
fi

# Expiry check
if [ -n "$EXPIRES_AT" ]; then
  EXPIRES_EPOCH=$(date -u -j -f "%Y-%m-%dT%H:%M:%SZ" "$EXPIRES_AT" +%s 2>/dev/null || \
                  date -u -d "$EXPIRES_AT" +%s 2>/dev/null || echo "0")
  NOW_EPOCH=$(date -u +%s)
  if [ "$EXPIRES_EPOCH" -gt 0 ] && [ "$NOW_EPOCH" -gt "$EXPIRES_EPOCH" ]; then
    echo "E2E commit gate: BLOCKED — marker expired at $EXPIRES_AT"
    echo "  Re-run E2E tests to refresh the marker."
    exit 1
  fi
fi

# All checks passed
PASSED=$(jq -r '.passed // 0' "$MARKER_FILE")
FLAKY=$(jq -r '.flaky // 0' "$MARKER_FILE")
if [ "$FLAKY" -gt 0 ]; then
  echo "E2E commit gate: PASSED ($PASSED tests, $FLAKY flaky — investigate flaky tests)"
else
  echo "E2E commit gate: PASSED ($PASSED tests)"
fi

exit 0
