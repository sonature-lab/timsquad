# ODD ↔ 기존 3-Layer 로그 정합성 리뷰 리포트 (2026-06-20)

> ODD L0/①([odd-log-schema-L0.md](../rfc/odd-log-schema-L0.md), [odd-object-model.md](../rfc/odd-object-model.md))가 기존 TimSquad **3-Layer 로그 아키텍처**([log-architecture.md](../log-architecture.md))와 정합하는지 2축 적대 검토. raw는 transcript. 확정 설계는 [정합 설계](../rfc/odd-legacy-log-alignment.md).

---

## 종합 판정: **통합 설계 필요** (충돌 심각 아님 — 철학은 강하게 정합)

기존 3-Layer는 이미 **append-only event-sourcing**(OTel Tracing + W3C Trace Context + DORA + GQM) 기반으로 구현·CLI 출하 완료. ODD L0도 append-only(CRDT/CALM). **이론 기반이 동일**해 흡수 통합이 자연스럽다. 단 세 지점에서 명시 설계가 없으면 충돌한다.

## 축1 — 계층·용어·체계

| 발견 | 심각도 | 내용 |
|---|---|---|
| **L1/L2/L3 용어 충돌** | High | 기존 L1=Task/L2=Sequence/L3=Phase(작업 롤업, `tsq log` CLI 출하) vs ODD L0/L1/L2/L3(데이터 파생). 같은 토큰 다른 의미. 기존은 개명 불가 → **ODD가 양보**(표기 폐기, 이름/①②③④로) |
| **동일 사건 2~3중 기록** | High | 결정이 (i)기존 `semantic.decisions[]` (ii)`decisions.jsonl` (iii)ODD L0 Intent에 3중. file 변경도 `mechanical.files[]` ↔ `file.*` 이중 → **흡수 통합**으로 단일화 |
| 참조 모델 정합 | Med | 철학 정합(단방향·비순환·과거참조 = W3C Trace Context ↔ L0 ③). 단 기존 path → file ObjectId 정규화 필요, `cause`는 신규 축, 재시도 `-r1` 네이밍 → `follows` |
| 집계 방식 | Med | 기존 **materialized 집계**(dora_derived/aggregate_metrics 박제) vs ODD **lazy projection**(L0 ⑥ "파생 저장X"). 기존 집계물은 ODD 불변식 위반 → "재생성 가능 캐시"로 격하하면 공존 |
| 트랜잭션 규칙 | Low | 기존 "로그 존재=완료"(약) vs ODD evidence-gated "Verification 판정"(강). 같은 방향, ODD가 강화 |

**권고**: ODD 레이어 L1/L2/L3 표기 폐기 + **흡수 통합**(ODD L0=진실 바닥, 기존 3-Layer=파생 스냅샷 뷰). decisions.jsonl 3중 중복 해소.

## 축2 — 스키마 필드 매핑

**정합 우수**: `mechanical.files{action A/M/D/R}` ↔ L0 `file.*`(created/modified/deleted/renamed) 완벽 · `decisions[]` ↔ `decision` ObjectId + Intent · `git_range` ↔ `evidence.ref` · L2/L3 집계 ↔ ② fold(ODD가 더 엄격).

**빠진 개념**:
| 기존 필드 | ODD 처리 | 판정 |
|---|---|---|
| `semantic.issues[]{level,description,filed_as}` | **① 타입 없음** | ❌ **issue 1급 승격**(전 계층 핵심 추적, level gate 판정) |
| `execution.model` | actor는 agent명만 | ❌ → `actor` 또는 payload 흡수 (Model Routing 추적) |
| `duration_ms`/`started_at`+`completed_at` | L0는 point-event(ts 1개), 구간 없음 | ❌ → start/stop 2로그 `follows` 차이로 ② 파생 규약 필요 (DORA lead_time 의존) |
| `tool_calls`, `techniques` | payload 흡수 | ⚠️ 승격 불필요 |
| `ssot_refs{doc,section,status}` | file + section 입도 없음 | ⚠️ `check`를 ssot-conformance까지 확장 검토 |
| `knowledge_extracted{lesson}`, `retrospective`(KPT) | 대응 좌표 전무 | ❌ 회고적 학습(MEMORY 핵심) 누락 — concept 흡수 or 규약 |

**충돌**: ① sequence_id/phase_id(문자열 slug, W3C Trace) ↔ ODD part_of(LogId) ID공간 불일치 · ② status enum(`partial` 대응 없음) · ③ span(OTel) vs point-event(Prime Event Structure) 시간모델 전환.

**판정**: 기계/결정 필드는 정합 우수(ODD가 더 견고). **issue 누락이 심각** + model/span/lesson 좌표 부재.

## 우선순위 권고
1. ODD L1/L2/L3 표기 폐기 (용어 충돌 — 매핑보다 선행)
2. 흡수 통합 명시 (L0=진실, 3-Layer=파생 뷰, decisions.jsonl 중복 해소)
3. `issue` 7번째 타입 승격 (사용자 결정: **승격 확정**)
4. model→actor 흡수 · span 파생 규약 · ssot-conformance check 확장
5. 집계 materialized→재생성 캐시 격하
6. sequence/phase ID공간 마이그레이션 (레거시 매핑 — 보류)
