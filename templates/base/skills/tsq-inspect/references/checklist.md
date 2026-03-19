---
title: Inspect Checklist
category: guide
---

# Inspect 상세 점검 체크리스트

## 1. Hook 정합성 — 실행 커맨드

```bash
# settings.json에서 등록된 스크립트 목록 추출
REGISTERED=$(grep '"command"' .claude/settings.json 2>/dev/null | \
  grep -oE 'scripts/[a-z-]+\.sh' | sort -u)

# 실제 스크립트 파일 목록
ACTUAL=$(ls .claude/scripts/*.sh 2>/dev/null | xargs -I{} basename {} | sort -u)

# 차이 비교
diff <(echo "$REGISTERED") <(echo "$ACTUAL")
```

**판정 기준:**
- 유령 Hook (등록 O, 파일 X) → **FAIL**
- 고아 스크립트 (등록 X, 파일 O) → **WARN** (유틸리티일 수 있음)
- Fail 전략: `|| true` 없으면 fail-closed, 있으면 fail-open

## 2. 스킬 정합성 — 실행 커맨드

```bash
# 전체 스킬 디렉토리
SKILLS=$(ls -d .claude/skills/tsq-*/ 2>/dev/null)

for SKILL_DIR in $SKILLS; do
  SKILL_FILE="$SKILL_DIR/SKILL.md"
  NAME=$(basename "$SKILL_DIR")

  # SKILL.md 존재 확인
  [ ! -f "$SKILL_FILE" ] && echo "FAIL: $NAME — SKILL.md 없음" && continue

  # Frontmatter 확인
  head -20 "$SKILL_FILE" | grep -q '^name:' || echo "WARN: $NAME — name 누락"
  head -20 "$SKILL_FILE" | grep -q '^description:' || echo "WARN: $NAME — description 누락"

  # 라인수 확인 (120줄 기준)
  LINES=$(wc -l < "$SKILL_FILE")
  [ "$LINES" -gt 120 ] && echo "WARN: $NAME — ${LINES}줄 (120줄 초과)"

  # references/ 포인터 검증 (한 줄씩 처리)
  grep -oE 'references/[a-zA-Z0-9_-]+\.md' "$SKILL_FILE" 2>/dev/null | sort -u | while IFS= read -r REF; do
    [ -z "$REF" ] && continue
    [ ! -f "$SKILL_DIR/$REF" ] && echo "FAIL: $NAME — $REF 파일 없음"
  done
done
```

## 3. CLI 정합성 — 실행 커맨드

```bash
# index.ts에서 import된 커맨드 파일
IMPORTED=$(grep "from './commands/" src/index.ts | \
  grep -oE "commands/[a-z]+\.js" | sed 's/\.js//' | sort)

# 실제 커맨드 파일
ACTUAL=$(ls src/commands/*.ts 2>/dev/null | \
  xargs -I{} basename {} .ts | sort)

# 비교
diff <(echo "$IMPORTED" | sed 's|commands/||') <(echo "$ACTUAL")
```

## 4. 문서 Drift — 점검 대상 패턴

문서에서 수치를 추출하는 정규식 패턴:

```
Hook 수:     /Hook[:\s]*(\d+)개/  또는  /(\d+)개.*Hook/
스킬 수:     /(\d+)개.*skill/i  또는  /스킬[:\s]*(\d+)/
테스트 수:   /(\d+)\s*테스트/  또는  /(\d+)\s*tests?/i
CLI 수:      /(\d+)개.*커맨드/  또는  /CLI[:\s]*(\d+)/
```

비교 대상 실제 수치:
- Hook: `grep -c '"command"' .claude/settings.json` ÷ 2 (중복 키 제거)
- 스킬: `ls -d .claude/skills/tsq-*/ | wc -l`
- 테스트: `npm test 2>&1 | grep -oE '\d+ passed'`
- CLI: `grep 'registerCommand' src/index.ts | wc -l` 또는 `node dist/index.js --help`

## 5. 테스트 커버리지 갭

```bash
# 소스 파일 목록 (테스트/설정 제외)
SRC_FILES=$(find src -name '*.ts' \
  -not -name '*.test.*' -not -name '*.spec.*' \
  -not -name '*.d.ts' -not -path '*/types/*')

for SRC in $SRC_FILES; do
  BASE=$(basename "$SRC" .ts)
  # 대응 테스트 파일 검색
  FOUND=$(find tests -name "${BASE}.test.*" -o -name "${BASE}.spec.*" 2>/dev/null | head -1)
  [ -z "$FOUND" ] && echo "GAP: $SRC — 테스트 없음"
done
```

## 6. 설정 일관성

```bash
# package.json version vs config.json framework_version
PKG_VER=$(jq -r '.version' package.json)
CFG_VER=$(jq -r '.project.framework_version // "없음"' .timsquad/config.json 2>/dev/null)
[ "$PKG_VER" != "$CFG_VER" ] && echo "WARN: 버전 불일치 pkg=$PKG_VER cfg=$CFG_VER"

# config stack vs actual dependencies
CONFIG_STACK=$(jq -r '.project.stack // [] | .[]' .timsquad/config.json 2>/dev/null)
for TECH in $CONFIG_STACK; do
  grep -q "\"$TECH\"" package.json 2>/dev/null || \
    echo "WARN: stack '$TECH'가 config에 있지만 dependencies에 없음"
done
```

## 7. 상태 파일 위생

```bash
STATE_DIR=".timsquad/state"

# 좀비 토큰
if [ -f "$STATE_DIR/controller-active" ]; then
  # 10분 이상 된 파일이면 좀비
  AGE=$(( $(date +%s) - $(stat -f %m "$STATE_DIR/controller-active" 2>/dev/null || echo 0) ))
  [ "$AGE" -gt 600 ] && echo "WARN: 좀비 controller-active (${AGE}초 전)"
fi

# Phase 동기화
if [ -f "$STATE_DIR/workflow.json" ] && [ -f "$STATE_DIR/current-phase.json" ]; then
  WF_PHASE=$(jq -r '.current_phase.id // "null"' "$STATE_DIR/workflow.json")
  CP_PHASE=$(jq -r '.current // "null"' "$STATE_DIR/current-phase.json")
  [ "$WF_PHASE" != "$CP_PHASE" ] && echo "FAIL: Phase 불일치 workflow=$WF_PHASE current=$CP_PHASE"
fi

# JSONL 검증
if [ -f "$STATE_DIR/decisions.jsonl" ]; then
  LINE_NUM=0
  while IFS= read -r line; do
    LINE_NUM=$((LINE_NUM + 1))
    echo "$line" | jq empty 2>/dev/null || echo "FAIL: decisions.jsonl 행 $LINE_NUM — 유효하지 않은 JSON"
  done < "$STATE_DIR/decisions.jsonl"
fi

# 잔여 임시 파일
TEMP=$(find "$STATE_DIR" -name "*.tmp" -o -name "*.bak" 2>/dev/null)
[ -n "$TEMP" ] && echo "WARN: 잔여 임시 파일: $TEMP"
```

## 자동 수정 가능 항목

사용자 동의 후 즉시 처리 가능한 항목:

| 항목 | 자동 수정 방법 |
|------|-------------|
| 좀비 controller-active | `rm .timsquad/state/controller-active` |
| 잔여 임시 파일 | `rm *.tmp *.bak` |
| Phase 불일치 | workflow.json 기준으로 current-phase.json 동기화 |
| 깨진 JSONL 행 | 해당 행 삭제 |
