# Phase 1 — Foundation 상세 계획

**승인일**: 2026-03-07
**목표**: 프로세스 무결성 강제, 감사/인덱스 인프라 구축
**대상 이슈**: #11 (High, L/3d), #10 (High, L/3d), #8 (High, XL/5d+ -- Semantic Layer only)
**예상 공수**: 5.5d (최적 병렬, Archiv 이월)
**진입 조건**: Phase 0 DoD 전체 충족

---

## 역할 배치

| 역할 | 담당 | 근거 |
|------|------|------|
| Architect | #8 스키마 설계, #10 감사 시스템 아키텍처 결정 | 새 시스템 도입이므로 설계 선행 필수 |
| Developer-A | #11 (컨트롤러) | 기존 코드(`compiler.ts`) 확장 중심 |
| Developer-B | #10 (감사 시스템) | 신규 커맨드 + 스킬 생성 |
| Developer-C | #8 (메타인덱스) | 타입 확장 + CLI 옵션 추가 |
| Reviewer | 모든 구현 후 교차 검증 | 보안, 타입 안전성, API 일관성 |
| QA | DoD 체크리스트 순회 | 단위/통합 테스트 + 회귀 |

---

## Issue #11 -- Controller

### 11-A. 전제조건 자동 검증 + stale 차단
- **현재 상태**: `parseAgentPrerequisites()` (compiler.ts:468), `validateDependencyGraph()` (compiler.ts:487) 존재하나 stale hash 비교 없음
- **작업**:
  1. `.compile-manifest.json` hash vs 현재 SSOT 파일 hash 비교 로직 추가
  2. 위임 시점에 prerequisites 자동 파싱 -> 누락/stale 시 차단 + 구체적 메시지
  3. `tsq delegate <agent> --task <id>` 명령 프로토타입 (또는 기존 task-start 확장)
- **검증**: 누락 prerequisite -> 차단 / stale -> 재컴파일 안내 (단위 테스트)
- **관련 파일**: `src/lib/compiler.ts` (L468-520), `src/commands/workflow.ts` (L309-341)

### 11-B. SCR 프레임워크 레벨 강제
- **현재 상태**: `controller/SKILL.md`에 텍스트로만 존재
- **작업**:
  1. 태스크 scope 분석기 -- 변경 대상 파일/모듈 수 추정
  2. 복합 태스크 감지 시 자동 분할 제안 (2개 이상 독립 모듈 변경 시)
  3. Phase 0의 5-C 결과물 활용
- **검증**: 복합 태스크 -> 분할 제안 출력 (단위 테스트)

### 11-C. E2E 영향 분석 자동화
- **현재 상태**: E2E 테스트 파일 스캐닝 없음, `affected_e2e` 필드 없음
- **작업**:
  1. `tsq compile --task` 시 `__tests__/e2e/` 디렉토리 자동 grep
  2. 변경 spec과 E2E 테스트 파일 매핑 (파일명/import 기반)
  3. 컴파일 출력에 `affected_e2e` + `e2e_action` 주입
- **검증**: 알려진 spec 변경 -> 올바른 E2E 매핑 (단위 테스트)
- **관련 파일**: `src/lib/compile-rules.ts`, `src/lib/compiler.ts`
- **참고**: Phase 0의 5-B 결과물 위에 구축

---

## Issue #10 -- Product-audit

### 아키텍처 결정 (Architect, Wave 1-A)
- **선택지**: (A) 독립 `tsq audit` 커맨드 vs (B) `tsq mi audit` 확장
- **권장**: (A) 독립 커맨드 -- 감사는 meta-index와 관심사 분리

### 10-A. FP (False Positive) Registry
- **현재 상태**: 감사 관련 코드 없음 (src/에 audit 참조 0건)
- **작업**:
  1. `src/commands/audit.ts` 신규 생성
  2. FP Registry: `.timsquad/state/audit/fp-registry.json`
  3. `tsq audit fp add/remove/list` 구현
  4. 감사 실행 시 FP Registry 자동 스킵
- **검증**: FP 등록 -> 재감사 시 스킵 + "N items excluded (FP)" 표시 (단위 테스트)

### 10-B. 점수 투명성 (`source` 필드)
- **작업**:
  1. 감사 리포트 템플릿에 `source: estimated | measured` 필드 필수화
  2. `source: estimated` 경고 마커 표시
  3. 검증 로직 -- `source` 누락 시 에러
- **검증**: source 없는 리포트 -> 검증 실패 (단위 테스트)

### 10-C. Phase D 공식화
- **작업**:
  1. product-audit SKILL.md Phase D 섹션 작성
  2. 심각도 정렬 remediation, 항목별 검증 타입, 롤백 가이드
- **검증**: SKILL.md Phase D 존재 + `tsq knowledge validate` 통과

### 10-D. 재감사 diff
- **작업**:
  1. 감사 리포트 저장 표준화: `.timsquad/state/audit/reports/`
  2. 이전 리포트 로딩 -> 도메인별 점수 delta 계산
  3. 항목별 상태 변경 diff 테이블 (FAIL->PASS, PASS->FAIL)
- **검증**: 두 번 감사 -> diff 테이블 올바른 delta (통합 테스트)

---

## Issue #8 -- Meta-index Semantic Layer (Archiv 이월)

### 8-A. FileSemantic 타입 확장
- **현재 상태**: types/meta-index.ts L73-77 -- 3개 필드만 존재
- **작업**:
  1. `FileSemantic`에 5개 필드 추가: `intent`, `domain`, `layer`, `reusability`, `constraints`
  2. `MethodSemantic`에 추가: `intent`, `errors`, `sideEffects`
  3. JSON 스키마 검증 타입 정의
- **검증**: 타입 컴파일 + 기존 코드 호환 (빌드 테스트)
- **관련 파일**: `src/types/meta-index.ts`

### 8-B. `tsq mi stage` CLI 옵션 확장
- **현재 상태**: commands/meta-index.ts L65-89 -- 8개 옵션만 존재
- **작업**:
  1. 새 CLI 옵션: `--intent`, `--domain`, `--layer`, `--reusability`, `--constraints`
  2. `appendPending()` / `mergeSemantics()` 확장
  3. `--semantic` 플래그로 전체 일괄 입력
- **검증**: 새 옵션 staging -> pending.jsonl 올바른 필드 (단위 테스트)
- **관련 파일**: `src/commands/meta-index.ts` (L65-89), `src/lib/meta-index.ts`

### 8-C. Semantic Coverage 통계
- **작업**:
  1. `tsq mi stats`에 semantic coverage % 추가
  2. 파일별/프로젝트별 semantic 완성도 계산
- **검증**: semantic 데이터 유무에 따른 올바른 % (단위 테스트)

---

## 실행 순서 (Wave)

```
Wave 1-A (병렬, 2d):
  +-- Architect: #10 아키텍처 결정 + #8 스키마 설계 (0.5d)
  +-- 11-A: 전제조건 자동검증 (M, 1.5d)
  +-- 8-A: FileSemantic 타입 확장 (S, 0.5d)

Wave 1-B (병렬, 2d):
  +-- 10-A: FP Registry (M, 1.5d)
  +-- 10-B: 점수 투명성 (XS, 0.5d)
  +-- 8-B: tsq mi stage 확장 (S, 1d)
  +-- 11-B: SCR 강제 (S, 0.5d) -- Phase 0 기반

Wave 1-C (병렬, 2d):
  +-- 11-C: E2E 영향 분석 (M, 1.5d) -- Phase 0 기반
  +-- 10-C: Phase D (XS, 0.5d)
  +-- 10-D: 재감사 diff (M, 1.5d)
  +-- 8-C: Semantic coverage (S, 0.5d)

Wave 1-D (마무리, 1d):
  +-- Reviewer: 전체 교차 검증
  +-- QA: DoD 체크리스트 + npm test + 회귀
```

최적 병렬 실행 시: ~5.5d

---

## 체크리스트

### #11 DoD
- [ ] 11-A: prerequisite 자동 파싱 -> 누락/stale 시 차단 + 메시지
- [ ] 11-B: 다중 파일 복합 태스크 -> 분할 제안
- [ ] 11-C: `tsq compile --task` -> `affected_e2e` + `e2e_action`
- [ ] 단위 테스트 3건 통과

### #10 DoD
- [ ] 10-A: `tsq audit fp add/remove/list` + 재감사 스킵
- [ ] 10-B: `source` 필드 필수 + estimated 경고
- [ ] 10-C: SKILL.md Phase D 섹션
- [ ] 10-D: 재감사 diff 테이블
- [ ] `tsq knowledge validate` 통과

### #8 DoD (Semantic Layer only)
- [ ] 8-A: FileSemantic/MethodSemantic 타입 확장 + 빌드 통과
- [ ] 8-B: `tsq mi stage` 새 옵션 + pending.jsonl 기록
- [ ] 8-C: `tsq mi stats` semantic coverage %
- [ ] Archiv -> 다음 스프린트 이월

### 품질 게이트
- [ ] `npm test` 전체 통과
- [ ] 신규 타입 하위 호환 (optional 필드)
- [ ] 보안: FP registry path traversal 차단
- [ ] API 일관성: CLI 네이밍 패턴 통일

---

## 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| #10 아키텍처 결정 지연 | 10-A~D 전체 블로킹 | Wave 1-A에서 0.5d 내 결정 |
| #8 semantic 필드 과다 -> UX 저하 | CLI 옵션 폭발 | `--semantic` 플래그 일괄 입력 |
| Phase 0 미완 시 | 11-B, 11-C 기반 부재 | Phase 0 DoD가 Phase 1 진입 조건 |
