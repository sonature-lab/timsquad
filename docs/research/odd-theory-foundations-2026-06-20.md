# ODD Theory Foundations Research (2026-06-20)

> ODD/OKG "로그 레인(log lane)" 분류의 *이론적 근거* 조사. [prior-art 조사](./odd-prior-art-2026-06-19.md)의 후속.
> 목적: 잠정안 4레인(intent/action/verification/state)을 정보이론·온톨로지·행위이론으로 검증.
> 방법: WebSearch 직접 조사(WebFetch 일부 차단 → 1차 출처 인용). 하위 에이전트 미사용.
> 이 문서 자체가 ODD 개발의 raw evidence (도그푸딩).

---

## 조사 1 — 로그·관측가능성·정보 이론

### 핵심 결론
**4레인 분류 기준이 혼재.** intent/action/verification = "정보의 인과적 위상" 축, state = "표현 형식(projection)" 축 — 다른 두 축을 한 레벨에 섞음. → **state를 1차 레인에서 강등, 나머지 3레인의 lazy projection으로.**

### 근거
- **관측가능성 신호 분리 기준 = "각 신호가 답하는 질문의 종류가 다르다"** (유일한 근본 기준). metrics=무엇/얼마나, logs=왜, traces=어디서. OTel은 각 signal = "독립적으로 완결된 기능 집합"으로 정의. baggage = 신호가 아니라 신호 간 전파되는 **context(cross-link 키)**.
- **로그 종류 분류 = severity 아니라 목적(purpose)**: application/operational/**audit(책임성·장기보존)**/transaction/event. Palantir: "무엇이 일어났나" 기준 표준 카테고리 + 카테고리별 공통 파라미터(스키마) 강제 → 레인 내부 선형성을 스키마로 보장.
- **Stripe canonical log line (= state의 정체)**: 요청당 1줄 dense wide-event, "pre-joined". = 여러 레인을 요청경계에서 cross-link해 lazy projection한 집계 레코드. **state는 1차 소스 아니라 파생 wide-event.**
- **정보이론(Shannon)**: 상호정보 `I(X;Y)`. 두 레인은 `I`가 낮을(거의 독립일) 때만 분리할 가치. `I(action;state)` 높음(state=action의 함수) → 중복 → 강등 근거. source-channel separation은 소스가 상관되면 비최적 → **cross-link을 1급으로 둔 다선형(면) 구조가 순수 분리보다 우월.**
- **CQRS 매핑**: intent↔Command(사실 이전), action↔Event/Fact(불변 기록), state↔Query/read model(=projection, 동격 아님), verification↔독립 정보원(맹점 보완). 
- **Kimball fact/dimension**: 각 레인의 **grain(1레코드가 표현하는 것)을 명시 선언** — "grain 미선언"이 1순위 실패. 

### cross-link 이론 근거 (확정)
OTel context propagation(trace_id 공유)·baggage(인과 수립)·exemplar(집계→개별 대표 포인터) + Shannon mutual info(`I>0`=교차할 정보 존재). → 모든 레인 레코드는 공유 correlation_key 보유, 교차선을 1급 엣지로, state↔레인은 exemplar식 대표 포인터만.

### 출처
- opentelemetry.io/docs/concepts/signals/ · /signals/baggage/ · /context-propagation/
- crowdstrike.com/.../three-pillars-of-observability/ · honeycomb.io/blog/time-to-version-observability (wide events)
- edgedelta.com/company/blog/log-types-and-formats · palantir.com/docs/foundry/security/audit-log-categories
- stripe.com/blog/canonical-log-lines · baselime.io/blog/canonical-log-lines
- math.uchicago.edu/~may/VIGRE/VIGRE2008/REUPapers/Delgado.pdf (mutual info) · arxiv.org/abs/0902.4647 (source-channel)
- martinfowler.com/bliki/CQRS.html · event-driven.io/en/cqrs_facts_and_myths_explained/
- kimballgroup.com/2003/01/fact-tables-and-dimension-tables/

---

## 조사 2 — 온톨로지 기초 이론

### 핵심 결론
OKG 노드/레인의 존재론적 척추 = **BFO continuant(지속체) vs occurrent(발생체)** 이분법. → 로그(append)는 전부 occurrent(intent/action/verification), **state는 continuant = occurrent들의 projection** (조사 1의 강등을 존재론으로 재확인).

### 근거
- **BFO**: continuant=시간 속 전체가 통째 존재, 시간적 부분 없음, 정체성 유지(예: File/Task/Agent). occurrent=시간에 걸쳐 펼쳐지며 시간적 부분 가짐(예: commit/build/test 실행). 대조축 = "시간적 부분 유무". BFO는 3D/4D 둘 다 표상도구로 포용(perspectivalism).
- **DOLCE 4범주**: endurant/perdurant/quality/abstract. perdurant는 stative(state/process) vs event로 세분. status값("blocked","stale") = dependent continuant(quality/role).
- **노드 ↔ PROV-O 1:1**: Agent=prov:Agent, Event(action/build/commit)=prov:Activity(startedAtTime/endedAtTime), File/Evidence=prov:Entity. 표준 차용 → 감사추적·상호운용 공짜.
- **관계 형식 토대**:
  - **part-of** = mereology proper parthood = **strict partial order(추이·비반사·비대칭)**. ⚠️ 구성적/물리 포함만 — 조직/기능 포함(사람-팀-회사)은 추이성 깨지므로 별도 `member-of`로 분리.
  - **follows** = Allen interval algebra. **before/meets/during 3개**면 충분(13개 전체 노출 금지). 추이·비대칭.
  - **causedBy** = 인과 ODP. **시간선행 공리(원인 end ≤ 결과 start) 강제** = gate 삽입검증. 직접 인과만 저장 + mediator 노드 분리. causal law(타입/TBox) vs causation(인스턴스/ABox) 구분.
- **TBox/ABox = 메타모델/인스턴스**: TBox=노드·엣지 타입+공리(저빈도), ABox=로그 인스턴스(고빈도). 물리 분리 권고. 대용량 단순 ABox는 룰/datalog·lazy(무거운 OWL DL 금지).
- **4D perdurantism ↔ bitemporal**: state 노드 = continuant 정체성 + 시간적 부분(버전). valid time(코드가 실제 그랬던 때) + transaction time(OKG 관측 때) 분리 → stale-truth 차단 직결.
- **Evidence 범주 분리**: 검증 *행위*(occurrent/Activity) vs 산출 *증거*(continuant/Entity) — 한 노드로 뭉개면 provenance 깨짐.

### 피해야 할 함정
① 상위온톨로지 과적용(continuant/occurrent 한 축만 차용) ② part-of 의미 혼합 ③ 인과 추이성 무비판 적용 ④ 시간선행 공리 누락 ⑤ TBox/ABox 혼동 ⑥ 3D/4D 종교전쟁(둘 다 표상도구로) ⑦ 대용량 ABox에 OWL DL 상시추론 ⑧ Evidence 범주 모호.

### 출처
- BFO: sciencedirect.com/topics/computer-science/basic-formal-ontology · stephendiehl.com/posts/bfo/ · pmc.ncbi.nlm.nih.gov/articles/PMC12423956/
- DOLCE: ontolearner.readthedocs.io/benchmarking/upper_ontology/dolce.html · philarchive.org/archive/BORDAD-3
- Mereology: plato.stanford.edu/entries/mereology/ · ontology.buffalo.edu/smith/courses03/tb/mereology.pdf
- Allen: en.wikipedia.org/wiki/Allen%27s_interval_algebra
- TBox/ABox: cs.ox.ac.uk/people/ian.horrocks/Publications/download/2007/BaHS07a.pdf
- PROV-O/ODP: w3.org/TR/prov-o/ · arxiv.org/pdf/1904.05405
- 인과: link.springer.com/chapter/10.1007/978-3-031-34241-7_11 · content.iospress.com/articles/applied-ontology/ao147
- 4D/bitemporal: en.wikipedia.org/wiki/Perdurantism · tedsider.org/papers/4d.pdf · en.wikipedia.org/wiki/Bitemporal_modeling

---

## 조사 3 — 행위·프로세스 이론 (Petri net / 화행 / Activity Theory)

### 핵심 결론
**4안은 "절반만" 정당.** action·state는 확립 이론에 직접 대응(Activity Theory action / Petri marking=state)하나, **intent는 과부하**(화행 3종 혼재), **verification은 독립 레인이 아니라 conformance alignment**(intent↔action을 잇는 관계).

### 근거
- **Searle 화행 5분류** (3축: illocutionary point + direction of fit + psychological state):
  - assertive(word→world, belief) = 분석/진단 결론
  - directive(world→word, want) = 명령 (controller→subagent)
  - commissive(world→word, intention) = 결정/계획 (= BDI intention = AI plan, 3이론 수렴)
  - expressive(null) = 회고/감정 (로그엔 약함)
  - **declarative(both) = "머지했다/배포했다" = action이 곧 state 변경** (Petri transition이 marking 바꿈과 동형)
  → **intent 레인은 assertive/directive/commissive 3종이 뭉친 것** → 서브타입 태그 필요.
- **Activity Theory(Leont'ev 3계층)**: Activity(motive)/Action(goal)/Operation(condition). 매핑: **task=Activity, phase=Action, step=Operation**. sequence는 이론 대응 없음 → ordering(Petri sequence)으로, 별 계층인지 재검토. 다대일(step은 여러 phase서 재사용) → step 노드 공유 가능하게.
- **BDI(Rao&Georgeff)**: belief/desire/intention. **belief = state 레인(단, fallible! 틀릴 수 있음 → evidence+timestamp 필수 = stale 차단 직결)**. goal/intention = intent.
- **Petri net (다선형 cross-link의 정답 모델)**: place=상태(state), transition=사건(action), marking=state값. **AND-split=다선형 시작, AND-join=동기화(cross-link)**. ⚠️ **"same case id token만 동기화" = cross-link은 공통 correlation key로만** (임의 연결 금지, 건전성 깨짐). "choice와 synchronization 섞지 마라"(free-choice).
- **Process mining event log = 우리 로그 스키마 템플릿**: event = `(case_id, activity, timestamp, ...)`. 필수 3: case/activity/timestamp. trace=같은 case의 시퀀스. → alpha miner로 흐름 발견, conformance check로 검증 적용 가능.
- **BPMN**: Event(발생)/Activity(작업=action)/**Gateway(흐름제어, "work 아님 cost=0"=순수 cross-link/동기 노드)**.
- **Plan vs Execution 분리**(HTN/plan mode): plan=intent, execution trace=action. 명시 link 필요. 계층 분해는 intent(plan) 측.
- **Conformance checking = verification의 정체**: plan(model)↔trace(execution) **alignment move**. deviation 2종(model엔 있는데 실행 안 됨 / 실행됐는데 model 불허). → verification = intent↔action을 잇는 관계. 단 "검증 *행위*(테스트 실행)=action", "검증 *판정*(pass/fail)=alignment 산출물" 분리.

### 개선안: 4안 → "4 레인 + 2 메타축"
- intent (화행 서브타입 assertive/directive/commissive 태그) / action (Petri transition, state-delta 가리킴) / state (=belief, fallible, evidence+ts 의무) / verification (행위는 action, 판정은 alignment)
- 메타축: **force/illocution**(Searle, edge label) + **conformance**(plan↔trace 정렬)

### cross-link 모델 (핵심 산출물)
레인=place, cross-link=transition, 동기화=AND-join, **상관=case id만**. 3종 의미적 cross-link: alignment(verification: intent↔action) / plan-link(intent→action) / declarative-delta(action→state).

### 출처
- 화행: plato.stanford.edu/entries/speech-acts/ · Searle 1976 "A Classification of Illocutionary Acts"
- 활동이론: researchgate.net/publication/30389157 · Leont'ev 1981(3계층) / Engeström(contradictions)
- BDI: link.springer.com/chapter/10.1007/3-540-49057-4_1 · Rao&Georgeff "BDI: Theory to Practice"
- Petri/workflow: pages.di.unipi.it/ferrari/CORSI/SISD/Lezioni/WFModel.pdf (van der Aalst) · Workflow Patterns
- process mining: processmaker.com/blog/what-are-event-logs-in-process-mining/ · en.wikipedia.org/wiki/Alpha_algorithm
- BPMN: visual-paradigm.com/tutorials/bpmn3.jsp · lucidchart bpmn-gateway-types
- conformance: esystems.fi/en/blog/what-is-conformance-checking · ceur-ws.org/Vol-1701/paper22.pdf

---

## 수렴 종합 (조사 1+2+3) — 최종 확정안

| 항목 | 정보이론(1) | 온톨로지(2) | 행위·Petri(3) | 확정 |
|---|---|---|---|---|
| **state** | 강등(projection) | continuant | Petri marking = BDI belief(fallible) | ✅ **state = projection, 1차 레인 아님. evidence+ts 의무** |
| **로그 레인** | intent/action/verif 독립 | 전부 occurrent | intent 과부하·verif=alignment | **Intent(화행3분해)·Action·Verification** |
| intent | — | — | assertive/directive/commissive 혼재 | **서브타입 태그 필수** |
| verification | 독립 정보(pass/fail) | — | conformance alignment(intent↔action) | **행위=action / 판정=alignment(독립 정보)** |
| cross-link | correlation key(baggage) | — | **Petri AND-join, same case id only** | 공유 case_id로만 + 1급 엣지 |
| 이벤트 스키마 | — | — | `(case_id, activity, timestamp, ...)` | **필수 3 + lane + force** |
| 계층 | — | — | Activity Theory | task=Activity/phase=Action/step=Operation, intent측 |
| grain | Kimball 명시 필수 | — | — | 레인마다 grain 선언 |
| part-of | — | strict PO(구성적) | — | member-of 분리 |
| follows | — | Allen before/meets/during | Petri sequence | |
| causedBy | — | 시간선행 공리(gate) | — | |
| 구조 | — | TBox/ABox 분리·bitemporal=4D | place/transition 분리 | |

**최종 확정안**:
- **로그 레인 3개**(occurrent, append): **Intent**(화행 서브타입 assertive/directive/commissive) · **Action**(Petri transition, state-delta 가리킴) · **Verification**(검증행위는 Action에, 판정=intent↔action alignment + evidence).
- **State**: 1차 레인 아님 → 3레인의 lazy projection(continuant=Petri marking=BDI belief). fallible → evidence+timestamp 의무.
- **cross-link**: 레인=place, cross-link=transition, 동기화=AND-join. **공통 case_id(correlation key)로만**. 3종 의미: alignment(verif) / plan-link(intent→action) / declarative-delta(action→state).
- **이벤트 스키마**: `(case_id, activity, timestamp, lane, force, ...)` — process mining 호환(alpha miner·conformance 적용 가능).
- **관계 공리**: part-of=strict PO(구성적, member-of 분리) · follows=Allen before/meets/during · causedBy=시간선행 공리(gate 검증).
- **구조**: TBox(메타모델)/ABox(로그) 물리분리 · bitemporal(valid+tx, 4D) · OWL DL 추론 금지(룰/lazy).
- **메타축 2**: force/illocution(Searle, edge label) · conformance(plan↔trace 정렬).
