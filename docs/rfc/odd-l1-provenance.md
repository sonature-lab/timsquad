# ODD ② — L1 Provenance Projection · v2

> Status: Draft v2 (2026-06-20) · 적대 2축 리뷰(resolve fold 결정성 / alias·증분·캐시 정합) 반영
> 범위: **L0 로그 fold → 대상별 이력·출처·현재 상태.** ①§4 정체성 계약의 *실행*(resolve), alias-index, 증분 fold, 파생물(span·집계), 게이트 freshness.
> 범위 밖: ObjectId 식별 계약(① — 변경 금지), 코드 구조(③), OKG 합성(④), 강제(L3).
> 전제: [L0](./odd-log-schema-L0.md) · [① 대상 노드](./odd-object-model.md) v3.1 · 정합: [legacy-log-alignment](./odd-legacy-log-alignment.md)

---

## 0. 설계 원칙

- **② = 파생, regenerate 가능.** 캐시가 날아가도 L0 fold로 복원. ①(append-only/식별)만큼 신중할 필요 없음 — **단 두 예외**: (a) fold *정의*의 정확성(틀린 정의는 재계산해도 틀림), (b) **게이트 판정 입력**(§7 — stale이 판정으로 새면 안 됨).
- **진실은 L0, ②는 뷰.** ② 산출은 전부 "L0 fold 결과"(L0 ⑥ "파생 저장 X = 진실 아님"). 저장은 캐시.
- **모든 ② 파생은 L0의 dedup-set 위에서 계산** (`id`/`dedup_key` union 후, L0 ②⑩). **도착 스트림 카운팅 금지** → at-least-once 재도착 멱등(§6.3).

## 1. 레이어 맥락

```
L0  로그 (append-only 진실)
①   ObjectId 계약 (타입·식별·정체성 — 불변)
②   Provenance ★ ← resolve()·이력·alias-index·span·집계캐시·게이트 freshness
③   analyzer 구조 그래프 (별도 id공간)
④   OKG = ② + ③ 합성
```

## 2. resolve() — ①§4 정체성 계약 실행

```
resolve(ObjectId | label) → ProvenanceView {
  canonical:  ObjectId | null     // 라벨 해소된 ULID. forked면 null
  tips:       ObjectId[]          // 현재 유효 이름표 (보통 1, 분기면 N)
  forked:     bool                // tips ≥ 2 = identity_conflict
  status:     active | retired | open
  by_tip:     { <tip>: { status, payload, history } }   // forked 시 per-tip (단일이면 1개)
  provenance: { generated_by, derived_from, used[] }     // W3C PROV 어휘
}
```

### §2.1 정체성 walk (directed time-respecting)
1. **alias 해소**: 라벨이면 alias-index(§4)로 ULID 후보 조회. 다대다면 **각 후보에 walk 수행**(ULID는 결정적 앵커 ①§3.3 → 각각 결정적) → forked.
2. **walk**: ObjectId를 `targets`로 가진 **정체성 이벤트**(renamed/superseded/merged/split/weakened/strengthened/amended/retired/resumed)를 `rel.follows` DAG로 directed walk. 방문 `(ObjectId, log_id)` 기록 → 사이클·이름재사용 차단. L0 ③(acyclic) → **종료 보장**.
3. **tips (★ leaf 정의 — 어휘 열거 폐기)**: tip = **종료 어휘**(`superseded`·`merged_from`·`split-consumed`·`retired`)에 **소비되지 않은 follows-DAG의 leaf**. (전진 어휘를 일일이 열거하지 않음 → 새 어휘 추가 시 자동 수용. weakened/strengthened/amended/resumed 모두 "종료 안 된 leaf"로 자연 포함.)
4. **forked**: tips ≥ 2 → `identity_conflict`(L0 ⑥ 파생, **저장 안 함**). `canonical=null`, by_tip에 각 tip view. **자동 canonical 선택 금지** → ①§3.4 self-heal로 명시 머지 위임.
5. **status**: follows-leaf가 `*.retired`(이후 `*.resumed` 없음)면 retired. start만 있고 stop 없으면 `open`(§5 미완 span).

### §2.2 payload fold (★ 모든 기여 이벤트)
- payload view = **payload 기여를 갖는 모든 이벤트의 follows-체인 누적**:
  - `*.amended` → `{field}` 기여 (내용 진화)
  - `weakened`/`strengthened` → `{to_predicate}` 기여 (★ 정체성이면서 predicate 변경 — v1 누락 수정)
  - 즉 "정체성=구조only / amended=내용only" 이분법 폐기 → **각 이벤트는 (라인 기여, payload 기여) 둘 다 가질 수 있음**.
- file 등 external: payload 대신 `evidence.ref`(content-hash) 추적만.

## 3. provenance + evidence-gated (게이트 freshness)

- **history**: L0 다축 인덱스 `(targets)`로 O(n) 필터 → 이 ObjectId 향한 로그 시간순. (forked면 by_tip별.)
- **provenance 어휘**(W3C PROV, L0 §5): `wasGeneratedBy`·`wasDerivedFrom`(**명시 로그만**, L0 ⑦ 자동추론 금지 — reverse-dep 무효화 전파 ≠ derivation 주장)·`used`.
- **evidence-gated completion** (① 간판, ★ freshness):
  - 판정 = `resolve(task:X)`의 history에서 `lane=Verification ∧ result=pass ∧ evidence≠∅` 존재 검사 (O(n) L0 직접 필터 — **캐시 우회**).
  - **forked task는 게이트 통과 금지** (미해소 identity_conflict 우선).
  - **게이트 입력은 항상 L0 직접 fold** (§7 freshness 계약). 집계 캐시 신뢰 금지.

## 4. alias-index (concept 라벨 → ULID)

①§3.3이 "alias-index = ② 1급 파생"으로 위임. **best-effort**(①이 비결정 수렴 못박음).
- 구조: `label → ObjectId[]` **다대일(동음이의는 다대다)**. `concept.aliased` 이벤트로 증분.
- **단조 악화 방지 (★ v1 누락)**: alias 추가만 가능·제거 불가(L0 ① retract 금지)라 후보가 단조 증가 → 오염 누적. 해소: **`concept.aliased`도 `*.superseded`/`*.retired` 대상** (alias 무력화 = 새 로그, append-only 양립). resolve는 **활성 alias=1급, 폐기/충돌 alias=2급**으로 2층 분리해 후보 격하.
- **오염 알람 (미결→계약)**: 한 라벨이 N개 초과 concept에 걸리면 발행 게이트 경고(단조 악화 하한).
- 조회: 단일 후보=수렴, 다수=self-heal 후보 제시→writer 명시 선택(①§3.4).

## 5. 파생물 (정합성 반영 + 한계 명시)

| 파생 | 계산 | 한계 (★ v2) |
|---|---|---|
| **span/duration** | start/stop 2이벤트 ts 차이 | ⚠️ **cross-writer ts = L0 ⑤ 위반**(start/stop 다른 writer면 wall-clock 차이 무의미). → `payload.observed_at`(L0 ⑩) 차이로 계산 + 시계 동기 가정 명시. 못 믿으면 **best-effort 파생**. **미완 span**(crash, stop 없음)=`open`, DORA 평균서 제외(별도 버킷) |
| **집계**(dora/aggregate/axis) | targets/part_of 인덱스 fold → 카운트·비율 (dedup-set 위, §6.3) | **재생성 캐시**(진실 아님). **게이트는 신뢰 금지**(§7) |
| **concurrency/conflict** | `concurrent(a,b)≜¬(a≤*b ∨ b≤*a)` (L0 ⑥) | 파생 술어, 저장 X |

- **span/집계는 게이트 판정에 직접 쓰지 않는다** — 둘 다 stale·부정확 가능(§7).

## 6. 증분 fold + 캐시

### §6.1 dirty 추출 (★ payload ObjectId + reverse-dep)
새 L0 로그 → dirty set = **`targets` ∪ payload의 모든 ObjectId 필드 ∪ reverse-dep 폐포**:

| 정체성 activity | dirty 기여 ObjectId |
|---|---|
| `*.amended`/`weakened`/`strengthened` | targets |
| `concept.merged` | targets[a,b] + **payload.canonical** (★ v1 누락 — canonical은 targets 아님) |
| `concept.split` | targets[orig,a,b] + payload.split_into |
| `*.superseded` | targets + payload.by |
| `constraint.weakened` | targets + **verifies하던 check (reverse-dep)** |

- dirty 추출 = **resolve의 identity walk와 같은 어휘로 통일** (walk 방문 = dirty 후보). 두 메커니즘 분기 금지.
- 재fold = **dedup-set 기준 전체 재계산**(델타 누산 아님) → 멱등.

### §6.2 캐시 (★ 2-plane — ULID 대상 분리)
ULID 대상(로그네이티브 5/6 타입)은 디렉토리 소속이 없어 merkle 축이 없다 → plane 분리:

| plane | 대상 | 샤딩 | 무효화 |
|---|---|---|---|
| **file-plane** | `file` | 디렉토리 2단 + content-hash **merkle** | 파일 변경 + L0 로그. early cutoff |
| **log-native-plane** | task/decision/concept/constraint/check(/issue) | **ULID prefix**(timestamp 부분) 2단 버킷 | **L0 로그 도착(dirty-set)만** (merkle 아님) |

- cross-target 참조 = 별도 **reverse-dep 인덱스**(양쪽 중복 금지). 무효화 전파는 §6.1 dirty와 합집합.
- 캐시=파생 → 날아가도 L0 재fold 복원.

### §6.3 멱등
모든 ② 파생은 **L0 dedup-set(`id`/`dedup_key` union 후) 위에서 계산**. 도착 스트림 카운팅 금지. dirty=집합(중복 무해), 재fold=dedup-set 전체 재계산 → at-least-once 재도착 멱등(L0 ②⑩).

## 7. 게이트 freshness 계약 (★ 안전 — 최우선)

② 캐시가 "진실 아님"이라도 **게이트가 신뢰하면 stale truth가 판정으로 부활**(vNext 차단 대상). 따라서:
- **판정 영향 집계**(verdict/proceed/done/phase gate)는 **게이트 시점에 L0 재fold 강제** — 캐시 우회.
- 또는 **freshness watermark**: 캐시에 "반영한 L0 frontier(ctx별 max writer_seq)" 기록 → 게이트 시점 L0 frontier와 일치할 때만 캐시 신뢰, 불일치면 재fold.
- **2등급 명시**: 게이트-신뢰 집계(freshness 검증 필수) vs UX-집계(탐색·표시, best-effort).

## 8. 책임 경계 + 후순위
- 계약=①, 실행=②. alias-index·집계·span·캐시 = ② 소유(파생). 판정 자체 = L3/게이트(입력은 L0 직접).
- **미결**: split-then-merge diamond **canonical 선택 규칙**(현재 = forked 유지+self-heal, 자동선택 금지) — Q2 dirty 정확성의 선결조건 · alias 오염 검출 자동화 정도 · 캐시 샤드 입도(③ 공유) · issue provenance(① 정합 반영 후) · span 시계 동기 가정 정밀화.

---

## 변경 이력
- **v2** (적대 2축): tip=**종료 안 된 follows-leaf**(어휘 열거 폐기, weakened/strengthened 누락 수정) · payload fold=**모든 기여 이벤트** · forked **per-tip + canonical null** · evidence-gated **forked 금지 + L0 직접** · **게이트 freshness 계약**(§7 안전) · dirty=**targets∪payload ObjectId∪reverse-dep**(canonical 누락 수정) · 캐시 **2-plane**(file merkle / log-native dirty-only) · span **cross-writer/open 한계** · alias **supersede 무력화**+오염 알람 · 멱등=dedup-set 위 계산.
- v1: resolve·provenance·alias·증분·캐시 후보안.
