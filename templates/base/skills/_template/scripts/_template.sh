#!/bin/bash
# @name {script-name}
# @description {이 스크립트가 하는 일 1줄}
# @args {필요한 인자 설명}
# @output {출력 형식 (text | json | exit-code)}

set -euo pipefail

# ─────────────────────────────────────
# 설정
# ─────────────────────────────────────
PROJECT_ROOT="${1:-.}"

# ─────────────────────────────────────
# 실행
# ─────────────────────────────────────

echo "Running {script-name}..."

# TODO: 스크립트 로직 작성

echo "Done."

# ─────────────────────────────────────
# 스크립트 작성 가이드:
# - set -euo pipefail 필수 (안전 실행)
# - 외부 URL 호출 금지 (보안)
# - 헤더 메타데이터 필수: @name, @description, @args, @output
# - 에이전트가 Bash로 실행 (컨텍스트에 로드하지 않음 → 토큰 0)
# - 파일명: {verb}-{noun}.sh (예: check-secrets.sh, validate-schema.sh)
# ─────────────────────────────────────
