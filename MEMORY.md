# TimSquad Project Memory (workdir index)

> **Note**: 이 파일은 작업 디렉토리의 **참조용 인덱스** 입니다. Claude Code 의 auto-memory 시스템(`~/.claude/projects/-Users-ericson-Dev-timsquad/memory/`)과는 별도이며, 새 세션이 이 파일을 **자동 로드한다는 보장은 없습니다**. 다음 세션 시 명시적으로 참조하거나 `/init` 시 통합하세요.

## 다음 세션 진입 시

**먼저 [memory/vnext-direction.md](memory/vnext-direction.md) 를 참조하세요** — vNext (Operational State Runtime) 의 핵심 원칙·5-Phase 로드맵·최소 CLI 가 요약되어 있습니다.

## 🧭 3-Horizon North Star (현재 H1)

- **H1**: Model-agnostic Operational Harness Runtime. **현재 단계**. vNext A9~A13 = H1 하위 Operational Runtime Track.
- **H2**: Harness-native Multi-session Terminal IDE (deferred).
- **H3**: Provider-agnostic LLM Execution Backend (deferred).

### H1 시작 순서: H1-F0 → A1~A3 / Wave 0 S3,S4 → A4 → A9 → A10

**H1-F0 = Kernel Grammar** (TaskRuntime Process + Log Taxonomy + Audit Protocol). H1 Foundation 의 첫 공식 slice. maximum 1 RFC, 1~2일, 구현 금지. A4/A9/A10 공통 문법 정의. **Codex audits read-only 는 H1-F0 Audit Protocol 에서 구체화**.

## ⚓ Prime Directive (불변)

```
No Evidence, No Commit.
Generated Views Are Never Truth.
```

A9~A13 은 **roadmap hypotheses**, 확정 commitment 아님. 각 phase 시작 전 Mini-RFC + Exit Criteria 필수. **Right-sized gate** — risk 와 reversibility 에 비례한 ceremony 만.

vNext 는 별도 트랙이 아니라 **open issue 해소의 방향성** (Stabilization + Runtime Seed + Conditional Runtime).

## 🎭 Execution Model

`Claude Code implements / Codex audits read-only / User decides on phase promotion or kill only`.

## 프로젝트 메타

- npm: `timsquad` (v3.8.0) / CLI: `tsq`
- 레포: github.com/sonature-lab/timsquad
- 브랜드: "Tim" 다이아몬드, "i" = cyan / 태그라인: "Vibe Development Framework"
- 비즈니스: Open Core (GitHub 공개 + `timsquad-mcp` 별도 리포 유료)
- 커밋: Conventional Commits, Co-Authored-By 미사용
- 배포: `npm run build && npm publish` (수동)

## vNext 방향 (2026-05-22 핸드오프)

**한 줄**: 문서 하네스 ❌ → **Evidence 기반 event commit + lazy projection 으로 stale truth 차단** ✅.

**절대 원칙**:
- Runtime = observer/validator, **NOT owner**
- Event append = 유일한 commit point
- Evidence = commit credential
- Projection = invalidate 후 lazy regenerate

**5-Phase 로드맵**:
- Phase 0 — append-only guard / Evidence / Entity ID (현재 위치)
- Phase 1 — event/evidence core walking skeleton (`evidence validate`, `event append/verify/tail`, `task complete` bridge). **최종 최소 CLI surface 는 5개** (`evidence validate` / `event append` / `task complete` / `context resolve` / `file impact`) 이지만 A10 구현 대상은 위 4개 + bridge
- Phase 2 — `.glog` + projections + ProjectMap + `context resolve` / `file impact` + **MetaIndex 격하**
- Phase 3 — capability boundary + Runtime 계층 + Convention executable
- Phase 4 — daemon + MCP + cross-platform

상세: [memory/vnext-direction.md](memory/vnext-direction.md), [docs/rfc/vnext-operational-state-runtime.md](docs/rfc/vnext-operational-state-runtime.md).

## 현재 상태 스냅샷 (참고용, drift 가능)

> 아래 항목은 auto-memory snapshot 기준이며 main repo 실측을 거치지 않았다. 정확한 현황은 `npm test`, `ls templates/base/skills`, `cat templates/platforms/claude-code/settings.json` 등으로 확인하라.

- CLI 10개 + `tsq next --wave` (스냅샷)
- 스킬 37개 `tsq-*` flat namespace (스냅샷)
- Hook 13개 (Fail-closed 7 + Fail-open 6) (스냅샷)
- Controller v3.0.0 + Model Routing + Wave 병렬 디스패치 (스냅샷)
- 777 테스트 통과 (memory snapshot, 실측은 `npm test`)
- 보완계획 #0~#7 — handoff 보고 기준 완료 (#31), main repo 반영 여부 액션별로 재검증 필요. vNext Phase 2 에서 MetaIndex 격하 예정

## 토픽 인덱스

| 토픽 | 파일 |
|---|---|
| **vNext / Operational State Runtime** | [memory/vnext-direction.md](memory/vnext-direction.md) |
| **vNext RFC (방향성 SSOT)** | [docs/rfc/vnext-operational-state-runtime.md](docs/rfc/vnext-operational-state-runtime.md) |
| **Evidence / Event / .glog / ProjectMap / MetaIndex 격하** | RFC §4~§8 |
| **개선 plan (16 액션, vNext 5-Phase 매핑)** | [docs/improvement-plan-2026-05-22.md](docs/improvement-plan-2026-05-22.md) |
| **이슈 통합 리포트 (30 OPEN)** | [docs/issue-report-2026-05-22.md](docs/issue-report-2026-05-22.md) |
| **경쟁분석 + 보완계획** | [docs/competitive-analysis-2026-03.md](docs/competitive-analysis-2026-03.md) |

## 테스트

- vitest: `npm test` / `npm run test:unit` / `test:integration` / `test:e2e`

## MCP 매핑 분석 (timsquad-mcp 참고)

- SSOT → MCP Resources, Skills → MCP Prompts, Controller → MCP Tools
- Hook Gate/Capability Token 은 MCP 로 옮길 수 없음 (Claude Code 전용)
