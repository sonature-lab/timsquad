---
name: inspect
description: |
  TimSquad 프레임워크 파이프라인 종합 건강 점검. 코드↔문서 정합성, Hook/스킬/CLI 일관성,
  테스트 커버리지, 설정 무결성, 데드코드를 자동 탐지하여 RAG(Red/Amber/Green) 리포트 생성.
  Use when: "점검", "헬스체크", "inspect", "health check", "파이프라인 검증", "전체 점검",
  "릴리스 전 확인", "뭐가 빠졌지", "정합성 확인", "drift 체크", "코드 상태",
  대규모 작업 후 정합성 확인, npm publish 전 최종 점검, 새 세션 시작 시 현황 파악.
  코드가 이상하게 동작하거나 테스트가 깨지면 이 스킬을 먼저 실행하라.
  보완계획이나 이슈 작업 완료 후에도 반드시 실행하여 drift를 잡아라.
user-invocable: true
---

# /inspect — TimSquad 프레임워크 건강 점검

릴리스 전, 대규모 작업 후, 또는 "뭔가 이상하다" 싶을 때 실행하는 종합 진단.
문서 drift와 데드코드는 시간이 지나면 반드시 누적된다 — 정기적으로 제거해야 파이프라인이 건강하다.

## Protocol

1. **Gate 실행**: `npm run build` + `npm test` — 하나라도 실패하면 즉시 FAIL 보고
2. **7영역 자동 점검**: 아래 영역을 병렬 Agent로 분산 실행
3. **RAG 리포트 생성**: 영역별 Green/Amber/Red + 구체적 항목
4. **권고 제시**: 수정 방법과 우선순위 (Red > Amber)
5. **리포트 저장**: `docs/inspect-report-{date}.md`

## 점검 7영역

상세 체크리스트는 `references/checklist.md`를 Read하여 참조.

### 1. Hook 정합성
settings.json에 등록된 Hook 커맨드 vs scripts/ 실제 파일 대조.
- 유령 Hook (등록됐지만 파일 없음)
- 고아 스크립트 (파일 있지만 미등록)
- Fail 전략 (`|| true` 유무) 의도 확인

실행: `bash ${CLAUDE_SKILL_DIR}/scripts/count-hooks.sh`

### 2. 스킬 정합성
templates/base/skills/ 전수 검증.
- 고아 디렉토리 (SKILL.md 없음)
- Frontmatter 누락 (name/description)
- 120줄 초과 (Progressive Disclosure 위반)
- references/ 포인터 끊김
- BASE_SKILLS/SKILL_PRESETS/DOMAIN_SKILL_MAP 미등록 + methodology 매핑 확인

### 3. CLI 정합성
src/index.ts 등록 vs src/commands/*.ts 파일 대조.
- 미등록 커맨드 파일
- 유령 import
- dist/ 빌드 동기화 (src 대비 dist 타임스탬프)

### 4. 문서 Drift
docs/competitive-analysis, MEMORY.md의 수치 주장 vs 실제 대조.
- Hook 수, 스킬 수, 테스트 수, CLI 수
- 보완계획 상태 (이슈 #31)
- 내부 자기 불일치 (같은 문서 내 다른 수치)

### 5. 테스트 커버리지 갭
src/**/*.ts 소스 파일 대비 tests/**/*.test.ts 매핑.
- 테스트 없는 핵심 소스 (commands/, lib/, daemon/)
- utils/ 전수 미커버 여부

### 6. 설정 일관성
package.json, tsconfig.json, src/types/config.ts 교차 검증.
- package.json version vs getInstalledVersion()
- package.json files 필드 누락
- npm scripts (test, build, prepublishOnly)
- tsconfig strict 설정

### 7. 의존성 위생
코드 간 의존 관계 + 타입 export 검증.
- 순환 import 탐지 (src/ 내부)
- 미사용 export (types/ 내 타입이 src/ 어디에서도 안 쓰임)
- 미사용 devDependencies

## RAG 판정 기준

| 등급 | 기준 |
|------|------|
| **Green** | 자동 검증 통과, gate 이상 없음 |
| **Amber** | 기능 영향 없지만 drift 또는 갭 존재 — 권고 수정 |
| **Red** | 빌드/테스트 실패, 유령 참조, 심각한 불일치 — 즉시 수정 |

## 리포트 형식

```markdown
# Inspect Report {date}

## Gate Results
| Gate | Status |
|------|--------|

## Summary
| 영역 | 판정 | 항목 수 |
|------|:----:|--------|

## 상세
### 1. Hook 정합성 — {판정}
...
### 7. 의존성 위생 — {판정}
...

## 권고 (우선순위순)
1. [Red] ...
2. [Amber] ...
```

## 실행 전략

- 영역 1~3(Hook/스킬/CLI)은 하나의 Agent로 묶어 실행 (파일 스캔 위주)
- 영역 4~5(문서/테스트)는 다른 Agent로 병렬 실행 (수치 대조 + 파일 매핑)
- 영역 6~7(설정/의존성)은 Bash 커맨드로 직접 실행
- 점검은 **읽기 전용** — 자동 수정은 반드시 사용자 동의 후

## Rules

- Gate(빌드+테스트)가 실패하면 다른 영역은 Blocked 처리
- Red가 1건이라도 있으면 사용자에게 즉시 알림
- 리포트는 `docs/inspect-report-{date}.md`에 저장
- 이전 리포트가 있으면 delta(개선/악화) 표시
