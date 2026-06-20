# ODD Prior-Art Research (2026-06-19)

> ODD(Ontology-Driven Development) / OKG 설계를 위한 7개 병렬 웹리서치 종합.
> 방법: WebSearch + WebFetch(일부 세션 차단 → 공식 docs/GitHub/논문 WebSearch 인용). 추측 배제, 출처 명기.
> 결정/함정 종합은 [RFC §8](../rfc/odd-ontology-driven-development.md) 참조. 이 문서는 조사 원본 보존용.

---

## 1. Append-only Fact DB / 시간축 (Datomic · XTDB · Dolt)

- **Datomic**: fact 단위 = datom 5-tuple `[E A V Tx Op]`. update/delete 없음(accumulate-only), 변경=retract+assert. Tx 자체가 1급 엔티티(메타/provenance 부착). 시간여행 `as-of`/`since`/`history` = DB-as-a-value(불변 스냅샷, 캐시 무효화 불필요). 인덱스 4벌(EAVT/AEVT/AVET/VAET, VAET=ref 역인덱스). tx-time 1축(uni-temporal). "accumulate-only ≠ append-only"(의미론 vs 물리쓰기).
- **XTDB v2**: 네이티브 bitemporal — `system_from/to`(tx-time) + `valid_from/to`(app-time, backfill/소급 가능). closed-open 구간. opt-in(평소 atemporal). SQL:2011 `FOR VALID_TIME/SYSTEM_TIME AS OF`. Arrow 컬럼너.
- **Dolt**: Git-for-data. prolly tree(content-addressed merkle B-tree) → diff/merge 비용이 트리크기 아닌 *차이*크기에 비례. commit-time 1축.
- 출처: docs.datomic.com/transactions/model.html · /transactions/transaction-data-reference.html · /javadoc/datomic/Datom.html · jepsen.io/analyses/datomic-pro-1.0.7075 · docs.xtdb.com/concepts/key-concepts.html · /about/time-in-xtdb.html · v1-docs.xtdb.com/concepts/bitemporality/ · docs.dolthub.com/architecture/storage-engine/prolly-tree

## 2. Incremental Computation (Salsa · Adapton · Differential Dataflow)

- **Salsa**(rust-analyzer): on-demand PULL. input vs tracked(derived). 전역 revision 카운터, commit=revision++. 메모 노드 `{verified_at, changed_at, deps}`, deps는 읽는 순간 자동 기록. 2단계 검증 `shallow_verify_memo`→`deep_verify_memo`. **backdating**(재계산해도 값 같으면 changed_at 유지→전파 차단). **durability 벡터**(High/Low별 revision → 안정 서브그래프 순회 생략, rust-analyzer 300ms 제거). 약점: 캐시 GC 없음.
- **Adapton**: DCG(cell/thunk), inner/outer 분리, dirty(eager 가벼움)↔clean(lazy 평가) 2단계. demand-driven.
- **Differential Dataflow**: PUSH-eager. collection=(data,time,diff) 스트림, 변경 즉시 operator 그래프로 전파. 분산 IVM용.
- 결론: OKG = "안 읽히는 파생 다수" → **PULL-lazy(Salsa)** 적합. eager는 분산 IVM 필요시만.
- 출처: salsa-rs.github.io/salsa/reference/algorithm.html · /overview.html · rust-analyzer.github.io/blog/2023/07/24/durable-incrementality.html · cs.tufts.edu/~jfoster/papers/cs-tr-5027.pdf · frankmcsherry.org/differential/dataflow/2015/04/07/differential.html

## 3. Event Sourcing 실무

- Event row: `event_id`(UUID, idempotency) · `stream_id` · `version`(앱계산) · `global_seq`(전역, version과 어긋남 가정) · `event_type`(런타임타입과 분리) · payload · metadata(correlation/causation) · `prev_hash`/`event_hash` · `UNIQUE(stream_id,version)`(낙관적 동시성) · `REVOKE UPDATE,DELETE`(append-only).
- Projection = left-fold. catch-up subscription + 체크포인트를 read model과 같은 트랜잭션(exactly-once). rebuild = lock→reset→teardown→replay.
- Snapshot = memoization(N개마다 + 체크섬, 삭제가능, events가 SSOT).
- Idempotency: at-least-once 전제, event_id dedup.
- Hash chain: `SHA256(payload‖prev_hash)`, RFC6962 domain separation(0x00 leaf/0x01 node, second-preimage 차단). append-only ≠ tamper-evident → Ed25519 서명 + 외부 anchor. 규모↑ Merkle(O(log n) inclusion/consistency proof). QLDB digest/Merkle proof 참고.
- 출처: martinfowler.com/eaaDev/EventSourcing.html · softwaremill.com/implementing-event-sourcing-using-a-relational-database/ · learn.microsoft.com/azure/architecture/patterns/event-sourcing · rfc-editor.org/rfc/rfc6962.html · docs.aws.amazon.com/qldb/latest/developerguide/verification.tutorial-block-hash.html · immudb.io/blog/proof-of-untampered-records-in-immudb · transparency.dev

## 4. Temporal Knowledge Graph / LPG vs RDF / OWL (Graphiti)

- **Graphiti**(Zep): `G=(N,E,φ)`, 3계층(episodic/entity/community). **fact = edge property**(Node-Edge-Node triplet). bi-temporal 4-필드 edge: `valid_at/invalid_at`(실세계) + `created_at/expired_at`(시스템). 무효화 = 삭제 아닌 **soft-invalidate**(expired 마킹) + 신규 엣지 병치. dedup은 동일 entity-쌍 범위. 삽입은 사전정의 Cypher(LLM 생성 회피).
- **LPG vs RDF**: LPG=엣지에 속성 네이티브, 깊은 traversal 강함. RDF=엣지 속성에 reification 필요(triple 폭증), SPARQL 종료보장 없음. → OKG는 LPG.
- **OWL 함정**: OWL-DL undecidable~2NExpTime, reasoner가 10k 인스턴스에서 확장 실패(ELK/HermiT/Pellet). → OWL 추론 회피, 패턴매칭+경량규칙(RL 프로파일)으로 한정.
- 출처: arxiv.org/html/2501.13956v1(Zep) · github.com/getzep/graphiti/blob/v0.29.1/graphiti_core/edges.py · neo4j.com/docs/getting-started/data-modeling/versioning/ · arxiv.org/pdf/2110.05028(CaLiGraph reasoner 확장실패) · ontotext.com/blog/reasoning-with-big-knowledge-graphs/

## 5. W3C PROV (provenance)

- 3 타입: Entity / Activity / Agent. Starting Point 관계 6 채택: `used`·`wasGeneratedBy`·`wasDerivedFrom`·`wasInformedBy`(인과)·`wasAttributedTo`·`wasAssociatedWith`. 선택: `actedOnBehalfOf`(위임=controller→subagent), `wasInvalidatedBy`(stale 소멸), `wasRevisionOf`.
- 시간은 Activity start/end로(binary) → qualified 회피. event-sourcing이면 시각이 이미 이벤트에 있어 유리.
- `wasDerivedFrom`은 used+wasGeneratedBy에서 **자동 추론 불가** → 명시 기록 필수.
- 버릴 것: full PROV-O(OWL)/qualified/bundle/collection. 어휘만 차용(향후 PROV-N export 호환).
- 출처: w3.org/TR/prov-dm/ · /TR/prov-o/ · /TR/prov-n/ · /TR/prov-overview/ · /TR/prov-constraints/

## 6. AI 개발 하네스 (코딩 에이전트)

| 도구 | 상태모델 | gate | 핵심 |
|---|---|---|---|
| OpenHands | **event-sourcing SSOT**(replay/fork 공짜) | 위험평가×집행, 단계강제 없음 | Stuck Detection. 무타입 로그(→ ODD는 typed) |
| Aider | git=SSOT + Repo Map(PageRank) | git=게이트 | exit-code self-heal, 편집포맷 준수율 측정 |
| Cline | shadow git checkpoint + Memory Bank | Hooks(PreToolUse cancel) but 모드는 프롬프트 강제 | 자기보고 의존(#8354) |
| **Roo Code** | shadow git, 표시≠저장 truth 분리 | **tool-group 권한으로 모드 강제** + 수치 hard-stop | Custom Modes fileRegex |
| Continue | ~/.continue SSOT | 강제 게이트 없음 | roles |
| **Goose** | SQLite sessions.db + Memory Ext | **Lifecycle Hooks(PreToolUse denial)** | Recipe `retry.checks`(shell/file/regex) |
| **Sweep** | GitHub 이슈코멘트=mutable ledger | **3중 게이트**(sandbox+CI+self-review) | 신규라인 검증 루프백 |
| Amp | 서버 Threads + AGENTS.md 계층 | 권한모델만 | **Oracle=read-only**(쓰기권한 박탈) |
| **Devin** | 3계층(세션/Knowledge/Wiki) | **Confidence 적응형 게이트** | **expectation 선커밋**(passed/failed/untested) |

## 7. Spec/Plan-Driven 도구

| 도구 | SSOT | gate | 핵심 |
|---|---|---|---|
| **spec-kit**(GitHub) | constitution.md(시맨틱 버저닝) | **Constitution Check 2회** | 다운스트림 자동 전파, /analyze 6패스 |
| **Kiro**(AWS) | req/design/tasks + spec.json | Agent Hooks(exit-2 차단) + phase 승인 | EARS 표기. **"completed ≠ 검증" 공식 자인**(#9405) |
| Tessl | .spec.md(코드 1:1) | 인간 승인 4단계 | round-trip(구현→스펙 역반영) |
| OpenSpec | specs/ vs changes/ delta | **rigid 게이트 의도적 거부** | RFC2119 |
| BMAD | 마크다운 체인 | DoR/DoD 프로세스 게이트 | 페르소나 팀, TDD |
| Task Master | tasks.json | 강제 없음(권고) | MCP-first |

**차별점 빈틈 TOP 3** (아무도 동시에 안 함): ① evidence-gated completion ② fail-closed phase gate(코드/상태머신) ③ typed ontology as SoT(마크다운=projection).

- 출처: arxiv.org/html/2511.03690v1(OpenHands) · deepwiki.com/All-Hands-AI/OpenHands · aider.chat/2024/12/21/polyglot.html · docs.roocode.com/features/custom-modes · github.com/cline/cline/issues/8354 · deepwiki.com/block/goose · cognition.ai/blog/testing-development(Devin) · github.com/github/spec-kit · kiro.dev/docs/specs/feature-specs/ · github.com/kirodotdev/Kiro/issues/9405 · github.com/Fission-AI/OpenSpec

---

## 실무 경고

- `.agents/` 경로: 우리=프로젝트 로컬 `.agents/skills/`, Goose=홈 `~/.agents/plugins/`. 스코프 다르나 네이밍 표준 주의. AGENTS.md 보유(Amp/Devin 호환).
- 게이트는 런타임 종속 → MCP 이식 불가. cross-harness는 문서만 이식, 강제력은 universal gate(git)로 공통화.
