#!/usr/bin/env bash
# cleanup-trails.sh — trail 아카이브 10개 초과 시 자동 정리
# Usage: bash .timsquad/scripts/cleanup-trails.sh [project_root] [max_count]
# Output: JSON {archived, remaining}
set -euo pipefail

ROOT="${1:-.}"
MAX_COUNT="${2:-10}"
TRAILS_DIR="$ROOT/.timsquad/trails"
ARCHIVE_DIR="$TRAILS_DIR/.archive"

if [ ! -d "$TRAILS_DIR" ]; then
  echo '{"archived":0,"remaining":0,"reason":"trails directory not found"}'
  exit 0
fi

# Count trail files (exclude .archive directory)
trail_files=()
while IFS= read -r -d '' f; do
  trail_files+=("$f")
done < <(find "$TRAILS_DIR" -maxdepth 1 -type f -print0 | sort -z)

count=${#trail_files[@]}

if [ "$count" -le "$MAX_COUNT" ]; then
  echo '{"archived":0,"remaining":'"$count"'}'
  exit 0
fi

# Archive oldest files beyond MAX_COUNT
to_archive=$((count - MAX_COUNT))
archive_month=$(date -u +%Y-%m)
archive_dest="$ARCHIVE_DIR/$archive_month"
mkdir -p "$archive_dest"

archived=0
for ((i=0; i<to_archive; i++)); do
  file="${trail_files[$i]}"
  mv "$file" "$archive_dest/"
  ((archived++))
done

remaining=$((count - archived))
echo '{"archived":'"$archived"',"remaining":'"$remaining"',"archive_path":"'"$archive_dest"'"}'
