---
name: tsq-inspect
description: |
  프로젝트 파이프라인 전체 건강 점검. 데드코드, 죽은 프로세스, 끊어진 Hook 체인,
  문서 drift, 고아 스킬, 미등록 스크립트, 설정 불일치를 탐지하여 리포트 생성.
  Use when: "점검", "헬스체크", "건강 검진", "파이프라인 검증", "전체 점검",
  "데드코드", "죽은 프로세스", "inspect", "health check", "프레임워크 진단",
  "뭐가 빠졌지", "뭐가 고장났지", "설정 확인", "Hook 확인", "스킬 확인",
  또는 릴리스 전 최종 점검, 대규모 작업 후 정합성 확인, 새 세션 시작 시 현황 파악.
  프로젝트가 "이상하게 동작한다" 싶으면 이 스킬을 먼저 실행하라.
version: "1.0.0"
tags: [tsq, inspect, health, audit, pipeline, dead-code]
user-invocable: true
---

# /tsq-inspect — 파이프라인 전체 건강 점검

릴리스 전, 대규모 작업 후, 또는 "뭔가 이상하다" 싶을 때 실행하는 종합 진단.
데드코드와 죽은 프로세스는 시간이 지나면 반드시 누적된다 — 정기적으로 제거해야 파이프라인이 건강하다.

## Protocol

1. **데이터 수집**: 아래 7개 영역을 자동 점검 (CLI + 파일 스캔)
2. **리포트 생성**: 영역별 PASS/WARN/FAIL + 구체적 항목
3. **권고 제시**: 수정 방법과 우선순위
4. **사용자 확인**: 자동 수정 가능한 항목은 동의 후 즉시 처리

## 점검 7영역

### 1. Hook 정합성
settings.json에 등록된 Hook vs 실제 스크립트 파일 대조.

| 점검 | 방법 |
|------|------|
| 유령 Hook | settings.json에 등록됐지만 스크립트 파일 없음 |
| 고아 스크립트 | scripts/ 디렉토리에 있지만 settings.json에 미등록 |
| Fail 전략 불일치 | `\|\| true` 유무와 의도된 fail-closed/open 비교 |

### 2. 스킬 정합성
templates/base/skills/ vs 배포된 .claude/skills/ 대조.

| 점검 | 방법 |
|------|------|
| 고아 스킬 | 디렉토리 존재하지만 SKILL.md 없음 |
| Frontmatter 누락 | name 또는 description 빠짐 |
| 120줄 초과 | Progressive Disclosure 기준 위반 |
| references/ 포인터 끊김 | SKILL.md에서 참조하지만 파일 없음 |
| 미배포 스킬 | config의 SKILL_PRESETS에 없고 BASE_SKILLS에도 없음 |

### 3. CLI 정합성
src/index.ts 등록 vs src/commands/ 파일 대조.

| 점검 | 방법 |
|------|------|
| 미등록 커맨드 | src/commands/*.ts 있지만 index.ts에 import 없음 |
| 유령 import | index.ts에 import 있지만 파일 없음 |
| 빌드 동기화 | src/ vs dist/ 타임스탬프 비교 |

### 4. 문서 Drift
보완계획/SSOT 문서의 주장 vs 실제 수치 대조.

| 점검 | 방법 |
|------|------|
| Hook 수 불일치 | 문서 주장 vs settings.json 실제 수 |
| 스킬 수 불일치 | 문서 주장 vs 실제 디렉토리 수 |
| 테스트 수 불일치 | 문서 주장 vs `npm test` 실제 수 |
| CLI 수 불일치 | 문서 주장 vs index.ts 등록 수 |
| 로드맵 상태 | 이슈 상태(open/closed) vs 문서 "완료/미착수" |

**상세 점검 항목은 `references/checklist.md`를 Read하여 참조.**

### 5. 테스트 커버리지 갭
소스 파일 대비 테스트 파일 존재 여부.

| 점검 | 방법 |
|------|------|
| 테스트 없는 소스 | src/**/*.ts에 대응하는 *.test.ts 없음 |
| 빈 테스트 | .test.ts 존재하지만 describe/it 블록 없음 |

### 6. 설정 일관성
config.json, package.json, tsconfig.json 간 교차 검증.

| 점검 | 방법 |
|------|------|
| 버전 불일치 | package.json vs config.json framework_version |
| 스택 불일치 | config.json stack vs 실제 dependencies |
| 스크립트 누락 | test/build 스크립트 미정의 |

### 7. 상태 파일 위생
.timsquad/state/ 디렉토리의 정합성.

| 점검 | 방법 |
|------|------|
| 좀비 토큰 | controller-active 존재하지만 Controller 미실행 |
| Stale workflow | workflow.json의 current_phase와 current-phase.json 불일치 |
| 깨진 JSONL | decisions.jsonl에 유효하지 않은 JSON 행 |
| 잔여 임시 파일 | *.tmp, *.bak 등 |

## 리포트

`.timsquad/logs/inspect-{date}.md`에 저장. 영역별 PASS/WARN/FAIL + 상세 항목 + 권고.

## Rules

- 점검은 읽기 전용 — 자동 수정은 반드시 사용자 동의 후
- 리포트는 `.timsquad/logs/inspect-{date}.md`에 저장
- `tsq audit score`를 내부적으로 실행하여 7영역 점수도 포함
- FAIL이 1건이라도 있으면 사용자에게 즉시 알림
