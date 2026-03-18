# Pipeline Hardening — 상세 작업 계획

> 기준: `docs/sprint/pipeline-hardening-plan.md` (교차 리뷰 반영 v2)

## Phase 1: SKILL.md + Hook (TypeScript 변경 없음)

---

### Task 1: TDD Gate 강화 [1-B]

**파일**: `templates/platforms/claude-code/scripts/completion-guard.sh`
**위치**: 기존 `# ── 1. Test execution gate ──` 섹션 (Line 37~78)
**변경 내용**:

현재 로직:
- `bashCommands === 0`이면 소스 변경 감지 → implementation phase에서만 block

추가할 로직 (기존 block 조건 아래에):
```bash
# ── 1b. TDD gate: 소스 변경 시 테스트 파일도 변경되었는지 확인 ──
if [ "$PHASE" = "implementation" ] && [ -z "$BLOCK_REASON" ]; then
  # staged + unstaged + untracked 전부 수집
  ALL_CHANGED=$(cd "$PROJECT_ROOT" && {
    git diff --cached --name-only --diff-filter=ACMR 2>/dev/null
    git diff --name-only --diff-filter=ACMR 2>/dev/null
    git ls-files --others --exclude-standard 2>/dev/null
  } | sort -u | grep -E '\.(ts|tsx|js|jsx)$')

  SRC_CHANGED=$(echo "$ALL_CHANGED" | grep -vE '\.(test|spec)\.' | grep -v '__tests__/' | head -5)
  TEST_CHANGED=$(echo "$ALL_CHANGED" | grep -E '\.(test|spec)\.' | head -1)

  if [ -n "$SRC_CHANGED" ] && [ -z "$TEST_CHANGED" ]; then
    # Completion Report에 refactor-only 명시 여부 확인 (escape hatch)
    NOTES_ESCAPE=$(echo "$INPUT" | jq -r '.transcript // ""' 2>/dev/null | grep -ci 'refactor-only' || echo "0")
    if [ "$NOTES_ESCAPE" -eq 0 ] 2>/dev/null; then
      BLOCK_REASON="[TDD Gate] 소스 파일이 변경되었으나 테스트 파일(.test./.spec.)이 없습니다. 테스트를 먼저 작성하세요. (리팩토링만 한 경우 Notes에 'refactor-only' 명시)"
    fi
  fi
fi
```

**검증**: `npm test` 통과 (기존 664 테스트에 영향 없음 — 이건 런타임 hook)

---

### Task 2: 모델 필드 전달 [1-D]

**파일**: `templates/base/skills/tsq-controller/SKILL.md`
**위치**: Protocol Step 10 (Line 36)
**변경 내용**:

현재:
```
10. **Task() 호출**: 조합된 프롬프트로 서브에이전트 실행
```

변경:
```
10. **Task() 호출**: 조합된 프롬프트로 서브에이전트 실행. 에이전트 파일의 `model` 필드가 있으면 Task()의 model 파라미터로 전달 (예: model: sonnet → 빠른 모델, model: opus → 정밀 모델)
```

**검증**: 변경 없는 마크다운 수정, 테스트 불필요

---

### Task 3: 멱등성 재개 [1-C']

**파일**: `templates/base/skills/tsq-controller/SKILL.md`
**위치**: task-complete 트리거 Step 5 (Line 56) 아래
**변경 내용**:

현재:
```
5. **미완료 시**: 다음 태스크 위임
```

변경:
```
5. **미완료 시**: 다음 태스크 위임. planning.md의 해당 Task 산출물(출력 파일)이 이미 존재하면 스킵하고 그 다음 Task로 진행 (세션 재개 시 중복 작업 방지)
```

**검증**: 마크다운 수정, 테스트 불필요

---

### Task 4: SSOT Plan Validator [1-A]

**파일 1**: `templates/base/skills/tsq-decompose/SKILL.md`
**위치**: Step 6 (Line 88~98) 과 Step 7 (Line 100~105) 사이
**추가할 내용**:

```markdown
### Step 6.5: Plan Review (자동)

planning.md 생성 후, Controller에 Plan Reviewer 위임을 요청한다.
Reviewer는 fork 컨텍스트(독립 판단)로 다음을 검증:

1. **Sub-PRD 커버리지**: 모든 Sub-PRD의 Must-Have 요구사항이 최소 1개 Task에 매핑되었는가
2. **DAG 무결성**: 선행 Task 없이 참조하는 Task가 없는가 (의존성 누락)
3. **Task 크기**: 각 Task가 "1 에이전트 1 세션"에 완료 가능한 범위인가
4. **Phase 배치**: 의존성 순서가 Phase 순서와 일치하는가

Reviewer 결과(이슈 목록 + 수정 제안)를 Step 7 Human Checkpoint에서 함께 제시한다.
이슈가 없으면 바로 Human Checkpoint 진행. 이슈가 있으면 사용자에게 수정 여부 확인.
```

**파일 2**: `templates/base/skills/tsq-controller/SKILL.md`
**위치**: Delegation Rules (Line 41~45) 뒤에 추가
**추가할 내용**:

```markdown
**Plan Reviewer** — 실행 계획 검증 (읽기 전용, fork 컨텍스트). 도구: Read, Grep, Glob. 출력: 커버리지/의존성/크기 검증 리포트.
```

**검증**: 마크다운 수정, 테스트 불필요

---

### Task 5: Spec Compliance 경고 [1-E]

**파일**: `templates/base/skills/tsq-controller/SKILL.md`
**위치**: sequence-complete 트리거 (Line 58~62), Step 3과 4 사이
**추가할 내용**:

현재 sequence-complete:
```
1. 통합 게이트
2. L2 로그 확인
3. 문서 갱신 체크
4. Phase 완료 판정
```

3과 4 사이에 삽입:
```markdown
3.5. **Spec Compliance 체크**: 해당 Sequence의 Sub-PRD Must-Have 목록과 완료된 Task 산출물을 대조. 누락 항목이 있으면 경고 표시 (block 아님 — 다른 Sequence나 Phase에서 처리 가능). 경고 내용을 L2 로그에 기록.
```

**검증**: 마크다운 수정, 테스트 불필요

---

## Phase 2: TypeScript 변경 포함

---

### Task 6: 토큰 메트릭 표시 [2-B']

**파일 1**: `templates/base/skills/tsq-status/SKILL.md`
**위치**: 요약 출력 섹션 (Line 20~28)
**변경 내용**:

출력 템플릿에 추가:
```
- Tokens (est): {input + output from session-state} ({cache hit rate}%)
```

**파일 2**: `src/daemon/session-state.ts` — 변경 불필요
이미 `tokenInput`, `tokenOutput`, `tokenCacheRead` 필드가 누적되고 있음 (Line 108~112).
`/tsq-status` 스킬이 `.timsquad/.daemon/session-state.json`을 읽어서 표시하면 됨.

**실제 작업**: tsq-status SKILL.md에 session-state.json 읽기 프로토콜 추가 (2줄)

**검증**: 마크다운 수정 위주, 기존 테스트 영향 없음

---

### Task 7: SSOT Drift Detection [2-F]

**파일 1**: `src/daemon/event-queue.ts`
**변경 내용**: 이벤트 처리에 drift 체크 추가 (~20줄)

```typescript
// git diff로 변경된 소스 파일 목록 추출
// SSOT 문서의 last_reviewed (frontmatter 또는 git log) 비교
// 7일 이상 미갱신 문서를 drift-warnings.json에 기록
```

**파일 2**: `templates/base/skills/tsq-status/SKILL.md`
**추가**: drift-warnings.json 존재 시 경고 표시
```
- SSOT Drift: {count} documents outdated ({list})
```

**파일 3**: `templates/base/skills/tsq-librarian/SKILL.md`
**추가**: Protocol Step 3 (SSOT 상태 확인) 에서 drift-warnings.json도 참조, carry-over에 기록

**검증**: event-queue.ts 변경 시 관련 테스트 추가 필요 (현재 테스트 유무 확인 후)

---

## 체크리스트

### Phase 1 완료 기준
- [x] completion-guard.sh TDD gate 추가 + 기존 테스트 통과
- [x] Controller Step 10에 model 전달 지시 추가
- [x] Controller task-complete Step 5에 멱등성 재개 추가
- [x] tsq-decompose Step 6.5 Plan Review 추가
- [x] Controller Delegation Rules에 Plan Reviewer 추가
- [x] Controller sequence-complete에 Spec Compliance 경고 추가
- [x] 전체 테스트 통과 (664+)

### Phase 2 완료 기준
- [x] tsq-status에 토큰 메트릭 표시 추가
- [x] event-queue.ts에 drift detection 로직 추가
- [x] tsq-status에 drift warning 표시 추가
- [x] tsq-librarian에 drift carry-over 추가
- [x] drift detection 단위 테스트 추가
- [x] 전체 테스트 통과

### 최종 검증
- [x] `npm test` 전체 통과
- [x] `npm run build` 성공
- [x] 변경 파일 목록 리뷰 (SKILL.md + Hook + TS만)
