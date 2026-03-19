---
title: Onboarding Steps
category: guide
---

# Onboarding Steps 상세

## Step 0: 개발환경 셋업 — 테스트 프레임워크 강제

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
3. **미설치 시**: 사용자에게 확인 후 설치
4. 기본 설정 파일 생성 (vitest.config.ts 등)
5. **검증**: 테스트 실행 커맨드가 정상 작동하는지 확인
6. `onboarding-progress.json`에 `"test_env": "ready"` 기록

이 단계는 건너뛸 수 없다.

## Step 1: PRD 작성 — `/tsq-grill prd` 강제 호출

PRD는 모든 후속 문서의 기반이므로 반드시 `/tsq-grill prd`로 소크라틱 심층 인터뷰를 진행한다.

```
prd.md가 empty → /tsq-grill prd 강제 실행 (건너뛸 수 없음)
                 ├── Vision 인터뷰 (비전, 타겟, 시장)
                 ├── Scope 인터뷰 (핵심 기능, 제약, Anti-scope)
                 ├── Metrics 인터뷰 (KPI, 성공/실패 기준)
                 └── PRD 생성 + Human Checkpoint
```

## Step 2: Sub-PRD 작성 — `/tsq-grill` 반복 호출

PRD 완성 후 기능 인덱스에 기능이 2개 이상이면 자동으로 `/tsq-grill` 반복 진입:

1. PRD 기능 인덱스에서 Sub-PRD 미작성 기능 목록 추출
2. 사용자에게 순서 확인
3. 각 기능마다 `/tsq-grill` 실행
4. 완료 후 다음 기능 자동 진행 (사용자가 "중단"이라면 정지)
5. 중단 시 `onboarding-progress.json`에 기록 → 다음 `/tsq-start`에서 이어서

## Step 3: 나머지 SSOT 문서

PRD + Sub-PRD 완성 후 나머지 문서를 작성. grill이 아닌 일반 인터뷰로 진행:

1. 핵심 질문 3-5개 (`references/onboarding-questions.md`의 ★ 필수 질문)
2. 답변으로 SSOT 템플릿 채움
3. 사용자 확인
4. `.timsquad/ssot/{name}.md` 저장

## 세션 관리

`.timsquad/state/onboarding-progress.json`:
```json
{
  "test_env": "ready",
  "documents": { "prd": "filled", "requirements": "empty" },
  "grill": {
    "pending": ["feature-b", "feature-c"],
    "completed": ["feature-a"],
    "current": null
  },
  "last_updated": "ISO8601"
}
```

세션 끊겨도 다음 `/tsq-start`에서 이어서 진행.
`test_env`가 "ready"가 아니면 Step 0부터 재시작.
