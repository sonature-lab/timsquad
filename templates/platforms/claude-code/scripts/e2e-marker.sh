#!/usr/bin/env bash
# e2e-marker.sh — E2E 테스트 결과를 JSON 마커로 기록
# 용도: PostToolUse 훅에서 E2E 테스트 완료 후 호출
# 출력: .e2e-passed (JSON)

set -euo pipefail

MARKER_FILE=".e2e-passed"
EXPIRY_HOURS="${E2E_MARKER_EXPIRY_HOURS:-24}"

# 인자: exit_code passed failed flaky
EXIT_CODE="${1:-0}"
PASSED="${2:-0}"
FAILED="${3:-0}"
FLAKY="${4:-0}"

# exit_code != 0 이면 마커 미생성
if [ "$EXIT_CODE" -ne 0 ]; then
  rm -f "$MARKER_FILE"
  echo "E2E failed (exit_code=$EXIT_CODE) — marker removed"
  exit 0
fi

# source_hash: 현재 소스의 git short hash
SOURCE_HASH=""
if command -v git >/dev/null 2>&1; then
  SOURCE_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
fi

# timestamp & expiry
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
if [[ "$OSTYPE" == "darwin"* ]]; then
  EXPIRES_AT=$(date -u -v+"${EXPIRY_HOURS}"H +"%Y-%m-%dT%H:%M:%SZ")
else
  EXPIRES_AT=$(date -u -d "+${EXPIRY_HOURS} hours" +"%Y-%m-%dT%H:%M:%SZ")
fi

# JSON 마커 생성
cat > "$MARKER_FILE" <<MARKER
{
  "timestamp": "$TIMESTAMP",
  "exit_code": $EXIT_CODE,
  "passed": $PASSED,
  "failed": $FAILED,
  "flaky": $FLAKY,
  "source_hash": "$SOURCE_HASH",
  "expires_at": "$EXPIRES_AT"
}
MARKER

echo "E2E marker created: $PASSED passed, $FAILED failed, $FLAKY flaky"
