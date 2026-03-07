# Sprint Context Notes (시방서)

**작성일**: 2026-03-07
**스프린트**: 2026-03-07 Sprint
**문서 목적**: 결정의 이유와 관련 자료의 위치를 기록

---

## 1. 결정 기록 (Decision Log)

### D-001: Phase 분할 기준
- **결정**: 3-Phase 구조 (Stabilization -> Foundation -> Quality & DX)
- **이유**: 의존성 그래프 분석 결과 #5, #17이 root dependency이므로 선행 필수. #11, #10, #8은 새 인프라 구축이므로 안정화 이후. 나머지 8개는 독립적이고 병렬 가능
- **대안 검토**: 2-Phase (Critical+High / Medium) 구조도 가능했으나, High 이슈 간 의존성(#11->#5)으로 3단계가 안전
- **관련 자료**: `docs/sprint/sprint-2026-03-07.md` Dependency Map 섹션

### D-002: #8 Archiv 이월
- **결정**: Semantic Layer만 이번 스프린트, Archiv 시스템은 다음 스프린트
- **이유**: Archiv 단독 XL 규모. Semantic Layer가 Archiv의 전제 조건이므로 분리 가능. 이번 스프린트 총 공수를 ~17d로 제한
- **관련 자료**: `docs/sprint/sprint-2026-03-07.md` Phase 1 Note

### D-003: #10 독립 커맨드 vs mi 확장
- **결정**: (A) 독립 `tsq audit` 커맨드 신설 권장
- **이유**: 감사(품질 평가)와 meta-index(코드 구조)는 관심사가 다름. 독립 커맨드가 CLI UX 상 명확
- **최종 결정**: Phase 1 Wave 1-A에서 Architect가 확정 (0.5d 내)
- **관련 자료**: GitHub Issue #10 본문, `docs/sprint/phase-1-plan.md`

### D-004: #6 중복 처리
- **결정**: #6 sub-items 1,2는 #10에서 구현, #6는 sub-item 3(scope guard)만 고유 작업
- **이유**: FP Registry와 source 필드는 #10에서 정식 구현. 동일 기능 중복 구현 방지
- **관련 자료**: `docs/sprint/sprint-2026-03-07.md` Overlap & Dedup

### D-005: .e2e-passed 하위 호환
- **결정**: JSON 포맷 전환 시 bare touch fallback 유지
- **이유**: 기존 프로젝트에서 bare `.e2e-passed` 파일 의존 가능. 파싱 실패 시 bare 파일 존재만으로 통과 허용 (경고 출력)
- **관련 자료**: `docs/sprint/phase-2-plan.md` 리스크 테이블

### D-006: Phase Gate 조건 최소 기준
- **결정**: test pass rate >= 80%, no critical issues, build success
- **이유**: 명확한 정량 기준 필요. 감사 점수는 프로젝트마다 다르므로 설정 가능하게 구현
- **관련 자료**: `docs/sprint/phase-0-plan.md` 17-C 섹션

### D-007: 역할 배치 원칙
- **결정**: 하나의 AI에게 모든 것을 시키지 않고 역할별 전문 에이전트 배치
- **이유**: 단일 에이전트는 컨텍스트 오버플로우 및 교차 검증 불가. 역할 분리로 CCTV식 변경 추적, 완료 후 자동 검사, 보안 리마인더 가능
- **관련 자료**: `docs/sprint/work-protocol.md`

---

## 2. 관련 자료 위치 (Resource Map)

### 스프린트 문서
| 파일 | 설명 |
|------|------|
| `docs/sprint/sprint-2026-03-07.md` | 스프린트 계획 총괄 (이슈 분석 + 의존성 + 페이즈) |
| `docs/sprint/phase-0-plan.md` | Phase 0 상세 (승인 2026-03-07) |
| `docs/sprint/phase-1-plan.md` | Phase 1 상세 (승인 2026-03-07) |
| `docs/sprint/phase-2-plan.md` | Phase 2 상세 (승인 2026-03-07) |
| `docs/sprint/context-notes.md` | 본 문서 (시방서) |
| `docs/sprint/work-protocol.md` | 작업 프로세스 프로토콜 |
| `docs/sprint/issues-2026-03-07.json` | GitHub 이슈 원본 데이터 |

### 핵심 소스 코드 (Phase 0)
| 파일 | 역할 | 관련 이슈 |
|------|------|-----------|
| `src/lib/workflow-state.ts` | 워크플로우 상태 모델 | #5, #17 |
| `src/commands/workflow.ts` | 워크플로우 CLI + 자동화 | #5, #17 |
| `src/daemon/event-queue.ts` | 데몬 이벤트 처리 | #17 |
| `src/daemon/index.ts` | 데몬 메인 루프 | #17 |
| `src/daemon/session-state.ts` | 세션 상태 관리 | #17 |
| `src/lib/compiler.ts` | 컴파일 엔진 | #5, #11 |
| `src/lib/compile-rules.ts` | 컴파일 규칙 스키마 | #5, #11 |

### 핵심 소스 코드 (Phase 1)
| 파일 | 역할 | 관련 이슈 |
|------|------|-----------|
| `src/types/meta-index.ts` | MetaIndex 타입 | #8 |
| `src/commands/meta-index.ts` | mi CLI | #8 |
| `src/lib/meta-index.ts` | mi 코어 로직 | #8 |
| `src/commands/audit.ts` | 감사 CLI (FP, validate, diff) | #10 |
| `src/commands/compile.ts` | 컴파일 CLI (e2e 서브커맨드 추가) | #11 |
| `templates/base/skills/product-audit/SKILL.md` | 감사 스킬 (Phase D 포함) | #10 |
| `templates/base/skills/controller/SKILL.md` | 컨트롤러 스킬 | #11 |

### 핵심 소스 코드 (Phase 2)
| 파일 | 역할 | 관련 이슈 |
|------|------|-----------|
| `templates/base/skills/testing/SKILL.md` | 테스팅 스킬 | #12 |
| `templates/platforms/claude-code/scripts/*.sh` | 훅 스크립트 | #15, #6 |
| `templates/base/skills/database/SKILL.md` | DB 스킬 | #13 |
| `templates/base/skills/_template/SKILL.md` | 스킬 템플릿 | #7 |
| `src/daemon/context-writer.ts` | 핸드오프 기반 | #9 |
| `src/daemon/session-notes.ts` | 세션 노트 | #9 |

### 프로젝트 기준 문서
| 파일 | 설명 |
|------|------|
| `docs/PRD.md` | 전체 기획 문서 |
| `CLAUDE.md` | 프로젝트 규칙 |

---

## 3. 이슈 간 교차 참조

```
#5 <-> #11: E2E 영향 분석 (5-B -> 11-C 확장)
#5 <-> #9:  TeamCreate -> 핸드오프 (5-A 결과가 9-A 기반)
#5 <-> #16: TeamCreate -> 에이전트 자동 호출
#17 <-> #16: 데몬 L2 -> architect 자동 호출
#10 <-> #6:  FP Registry (중복, #10에서 구현)
#12 <-> #15: 마커 포맷 -> 커밋 게이트
#13 <-> #14: DB 스킬 보강 -> 생태계 구체 사례
#7 <-> #14:  의존성 선언 -> 생태계 성숙도
#15 <-> #6:  scope guard (동일 작업, #6에서 구현 #15에서 강화)
```

---

## 4. 미결 사항 (Open Items)

| ID | 내용 | 결정 시점 | 담당 | 상태 |
|----|------|-----------|------|------|
| O-001 | #10 독립 커맨드 vs mi 확장 최종 확정 | Phase 1 Wave 1-A | Architect | **해결** — 독립 `tsq audit` 커맨드로 구현 (src/commands/audit.ts) |
| O-002 | #13 Database/Prisma 소유권 경계 Option A vs B | Phase 2 Wave 2-A | Developer-Skill | 미결 |
| O-003 | #8 Archiv confidence 임계값 | 다음 스프린트 | PM | 미결 |
| O-004 | #16 Designer 활성화 기준 구체화 | Phase 2 Wave 2-C | PM | 미결 |
| O-005 | Phase Gate 감사 점수 임계값 (프로젝트별) | Phase 0 구현 시 | Developer | **해결** — buildPhaseGateData 기반, 시퀀스 verdict + feedback 조건 사용 |
