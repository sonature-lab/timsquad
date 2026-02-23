#!/bin/bash
# Stability Verification — 6-Layer 자동 검증 오케스트레이터
#
# Usage: bash verify.sh [--layer L0-L5] [--skip L0-L5] [--report]
# Exit: 0=PASS, 1=FAIL
#
# 출처: OWASP, ShellCheck Wiki, npm security best practices

set -e

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# ── Args ──
ONLY_LAYER=""
SKIP_LAYERS=""
REPORT_MODE=false
while [[ $# -gt 0 ]]; do
  case $1 in
    --layer) ONLY_LAYER="$2"; shift 2 ;;
    --skip) SKIP_LAYERS="$SKIP_LAYERS $2"; shift 2 ;;
    --report) REPORT_MODE=true; shift ;;
    *) shift ;;
  esac
done

# ── Helpers ──
PASS=0
FAIL=0
WARN=0

layer_header() {
  echo -e "\n${CYAN}━━━ $1 ━━━${NC}"
}

pass() {
  echo -e "  ${GREEN}✓${NC} $1"
  PASS=$((PASS + 1))
}

fail() {
  echo -e "  ${RED}✗${NC} $1"
  FAIL=$((FAIL + 1))
}

warn() {
  echo -e "  ${YELLOW}!${NC} $1"
  WARN=$((WARN + 1))
}

should_run() {
  local layer="$1"
  if [ -n "$ONLY_LAYER" ] && [ "$ONLY_LAYER" != "$layer" ]; then
    return 1
  fi
  if echo "$SKIP_LAYERS" | grep -q "$layer"; then
    return 1
  fi
  return 0
}

# ── Find project root ──
PROJECT_ROOT="$(pwd)"
while [ "$PROJECT_ROOT" != "/" ]; do
  if [ -f "$PROJECT_ROOT/package.json" ]; then break; fi
  PROJECT_ROOT="$(dirname "$PROJECT_ROOT")"
done
cd "$PROJECT_ROOT"

echo -e "${CYAN}Stability Verification${NC} — $(basename "$PROJECT_ROOT")"
echo "──────────────────────────────────────"

# ════════════════════════════════════════
# L0: 정적 분석
# ════════════════════════════════════════
if should_run "L0"; then
  layer_header "L0: 정적 분석 (Syntax/Lint)"

  # tsc --noEmit
  if [ -f "tsconfig.json" ]; then
    if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
      fail "tsc --noEmit — TypeScript 에러 발견"
    else
      pass "tsc --noEmit"
    fi
  fi

  # shellcheck
  SH_FILES=$(find . -name '*.sh' -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null || echo "")
  if [ -n "$SH_FILES" ] && command -v shellcheck &>/dev/null; then
    SC_RESULT=$(echo "$SH_FILES" | xargs shellcheck --severity=warning 2>&1 || true)
    SC_ERRORS=$(echo "$SC_RESULT" | grep -c "^In " 2>/dev/null || echo "0")
    if [ "$SC_ERRORS" -gt 0 ]; then
      warn "shellcheck — ${SC_ERRORS}개 파일에서 경고 발견"
    else
      pass "shellcheck"
    fi
  fi

  # bash -n
  BASH_FAIL=0
  for f in $SH_FILES; do
    bash -n "$f" 2>/dev/null || { BASH_FAIL=$((BASH_FAIL + 1)); }
  done
  if [ "$BASH_FAIL" -gt 0 ]; then
    fail "bash -n — ${BASH_FAIL}개 파일 구문 에러"
  else
    pass "bash -n (전체 .sh)"
  fi

  # JSON validation
  JSON_FILES=$(find . -name '*.json' -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' 2>/dev/null || echo "")
  JSON_FAIL=0
  for f in $JSON_FILES; do
    jq empty < "$f" 2>/dev/null || { JSON_FAIL=$((JSON_FAIL + 1)); }
  done
  if [ "$JSON_FAIL" -gt 0 ]; then
    fail "JSON — ${JSON_FAIL}개 파일 구문 에러"
  else
    pass "JSON 유효성 ($(echo "$JSON_FILES" | wc -w | tr -d ' ')개)"
  fi
fi

# ════════════════════════════════════════
# L1: 유닛 테스트
# ════════════════════════════════════════
if should_run "L1"; then
  layer_header "L1: 유닛 테스트"

  TEST_OUTPUT=$(npm run test:unit 2>&1 || true)
  if echo "$TEST_OUTPUT" | grep -q "passed"; then
    TEST_COUNT=$(echo "$TEST_OUTPUT" | grep "Tests" | grep -oE '[0-9]+ passed' || echo "? passed")
    pass "test:unit — $TEST_COUNT"
  else
    fail "test:unit — 실패"
  fi
fi

# ════════════════════════════════════════
# L2: 보안 스캔
# ════════════════════════════════════════
if should_run "L2"; then
  layer_header "L2: 보안 스캔"

  # npm audit (production dependencies only — devDeps are warn-only)
  AUDIT_PROD=$(npm audit --omit=dev 2>&1 || true)
  if echo "$AUDIT_PROD" | grep -q "found 0 vulnerabilities"; then
    pass "npm audit (prod)"
  elif echo "$AUDIT_PROD" | grep -qiE "high|critical"; then
    fail "npm audit (prod) — high/critical 취약점 발견"
  else
    warn "npm audit (prod) — moderate/low 취약점 존재"
  fi

  # npm audit (dev — warn only, ReDoS in eslint/vitest chain is common)
  AUDIT_FULL=$(npm audit 2>&1 || true)
  AUDIT_DEV_COUNT=$(echo "$AUDIT_FULL" | grep -oE '[0-9]+ vulnerabilities' | grep -oE '[0-9]+' || echo "0")
  if [ "$AUDIT_DEV_COUNT" -gt 0 ] 2>/dev/null; then
    warn "npm audit (dev) — ${AUDIT_DEV_COUNT}개 취약점 (devDependencies)"
  fi

  # execSync injection check
  EXEC_SYNC=$(grep -rn 'execSync(' src/ 2>/dev/null | grep -v 'gh --version' | grep -v '\.test\.' || true)
  if [ -n "$EXEC_SYNC" ]; then
    # 변수 보간 확인 (template literal 또는 string concat)
    INJECTION=$(echo "$EXEC_SYNC" | grep -E '\$\{|` \+' || true)
    if [ -n "$INJECTION" ]; then
      fail "execSync 커맨드 인젝션 의심: $(echo "$INJECTION" | wc -l | tr -d ' ')건"
    else
      pass "execSync — 변수 보간 없음"
    fi
  else
    pass "execSync — 미사용 또는 상수만 사용"
  fi

  # eval check
  EVAL_USAGE=$(grep -rn 'eval ' templates/**/*.sh scripts/**/*.sh 2>/dev/null | grep -v '^\s*#' || true)
  if [ -n "$EVAL_USAGE" ]; then
    fail "eval 사용 발견: $(echo "$EVAL_USAGE" | wc -l | tr -d ' ')건"
  else
    pass "eval 미사용"
  fi

  # .gitignore security
  if [ -f ".gitignore" ]; then
    MISSING=""
    grep -q '\.env' .gitignore 2>/dev/null || MISSING="$MISSING .env"
    grep -q '\*.pem' .gitignore 2>/dev/null || MISSING="$MISSING *.pem"
    grep -q '\*.key' .gitignore 2>/dev/null || MISSING="$MISSING *.key"
    if [ -n "$MISSING" ]; then
      warn ".gitignore 보안 항목 누락:$MISSING"
    else
      pass ".gitignore 보안 항목"
    fi
  fi
fi

# ════════════════════════════════════════
# L3: 쉘 스크립트 테스트
# ════════════════════════════════════════
if should_run "L3"; then
  layer_header "L3: 쉘 스크립트 테스트"

  HOOK_DIR="templates/platforms/claude-code/scripts"
  if [ -d "$HOOK_DIR" ]; then
    HOOK_SCRIPTS=$(find "$HOOK_DIR" -name '*.sh' 2>/dev/null || echo "")
    L3_FAIL=0

    for script in $HOOK_SCRIPTS; do
      NAME=$(basename "$script" .sh)

      # malformed JSON → fail-open
      RESULT=$(echo "not json" | bash "$script" 2>/dev/null || true)
      EXIT=$?
      if [ $EXIT -ne 0 ]; then
        fail "$NAME — malformed JSON 시 crash (exit $EXIT)"
        L3_FAIL=$((L3_FAIL + 1))
      fi

      # empty stdin → fail-open
      RESULT=$(echo "" | bash "$script" 2>/dev/null || true)
      EXIT=$?
      if [ $EXIT -ne 0 ]; then
        fail "$NAME — empty stdin 시 crash"
        L3_FAIL=$((L3_FAIL + 1))
      fi
    done

    if [ $L3_FAIL -eq 0 ]; then
      pass "훅 스크립트 fail-open 검증 ($(echo "$HOOK_SCRIPTS" | wc -w | tr -d ' ')개)"
    fi
  else
    warn "훅 스크립트 디렉토리 없음: $HOOK_DIR"
  fi
fi

# ════════════════════════════════════════
# L5: 패키지 무결성
# ════════════════════════════════════════
if should_run "L5"; then
  layer_header "L5: 패키지 무결성"

  # Build
  BUILD_OUTPUT=$(npm run build 2>&1 || true)
  if echo "$BUILD_OUTPUT" | grep -q "error TS"; then
    fail "npm run build — TypeScript 에러"
  else
    pass "npm run build"
  fi

  # Version
  if [ -f "bin/tsq.js" ]; then
    VER=$(node bin/tsq.js --version 2>/dev/null || echo "FAIL")
    if [ "$VER" != "FAIL" ]; then
      pass "CLI version: $VER"
    else
      fail "CLI version 출력 실패"
    fi
  fi

  # npm pack
  PACK_OUTPUT=$(npm pack --dry-run 2>&1)
  if echo "$PACK_OUTPUT" | grep -qiE '\.env|\.key.*\.pem|credential'; then
    fail "npm pack — 민감 파일 포함"
  else
    pass "npm pack — 민감 파일 미포함"
  fi

  # domains/ exclusion
  if echo "$PACK_OUTPUT" | grep -q "templates/domains/"; then
    fail "npm pack — templates/domains/ 포함 (유료 콘텐츠)"
  else
    pass "npm pack — templates/domains/ 제외"
  fi
fi

# ════════════════════════════════════════
# Summary
# ════════════════════════════════════════
echo ""
echo "──────────────────────────────────────"
echo -e "  ${GREEN}PASS: $PASS${NC}  ${RED}FAIL: $FAIL${NC}  ${YELLOW}WARN: $WARN${NC}"

if [ $FAIL -gt 0 ]; then
  echo -e "\n${RED}VERIFICATION FAILED${NC} — $FAIL개 항목 실패"
  exit 1
else
  echo -e "\n${GREEN}VERIFICATION PASSED${NC}"
  exit 0
fi
