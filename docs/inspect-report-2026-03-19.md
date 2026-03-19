# TimSquad Inspect Report

> 날짜: 2026-03-19 | 버전: v3.7.1 | 테스트: 686/686 | 스킬: tsq-inspect v1.0.0

---

## Summary

| 영역 | 상태 | 이슈 수 |
|------|:----:|:------:|
| Hook 정합성 | **WARN** | 2 |
| 스킬 정합성 | PASS | 0 |
| CLI 정합성 | PASS | 0 |
| 문서 Drift | **WARN** | 5 |
| 테스트 커버리지 | PASS | 0 |
| 빌드 동기화 | PASS | 0 |
| Issue 구현 검증 | PASS | 6/6 |

---

## 1. Hook 정합성

### [WARN] 고아 스크립트 (파일 O, settings.json 등록 X)

| 스크립트 | 판정 | 이유 |
|---------|:----:|------|
| `detect-env.sh` | 정상 | 유틸리티 (다른 스크립트에서 source) |
| `validate-completion-report.sh` | 정상 | subagent-stop.sh에서 내부 호출 |
| **`e2e-commit-gate.sh`** | **점검 필요** | 어디서도 호출 안 됨 |
| **`e2e-marker.sh`** | **점검 필요** | 어디서도 호출 안 됨 |

### 등록 Hook 수

- settings.json 등록: **13개** (fail-closed 7 + fail-open 6)
- 스크립트 파일: **16개** (유틸 2 + 미사용 2 + 등록 12)

---

## 2. 스킬 정합성

- 스킬 수: **37개** (tsq-inspect 추가 후)
- 120줄 초과: **0개** (전체 PASS)
- references/ 포인터 끊김: **0개** (전체 PASS)
- Frontmatter 누락: 0개

---

## 3. CLI 정합성

- index.ts imports: 10개
- src/commands/ 파일: 10개
- **완전 일치** (init, update, daemon, next, plan, spec, log, status, retro, audit)
- 빌드 동기화: PASS

---

## 4. 문서 Drift (docs/competitive-analysis-2026-03.md)

| ID | 심각도 | 문서 주장 | 실제 | 섹션 |
|----|:------:|----------|------|------|
| DRIFT-01 | 중 | 스킬 37개 (tsq-daemon 포함) | 37개 (tsq-daemon 없음, tsq-inspect 추가) | 2-5 L97 |
| DRIFT-02 | 중 | Hook 14개 (7+7) | 13개 (7+6) | 2-5 L108 |
| DRIFT-06 | 중 | 섹션 3: "5개 Fail-closed" | 실제 7개 (섹션 2-5와 내부 불일치) | 3-1 L145 |
| DRIFT-08 | 높음 | validate-completion-report.sh 완료 | settings.json 미등록 (내부 호출로 동작) | 5-1.5 |
| DRIFT-12 | 중 | "34개 소프트 규칙 → 코드 강제" | #4~#8 미착수로 부분 완료 (~20개) | 6-2 |

---

## 5. Issue 구현 검증

| 이슈 | 제목 | 검증 |
|:----:|------|:----:|
| #27 | 하이브리드 Controller | **PASS** |
| #28 | CRITICAL Hook + Progressive Disclosure | **PASS** |
| #29 | Hook 환경 인식 + HIGH Hook | **PASS** |
| #30 | CLI 자동화 8건 | **PASS** |
| #25 | Test Gate 적응화 | **PASS** |
| #23 | build-gate 모노레포 | **PASS** |

---

## 6. 실제 수치 (검증된 팩트)

| 항목 | 수치 |
|------|:----:|
| 스킬 | 37개 |
| Hook 등록 | 13개 (settings.json) |
| Hook 스크립트 | 16개 (파일) |
| CLI 커맨드 | 10개 |
| 테스트 | 686개 (전체 통과) |
| TypeScript | 11,375줄 |
| 오픈 이슈 | 3개 (#21, #26, #31) |

---

## 7. 권고 사항

### 즉시 조치 (문서 수정)

1. 스킬 수: tsq-daemon 삭제 + tsq-inspect/tsq-typescript 반영 → 37개
2. Hook 수: 14개(7+7) → 13개(7+6) 수정
3. 섹션 3 "5개 Fail-closed" → "7개" 통일
4. 섹션 6 "34개 전환" → "~20개 전환 (나머지 #4~#8에서 완료 예정)"

### 점검 필요

5. `e2e-commit-gate.sh`, `e2e-marker.sh` — 사용 여부 확인 후 삭제 또는 등록
6. validate-completion-report.sh — settings.json 직접 등록 vs 현행 내부 호출 유지 결정

### 후속 이슈 (#31 후순위)

7. 모델 라우팅 (#4) — 토큰 효율 A-로 가기 위한 핵심
8. 병렬 디스패치 (#7) — 속도 B→A-로 가기 위한 핵심
