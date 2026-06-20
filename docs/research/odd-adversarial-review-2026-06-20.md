# ODD 로그 레인 — 적대적 다축 리뷰 (2026-06-20)

> 대상: ODD 로그 레인 확정안 (3레인 Intent/Action/Verification + State 강등 + Petri cross-link(same case_id) + 이벤트 스키마 + 관계공리 + bitemporal/TBox-ABox).
> 방법: 6축 독립 적대 리뷰어, 각자 RFC + 리서치 2개 직접 읽고 refute 지향. 다중 리뷰어 독립 지적 = 진짜 결함.
> 상태: 4/6 완료(구현·오컴·이론·엣지). 정합성·재생 축 pending.
> 이 문서도 ODD 개발의 raw evidence.

---

## 다중 리뷰어 수렴 결함 (= 진짜 결함)

| # | 결함 | 지적 축 | 핵심 / 수정 |
|---|---|---|---|
| 1 | **LLM 자기보고 의존 = 자기모순** | 구현·오컴·이론·엣지 (4) | force/case_id/grain/intent분류가 LLM이 채워야→비결정. prior-art가 깐 Cline #8354 악화. **결정론으로 잡히는 건 Action(hook)+evidence(해시)뿐** |
| 2 | **case_id = single point of failure** | 구현·엣지 (2 치명) | single case_id가 병렬 wave·cross-case 리팩터링·백그라운드에서 붕괴 → **OCEL object-centric(다중 object ref)** |
| 3 | **이론 cherry-pick** | 이론·오컴 (2) | append-only는 token 소비 없어 Petri와 모순(은유를 동형 위장). state=continuant=marking=belief 4중 봉합 모순 |
| 4 | **과잉설계 ~90%** | 오컴 (전면) | bitemporal/화행5분류/Petri실행/Salsa/hash chain/datom = gate 안 읽는 메타데이터. 진짜 가치(evidence-gated)는 10% |
| 5 | **Observation 레인 누락** | 엣지 (치명) | 외부이벤트(CI·인터럽트·FS변경)가 3레인에 안 맞음(mind←world). 4번째 레인 필요 |
| 6 | **causedBy 시간선행 공리 붕괴** | 이론·엣지 (2) | 물리 ts 강제→클럭스큐·소급·동시성 깨짐. "Lamport 동형" 자기모순 → 논리시계(happens-before) |
| 7 | **Codex fail-closed 불가** | 구현 | git pre-commit은 사후·diff만. 차별점 2/3 플랫폼 종속 → "동일 강제" 철회 |

**관통 메시지**: "결정론으로 잡히는 건 Action(hook)+evidence(해시)뿐. 나머지 분류축(force/case_id/grain/화행)은 LLM 자기보고로만 생성 → gate가 그 위에 서면 gate 자체가 신뢰 불가."

## 만장일치로 견고 (못 깸)
- **state 강등(=projection)**: 4 리뷰어 "깰 약점 없음". 단 근거는 CQRS fold 하나로 충분(BFO/Petri 과적재).
- **evidence-gated completion**: "진짜 해자, 시스템 존재 이유". Action+evidence만으로 성립.

---

## 축별 상세

### 구현 가능성 축 (BLOCKER/HIGH/MEDIUM)
- **A. LLM 화행(force) 분류 비일관 — BLOCKER**: Searle 분류는 화행론자도 미합의(indirect speech act). force를 append-only 1급 필드로 두면 비결정 라벨이 로그 오염. → force 삭제, provenance에서 결정론 유도(event_type에 내장: `command.issued`/`plan.committed`).
- **B. case_id 발급 메커니즘 공백 — BLOCKER**: "same case_id only"가 토대인데 누가/언제 발급하는지 정의 없음. 병렬 wave·cross-case에서 너무 좁거나 넓음. → controller가 dispatch 시 부모 case_id 전파, cross-case는 wasInformedBy로 분리.
- **C. grain LLM 의존 — HIGH**: ETL은 결정론이라 grain 유지되지만 LLM 행위는 아님. Intent/Verification grain의 분모 없음. → Action만 결정론 grain(1 도구호출=hook), Intent/Verification은 Action에 anchor된 facet. 3레인 대칭 가정 버려라.
- **D. 7층 동시 탑재 TS 장난감화 — HIGH**: Salsa(rust 컴파일러급)/bitemporal(XTDB Arrow)/Petri 건전성(EXPSPACE)을 TS로 = 장난감. 장난감이면 의미론 검증 불가. → MVP: datom+전량fold+LPG. Salsa/bitemporal/Petri-soundness/Merkle 후순위.
- **E. alignment NP-hard + lazy 상쇄 — MEDIUM→HIGH**: conformance optimal alignment는 NP-hard, 매 commit이면 지연. lazy도 gate가 매 commit read 트리거해 상쇄. → alignment는 gate 시점(phase전이/done)만, optimal 대신 룰 근사(집합 포함 O(n)).
- **F. Codex fail-closed 불가 — HIGH**: git pre-commit은 사후·git diff만. capability gate(사전 차단)는 사후훅으로 불가. case_id/force는 git tree에 없음. → "fail-closed=hook 하네스 전용, Codex=fail-open audit" 솔직히 명시.

### 오컴(단순성) 축
- **즉시 제거(값 0)**: bitemporal valid-time(opt-in이라 안 씀, tx-time 1축이면 stale 차단 충분) / 화행5분류·force 태그(gate 안 읽음) / conformance 메타축(verification 레인과 중복).
- **강력 단순화**: Petri→설명 은유로 강등(구현은 DAG+case_id) / TBox-ABox 물리분리→코드 상수(reasoner 안 씀) / hash chain·Merkle·Ed25519→MVP 제외(위협모델 부재) / PROV 7종→`wasGeneratedBy`+`used` 2종 / Salsa→전량 fold(미측정 병목) / datom·LPG 이중표현→typed event 단일.
- **유지(핵심)**: append-only typed log / evidence-gated completion(진짜 해자) / 3레인=lane 태그(구조 아닌 컬럼) / state=projection / 간단 traversal gate.
- **개념 중복**: 분류축이 lane×계층×메타축×화행 4중 직교 → LLM이 일관 못 채움. **2축(lane, 계층)으로**.
- **메타 비판**: ①정당화(이론 인용)≠요구 ②안 읽는 메타데이터=비용 ③LLM이 채워야 하는데 4축 태깅 비일관.
- **MVP 제안**: 단일 typed event log(jsonl+fold), Event{id,seq,ts(tx 1축),actor,lane(intent/action/verification),type,parent(part-of),follows,cause,uses[],evidence{tier,ref,sha}?,payload}. State=fold(저장X). Gate=fold 위 도달성 검사. ≈ 현 설계의 1/5.

### 이론 오용 축
- **C1. 레인=Petri place 동형 위장 — 치명**: Petri 본질=token 소비/marking mutation인데 append-only는 소비 없음. "AND-join 동기화" 표면만 떼고 token 소비 본체 버림. "state=marking"과 "lane=place" 동시 참 불가. → happens-before partial order / event structure로 대체(append-only의 진짜 동형). RFC가 이미 "Lamport spacetime" 언급하며 Petri를 정답으로 올린 자기모순.
- **C2. state=continuant=marking=belief 봉합 — 치명**: BFO continuant(1차 실체, 시간부분 없음) vs CQRS projection(파생, fold) 혼동. "continuant+시간부분(버전)"은 BFO 금지조합(=4D perdurant). 문서가 경고한 함정⑥(3D/4D 혼동)을 자기가 범함. → state=CQRS projection 하나로. continuant는 노드 정체성(EntityId)에만. belief는 "fallible 경고"로만.
- **M2. causedBy 시간선행 공리**: 시간선행은 흄적 직관(논쟁적), SW 인과는 자주 위반(backfill·동시·retry). → provenance(wasInformedBy)로 시간독립 검증, 물리ts는 soft warning.
- **M3. Activity Theory 라벨만**: 이론 본체=동적 전환(shift)인데 고정 정적 계층으로 박음. Engeström contradictions 인용만. → HTN(정적 분해)을 계층 1차 근거로, Activity Theory는 부차.
- **M4. Searle 화행 절단**: "머지했다"는 declarative 아니라 assertive(보고)일 수 있음→intent/action 경계 무너짐. expressive 폐기가 "회고학습" 표방과 모순. → force는 메타축 OR 레인 중 하나만(이중사용 금지).
- **M5. Allen "3개면 충분" 닫힘성 위반**: 부분집합은 합성에 닫혀있지 않음. meets는 비추이("follows=추이"와 모순). → before만(strict total order)으로 단순화하고 Allen 인용 철회(레인 내부엔 before면 충분, Allen 자체가 과적용).
- **M6. conformance=verification 정체**: model 없으면 미정의(탐색적 작업엔 plan 없음). TDD는 oracle-based(expected↔actual)지 conformance 아님. → verification 2종: oracle-based(다수, model 불필요) + conformance-based(부분집합).
- **경미(m7~m10)**: mutual info 강등논거는 fold 논거로 충분(잉여 권위) / part-of reflexive 용어 혼용 / TBox-ABox는 OWA 버리면 DL 권위 무의미 / 누락이론: **CALM 정리**(append-only 일관성의 진짜 근거), event structure, frame problem, anti-realism.
- **관통**: 형식체계(BFO/Allen/DL/Petri)의 일부만 떼와 권위는 취하고 의미론 의무는 버림. 자각한 함정(①⑥)을 자기가 범함. **권고: event sourcing+happens-before+CQRS+PROV 4개로 완결. 적게 인용 깊게 지켜라.**

### 엣지케이스·반례 축
- **C1. Observation 레인 부재 — 치명**: 외부 이벤트(CI 결과·인터럽트·FS변경)는 우리 transition 아님(mind←world). → 4번째 레인 Observation 신설(actor:external). 화행 direction of fit에 없는 제4 방향.
- **C2. causedBy 시간공리 붕괴 — 치명**: 클럭스큐(CI 다른 머신)·동시사건·소급정정에서 깨짐. → 논리 happens-before로 검사, valid_time 고정, 동시사건은 causedBy 금지.
- **C3. case_id 다대다 폭발 — 치명(스키마 근간)**: 개발 사건은 object-centric(한 리팩터링이 N task). single case_id는 process mining의 convergence/divergence 문제. → **OCEL(Object-Centric Event Log)**: case_id→다중 object ref. AND-join을 "공유 object 동기화"로. 백그라운드는 object 0개.
- **C4. spike 역방향**: 결과가 의도 형성(action→assertive→intent 역류), throwaway 코드는 evidence 없어 영원히 미완. → force `explorative/abductive`, `disposition:throwaway` 메타로 gate 면제.
- **C5. 메타작업 state-delta null**: 리팩터링은 behavior 불변(declarative-delta null)=silent transition(alpha miner 곤란). → state 이분: behavioral-state(불변) vs structural-state(변경). 리팩터링 evidence="기존 테스트 green".
- **C6. human sign-off**: 주관검증(재미/UX)은 alignment 불가·T1 불가→task.done 영원히 막힘(게임/디자인 도메인 배제). → judgment-verification 종 추가, "서명된 attestation"을 evidence tier 승격(machine-verifiable provenance).
- **C7. wave race/충돌**: free-choice net은 협력만 모델, 경쟁(merge conflict)·무효화 못 함. cross-link이 same case_id라 cross-case 충돌이 안 보임(silent corruption). → net class 확장 or conflict/invalidates 엣지 cross-case 허용.
- **C8. retry/revert**: attempt는 follows 선형 아닌 루프백, revert는 marking 과거화(non-monotonic). → `retry-of`/`reverts` 관계, bitemporal valid_time으로 흡수.
- **C9. retro**: expressive 화행 버림이 회고학습과 모순. 메타사건(다른 사건 대상). → case:retro 메타, reflects-on 엣지, expressive 복원, learning→Decision/Constraint 노드.
- **C10. 불완전 케이스**: intent 없는 action(핫픽스), action 없는 verification(코드리뷰만). → plan-link optional, retroactive 부착 허용.
- **메타 뿌리 3**: ①single case_id 가정 틀림(→OCEL) ②화행3종이 에이전트 발화만 덮음(observation/abduction/retro 누락) ③물리ts로 인과/순서 강제(→논리시계).

### 정합성 축
- **CRITICAL-1**: verification→alignment가 evidence-gated completion 파괴. gate가 찾을 `series=verification`이 사라짐, alignment 엣지에 붙는 evidence는 S2b(노드 wasGeneratedBy)에 미정의. → verification을 series로 유지(gate 보존, alignment는 해석뷰) or gate+S2b 동시 재작성.
- **CRITICAL-2**: 두 면모델 충돌(RFC §5 PROV/Allen DAG vs 확정안 Petri) + 확정안 내부모순(place=레인 ∧ transition=action ∧ action=레인 → place=transition). → Petri는 데이터모델 아닌 conformance 렌즈로만.
- **HIGH-3**: Tx(datom 다발) vs event 1행 단위충돌. event=Tx인가 datom인가? case_id↔EntityId? lane이 컬럼인가 view인가?
- **HIGH-4**: evidence.series(4값) vs lane(3값) 중복정의. "state evidence" 존재가능성 모순. series가 evidence속성인지 event속성인지.
- **HIGH-5**: state 강등이 §6 push 구독 깸(state 구독 불가→eager 필요=§8 함정2 위반), S6 ts가 verified_at인지 changed_at인지.
- **MED-6/7**: Allen `during`이 lane 전순서 깸 / Activity Theory 계층(Sequence) vs NodeType.
- **LOW-8 (메타위험)**: `vnext-v0.2.md`가 **세 번째 evidence 스키마**(kind/verifier/digest, series/lane/force 없음). → RFC + theory-foundations + vnext-v0.2 **3갈래로 evidence 분열**. append-only라 동결 전 단일화 필수.
- **화해 원칙(전 충돌 관통)**: 확정안의 기여(state=파생, process-mining 호환)를 **write 스키마(S2a)가 아니라 read projection(S3/§6) 레이어**에 넣으면 대부분 해소. `(case_id,activity,ts,lane)`=S3 LPG의 process-mining **projection view**(write 단위 Tx/datom 유지). Petri=**conformance 렌즈**. series/lane=3값 통일(state 제거, evidence.series는 lane 상속). alignment/plan-link/declarative-delta=RelType **매핑표**(신규 §).

### 재생 가능성 축 (사용자 특별 요청)
**평결: Temporal의 결론(evidence 재사용)만 베끼고 전제(결정론 workflow층 + non-determinism 검출 + activity never-replay)를 빠뜨림 → 현재 설계로 재생 보장 불가.**
- **축1 결정론/비결정 경계 부재 — 치명**: ODD엔 Temporal workflow(결정론 오케스트레이션)층이 없음. 전부 LLM(비결정) 아니면 fold. (B)"결정론 로직 재계산"은 재계산할 대상 없는 빈 주장 → (A)fold + 로그조회로 붕괴. evidence 재사용은 재생이 아니라 **캐싱/조회**.
- **축2 비결정 입력 미봉인 — 치명**: `used`는 entity ref만. 도구/네트워크 결과·파일 내용해시·프롬프트 바이트·model_id/temperature/seed·wall-clock이 evidence로 강제 캡처 안 됨. → content-addressed `input_digest`, 도구결과=T1 강제, LLM 파라미터 봉인, `workflow.now()`식 시각 주입.
- **축3 스키마 모순 — 치명**: 확정 5-튜플 `(case_id,activity,ts,lane,force)`에 `used[]`/`evidence`가 없음(RFC §6 불변식 "Event는 used[]+wasGeneratedBy 필수"와 **문서 내부 모순**). → 7-튜플 승격 `(case_id,activity,ts,lane,force,used_digest[],output_evidence)`, output tier T1/T2 제약.
- **축4 fold 메타·bitemporal 비결정**: fold value는 결정론이나 `changed_at`/`verified_at`(전체재구축 vs 증분 순서 의존)·valid-time 좌표가 재생 파라미터 의존. gate가 이 메타 읽으면 판정 갈림. → 재생=as-of(T_sys,T_valid) 명시, value만 비교, 등가성 property test.
- **축5 LLM 재생≠코드 재생 + 검출기 부재 — 치명**: Temporal activity 재사용이 정당한 건 주변 workflow가 결정론이라 같은 지점서 같은 activity 호출 보장되기 때문. ODD는 주변이 LLM → 보장 안 됨. (B)/(C) 혼합 시 history와 어긋나는데 **ODD엔 non-determinism 검출기가 없어 조용히 갈라진 결과를 "재생됐다"고 착각**. → non-determinism 검출 게이트(재생 activity 시퀀스==history 비교), version marker/`patched()`, model_id 봉인, (B)(C) 혼합 금지.
- **축6 부분/분기 재생**: 부분재생은 state(projection)는 복원하나 action 재생입력(외부세계)은 복원 못 함. 분기재생은 case_id/cross-link fork 규칙 부재. → `branch_of:(case_id,fork_at_seq)`, 체크포인트에 외부세계 digest 봉인.
- **축7 레인별 재생 비대칭 — declarative action**: "머지/배포/파일쓰기"는 외부세계 비멱등 → 재실행하면 **외부세계 2회 변경**. Temporal은 모든 activity를 재생 시 재실행 안 함으로 차단. → `side_effect: pure|external_mutation` 태그, external은 **never-replay(evidence 재사용만)**.
- **처방 3대**: ①`execution_class` 결정론/비결정 경계 ②모든 비결정 입력 content-addressed 봉인 ③non-determinism 검출 게이트. + "재생(replay, 무부작용 복원)"과 "재실행(re-execution, 부작용 있는 새 실행)" 용어 분리.

---

## 최종 보정 방향 (6축 종합)

6축이 한 점으로 수렴한다. **핵심 = write/read 레이어 분리 + 결정론 척추 + 재생 전제 3개.**

1. **write(진실) vs read(해석) 레이어 분리** (정합성 화해원칙): write = append-only Tx(또는 typed event, tx-time 1축). 3레인 lane 태그·process-mining 5→7튜플·Petri·state강등은 전부 **read projection 레이어**. 이걸로 정합성 충돌 대부분 소멸.
2. **결정론 척추 = Action + evidence** (구현·오컴): LLM 자기보고로만 잡히는 force/case_id/grain/화행은 best-effort 주석으로 격하. gate는 결정론으로 잡히는 것(도구호출=hook, 파일해시=T1)만 신뢰.
3. **evidence 단일화** (정합성 메타위험): RFC/theory/vnext-v0.2 3갈래 evidence를 동결 전 단일 스키마로 수렴.
4. **재생 전제 3개** (재생 축): ①`execution_class`(결정론/비결정) ②비결정 입력 content-addressed 봉인(input_digest·도구결과 T1·model/seed·시각주입) ③non-determinism 검출 게이트. "재생"과 "재실행"(side_effect:external은 never-replay) 용어 분리. **이게 없으면 Temporal식 재생은 환상.**
5. **OCEL object-centric** (엣지): single case_id → 다중 object ref. 병렬 wave·cross-case 흡수.
6. **Observation 레인 추가** (엣지): 외부이벤트(mind←world). 4번째 레인.
7. **happens-before(물리ts 아님)** (이론·엣지): causedBy는 논리시계로, 물리ts는 soft warning.
8. **이론 축소** (이론): event sourcing + happens-before + CQRS + PROV 4개로 완결. Petri/BFO/Allen/Searle/Salsa/bitemporal/hash chain은 은유·후순위·삭제.

**불변(만장일치 견고)**: append-only event log + state=projection + **evidence-gated completion(진짜 해자)**.
