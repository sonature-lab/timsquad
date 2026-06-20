# ODD RFC v2 — 최종 적대 다축 리뷰 (라운드2, 2026-06-20)

> 대상: RFC v2 (라운드1 6축 비판을 반영한 개정본).
> 방법: 5축 독립 적대 리뷰. **"원래 의도 충족" 축을 1순위로** (단순화가 야심을 죽였나).
> 라운드1: [odd-adversarial-review-2026-06-20.md](./odd-adversarial-review-2026-06-20.md) (v1 대상 6축).
> 결론: **v2 동결 불가 → v3 필요.** 단 수정 6개가 한 방향(충돌 없음).

---

## 5축 요약

### ① 원래 의도 충족 (1순위) — **v2가 ODD를 배신**
판결: "Ontology-Driven Development"가 "Evidence-Gated Event Sourcing + optional ontology view"가 됨. **제목이 거짓.**
- 배신 #1(CRITICAL·뿌리): **온톨로지 강등** — OKG가 1급 진실→파생 뷰. 진실 화살표 역전(event=진실, OKG=투영). DomainConcept가 §15 미해결로 추방.
- #3(CRITICAL): DDD/BDD/TDD 융합 통째 누락 → D(Driven)가 무엇에 driven인지 답 없음. 6축 어디에도 "방법론 빼라" 없었음=순수 누락.
- #5(CRITICAL): MVP가 OpenHands식 event-sourced와 구별 불가. 차별점이 evidence-gated 하나만.
- #4(HIGH): context resolve("올바른 결정 제공"=존재이유) MVP 누락. 방패만 만들고 칼 안 만듦.
- #2(HIGH): "면(surface)" 어휘에서까지 소거. Action 척추+갈비뼈로 대등한 면 파괴.
- #6(MED): 도메인 무관 립서비스. 모든 예시 코딩/CI. S-tier가 예외구.
- **단일 처방**: OKG를 1급 materialized read model로 격상("event=source of change, OKG=source of truth at-now"). #1~#5 동시 부활. 6축 write/read 분리·OCEL·결정론 척추 전부 지키며 가능.

### ② 6축해소 검증/회귀
- 진짜 닫힘(2): 재생 전제 3개 1급 필드화, state=CQRS projection.
- 부분: activity name 결정론화(=force가 옷만 갈아입음, 의미분류는 LLM), OCEL(entity resolution §15 미해결로 작동불가), write/read 분리(충돌 이동), Petri 격하(AND-join 잔흔+conformance 이중).
- 말로만: evidence 단일화(§11·§15가 "아직 3벌" 자인).
- 새 회귀: **R1(HIGH) §4 "write=결정론only" ↔ §5 model{seed}/§6 nondeterministic 자기모순.** R2 seq(전순서)↔happens-before(부분순서) 이중. R3 §4 다이어그램(5종 projection)↔§14 MVP 복잡도 불일치.
- 관통: v2가 자료구조 교체로 우회, "누가 채우나"가 activity name·objects[]에서 재발.

### ③ 내적 정합성 — 11개 내부모순
- C5(CRITICAL): **gate↔read projection 순환** — 해자가 stale 파생 위 평가→false-positive로 무력화. §10에 as-of 없음.
- C2+C3(CRITICAL): **actor=agent 자기보고 뒷문** — "write는 자기보고 아님"이 agent 발행 activity/execution_class 태깅으로 증명 안 됨. LLM이 external_mutation 누락하면 never-replay 깨져 외부세계 2회 변경.
- C1(CRITICAL): **seal vs classify 미구분** — §4 "결정론"을 두 뜻으로 미끄러뜨림. 봉인(비결정 출력 담기)≠분류(판정).
- C4 lane=map(activity) 부분함수를 전함수로 서술 + Verification이 두 lane 걸침. C6 evidence 4번째 정의. C7 view에 grain 귀속 모순. C10 capability gate가 미정의 phase(§15)에 의존. 등.
- 메타: **"누가/언제" 부재** = 공통 패턴. v2는 "무엇을(스키마)" 정교, "누가 채우나(provenance of provenance)" 미룸. → 다음 단일 축: 발행원·시점 책임 테이블.

### ④ 재생 완결성 — (C) 원리적 불가
평결: 전제 3개는 "재생 엔진"이 아니라 "재생 불가의 정직한 방어선". 정직한 이름="as-of 복원 + evidence 조회 + 비결정 분기 검출".
- (A) 상태 fold 복원: ✅(=CQRS projection, Temporal식 아님). (B) evidence 조회: ✅(=녹화 되감기). **(C) 재실행: ❌ 원리불가**(=Temporal 본질).
- 검출 게이트 역설: LLM 비결정성 때문에 검출기가 *모든 재실행 거부*, 통과는 evidence 조회뿐.
- 봉인은 (B)엔 충분(메모이제이션), (C)엔 무의미(LLM 출력≠입력의 함수). digest는 검증용≠복원용(CAS 필요).
- 메울 수 없는 핵심 간극: **결정론 오케스트레이션 층 부재**(LLM이 오케스트레이션). execution_class/봉인/검출게이트 셋 다 부재를 기술·검출·격리만, 생성 못 함.
- 처방: §2·§9 "Temporal식 재생" 철회. 검출게이트 상시 발화가 정상 동작. digest→CAS.

### ⑤ 구현 현실성 — MVP 거짓광고
- BLOCKER: non-determinism 검출게이트 LLM에 false-positive 폭탄(v1 진단 인용 후 모순 처방).
- HIGH: MVP "1/5" 거짓 — gate가 graph reachability+entity resolution(미해결) 요구→MVP=사실상 전체.
- HIGH: content-addressed 봉인 저장 폭발(비용 0회 언급), digest≠복원.
- HIGH: Codex fail-open=차별점 ~0("logged" not "gated"). "범용" 거짓, ~100% hook 종속.
- MED-HIGH: execution_class/side_effect 태깅=자기보고 재림(§4 불변식 위반).
- MED: OCEL 과적용(학술 분석도구를 온라인 경로에). objects:string[] + set intersection이면 충분.
- 진짜 MVP: **gate=로그 필터(O(n) scan, graph 아님)** + activity→lane 정적매핑 + evidence-gated + state fold. 재생/OCEL풀/봉인/hash chain/cause graph/execution_class 전부 후순위.

---

## 11축(라운드1 6 + 라운드2 5) 최종 수렴 — 5대 결론

1. **"누가 채우나"가 핵심** — 결정론은 발행원이 코드(hook/cli/external)일 때만. agent 발행=best-effort, gate 불신. seal≠classify 구분. "모르면 external_mutation+nondeterministic로 강등" 안전기본값. 발행원·시점 책임 테이블 1장.
2. **온톨로지 1급 복원** — read 강등이 ODD 배신. OKG=materialized read model(addressable·queryable·context-resolvable). #1~#5 동시 부활 지렛대.
3. **gate = 로그 필터(graph 아님)** — O(n) scan. reachability·entity resolution·OCEL풀 불필요.
4. **재생 정직화** — (A)fold+(B)조회만 보장. (C)원리불가. "Temporal식 재생"→"as-of복원+조회+분기검출". evidence=감사/조회 기록.
5. **MVP=최소 차별 집합** — "구현 쉬운 것" 아닌 "ODD를 ODD이게 하는 최소 + 구현가능". evidence-gated + context resolve v0 + OKG read model(DomainConcept) + 방법론 activity name = 넷 다 fold+objects[] 위 O(n) 구현 가능(오컴 안 위반).

## 핵심 긴장 해소
"야심 복원"(①)과 "더 줄여라"(⑤)는 충돌 아님 — MVP 정의를 차별 집합으로 바꾸면 양립. 단순함≠평범함.

---

## v3 방향 (확정)

```
v3:
 ① OKG = 1급 materialized read model (온톨로지 주도 부활). DomainConcept 1급. event=source of change / OKG=source of truth at-now
 ② 발행원·시점 책임 테이블: hook/cli/external=결정론(신뢰) / agent=best-effort(claimed_*, gate 불신). seal≠classify. 안전기본값=강등
 ③ gate = write 로그 필터(O(n) scan) or as-of 동기 fold. graph reachability 제거. 순환 차단
 ④ context resolve v0 + 방법론 activity name(invariant.defined/property.verified) + 면=read 1급 산출물 복원
 ⑤ 재생: "Temporal식" 철회 → (A)as-of 복원 + (B)evidence 조회. (C)는 "비결정 분기, 검출게이트가 정상 거부"로 기능 선언. digest→CAS(복원 필요시)
 ⑥ evidence 실제 단일화(§11·§15 머지) + §4 불변식 정정("비결정 봉인하되 분류 안 함") + objects:string[](OCEL 이름표 제거)
 ⑦ MVP=최소 차별: append log + objects[] + activity→lane + evidence-gated(로그필터) + OKG read model + context resolve v0 + state fold. 나머지 후순위
 차별점 정직: Claude Code=fail-closed(해자) / Codex=fail-open(가치 낮음, CI 게이트 보완)
```
