#!/usr/bin/env bash
# check-circular-deps.sh — planning.md DAG 순환 의존성 탐지
# Usage: bash .timsquad/scripts/check-circular-deps.sh [planning.md path]
# Output: JSON {verdict, cycles}
set -euo pipefail

PLANNING="${1:-.timsquad/ssot/planning.md}"

if [ ! -f "$PLANNING" ]; then
  echo '{"verdict":"skip","cycles":[],"reason":"planning.md not found"}'
  exit 0
fi

# Task ID와 depends_on 추출 (### Task 헤딩 + metadata)
declare -A DEPS
current_task=""

while IFS= read -r line; do
  if [[ "$line" =~ ^###[[:space:]]+.*\(([A-Z][0-9]+-S[0-9]+-T[0-9]+)\) ]]; then
    current_task="${BASH_REMATCH[1]}"
    DEPS["$current_task"]=""
  elif [[ -n "$current_task" && "$line" =~ depends_on:[[:space:]]*(.+) ]]; then
    DEPS["$current_task"]="${BASH_REMATCH[1]}"
  elif [[ "$line" =~ ^###[[:space:]] ]]; then
    current_task=""
  fi
done < "$PLANNING"

# Topological sort with cycle detection (Kahn's algorithm)
declare -A IN_DEGREE
declare -A ADJ

for task in "${!DEPS[@]}"; do
  [ -z "${IN_DEGREE[$task]+x}" ] && IN_DEGREE["$task"]=0
  IFS=',' read -ra dep_list <<< "${DEPS[$task]}"
  for dep in "${dep_list[@]}"; do
    dep=$(echo "$dep" | xargs)
    [ -z "$dep" ] && continue
    ADJ["$dep"]+="$task "
    IN_DEGREE["$task"]=$(( ${IN_DEGREE[$task]:-0} + 1 ))
    [ -z "${IN_DEGREE[$dep]+x}" ] && IN_DEGREE["$dep"]=0
  done
done

# BFS
queue=()
for task in "${!IN_DEGREE[@]}"; do
  [ "${IN_DEGREE[$task]}" -eq 0 ] && queue+=("$task")
done

sorted=0
i=0
while [ $i -lt ${#queue[@]} ]; do
  node="${queue[$i]}"
  ((i++))
  ((sorted++))
  for neighbor in ${ADJ[$node]:-}; do
    IN_DEGREE["$neighbor"]=$(( ${IN_DEGREE[$neighbor]} - 1 ))
    [ "${IN_DEGREE[$neighbor]}" -eq 0 ] && queue+=("$neighbor")
  done
done

total=${#IN_DEGREE[@]}

if [ "$total" -eq 0 ]; then
  echo '{"verdict":"skip","cycles":[],"reason":"no tasks with dependencies found"}'
  exit 0
fi

if [ "$sorted" -eq "$total" ]; then
  echo '{"verdict":"pass","cycles":[],"total_tasks":'"$total"'}'
  exit 0
else
  # Collect tasks in cycle
  cycle_tasks=()
  for task in "${!IN_DEGREE[@]}"; do
    [ "${IN_DEGREE[$task]}" -gt 0 ] && cycle_tasks+=("\"$task\"")
  done
  cycle_json=$(IFS=,; echo "${cycle_tasks[*]}")
  echo '{"verdict":"fail","cycles":['"$cycle_json"'],"total_tasks":'"$total"',"sorted":'"$sorted"'}'
  exit 1
fi
