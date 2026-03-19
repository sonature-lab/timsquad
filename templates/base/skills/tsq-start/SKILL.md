---
name: tsq-start
description: |
  TimSquad 파이프라인 시작. 데몬 기동, 프로토콜 활성화, 현재 상태 복원.
  초기화 직후 프로젝트는 자동으로 온보딩 모드 진입 (SSOT 문서 작성 가이드).
  Use when: 사용자가 /tsq-start로 TimSquad 파이프라인을 시작할 때.
version: "2.0.0"
tags: [tsq, pipeline, start, onboarding]
user-invocable: true
---

# /tsq-start — TimSquad Pipeline Start

## Protocol

1. **데몬 기동**: `tsq daemon start 2>/dev/null || true`
2. **현재 Phase 확인**: `.timsquad/state/current-phase.json` 읽기
3. **프로토콜 활성화**: 이후 tsq-protocol 준수, 위임은 controller 경유
4. **상태 복원**: 진행 중인 시퀀스/태스크 요약 출력
5. **온보딩 감지**: SSOT 충족도 검사 → 미충족 시 온보딩 모드
6. **안내 출력**

## 온보딩 감지 (Step 5)

`.timsquad/ssot/`의 `.md` 파일을 스캔하여 작성 완료도 판정:
- **empty**: placeholder만 존재 (`[Resource Name]`, `TBD`, `example.com` 등이 50%+)
- **partial**: 일부 섹션만 작성
- **filled**: 주요 섹션 작성 완료

**진입 조건** (하나라도 해당): prd.md가 empty / required 70%+ empty / progress=0

온보딩 시 SSOT 현황(⬜/🟨/✅)을 보여주고 3가지 선택지 제시:
1. 온보딩 시작 (권장) — PRD부터 순서대로
2. 특정 문서만 작성
3. 건너뛰기

## 온보딩 프로세스

**작성 우선순위**: 개발환경(강제) → prd(grill 강제) → Sub-PRD(grill 강제) → requirements → data-design → service-spec → 타입별 필수

타입별 추가 우선 문서는 `references/onboarding-questions.md` 참조.

### Step 0: 개발환경 셋업 — 테스트 프레임워크 강제

SSOT 문서 작성 전에 개발 인프라부터 잡는다.
테스트 환경이 없으면 이후 completion-guard의 Test Gate를 통과할 수 없고,
TDD/BDD 프로세스 자체가 불가능하기 때문이다.

**config.yaml의 stack 정보를 읽고 프로젝트 타입에 맞는 환경을 셋업한다:**

| 프로젝트 타입 | 테스트 프레임워크 | 추가 셋업 |
|-------------|----------------|----------|
| web-service | vitest | vitest.config.ts, tsconfig 확인 |
| web-app | vitest | vitest.config.ts, tsconfig 확인 |
| api-backend | vitest 또는 jest | vitest.config.ts |
| mobile-app | flutter test | pubspec.yaml test deps 확인 |
| fintech | vitest + 별도 security test | vitest.config.ts |
| platform | vitest | vitest.config.ts |
| infra | vitest 또는 프레임워크별 | 환경에 따라 |

**셋업 흐름:**

1. `config.yaml`에서 `stack.*.testing` 값 읽기
2. 프로젝트 루트에서 테스트 프레임워크 설치 여부 확인
   - `package.json`에 vitest/jest가 있는지
   - `pubspec.yaml`에 flutter_test가 있는지
3. **미설치 시**: 사용자에게 확인 후 설치
   ```
   "테스트 프레임워크(vitest)가 설치되어 있지 않습니다.
    config.yaml 설정에 따라 vitest를 설치하겠습니다. 진행할까요?"
   ```
4. 기본 설정 파일 생성 (vitest.config.ts 등)
5. **검증**: 테스트 실행 커맨드 (`npm test` 등)가 정상 작동하는지 확인
6. `onboarding-progress.json`에 `"test_env": "ready"` 기록

이 단계는 건너뛸 수 없다. 테스트 환경 없이 코드를 작성하면
이후 모든 Test Gate에서 블로킹되어 작업이 중단된다.

### Step 1: PRD 작성 — `/tsq-grill prd` 강제 호출

PRD는 모든 후속 문서의 기반이므로, 간단한 질문 3-5개로 만들면 안 된다.
반드시 `/tsq-grill prd` (PRD Mode)를 호출하여 소크라틱 심층 인터뷰로 PRD를 작성한다.

```
prd.md가 empty → /tsq-grill prd 강제 실행 (건너뛸 수 없음)
                 ├── Vision 인터뷰 (비전, 타겟, 시장)
                 ├── Scope 인터뷰 (핵심 기능, 제약, Anti-scope)
                 ├── Metrics 인터뷰 (KPI, 성공/실패 기준)
                 └── PRD 생성 + Human Checkpoint
```

이 단계를 건너뛰거나 약식으로 대체하지 않는다.
PRD가 부실하면 Sub-PRD, requirements, planning 전부 부실해지기 때문이다.

### Step 2: Sub-PRD 작성 — `/tsq-grill` 반복 호출

PRD 완성 후 기능 인덱스에 기능이 2개 이상이면 자동으로 `/tsq-grill` (Sub-PRD Mode) 반복 진입:

1. PRD 기능 인덱스 테이블에서 Sub-PRD 미작성 기능 목록 추출
2. 사용자에게 목록 보여주고 순서 확인 ("이 순서로 하나씩 상세화합니다")
3. 각 기능마다 `/tsq-grill` 프로세스 실행 (Why → What → How 인터뷰 → Sub-PRD 생성)
4. 하나 완료 후 자동으로 다음 기능 진행 (사용자가 "중단", "나중에"라고 하면 정지)
5. 중단 시 진행 상태를 `onboarding-progress.json`에 기록 → 다음 `/tsq-start`에서 이어서 진행
6. 모든 기능의 Sub-PRD 완성 시 → Step 3으로 진행

### Step 3: 나머지 SSOT 문서

PRD + Sub-PRD가 모두 충실하게 작성된 상태에서 나머지 문서를 작성한다.
이 문서들은 grill이 아닌 일반 인터뷰(`references/onboarding-questions.md`의 ★ 필수 질문)로 진행:

1. **인터뷰**: 핵심 질문 3-5개
2. **초안 생성**: 답변으로 SSOT 템플릿 placeholder 채움
3. **확인**: 초안 보여주고 수정 수렴
4. **저장**: `.timsquad/ssot/{name}.md`
5. **다음 문서**: 계속 여부 확인

PRD/Sub-PRD에서 이미 확립된 비전, 스코프, 제약사항을 기반으로 작성하므로
requirements, data-design 등은 일관된 내용으로 빠르게 채울 수 있다.

**세션 관리**: `.timsquad/state/onboarding-progress.json`에 진행 상태 저장:
```json
{
  "test_env": "ready",
  "documents": { "prd": "filled", "requirements": "empty", ... },
  "grill": {
    "pending": ["feature-b", "feature-c"],
    "completed": ["feature-a"],
    "current": null
  },
  "last_updated": "ISO8601"
}
```
세션 끊겨도 다음 `/tsq-start`에서 `test_env` 확인 → `grill.pending`부터 이어서 진행. `test_env`가 "ready"가 아니면 Step 0부터 재시작.

## 온보딩 완료 후 자동 전환

모든 SSOT 문서 filled + grill.pending 비어있으면 온보딩 완료. 이후:

1. **`/tsq-decompose` 자동 안내**: "온보딩 완료. `/tsq-decompose`로 Phase-Sequence-Task 실행 계획을 생성하시겠습니까?"
2. 사용자 승인 시 `/tsq-decompose` 실행 (Sub-PRD → DAG → planning.md)
3. planning.md 확정 후 → 정상 파이프라인 진행 (Controller 경유 위임)

## 파이프라인 분기

온보딩 완료 + planning.md 확정 후 사용자가 작업을 지시하면:
- **파이프라인 적합** (새 기능, API, DB, 아키텍처) → controller 경유 위임
- **단순 작업** (오타, 스타일, 1-2줄) → 직접 수행 + 최소 로그
- **모호한 경우** → 사용자에게 선택지 제시
