# Phase 2 — Quality & DX 상세 계획

**승인일**: 2026-03-07
**목표**: 개발자 경험 개선, 테스트 신뢰성, 스킬 생태계 강화
**대상 이슈**: #12, #15, #16, #13, #6, #7, #14, #9 (8개)
**예상 공수**: 6d (최적 병렬)
**진입 조건**: Phase 0 + Phase 1 DoD 전체 충족

---

## 역할 배치

| 역할 | 담당 | 근거 |
|------|------|------|
| Developer-Guard | #12, #15, #6 | 훅 스크립트 + 테스팅 스킬 (연관 체인) |
| Developer-Skill | #7, #14, #13 | 스킬 프레임워크 + 콘텐츠 보강 |
| Developer-DX | #9, #16 | 데몬 DX + 에이전트 조율 |
| Reviewer | 전체 교차 검증 | 보안(ShellCheck), 일관성, 호환성 |
| QA | DoD 체크리스트 | 테스트 + 회귀 + 리마인더 |

---

## Wave 2-A: 기반 작업 (병렬, ~1d)

### 12-A. Testing 스킬 E2E 안정성 가이드
- **현재 상태**: testing/SKILL.md (64줄) -- E2E 관련 가이드 없음
- **작업**:
  1. E2E 안정성 가이드 섹션 추가 (viewport, 셀렉터, serial, wait)
  2. retry 설정 패턴 문서화
  3. 타임아웃 가이드: unit 120s, e2e 300s, build 180s
- **검증**: `tsq knowledge validate` 통과
- **관련 파일**: `templates/base/skills/testing/SKILL.md`, `templates/base/skills/testing/references/testing-patterns.md`

### 12-B. E2E 마커 JSON 포맷
- **현재 상태**: `.e2e-passed`가 bare `touch`
- **작업**:
  1. `e2e-marker.sh` 훅 신규 생성 -> JSON 마커
  2. 포맷: `{ timestamp, exit_code, passed, failed, flaky, source_hash, expires_at }`
  3. `exit_code != 0` 시 마커 미생성
- **검증**: 성공 시 유효 JSON, 실패 시 마커 없음 (단위 테스트)
- **생성**: `templates/platforms/claude-code/scripts/e2e-marker.sh`

### 13-A. Database 스킬 Supabase 패턴
- **현재 상태**: database/SKILL.md (99줄) -- Supabase 패턴 없음
- **작업**:
  1. `rules/supabase-patterns.md` 신규 (JSONB, RLS, Edge Runtime, USE_MOCK)
  2. Database/Prisma 소유권 경계 문서화
  3. Edge Runtime 커넥션 풀링 가이드
- **검증**: `tsq knowledge validate` 통과
- **관련 파일**: `templates/base/skills/database/SKILL.md`, `templates/base/skills/database/prisma/SKILL.md`

### 6-A. Scope Guard PreToolUse 전환
- **현재 상태**: change-scope-guard.sh 존재하지 않음
- **작업**:
  1. scope guard PreToolUse 훅 구현 (Edit/Write 호출 시 누적 추적)
  2. 3파일 경고, 6파일 차단
  3. #10 FP Registry + source 필드 해소 확인
- **검증**: Edit 시뮬레이션 -> 임계값 트리거 (단위 테스트)
- **생성**: `templates/platforms/claude-code/scripts/change-scope-guard.sh`

---

## Wave 2-B: 프레임워크 확장 (병렬, ~2d)

### 15-A. E2E 커밋 게이트
- **작업**: `e2e-commit-gate.sh` -- JSON 마커 검증 (source_hash, expiry, exit_code)
- **의존**: #12 (마커 포맷)
- **생성**: `templates/platforms/claude-code/scripts/e2e-commit-gate.sh`

### 15-B. Scope Guard 라인 카운트
- **작업**: 6-A scope guard에 >100줄 경고 추가, E2E 파일 별도 카운트

### 15-C. ShellCheck 전체 통과
- **작업**: 모든 guard 스크립트 (기존 4개 + 신규 3개) ShellCheck 수정
- **검증**: `shellcheck templates/platforms/claude-code/scripts/*.sh` 통과

### 7-A. SKILL.md 의존성 필드
- **작업**:
  1. `depends_on`, `conflicts_with` 필드 추가
  2. `tsq compile` 의존성 그래프 검증 (누락/순환 에러)
  3. 기존 스킬에 의존성 선언
- **검증**: 테스트 스킬 누락/순환 검증 (단위 테스트)
- **관련 파일**: `templates/base/skills/_template/SKILL.md`, `src/lib/compile-rules.ts`

### 7-B. 규칙 중복 해소
- **작업**: 최소 1건 추출 (`_shared/naming-conventions.md`), extends 메커니즘 설계
- **검증**: before/after diff 단일 소스

### 9-A. 에이전트 핸드오프 구조화
- **작업**:
  1. 핸드오프 struct: `changed_files`, `test_results`, `warnings`, `execution_log_ref`
  2. `.timsquad/state/handoffs/` YAML 저장
  3. 다음 에이전트 시작 시 자동 로딩
- **검증**: 파일 수정 태스크 -> 핸드오프 YAML 확인 (통합 테스트)
- **관련 파일**: `src/daemon/context-writer.ts`, `src/daemon/session-notes.ts`

### 9-B. 장시간 실행 타임아웃
- **작업**: `config.yaml` command_timeout (default 120s, test 120s, build 180s, e2e 300s)
- **검증**: sleep 999 + 5s 타임아웃 -> kill + 리포트 (통합 테스트)

---

## Wave 2-C: 통합 & 생태계 (병렬, ~3d)

### 16-A. 아키텍트 자동 호출
- **작업**: 시퀀스 완료 시 데몬 `@tsq-architect` 자동 호출 -> 리포트 + L2
- **의존**: Phase 0 #17 (데몬 L2)
- **관련 파일**: `src/daemon/event-queue.ts`, `templates/base/agents/base/tsq-architect.md`

### 16-B. QA P3 워크플로우 편입
- **작업**: P3 템플릿에 QA 스텝 추가 (developer 완료 + vitest 후)

### 16-C. Designer 역할 명확화
- **작업**: 활성화 기준 문서화 (프로젝트 타입별)

### 16-D. 핸드오프 페이로드 구조화
- **작업**: 스키마 정의 + 검증 로직 (9-A 활용)

### 14-A. 핵심 스킬 보강
- **작업**: coding, security >= 5 rules / tdd, retrospective >= 3 rules + 예시

### 14-B. `tsq retro apply` 명령
- **작업**: `tsq retro apply <pattern-id> --skill <name>` -> rule 파일 생성 + SKILL.md 수정

### 14-C. 미반영 패턴 적용
- **작업**: SP-007, SP-011, SUPABASE-001, DEPLOY-001, E2E-001, FP-007 (6건)

---

## 실행 타임라인

```
Wave 2-A (병렬, 1d):  #12(12-A,12-B), #13(13-A), #6(6-A)
Wave 2-B (병렬, 2d):  #15(15-A~C), #7(7-A,7-B), #9(9-A,9-B)
Wave 2-C (병렬, 3d):  #16(16-A~D), #14(14-A~C)
Wave 2-D (마무리, 1d): Reviewer + QA
```

최적 병렬: ~6d

---

## 체크리스트

### #12 DoD
- [ ] 12-A: testing 스킬 E2E 안정성 가이드
- [ ] 12-B: `.e2e-passed` JSON 마커 (7필드) + 실패 시 미생성

### #15 DoD
- [ ] 15-A: e2e-commit-gate.sh JSON 마커 검증
- [ ] 15-B: scope guard 라인 카운트 (>100줄 경고)
- [ ] 15-C: 모든 guard 스크립트 ShellCheck 통과

### #16 DoD
- [ ] 16-A: 시퀀스 완료 시 architect 자동 호출
- [ ] 16-B: P3 워크플로우 QA 스텝
- [ ] 16-C: Designer 활성화 기준 문서
- [ ] 16-D: 핸드오프 페이로드 스키마 검증

### #13 DoD
- [ ] 13-A: supabase-patterns.md + 소유권 경계 + 커넥션 풀링
- [ ] `tsq knowledge validate` 통과

### #6 DoD
- [ ] 6-A: scope guard PreToolUse (3파일 경고 / 6파일 차단)
- [ ] #10 중복 해소 확인

### #7 DoD
- [ ] 7-A: depends_on / conflicts_with + 의존성 검증
- [ ] 7-B: 최소 1건 중복 제거

### #14 DoD
- [ ] 14-A: 스킬별 rule 수 기준 충족
- [ ] 14-B: `tsq retro apply` 동작
- [ ] 14-C: 미반영 패턴 6건 적용

### #9 DoD
- [ ] 9-A: 핸드오프 struct 자동 생성
- [ ] 9-B: command_timeout + kill + 리포트

### 품질 게이트
- [ ] `npm test` 전체 통과
- [ ] `npm run test:integration` 통과
- [ ] `shellcheck` 모든 .sh 통과
- [ ] `tsq knowledge validate` 통과
- [ ] 보안 리뷰 완료
- [ ] 하위 호환성 확인 (.e2e-passed bare touch fallback)

---

## 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| #16 데몬(#17) 미완 | 16-A 불가 | 수동 호출 축소 |
| #15 -> #12 의존 | 15-A 게이트 불가 | Wave 순서 준수 |
| #14 스킬 보강 과대 | 공수 초과 | 최소 기준만 충족 |
| .e2e-passed 호환 | 기존 프로젝트 깨짐 | JSON + bare fallback |
| ShellCheck 수정 연쇄 | 기존 guard 변경 | 기능 변경 없이 lint만 |
