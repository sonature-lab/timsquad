# ODD ↔ 기존 3-Layer 로그 정합 설계

> Status: Draft (2026-06-20)
> 기존 TimSquad **3-Layer 로그**([log-architecture.md](../log-architecture.md): L1 Task / L2 Sequence / L3 Phase, CLI 출하 완료)와 ODD **L0 로그 + ① 대상 노드**([odd-log-schema-L0.md](./odd-log-schema-L0.md), [odd-object-model.md](./odd-object-model.md))의 정합 설계.
> 검토 근거: [정합성 리뷰 리포트](../research/odd-legacy-log-alignment-review-2026-06-20.md) (2축 적대).
> **이 문서 = 정합 전용.** ① 모델 본문은 건드리지 않고, 여기서 확정한 변경만 ①에 일괄 반영.

---

## 1. 용어 충돌 해소 (선행 — 매핑보다 먼저)

기존 `L1/L2/L3`(작업 롤업, `tsq log task/sequence/phase` 출하)와 ODD `L0/L1/L2/L3`(데이터 파생)가 토큰 충돌. **기존은 개명 불가**(CLI 출하) → ODD가 양보:

| ODD 레이어 | 기존 표기(폐기) | 새 표기 |
|---|---|---|
| 진실 바닥 | L0 | **L0 로그** (유지 — 기존에 없는 토큰) |
| 출처 연결 | L1 provenance | **Provenance** |
| 재파생 | L2 OKG | **OKG / 프로젝트맵** |
| 활용 | L3 .glog | **Glog / Projection** |

- 규약: **ODD 파생 레이어는 번호 대신 이름.** `L0`만 번호 유지. 구성요소는 `①②③④`(로드맵 단계)로.
- 기존 3-Layer(L1 Task/L2 Seq/L3 Phase)는 그대로 — ODD가 회피.

## 2. 두 체계 관계 = 흡수 통합

```
ODD L0 로그 (원자 evidence 레인, 진실 바닥)
        │ fold (Provenance)
        ▼
기존 L1 Task / L2 Sequence / L3 Phase  =  파생 스냅샷 뷰 (자체 진실 박탈, 재생성 가능)
```

- **ODD L0 = 진실.** 기존 3-Layer는 L0 이벤트를 `part_of`(phase/seq 묶음) + `targets`(task)로 fold한 **뷰**.
- 기존 `mechanical.files` → `file.*` Action 이벤트 fold · `semantic.decisions` → Intent 이벤트 fold · `issues` → issue 이벤트 fold.
- **동일 사건 2~3중 기록 해소**: `decisions.jsonl`/`semantic.decisions[]`를 **L0 Intent 발행으로 단일화**. decisions.jsonl은 L0 이전 임시 버퍼로 격하하거나 폐기.
- (a)대체 ❌(출하 자산 폐기 과대) / (c)병행 ❌(다중 기록 영구화) / **(b)흡수 ✅**.

## 3. 필드 매핑 (기존 → ODD)

| 기존 필드 | ODD 대응 | 판정 |
|---|---|---|
| `schema_version` | L0 `v` | ✅ |
| `trace.task_id` | `task` ObjectId + `targets:[task:X]` | ✅ |
| `trace.session_id` | L0 `ctx` | ✅ |
| `trace.{sequence,phase}_id` | `part_of`(phase/seq 묶음 LogId) | ⚠️ ID공간 불일치(slug↔LogId) — §6 미결 |
| `execution.agent` | L0 `actor` (`agent:<name>`) | ✅ |
| `execution.model` | **→ actor 확장**(`agent:dev@opus`) or `payload.model` | 🔧 §4 |
| `execution.status` | lane(Verification) + `payload.result` | ⚠️ `partial` 대응 추가 |
| `duration_ms`/start+end | **start/stop 2로그 `follows` 차이로 ② 파생** | 🔧 §4 (span 규약) |
| `mechanical.files[]{action,path}` | `file` ObjectId + `file.*`(A/M/D/R↔verb) | ✅ 우수 |
| `mechanical.git_range` | `evidence.ref`(불변 핸들) | ✅ |
| `mechanical.commands[]` | `command.run` + Verification | ✅ |
| `mechanical.tool_calls` | L0 `payload` 흡수 | ⚠️ 승격 불필요 |
| `semantic.summary` | L0 `payload` | ✅ |
| `semantic.techniques[]` | L0 `payload` 흡수 | ⚠️ 승격 불필요 |
| `semantic.ssot_refs[]` | `file`(doc) + `check`(conformance) | 🔧 check 확장 §4 |
| `semantic.decisions[]` | `decision` ObjectId + Intent | ✅ 우수 |
| `semantic.issues[]{level,description,filed_as}` | **`issue` ObjectId** (신규) | 🔧 §4 (승격) |
| `error{type,message,recovery}` | Verification `*.errored`/`check.failed` + `follows`(recovery) | ⚠️ enum↔activity 매핑 |
| L2/L3 `dora_derived`/`aggregate_metrics`/`analysis` | ② Provenance fold (재생성 캐시) | ✅ §5 |
| L3 `retrospective`(KPT)/`knowledge_extracted{lesson}` | 대응 없음 — concept 흡수 or 규약 | 🔧 §6 미결 |

## 4. ① 모델 반영 예정 (확정 시 odd-object-model.md에 일괄)

### 4.1 `issue` 7번째 타입 (★ 사용자 결정: 승격 확정)
- type ∈ `{file,task,decision,concept,constraint,check,issue}` (화이트리스트 확장)
- `issue` = log-native, ULID. 1급 근거 = **level(1/2/3) gate 판정 + filed_as 추적**.
- 식별: `rel.about → 결함 대상`(file/check/task 등 — check 패턴, 대상이 file이면 좌표 상속). `filed_as`(GitHub#) = `payload.ref`.
- 정체성: `issue.filed`(생성) · `issue.resolved`(= retired terminator) · `issue.reopened`(= resumed). §4 어휘의 retired/resumed 적용 타입에 `issue` 추가.
- `check`의 fail 결과 ↔ `issue` 연결 규약: `check.failed` → `issue.filed`(rel.cause).

### 4.2 흡수 필드 (타입 승격 불필요)
- `execution.model` → `actor` 확장 `agent:<name>@<model>` 또는 `payload.model`.
- `tool_calls`/`techniques`/`summary` → L0 `payload` 권장키.

### 4.3 span 파생 규약 (L0 point-event 보완)
- L0는 `ts` 단일 시점(Prime Event Structure). 구간(duration)은 **start/stop 2 이벤트의 `rel.follows` 차이로 ② Provenance에서 파생**. DORA lead_time도 이 파생에 의존. → L0 §5 또는 ② 설계에 "span = 2-event 파생" 명시.

### 4.4 `check` 확장
- 현재 "test/ci 표적"으로 좁음 → **ssot-conformance 검증**(기존 `ssot_refs.status`)도 `check`로. verifies 대상 = `file`(spec doc) / `concept`.

## 5. 집계 방식 격하 (materialized → 재생성 캐시)

- 기존 L2/L3 `dora_derived`/`aggregate_metrics`/`analysis.axis_*` = **완료 시점 박제**(materialized). ODD L0 ⑥("파생 저장 X, 진실 아님")과 충돌.
- 해소: 이 집계물을 **"Provenance fold의 캐시된 스냅샷"**으로 재정의 — 저장은 하되 **진실 자격 박탈**(언제든 L0 fold로 재생성). vNext "lazy projection으로 stale truth 차단", "MetaIndex 격하 → on-demand cache" 방향과 일치.
- log-architecture.md "스냅샷 집계 = 상위 로그 내용" 전제 → "스냅샷 = 캐시지 진실 아님"으로 수정.

## 6. 미결 (레거시 마이그레이션 — 보류)
- **sequence/phase ID공간**: 기존 `trace.sequence_id="SEQ-01-auth"`(slug) ↔ ODD `part_of`(LogId) 매핑 규칙.
- **재시도 네이밍**: 기존 `TASK-03-qa-r1.json`(파일명 규칙, rework=파일수-1) → `rel.follows` 변환.
- **회고/lesson**: `retrospective`(KPT)·`knowledge_extracted{lesson}`의 ODD 좌표(concept 흡수 vs 별도).
- **status `partial`**: Verification result enum 확장.
- **error.type enum** ↔ Verification activity 카탈로그 매핑.
- 실제 마이그레이션 실행(기존 로그 데이터 변환)은 별도 작업 — **나중에**.
