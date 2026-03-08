# Phase 2 — Verification Pipeline (검증 파이프라인 완성) 상세 계획

**승인일**: 2026-03-08
**목표**: 스킬 Verification → 자동 검증 파이프라인 + 교차 리뷰 + 컴팩션 방어
**대상 이슈**: #22 (M/2d)
**예상 공수**: 2d
**진입 조건**: Phase 0 + Phase 1 DoD 전체 충족

---

## 역할 배치

| 역할 | 담당 | 근거 |
|------|------|------|
| Developer | #22 전체 | Hook 확장 + 커맨드 프롬프트 연동 |
| Reviewer | 교차 검증 | Hook 안정성, ShellCheck, 프롬프트 품질 |
| QA | DoD 체크리스트 | 전체 테스트 + 회귀 + 통합 시나리오 |

---

## Issue #22 — 검증 파이프라인 완성

### 22-A. completion-guard.sh 확장 — 스킬 Verification 리마인더

- **현재 상태**: completion-guard.sh가 테스트 미실행 블로킹 + 세션 컨텍스트 주입만 수행
- **작업**:
  1. Stop 시점에 현재 세션에서 활성화된 스킬 목록 파악
  2. 각 활성 스킬의 Verification 섹션에서 핵심 체크 항목 추출
  3. `systemMessage`로 Verification 리마인더 주입
  4. 포맷: `[Skill Verification] {skill}: {check items}`
  5. 최대 3개 스킬, 스킬당 2줄 (토큰 예산 관리)
- **검증**: 코드 변경 후 Stop 시 coding/testing Verification 리마인더 출력 (수동 검증)
- **수정**: `templates/platforms/claude-code/scripts/completion-guard.sh`

### 22-B. /audit 스킬 통합 실행 강화

- **현재 상태**: Phase 0에서 생성된 `/audit` 스킬이 기본 프롬프트만 제공
- **작업**:
  1. audit SKILL.md Protocol 강화: `tsq audit validate` 자동 실행 포함
  2. 변경 파일 기반 관련 스킬 자동 감지 → Verification 섹션 실행
  3. 보안/호환성/에지케이스 리마인더 (work-protocol.md 4번 섹션 기반)
  4. 감사 결과를 구조화된 리포트로 출력
  5. rules/ 에 audit-checklist.md 추가 (리마인더 상세)
- **검증**: `/audit` 실행 시 변경 파일 기반 스킬 감지 + Verification 실행 확인
- **수정**: `templates/base/skills/audit/SKILL.md`

### 22-C. /review 스킬 교차 리뷰 강화

- **현재 상태**: Phase 0에서 생성된 `/review` 스킬이 기본 프롬프트만 제공
- **작업**:
  1. review SKILL.md Protocol 강화: 별도 서브에이전트(Task) 실행 지시
  2. 리뷰 관점 6가지:
     - 보안 (OWASP Top 10, 시크릿 노출)
     - 타입 안전성 (any 타입, 타입 단언)
     - 에러 핸들링 (catch 누락, 에러 무시)
     - API 호환성 (기존 인터페이스 변경)
     - 테스트 커버리지 (변경 코드의 테스트 존재)
     - 성능 (N+1 쿼리, 불필요한 리렌더링)
  3. 리뷰 결과 구조화: severity (critical/high/medium/low), 파일, 라인, 설명
  4. rules/ 에 review-criteria.md 추가 (6가지 관점 상세)
- **검증**: `/review` 실행 시 구조화된 리뷰 리포트 출력 확인
- **수정**: `templates/base/skills/review/SKILL.md`

### 22-D. /spec 스킬 구현 차단 강화

- **현재 상태**: Phase 0에서 생성된 `/spec` 스킬이 기본 프롬프트만 제공
- **작업**:
  1. spec SKILL.md Protocol 강화: SSOT 문서 존재 + 최신 여부 확인
  2. 존재 시: spec 요약 출력 + "구현 가능" 메시지
  3. 미존재 시: "스펙 먼저 작성하세요" + 스펙 작성 가이드
  4. stale 시: "tsq compile 재실행" 안내
  5. rules/ 에 spec-gate.md 추가 (차단 조건 상세)
- **검증**: SSOT 없는 프로젝트에서 `/spec` 시 차단 메시지 확인
- **수정**: `templates/base/skills/spec/SKILL.md`

### 22-E. PreCompact 훅 — 태스크 요약 자동 저장

- **현재 상태**: PreCompact 훅 없음. 컴팩션 시 맥락 유실
- **작업**:
  1. `templates/platforms/claude-code/scripts/pre-compact.sh` 신규
  2. 컴팩션 직전 현재 상태 요약을 `.timsquad/.daemon/compact-summary.md`에 저장
  3. 저장 내용: 현재 Phase, 활성 태스크, 최근 변경 파일 5개, 미완료 항목
  4. `settings.json`에 PreCompact 훅 등록
  5. context-restore.sh (21-C)가 이 파일을 읽어 compact 후 재주입
- **검증**: PreCompact 이벤트 시 compact-summary.md 생성 확인
- **생성**: `templates/platforms/claude-code/scripts/pre-compact.sh`

### 22-F. 통합 시나리오 검증

- **작업**:
  1. 전체 플로우 시나리오: 프롬프트 → skill-inject → 구현 → completion-guard Verification → /audit → /review
  2. compact 시나리오: 작업 중 → PreCompact → compact → context-restore → 작업 재개
  3. 서브에이전트 시나리오: Task() 호출 → SubagentStart 주입 → 작업 → HandoffPayload
- **검증**: 3가지 시나리오 정상 동작 (통합 테스트 or 수동 검증)

---

## 실행 순서 (Wave)

```
Wave 2-A (병렬, 1d):
  +-- 22-A: completion-guard Verification 확장 (S, 0.5d)
  +-- 22-D: /spec 차단 강화 (XS, 0.25d)
  +-- 22-E: pre-compact.sh (S, 0.5d)

Wave 2-B (병렬, 1d):
  +-- 22-B: /audit 통합 실행 (S, 0.5d) -- 22-A 완료 후
  +-- 22-C: /review 교차 리뷰 (S, 0.5d)

Wave 2-C (마무리, 0.5d):
  +-- 22-F: 통합 시나리오 검증 (M, 0.5d)
  +-- Reviewer: 전체 교차 검증
  +-- QA: npm test + ShellCheck + 회귀
```

최적 병렬 실행 시: ~2d

---

## 체크리스트

### #22 DoD
- [x] 22-A: completion-guard.sh — 활성 스킬 Verification 리마인더 주입 (max 3 스킬)
- [x] 22-B: `/audit` — Contract/Protocol 강화 + 스킬 매칭 상세 + 출력 형식 정의
- [x] 22-C: `/review` — Contract 추가 + 서브에이전트 교차 리뷰 + Report Format 상세
- [x] 22-D: `/spec` — Contract 추가 + advisory/stale/차단 메시지 상세 정의
- [x] 22-E: pre-compact.sh — 컴팩션 전 태스크 요약 저장 + PreCompact Hook 등록
- [x] 22-F: 통합 시나리오 — skill-inject→completion-guard→/audit 파이프라인 연결 확인

### 품질 게이트
- [x] `npm test` 전체 통과 (633/633)
- [x] `shellcheck` 모든 .sh 통과 (기존 + 신규 4개)
- [x] `tsc --noEmit` 클린
- [x] 기존 Hook 동작 정상 (순서 유지, append only)
- [x] 보안 리뷰: path traversal 방지 (PROJECT_ROOT 검증), command injection 방지 (jq 사용)

---

## 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| completion-guard 확장으로 Stop 지연 | 매 턴 종료 시 latency 증가 | 스킬 목록 캐시, 최대 3개 제한 |
| /review 서브에이전트 비용 | 토큰 사용량 증가 | 명시적 사용자 호출만 (자동 실행 아님) |
| PreCompact 타이밍 경합 | compact-summary 미생성 | fail-open 원칙 (실패 시 빈 요약) |
| /spec 과도한 차단 | DX 저하 | advisory 모드 기본, 차단은 Phase gate만 |
| 스킬 Verification 표준 미달 | 리마인더 무의미 | Phase 1에서 핵심 6개 스킬 Verification 필수 완성 |

---

## 완료 후 영상 4대 시스템 충족도 (목표)

| 시스템 | 현재 | 목표 | 핵심 변경 |
|--------|------|------|-----------|
| 자동 매뉴얼 | 60% | **95%** | skill-inject 강제 주입 + context-restore |
| 작업 기억 | 70% | **90%** | PreCompact + compact-summary + context-restore |
| 자동 품질 검사 | 75% | **95%** | Verification 리마인더 + /audit + /review |
| 전문 에이전트 | 80% | **90%** | SubagentStart 프로토콜 주입 + /review 교차 리뷰 |
