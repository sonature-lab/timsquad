#!/usr/bin/env bash
# detect-env.sh — 프로젝트 환경 감지 유틸리티 (공용)
# 다른 hook 스크립트에서 source로 함수만 사용
#
# Usage:
#   source .claude/scripts/detect-env.sh
#   has_test_framework && echo "테스트 가능"
#   TSC=$(find_tsc) && $TSC --noEmit

# ── has_test_framework() ──
# 프로젝트에 테스트 프레임워크가 설치되어 있는지 감지
# Returns: 0 = found, 1 = not found
# Stdout: framework name (vitest|jest|mocha|pytest|flutter_test)
has_test_framework() {
  local project_root="${1:-$(pwd)}"

  # Node.js — package.json 기반
  if [ -f "$project_root/package.json" ]; then
    local deps
    deps=$(cat "$project_root/package.json")

    if echo "$deps" | grep -q '"vitest"'; then
      echo "vitest"
      return 0
    fi
    if echo "$deps" | grep -q '"jest"'; then
      echo "jest"
      return 0
    fi
    if echo "$deps" | grep -q '"mocha"'; then
      echo "mocha"
      return 0
    fi
  fi

  # Python — pytest
  if [ -f "$project_root/pyproject.toml" ] || [ -f "$project_root/setup.py" ]; then
    if command -v pytest &>/dev/null || [ -f "$project_root/.venv/bin/pytest" ]; then
      echo "pytest"
      return 0
    fi
  fi

  # Flutter
  if [ -f "$project_root/pubspec.yaml" ]; then
    if grep -q 'flutter_test' "$project_root/pubspec.yaml" 2>/dev/null; then
      echo "flutter_test"
      return 0
    fi
  fi

  return 1
}

# ── find_tsc() ──
# 모노레포 내 tsc 위치를 정확하게 탐색
# Returns: 0 = found, 1 = not found
# Stdout: tsc 실행 경로
find_tsc() {
  local project_root="${1:-$(pwd)}"

  # 1. 프로젝트 로컬 node_modules
  if [ -x "$project_root/node_modules/.bin/tsc" ]; then
    echo "$project_root/node_modules/.bin/tsc"
    return 0
  fi

  # 2. 모노레포: 상위 디렉토리 탐색
  local search_dir="$project_root"
  while [ "$search_dir" != "/" ]; do
    if [ -x "$search_dir/node_modules/.bin/tsc" ]; then
      echo "$search_dir/node_modules/.bin/tsc"
      return 0
    fi
    search_dir=$(dirname "$search_dir")
  done

  # 3. npx --no-install (잘못된 패키지 설치 방지)
  if npx --no-install tsc --version &>/dev/null; then
    echo "npx --no-install tsc"
    return 0
  fi

  # 4. 글로벌
  if command -v tsc &>/dev/null; then
    echo "tsc"
    return 0
  fi

  return 1
}

# ── get_project_type() ──
# config.yaml에서 프로젝트 타입 읽기
# Returns: 0 = found, 1 = not found
# Stdout: project type (web-service|web-app|api-backend|...)
get_project_type() {
  local project_root="${1:-$(pwd)}"
  local config="$project_root/.timsquad/config.json"

  if [ -f "$config" ]; then
    jq -r '.project.type // ""' "$config" 2>/dev/null
    return 0
  fi

  return 1
}

# ── get_current_phase() ──
# workflow 상태에서 현재 Phase ID 읽기
# Returns: 0 = found, 1 = not found
# Stdout: phase ID (planning|implementation|...)
get_current_phase() {
  local project_root="${1:-$(pwd)}"
  local phase_file="$project_root/.timsquad/state/current-phase.json"

  if [ -f "$phase_file" ]; then
    jq -r '.current // .current_phase // "unknown"' "$phase_file" 2>/dev/null
    return 0
  fi

  echo "unknown"
  return 1
}
