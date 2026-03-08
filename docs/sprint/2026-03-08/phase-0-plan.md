# Phase 0 — Foundation (기반 구축) 상세 계획

**승인일**: 2026-03-08
**목표**: Custom Slash Commands 추가 + CLAUDE.md 인덱스 전환
**대상 이슈**: #18 (S/0.5d), #19 (S/0.5d)
**예상 공수**: 0.5d (최적 병렬)
**진입 조건**: 이전 스프린트(2026-03-07) 완료

---

## 역할 배치

| 역할 | 담당 | 근거 |
|------|------|------|
| Developer | #18, #19 | 템플릿 파일 작성 + CLAUDE.md 리팩토링 |
| Reviewer | 교차 검증 | 커맨드 프롬프트 품질, CLAUDE.md 인덱스 완전성 |
| QA | DoD 체크리스트 | tsq init 정상 동작, 기존 테스트 회귀 없음 |

---

## Issue #18 — Custom Slash Commands (user-invocable 스킬)

### 18-A. /spec 스킬 (스펙 확인 차단)

- **현재 상태**: Custom slash command 0개. 모든 스킬 `user-invocable: false`
- **작업**:
  1. `templates/base/skills/spec/SKILL.md` 신규 생성 (`user-invocable: true`)
  2. Contract: SSOT 문서 존재 확인 → 미존재 시 구현 차단 메시지
  3. Protocol: 1) SSOT 디렉토리 확인 → 2) stale 여부 확인 → 3) 결과 안내
  4. Verification: SSOT 파일 존재 + compile-manifest hash 일치
  5. `$ARGUMENTS`로 대상 기능/태스크 지정 가능
- **검증**: `/spec login` 실행 시 SSOT 존재 여부에 따른 분기 확인
- **생성**: `templates/base/skills/spec/SKILL.md`

### 18-B. /audit 스킬 (자기감사)

- **작업**:
  1. `templates/base/skills/audit/SKILL.md` 신규 생성 (`user-invocable: true`)
  2. Contract: 현재 변경 파일 기반 관련 스킬 Verification 실행 + tsq audit validate
  3. Protocol: 1) 변경 파일 감지 → 2) 관련 스킬 매칭 → 3) Verification 실행 → 4) 리마인더
  4. Verification: 모든 체크 통과 + 보안/호환성/에지케이스 리마인더 확인
  5. `depends_on: [coding, testing, security]`
- **검증**: `/audit` 실행 시 자기감사 프롬프트 + Verification 체크 출력
- **생성**: `templates/base/skills/audit/SKILL.md`

### 18-C. /review 스킬 (교차 리뷰)

- **작업**:
  1. `templates/base/skills/review/SKILL.md` 신규 생성 (`user-invocable: true`)
  2. Contract: 별도 서브에이전트(Task)로 코드 리뷰 수행, 구조화된 리포트 반환
  3. Protocol: 1) 변경 diff 수집 → 2) 6가지 관점 리뷰 → 3) severity별 리포트
  4. Verification: 리뷰 리포트에 severity 분류 + 파일/라인 참조 포함
  5. 리뷰 관점: 보안(OWASP), 타입 안전성, 에러 핸들링, API 호환성, 테스트 커버리지, 성능
- **검증**: `/review` 실행 시 구조화된 리뷰 리포트 출력
- **생성**: `templates/base/skills/review/SKILL.md`

### 18-D. tsq init 배포 연동

- **작업**:
  1. 기존 `src/commands/init.ts`의 스킬 배포 로직이 신규 스킬 포함 확인
  2. `tsq init` 시 `.claude/skills/spec/`, `audit/`, `review/` 자동 배포
  3. 기존 스킬 배포 패턴 그대로 따름 (추가 코드 변경 최소화)
- **검증**: `tsq init --type web-service` 후 `.claude/skills/` 에 3개 스킬 디렉토리 존재 (단위 테스트)
- **관련 파일**: `src/commands/init.ts`, `src/lib/project.ts`

---

## Issue #19 — CLAUDE.md 경량화

### 19-A. CLI 레퍼런스 분리

- **현재 상태**: CLAUDE.md 83줄 중 ~40줄이 CLI 커맨드 목록
- **작업**:
  1. `templates/base/skills/tsq-cli/SKILL.md` 신규 — CLI 인덱스 (120줄 이하)
  2. `templates/base/skills/tsq-cli/references/cli-reference.md` — 전체 커맨드 상세
  3. CLAUDE.md에서 CLI 섹션 제거, "CLI 사용법은 tsq-cli 스킬 참조" 한 줄로 대체
- **검증**: CLAUDE.md 30줄 이하, tsq-cli SKILL.md 120줄 이하

### 19-B. 핵심 개념 위임

- **작업**:
  1. "핵심 개념" 섹션 → tsq-protocol/SKILL.md로 위임 (이미 대부분 존재)
  2. "작업 원칙" 섹션 → Phase 1 #21의 main-session-constraints 스킬로 이관 예정, 임시 유지
  3. CLAUDE.md 최종 구조: 프로젝트 개요 + 구조 + 스킬 디스커버리 안내
- **검증**: 기존 정보 손실 없음 (before/after diff 검토)

### 19-C. 스킬 디스커버리 안내

- **작업**:
  1. CLAUDE.md에 "스킬 탐색" 섹션 추가 (3줄)
  2. `skill-suggest.sh` 훅이 관련 스킬 자동 제안함을 안내
  3. 주요 스킬 목록 (tsq-protocol, controller, coding, testing, security) 간략 링크
- **검증**: CLAUDE.md가 스킬 시스템으로의 진입점 역할 확인

---

## 실행 순서 (Wave)

```
Wave 0-A (병렬, 0.5d):
  +-- 18-A: /spec 커맨드 (XS, 0.25d)
  +-- 18-B: /audit 커맨드 (XS, 0.25d)
  +-- 18-C: /review 커맨드 (XS, 0.25d)
  +-- 19-A: CLI 레퍼런스 분리 (S, 0.5d)

Wave 0-B (순차, 0.5d):
  +-- 19-B: 핵심 개념 위임 (XS, 0.25d) -- 19-A 완료 후
  +-- 19-C: 스킬 디스커버리 안내 (XS, 0.1d)
  +-- 18-D: tsq init 배포 연동 (S, 0.25d) -- 18-A~C 완료 후
  +-- QA: 기존 테스트 회귀 확인
```

최적 병렬 실행 시: ~0.5d

---

## 체크리스트

### #18 DoD
- [x] 18-A: `/spec` 스킬 (`user-invocable: true`) — SSOT 확인 + 미존재 시 차단 메시지
- [x] 18-B: `/audit` 스킬 (`user-invocable: true`) — 변경 파일 감사 + 스킬 Verification + 리마인더
- [x] 18-C: `/review` 스킬 (`user-invocable: true`) — 서브에이전트 교차 리뷰 프롬프트
- [x] 18-D: `tsq init` 시 `.claude/skills/` 배포 (spec, audit, review) — BASE_SKILLS 추가

### #19 DoD
- [x] 19-A: CLAUDE.md 31줄 + tsq-cli SKILL.md 신규 (73줄 + references/)
- [x] 19-B: 핵심 개념 기존 스킬로 위임 (CLI → tsq-cli, 개념 → tsq-protocol)
- [x] 19-C: 스킬 디스커버리 안내 포함 (스킬 시스템 섹션)

### 품질 게이트
- [x] `npm test` 전체 통과 (627/627)
- [x] `tsq knowledge validate` — 초기화 프로젝트 전용, 스킬 구조 검증은 prompt-quality.test.ts 통과
- [x] `tsc --noEmit` 클린
- [x] 기존 Hook 동작 정상 (settings.json 미변경)

---

## 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| CLAUDE.md 과도한 축소 | 에이전트 초기 맥락 부족 | 최소 프로젝트 개요 + 구조 + 스킬 안내는 유지 |
| /spec 동적 컨텍스트 실패 | SSOT 없는 프로젝트에서 에러 | `2>/dev/null \|\| echo "NOT FOUND"` 방어 |
| tsq init 스킬 배포 경로 | 기존 init 로직 간섭 | 기존 스킬 배포 패턴 그대로 따름 |
