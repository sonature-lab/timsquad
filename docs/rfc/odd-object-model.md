# ODD ① — 대상 노드 (ObjectId) 모델 · v3.1

> Status: Draft v3.1 (2026-06-20) · v3 적대 4축 리뷰(task/part_of · ULID조회 · 정체성어휘 · 경량/self-heal) 반영
> 기존 3-Layer 로그 정합성: [정합 설계](./odd-legacy-log-alignment.md) · [리뷰 리포트](../research/odd-legacy-log-alignment-review-2026-06-20.md) (별도 문서)
> 범위: 로그 `targets`가 가리키는 대상 노드의 타입 + 식별 규약 + 정체성 연속 **계약**. (실행/구현은 ②/③/L3 포인터)
> 범위 밖: fold 실행·상태(② L1), 코드구조·캐시·structure-hash(③), 프로젝트맵·L2합성(④), 발행게이트 구현(L3).
> 전제: [L0](./odd-log-schema-L0.md) · 근거: [리서치 종합](../research/odd-object-model-synthesis-2026-06-20.md)

---

## 0. 설계 원칙

- **① = 계약·문법·원칙만.** 런타임 데이터 = ObjectId 문자열 하나(노드는 저장 엔티티 아님). 알고리즘/캐시/구현은 포인터.
- **무게중심 = 의도·지식 축**(task/decision/concept)을 file 수준으로. 코드(method/analyzer)는 약참조·③.
- **L0 무수정**: ①은 L0 소비자. 새 스키마 필드·새 rel 종류 0.
- **식별 = 안정성 우선, 수렴은 best-effort** (v3.1 핵심 교정 — 아래 §3.3).

## 1. 레이어 맥락

```
L0  로그 (행위·의도)            ← targets[ObjectId]
①   대상 노드 (ObjectId) ★      ← 타입·식별·정체성 "계약"
②   L1 provenance              ← "실행"(fold·resolve·상태·이력·alias-index·캐시)
③   analyzer 구조 그래프         ← 코드 파싱(별도 id공간)
④   L2 프로젝트맵 / OKG          ← ②+③ 합성
```

| | 안정성 | 어디서 |
|---|---|---|
| 로그(L0) | append-only 진실 | L0 |
| **ObjectId** | 재발급/삭제 금지 · 런타임=문자열 1개 | **①** |
| 상태/이력 | 변함 | ② |
| 구조 | regenerate | ③ |

> ObjectId=**시점 무차원**(현재 referent). 시점고정=로그 `evidence.ref`.

## 2. 노드 타입 (6종)

격하 기준 = **regenerate 가능성**. 1급 기준(로그네이티브 중) = **독립적으로 done/gate 판정을 받고 그 판정에 evidence가 붙는 단위**.

| type | truth-origin | 1급 근거 | 정의 |
|---|---|---|---|
| `file` | external (디스크/git) | 외부 referent 식별 | 파일·문서 |
| `task` | log-native | **evidence-gated done 표적** | 작업 단위·요구사항·이슈 |
| `decision` | log-native | 독립 추적·supersede | 결정 (왜) |
| `concept` | log-native | 도메인 식별·귀속 앵커 | DomainConcept |
| `constraint` | log-native | 불변식·verifies 대상 | 규칙 (DDD invariant) |
| `check` | log-native | 검증 판정 표적 | test/ci가 향하는 표적 |

> `issue`(발견된 결함) 7번째 타입 추가는 기존 로그 정합에서 결정됨 → [정합 설계](./odd-legacy-log-alignment.md)에서 확정 후 본 모델에 반영 예정.

### §2.1 `task` ↔ `part_of` (★ B안 — 이중정체성 해소)
- `task`는 **ObjectId로 단일화**. "이 로그가 task X에 속한다/향한다"는 전부 **`targets:[task:X]`** 로 일원화.
- L0 `part_of`(LogId 묶음)는 **phase/sequence 같은 순수 로그 묶음 전용**으로 한정 — **task 역할 제거**. (한 작업단위를 LogId공간과 ObjectId공간에 동시 표현하던 이중정체성 차단.)
- **근거**: cross-writer Verification(다른 agent 발행)이 묶음 head를 몰라도 `targets:[task:X]`로 task를 표적할 수 있어야 evidence-gating이 견고(L0 ⑤ cross-writer 순서금지 회피). 이게 task 1급화의 진짜 이득. → 집계는 **단일 fold 경로**(targets 인덱스).
- **입도 일관기준**: done/gate 판정의 *표적*이 되고 거기 evidence가 붙는 단위만 1급. phase/sequence는 (현재) 파생 집계라 묶음(part_of). 게이트 성격이 확인되면 재평가.

### §2.2 제외/약참조
| 후보 | 결정 | 이유 |
|---|---|---|
| `method` | 약참조(§5) | regenerate 가능 → ③ |
| `adr` | 타입 아님 = `file`+`decision` | 문서와 그 결정은 별도 |
| `external`(URL/API/패키지) | §9 미결 | payload+evidence 흡수 시작 |

## 3. 식별 규약

```
ObjectId = "<type>:<canonical-id>"
```

### §3.1 파싱
- 첫 `:`에서만 분리. type ∈ `{file,task,decision,concept,constraint,check}` 화이트리스트, 불일치 reject. (issue 추가 시 확장 — 정합 설계 참조)

### §3.2 `file` (계약 — 정규화 구현은 L3)
- **불변 술어**: file ObjectId는 **repo-relative · NFC · 정규형 유일**(한 파일 = 정확히 한 ObjectId). 케이스·NFC 권위 = **git-index**. 레포 외부 = reject. 심링크 비해석.
- 정규화 *절차*(절대→relpath, lexical collapse, 슬래시 정리 등 순서)는 **L3/하네스 구현**.

### §3.3 로그 네이티브 — 식별자 발급 vs 조회 (★ v3.1 핵심 교정: 두 역할 분리)

ULID 발급은 두 역할 중 하나만 한다 — 융합 금지:

| 역할 | 메커니즘 | 결정성 |
|---|---|---|
| **불변 참조 앵커** (발급) | ULID. 한번 발급되면 같은 ULID=같은 대상 영구 보장 | ✅ 결정적·견고 |
| **사전 조회/수렴** (참조) | 라벨(`payload.title`/alias) 매칭 = ② alias-index | ⚠️ **비결정적·best-effort** |

- **목표 축소**: "멀티 writer 키 일치"는 ULID로 **달성 불가**(ULID는 조회 키가 못 됨). 목표 = **"식별자 안정성 + best-effort 수렴"**. 같은 대상이 다른 writer에서 같은 키로 *수렴함*은 보장하지 않는다.
- **타입별**:
  - `decision`/`task` = ULID(인간 라벨 `payload.title`). **primary referent 좌표 활용**(★ check 패턴 일반화): 향하는 객관 대상(file/constraint 등)이 있으면 `rel`로 매달아 그 좌표로 **부분 수렴**.
  - `concept` = ULID + **alias 집합**(`payload.aliases[]`). 동의어=alias 추가. ⚠️ **alias-index는 다대다**(동음이의 `order`가 두 ULID에): 자동 흡수 **금지**, 충돌 시 §3.4 self-heal이 후보 제시→명시 선택. alias append는 **비가역**(L0 ① retract 금지)이라 오염 주의.
  - `constraint` = ULID, 귀속 concept = **concept ULID(불변)에 `rel`**(merge 시 stale 차단).
  - `check` = ULID + **verifies 대상**(`rel.verifies → ObjectId`). 대상이 file이면 file 수렴성 상속(**모범 패턴**).
- **동시 발급 = 수렴 미보장 한계 (계약 아님)**: 두 writer가 같은 대상을 따로 발급하면 두 ULID 분기. **수렴 트리거가 없으면 영구 분기**(서로의 ULID를 모르므로). 이는 **알려진 한계**(duplicate-truth) — "계약"으로 포장하지 않는다. 해소 = 라벨 후처리로 후보 발견 후 사후 명시 머지(best-effort).

### §3.4 발행 게이트 (계약 — 구현 L3)
- 정규형 강제 + `id==NFC(id)` 아니면 reject + `targets` set-dedup (L0 ②⑩ 전제).
- **결정적 게이트**(닫힘 보장): FC typed schema(`lane`·`activity`·`type`·방향키 enum/required) · ObjectId 참조 무결성 · 정확 중복.
- **확률적 보조**(닫힘 보장 없음): 라벨 유사 후보 제시. 이게 "조회후참조"의 유일 실현 수단 → **조회후참조 = best-effort UX**(결정 계약 아님).
- **self-heal 계약**(알고리즘은 L3): ① reject는 **사유코드 + 후보 동반 의무**(빈 reject 금지) ② 후보는 **결정론적 랭킹** ③ 루프는 **유한**(max-retry 후 human escalation). (AutoBE coercion 2층 차용 여부 = §9.)
- **payload typed-fill**: Intent는 **`{rationale, decision}` 순서**(추론을 결론 앞에 — CoT 보존), Verification `{result}` 강제. `rationale`은 *검증 불가 자유텍스트* 라벨.
- **형식진실 ≠ 사실진실**: 게이트 = "well-formed intent"까지만. 사실 진실 owner = **Verification 레인 + evidence**.
- **log-native evidence = 출처 추적뿐(사실 대조 아님)**: decision/task는 외부 실체가 없어 **사실진실이 근본적으로 검증 불가**. evidence는 **`LogId`(1순위 권위)**, transcript turn은 **비권위 출처 hint**(에이전트 자기발화라 자기참조 순환 — 거짓 결정은 거짓 transcript로 앵커됨). 사실 대조는 **file/check(외부 실체 있는 연결 대상)으로만** 가능.

## 4. 정체성 연속 계약 (방향=payload)

ObjectId=그 시점 이름표. 변경도 명시 로그(L0 ⑦). 방향=payload(targets 단방향 L0 ⑨), 모든 정체성 이벤트 `rel.follows`.

| 사건 | activity | targets | payload | 타입 | 성격 |
|---|---|---|---|---|---|
| 리네임 | `file.renamed` | `[old,new]` | `{from,to}` | file | 정체성 |
| 대체 | `*.superseded` | `[v1,v2]` | `{superseded,by}` | decision·task | 정체성(라인종료) |
| 병합 | `concept.merged` | `[a,b]` | `{canonical,merged_from[]}` | concept | 정체성(합류) |
| 분할 | `concept.split` | `[orig,a,b]` | `{split_from,split_into[]}` | concept | 정체성(분기) |
| **약화/강화** | `constraint.weakened`/`strengthened` | `[c]` | `{from_predicate,to_predicate}` | constraint | 정체성(전진) ★분리 |
| 내용 진화 | `*.amended` | `[obj]` | `{field,note}` | 전 로그네이티브 | **비정체성**(내용 append, tip 전진) |
| 폐기 | `*.retired` | `[obj]` | `{reason}` | constraint·check·task | 정체성(terminator) |
| **재개** | `*.resumed` | `[obj]` | `{}` (follows=retired log) | task·check | 정체성(라인 재개) ★추가 |
| 별칭 | `concept.aliased` | `[c]` | `{alias}` | concept | **비정체성**(라벨 lookup만) |

- **정체성 좌표 = ULID**(불변, follows 체인 참여). **식별 손잡이 = 라벨+alias**(가변, lookup-only, **identity walk 불참**). `aliased`는 후자만. → "비정체성이 식별에 쓰임"은 모순 아님(두 축 분리).
- **노드 동일성 결정 = writer의 activity 선택**: `amended`/`resumed`=같은 노드 전진, `superseded`/`split`=새 노드. (자동 아님, L0 ⑦ 양립.) ← fold 결정성의 안전장치.
- **"식별축만 공통, 내용축 비대칭"** (★ "대칭" 정정): file은 내용=외부(git), 로그네이티브는 내용=로그 fold 합성. 공통은 *식별=ObjectId 불변*뿐.
- **단절·재개**: `*.retired`/`file.deleted`=terminator. 동일 ID 재등장은 기본 새 라인; 진짜 재개는 **`*.resumed`**(follows=retired) 또는 `restores:"<id>@<log_id>"`. retired tip은 조회에 **terminated 표시로 노출** → writer가 resume/새라인 명시 선택.
- **강도 변경 영향**: `constraint.weakened`는 그 constraint를 `verifies`하던 check 의미를 바꿀 수 있음 → ② resolve가 "verifies 재검토 필요" 파생 술어 산출(저장X, L0 ⑥). 자동 전파 금지(L0 ⑦).
- **fold 실행은 ②**: `resolve(ObjectId)→{tips,forked}`. 다중 tip=`identity_conflict`(L0 ⑥ 파생, 저장X·1급화 금지). **"현재 유효 tip" = `superseded`/`merged_from`/`split-consumed`/`retired`에 나타나지 않고 `amended`/`resumed`로 전진한 최신 tip** (★ retired/amended/resumed 반영 — v3 정의 버그 수정). directed time-respecting walk(L0 ③ DAG → 종료 보장).

## 5. method = 2-tier (상세 ③)
약참조 fallback이 MVP 기본 + precision은 **analyzer-mint**(에이전트 self-author 금지, Cline #8354) + structure-hash checksum(③). `payload.symbol` + ③ 노드, silent failure 명시(best-effort 라벨). 휴리스틱 standalone 우선.

## 6. analyzer 결합 (원칙 — 상세 ③)
analyzer symbol = **제3 id공간**(ObjectId 아님). L2 합성 = **file 축 조인**(어휘공유 아님) → 언어 의존성이 analyzer에 갇힘. 결합점 2개(file-level 견고 / method-level best-effort).

## 7. 책임 경계 + ① 불변 최소 핵심

**경계**: 정체성 *계약*(§4 표)=① / *fold 실행*=②. evidence 핸들=L0. 사실진실 owner=Verification+evidence.

**① 불변 최소 핵심:**
1. **정규형 유일성**: 한 ObjectId 문자열 = 정확히 한 정규형 (L0 ②⑩ 전제)
2. ObjectId 문법(§3.1) + 6종 닫힌 type 집합
3. 6종 타입 + truth-origin + regenerate 격하기준 + 1급 기준(done/gate 표적)
4. file 불변 술어(§3.2: repo-relative·NFC·정규형 유일)
5. 로그네이티브 **발급(ULID 앵커) / 조회(라벨 best-effort) 분리** + 수렴 미보장 한계(§3.3)
6. 정체성 연속 계약 표(§4) + 방향=payload + rel.follows + **정체성좌표(ULID)/식별손잡이(라벨) 2축 분리**
7. 정체성 단절·재개 + 노드동일성=activity 선택 규칙
8. id공간 삼분 원칙(ObjectId/LogId/analyzer symbol)

→ 1~8 전부 계약·문법·원칙. (L2 조인은 ④ — 핵심에서 제외.)

## 8. 후순위 / 미결
- **레거시 매핑**(기존 task-log L1/L2/L3 ↔ task/part_of): **나중에**(사용자 보류).
- **외부 리소스**(URL/API/패키지): payload+evidence 흡수, 수요 시 `external` 타입.
- **AutoBE coercion(2층)** 차용 여부: 발행 게이트 self-heal에 자동 교정 추가할지.
- **decision 존치 수요**(Q1): 문서 밖 결정 추적 수요.
- 미결: concept alias 오염 검출 규약 · `constraint.weakened`의 verifies 재검토 자동화 · primary referent 부분수렴 규약 정밀화 · 파생 캐시(디렉토리 2단 샤딩+merkle+역인덱스, ②/③).

---

## 변경 이력
- **v3.1** (v3 적대 4축): **task=ObjectId 단일화**(part_of는 phase/seq 전용, 이중정체성 해소) · **ULID 발급/조회 역할 분리**(앵커=결정적/조회=best-effort, "멀티writer 키일치"→"식별자 안정+best-effort 수렴", check 패턴 일반화) · 동시분기 "계약"→"수렴 미보장 한계" 정직화 · 정체성 어휘 정정(**weakened/strengthened 분리·resumed 추가·aliased 2축**) · **"현재 유효 tip" 정의 버그 수정**(retired/amended 반영) · **transcript=출처추적뿐**(사실대조 불가 명시, LogId 1순위) · self-heal 3계약 · §3.2 술어 축약 · payload `{rationale,decision}` 순서 · 불변핵심 정규형 유일성 독립·L2조인 제외.
- v3: task 추가·ULID·정체성 어휘·self-heal·다이어트.
- v2.1/v2: [synthesis](../research/odd-object-model-synthesis-2026-06-20.md) · 적대 4축.
