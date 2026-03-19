#!/usr/bin/env bash
# Completion Report 스키마 검증 (A-2 CRITICAL Hook)
#
# 서브에이전트의 Completion Report 5필드 검증:
# Task, Status, Files, Tests, Notes
#
# 사용:
#   bash validate-completion-report.sh [project-root]
#   또는 다른 hook에서 source로 함수만 사용
#
# 반환:
#   0 = valid, 1 = invalid (누락 필드 정보 stderr 출력)

set -euo pipefail

validate_completion_report() {
  local project_root="${1:-.}"
  local context_file="$project_root/.timsquad/.daemon/task-context.json"
  local logs_dir="$project_root/.timsquad/logs"

  # task-context.json에서 현재 task ID 확인
  local task_id=""
  if [ -f "$context_file" ]; then
    task_id=$(jq -r '.taskId // ""' "$context_file" 2>/dev/null || echo "")
  fi

  # task ID가 없으면 파이프라인 외 실행 — 스킵
  if [ -z "$task_id" ]; then
    return 0
  fi

  # 최신 로그 파일에서 Completion Report 검색
  local latest_log=""
  if [ -d "$logs_dir" ]; then
    latest_log=$(find "$logs_dir" -name "*.md" -newer "$context_file" -type f 2>/dev/null | sort -r | head -1)
  fi

  # 로그 파일이 없으면 아직 보고서 미생성 — 경고만
  if [ -z "$latest_log" ]; then
    return 0
  fi

  local content
  content=$(cat "$latest_log")

  # 5필드 검증
  local missing=""
  echo "$content" | grep -qi 'Task:' || missing="${missing}Task, "
  echo "$content" | grep -qiE 'Status:\s*(pass|fail|blocked)' || missing="${missing}Status, "
  echo "$content" | grep -qi 'Files' || missing="${missing}Files, "
  echo "$content" | grep -qi 'Tests' || missing="${missing}Tests, "
  echo "$content" | grep -qi 'Notes' || missing="${missing}Notes, "

  if [ -n "$missing" ]; then
    missing="${missing%, }"
    echo "[Completion Report] 누락 필드: $missing. 5필드(Task, Status, Files, Tests, Notes)를 모두 포함해야 합니다." >&2
    return 1
  fi

  return 0
}

# 직접 실행 시
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  PROJECT_ROOT="${1:-.}"

  # Find project root
  # Canonicalize and validate project root
  if [ "$PROJECT_ROOT" = "." ]; then
    PROJECT_ROOT="$(pwd)"
    while [ "$PROJECT_ROOT" != "/" ]; do
      [ -d "$PROJECT_ROOT/.timsquad" ] && break
      PROJECT_ROOT="$(dirname "$PROJECT_ROOT")"
    done
  else
    PROJECT_ROOT=$(cd "$PROJECT_ROOT" 2>/dev/null && pwd || echo "")
  fi

  if [ ! -d "$PROJECT_ROOT/.timsquad" ]; then
    exit 0
  fi

  if ! validate_completion_report "$PROJECT_ROOT"; then
    exit 1
  fi
fi
