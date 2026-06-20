# RFC: ODD — Ontology-Driven Development (v3)

> Status: Draft v3 (2026-06-20) · vNext Operational State Runtime의 통합 우산
> v2 → v3 (사용자 교정 + 11축 적대검증의 *유효* 부분 반영):
> 1. **재실행 엔진 아님** — 로그는 과거 사실 기록 + 파생 객체로 갭 메우기. Temporal 재실행 기계장치(execution_class·검출게이트·봉인·CAS) 제거. 재생 = (A)상태복원 + (B)조회만.
> 2. **온톨로지 방향 정정** — "강등"이 아니라 *원래 설계*. 로그가 진실, 온톨로지는 로그에서 파생되는 정보제공 객체. (v1~v2의 "OKG=ground truth"는 오기재였음)
> 3. **hook = ODD 런타임이 소유** — 도구 중개로 하네스 무관 fail-closed. 하네스는 LLM 제공자로 격하.
> 근거: [prior-art](../research/odd-prior-art-2026-06-19.md) · [이론](../research/odd-theory-foundations-2026-06-20.md) · [적대 라운드1](../research/odd-adversarial-review-2026-06-20.md) · [적대 라운드2](../research/odd-adversarial-review-round2-2026-06-20.md)

---

## 1. 핵심 원칙

```
로그 = 이미 일어난 결정된 사실 기록 (append-only, 불변 — 과거는 안 바뀜)
   │ fold / 가공
   ▼
파생 객체(온톨로지 = OKG) = 로그에서 도출된 정보제공 객체
   │ 제공 (tsq context resolve)
   ▼
이후의 "갭"을 메움 = 에이전트가 다음 결정 시 컨텍스트 확보 (망각/환각/비일관 보강)
```

- **로그가 진실(source of truth)**, 온톨로지는 로그에서 *파생*(읽기 최적화 view + 정보제공 객체). 진실 화살표는 항상 로그→온톨로지.
- **재실행 엔진이 아니다.** Temporal에서 빌린 것은 "이벤트 이력으로 상태를 복원·활용한다"는 개념 하나뿐. 결정론 코드 재실행(Temporal 본질)은 LLM이 행위자이므로 불가하고, *목표도 아님*.
- **§18 목표 불변**: 검증되지 않은 invalid state가 commit되지 못하게 (evidence-gated).

## 2. 닫힌 루프

```
OKG(파생 진실 형상) ──context resolve──▶ 에이전트 개발(DDD→BDD→TDD)
     ▲                                          │
     └──fold/갱신──◀ 로그 append (ODD 런타임이 행위 중개하며 기록)
```

## 3. 2-레이어

```
WRITE (진실): append-only 로그. 이미 일어난 사실. ODD 런타임이 행위를 중개하며 기록.
   │ fold (순수 함수)
READ (파생): OKG 온톨로지 인스턴스 · 로그 레인 view · state · context resolve 결과
```
read는 언제든 로그에서 재생성 가능(invalidate→regenerate). write가 진실, read가 형상.

---

## 4. ★ 로그 레인 (Log Lane) 정의

레인은 로그 종류별 분류다. 각 레인은 내부적으로 선형(시간순)이고, 레인끼리 cross-link으로 엮여 **면(surface)을 이룬다**(read 레이어의 1급 산출물). `lane = map(activity)` — activity name에서 결정론적으로 유도되는 view(별도 저장 아님).

**4 레인** (전부 occurrent = 일어난 사실):

| 레인 | 답하는 질문 | 발행원 | evidence tier | activity 예 |
|---|---|---|---|---|
| **Intent** | 왜 / 무엇을 하려 (사실 이전) | agent(plan) | T2/T3 | `decision.made` · `plan.committed` · `criteria.defined` · `domain.modeled` |
| **Action** | 무엇을 했나 (불변 사실) | ODD 런타임(도구 중개) | T1/T2 | `method.created` · `file.changed` · `commit.made` · `test.created` |
| **Observation** | 외부에서 무엇이 도착했나 (mind←world) | external | T1/T2 | `ci.result.received` · `user.interrupt` · `fs.changed` · `alert.raised` |
| **Verification** | 의도대로인가 (증거) | ODD 런타임 / agent(서명) | **T1 또는 S(서명)** | `test.passed` · `property.verified` · `mutation.run` · `gate.checked` · `signoff.attested` |

**State = projection (1차 레인 아님)** — 로그를 fold한 현재 형상. continuant(지속하는 현재값). 별도 append 없음.

레인 규율:
- **Action이 결정론 척추** — ODD 런타임이 도구를 중개하므로(§10), Action event는 LLM 자기보고가 아니라 *런타임이 직접 관측해 기록*. (적대검증의 "누가 채우나" 문제가 여기서 해소.)
- Intent는 agent 발행이라 best-effort(분석/결정/계획). Verification 판정은 oracle-based(test/type, 다수) + 서명(주관검증: 게임 재미/UX).
- 한 event = 한 lane(주 분류). 검증 *행위*는 Action event(`test.created`), 검증 *판정*은 Verification event(`test.passed`)로 분리.
- 미매핑 activity → Intent 레인(best-effort) + 경고. `map`을 전함수로 닫음.

## 5. ★ 로그 스키마 (Event)

```
Event {
  id:        ULID                  // 고유 식별 + dedup
  ts:        timestamp             // 발생 시각 (이미 일어난 사실의 시점)
  actor:     "hook:" | "cli:" | "agent:" | "external:"   // 발행원 (신뢰 등급의 근거)
  activity:  string                // 무슨 일이 일어났나 (→ lane은 여기서 유도)
  objects:   ObjectRef[]           // 관여 대상 (다중). 두 event가 object를 공유하면 연결됨

  // ── 관계 (로그넷 = 면을 짜는 실) ──
  part_of:   EventId?              // 계층: event ⊂ phase ⊂ task   (세로 포함)
  follows:   EventId?              // lane 내 순서                   (세로 선형)
  cause:     EventId[]             // 인과: wasInformedBy (happens-before, 직접 인과만)  (가로)
  used:      EntityId[]            // 참조·소비한 입력 (provenance → context resolve)    (가로)

  // ── 근거 ──
  evidence:  EvidenceRef?          // 산출 증거 (감사 / 갭메우기 / gate 입력)
  payload:   { ... }               // 도메인 사실
}
```

**v2에서 제거된 필드** (재실행 엔진 전용 — 목표 아님): `execution_class`, `side_effect`, `model{seed,prompt_hash}`, `used[].digest`(봉인), `seq`(전역 단조 — `cause`+`ts`로 충분), non-determinism 검출 게이트. hash chain은 무결성용으로 *후순위*(위협모델 생길 때).

발행원별 신뢰 (gate가 신뢰할지 결정):
| actor | activity 출처 | gate 취급 |
|---|---|---|
| `hook:`/`cli:`/`external:` | 코드/외부 스키마가 결정론적으로 발행 | **신뢰** |
| `agent:` | LLM이 선언 | best-effort, 판정 근거로는 evidence(T1/S) 요구 |

## 6. ★ 노드 관계성 (Ontology Schema)

로그(Event)를 fold하면 노드/엣지 그래프(OKG)가 나온다. 노드는 PROV 3분류 위에 도메인 타입을 얹는다.

**노드 타입**:
```
Activity 계열 (occurrent, 로그에 직접 기록):  Task · Phase · Sequence · Event
Artifact 계열 (continuant, fold로 파생):     File · Method · Test · DomainConcept · DataModel
근거 계열:                                    Evidence · Decision · Constraint
주체:                                        Agent
```

**관계(엣지) 타입 + 형식 성질**:

| 관계 | 방향 | 형식 | 용도 |
|---|---|---|---|
| **part-of** | 하위 Activity → 상위 Activity | strict partial order (추이·비반사·비대칭), **구성적 포함만** | 계층 (Event⊂Phase⊂Task). 조직 소속은 `member-of`로 분리 |
| **follows** | Event → Event | strict total order (선형) | lane 내 순서 |
| **wasInformedBy** (cause) | Event → Event | happens-before (논리시계, 물리 ts 비교 금지) | 인과. 직접 인과만 저장, 체인은 질의 시 도출 |
| **wasGeneratedBy** | Artifact/Evidence → Event | — | 무엇이 이 산출물을 만들었나 |
| **used** | Event → Entity | — | 무엇을 참조·소비했나 (context resolve 입력) |
| **wasAttributedTo** | Entity → Agent | — | 책임 주체 |
| **implements** | Method → DomainConcept | — | 도메인 구현 |
| **verifies** | Test/Verification → Method/Concept | — | 검증 대상 |
| **has-evidence** | Entity → Evidence | — | 근거 부착 |
| **wasDerivedFrom** | Entity → Entity | — | 파생 (자동추론 불가 → 명시 기록) |

**관계 다이어그램 (예: `Order.cancel` 작업)**:
```
Task:cancel-order
   ▲ part-of
Phase:impl
   ▲ part-of      ▲ part-of           ▲ part-of
  E1(method.created)─follows→E2(test.created)─follows→E3(test.passed)
   │wasGeneratedBy        │wasGeneratedBy       │wasInformedBy→E2, used→Test
   ▼                      ▼                      ▼has-evidence
 Method:Order.cancel ◀─verifies─ Test:cancelTest   Evidence(T1, Verification)
   │implements
   ▼
 DomainConcept:order-cancellation (invariant: 총액≥0)
```
→ 선형(follows) + 계층(part-of) + 인과(wasInformedBy/used) = **면(surface)**. 모든 관계가 같은 로그에 함께 기록.

## 7. 파생 객체 (OKG) + context resolve — 갭 메우기

- **OKG = 로그 fold 결과** = 노드(위 타입) + 엣지(위 관계)의 LPG. 로그에서 파생되며 언제든 재생성.
- **DomainConcept** = DDD 모델을 살아있는 노드로. facet 통합(도메인 의미 + invariant + 구현 + 검증 + evidence). 로그 fold로 점진 형성.
- **`tsq context resolve <object>`** = 주어진 object에 대해 관련 로그를 fold → `{결정(Decision)·제약(Constraint)·미해결 evidence·의존(used/depends-on)}` 반환. **이게 "빠르게 낭비없이 올바른 결정 제공" = ODD의 존재 이유.** fold + objects[] 위 O(n)으로 구현 (MVP 1급).

## 8. 방법론 융합 (DDD/BDD/TDD) — activity name으로 결정론화

방법론 단계가 곧 activity name → write에 결정론적으로 박힘:
```
DDD:  domain.modeled · invariant.defined        (invariant → property test)
BDD:  scenario.committed (Given-When-Then = criteria)   ← Verification spec
TDD:  test.created(red) · test.passed(green) · refactor.done · mutation.run · property.verified
```
- DDD `invariant` → Verification의 property test 대상. ubiquitous language → activity name 어휘(= 온톨로지가 개발을 *driven*).
- 이중 루프: BDD 시나리오(바깥) → TDD red-green(안쪽). evidence tier를 "test.passed"로 추상화하지 말고 **방법론 evidence**(property 통과·mutation 생존율)로 구체화.

## 9. Gate — evidence-gated completion (해자)

```
Gate = write 로그 위 직접 필터 (O(n) scan, graph reachability 아님)
  completion : task.done 전 — 그 task object를 가진 event 중 lane=Verification ∧ evidence.tier∈{T1,S}가 존재?
  capability : 현재 phase 허용 activity인가? (phase 정의는 §11 — 우선 "허용 activity 집합")
  causal     : cause 엣지가 happens-before 위반 없나?
```

**hook = ODD 런타임이 소유 (사용자 핵심 교정)**:
```
[기존] 에이전트 ─직접─▶ 파일/shell/git, ODD는 하네스 hook에 의존
[v3]   에이전트 ─▶ ODD 런타임(도구 중개) ─▶ 파일/shell/git
       → 모든 행위가 ODD를 거침 = 런타임이 곧 hook = 하네스 무관 fail-closed
       → 행위를 직접 관측하므로 Action 로그가 자기보고 아닌 런타임 기록 (§4 척추)
```
- 하네스(Claude Code/Codex)는 **LLM 제공자로 격하**. 강제력은 ODD가 소유 → Codex에서도 fail-closed.
- **우회 방지 (1급 설계)**: 에이전트에 ODD 도구만 노출 + 샌드박스/OS 격리로 직접 파일·shell 접근 차단.
- 보조: git pre-commit(universal 사후 안전망).

## 10. 재생 (단순 — 재실행 엔진 아님)

- **(A) as-of 상태 복원**: 로그를 fold해 과거 시점 OKG/state 재구성. 순수 함수라 결정론. ✅
- **(B) 조회 / 갭 메우기**: 파생 객체·evidence를 에이전트에 제공(context resolve). ✅ = §7.
- **(C) 진짜 재실행**: 목표 아님. LLM이 행위자라 결정론 보장 불가 — 제외.
- evidence는 "재생 입력 봉인"이 아니라 **감사·조회·갭메우기 기록**. Temporal에서 빌린 건 (A) 개념뿐.

## 11. Evidence (단일 스키마)

```
Evidence { id: sha256-<hash>, tier: T1(machine) | T2(artifact) | T3(narrative) | S(signed-attestation),
           wasGeneratedBy: EventId, wasAttributedTo: AgentId, ref }
```
- task.done = T1 또는 S. T3(대화)는 맥락용, 완료 근거 불가.
- S(서명) = 주관검증(게임 재미/UX) 정식 경로. machine-verifiable provenance(누가 언제 서명).
- ⚠️ `vnext-v0.2.md`의 evidence 스키마와 동결 전 머지 (§13).

## 12. 적대검증 반영 기록 (11축 중 *유효* 부분만)

| 지적 | 처리 |
|---|---|
| "누가 채우나"(자기보고) | ODD 런타임 도구 중개로 Action을 직접 관측 (§9) |
| gate=graph reachability 거짓MVP | 로그 필터(O(n))로 (§9) |
| 온톨로지 강등=배신 | **무효** — 원래부터 로그→파생. ground truth 오기재 정정 (§1) |
| 재생 (C) 원리불가·검출게이트 역설·봉인 비용 | **무효화** — 재실행 엔진 제거 (§10). 관련 필드 삭제 (§5) |
| DDD/BDD/TDD·context resolve·면 누락 | 복원 (§4·§7·§8) |
| seal vs classify, §4 불변식 모순 | write=사실 기록(분류 안 함), lane=read 유도로 정리 (§4·§5) |
| OCEL 과적용·entity resolution 공백 | objects[]=단순 배열 + 공유연결(set intersection). 풀 OCEL 제외 (§5·§13) |
| Codex fail-open | **갱신** — ODD 런타임이 도구 소유하면 Codex도 fail-closed (§9) |
| evidence 3갈래 | 단일 스키마, vnext-v0.2 머지 미완 (§11·§13) |

## 13. 로드맵 (MVP)

1. **MVP**: append-only 로그 + objects[] + activity→lane 매핑 + **evidence-gated completion(로그 필터)** + OKG fold(DomainConcept) + **context resolve v0** + state fold. → ODD 차별점이 MVP에 실재(OpenHands식과 구별됨).
2. **런타임 hook(b)**: 도구 중개 계층 + 우회 방지(도구 제한/샌드박스) → 하네스 무관 fail-closed.
3. **방법론 activity 카탈로그**(DDD/BDD/TDD) + evidence 구체화.
4. **후순위**: hash chain/서명, conformance alignment, bitemporal, 도메인 플러그인(게임/OS evidence).
- 언어: TS 프로토타입 → Rust/Go는 daemon/성능 단계.

## 14. 미해결

- S4 State machine / S5 Process module (DomainConcept 생명주기, 도메인별 phase 시퀀스).
- objects[] 식별 규칙 (단, 풀 entity-resolution 아닌 단순 ID 규약으로).
- 도구 중개 우회 방지 구체 (샌드박스 수준).
- `vnext-v0.2.md` evidence 머지.
- 저장 백엔드(jsonl+fold vs 임베디드 graph).
- wave 병렬 충돌 (conflict/invalidates 엣지 cross-object).
