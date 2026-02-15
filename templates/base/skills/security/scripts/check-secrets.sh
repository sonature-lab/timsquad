#!/bin/bash
# @name check-secrets
# @description 하드코딩된 시크릿/토큰/비밀번호를 소스코드에서 스캔
# @args [PROJECT_ROOT] (기본: 현재 디렉토리)
# @output text (발견된 파일:라인 목록 또는 "No secrets found")

set -euo pipefail

PROJECT_ROOT="${1:-.}"
FOUND=0

echo "Scanning for hardcoded secrets in: $PROJECT_ROOT"
echo "================================================"

# Pattern 1: API keys, tokens, secrets in assignments
echo ""
echo "## Hardcoded API Keys / Tokens"
if grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" --include="*.go" \
  -E "(api_key|apiKey|API_KEY|secret|SECRET|token|TOKEN|password|PASSWORD)\s*[:=]\s*['\"][^'\"]{8,}" \
  "$PROJECT_ROOT/src" "$PROJECT_ROOT/app" "$PROJECT_ROOT/lib" 2>/dev/null | \
  grep -v "node_modules" | grep -v ".test." | grep -v "__mock__" | grep -v "example" | grep -v "placeholder"; then
  FOUND=1
else
  echo "  (none found)"
fi

# Pattern 2: .env files committed
echo ""
echo "## Committed .env Files"
if find "$PROJECT_ROOT" -name ".env" -o -name ".env.local" -o -name ".env.production" 2>/dev/null | \
  grep -v "node_modules" | grep -v ".example"; then
  FOUND=1
else
  echo "  (none found)"
fi

# Pattern 3: Private keys
echo ""
echo "## Private Keys"
if grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.pem" --include="*.key" \
  -l "PRIVATE KEY" "$PROJECT_ROOT" 2>/dev/null | grep -v "node_modules"; then
  FOUND=1
else
  echo "  (none found)"
fi

echo ""
echo "================================================"
if [ "$FOUND" -eq 1 ]; then
  echo "WARNING: Potential secrets found. Review above results."
  exit 1
else
  echo "No secrets found."
  exit 0
fi
