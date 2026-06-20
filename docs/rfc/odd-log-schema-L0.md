# ODD L0 — 로그레인 + 로그 스키마 (원자적 로우데이터) · v2

> Status: Draft v2 (2026-06-20) · L0 적대 4축(레인/스키마/식별·순서·관계/파생충분성) 반영
> 범위: **L0 = evidence asset의 원자적 로우데이터(로그)만.** 로그레인 분류 + LogEntry 스키마.
> 범위 밖: gate/강제(L3), context resolve(L2), 파생객체·프로젝트맵·.glog(L1~L3), 하네스, 재실행.

---

## 1. 레이어 맥락

```
L0  로그 (행위·의도) ★ ← 이 문서. 원자 로우데이터. append-only. 진실.
L1  파생: 프로젝트 파일·문서 + 출처(provenance) 연결
L2  재파생: 프로젝트맵·메타인덱스   ※ 구조 그래프는 외부 analyzer가, 로그는 시간·출처·인과를 덧입힘
L3  활용 산출: 새 객체데이터·.glog
목적: LLM이 재실행/검토 시 이 에셋을 참고
```

**중요 경계(파생 축 반영)**: 로그는 "무슨 일이 일어났나(행위/의도/관측/검증)"를 담는다. **"코드가 어떻게 엮였나(import/contains/implements 같은 *구조*)"는 로그가 아니라 파일 analyzer에서 온다.** L2 프로젝트맵 = analyzer가 만든 구조 그래프 + 로그가 입힌 시간·출처·인과 차원.

## 2. 로그레인 (4종)

| 레인 | 무엇을 기록 | 방향 | activity 예 |
|---|---|---|---|
| **Intent** | 의도·결정·계획·기준설정 (왜) | 마음→세계 | `decision.made` · `plan.stated` · `criteria.set` |
| **Action** | 행위 (무엇을 했나) | 세계 변경 | `file.created` · `file.modified` · `file.deleted` · `file.renamed` · `command.run` |
| **Observation** | 외부에서 도착·관측 (밖에서 일어난 일) | 세계→마음 | `ci.result` · `user.reply` · `fs.changed` · `infra.failed` |
| **Verification** | 검증 결과·증거·판정 | 대조 | `test.passed` · `check.failed` · `test.errored` · `review.done` |

- 분리 기준: "답하는 질문의 종류". 한 종류 = 한 레인.
- **Observation 조건(2개 동시)**: actor가 시스템 경계 밖 + 방향이 수용. (`fs.changed`가 `file.modified`와 동형이지만 actor=external·방향=수용이라 Observation.)

### §2.1 경계 규칙 (레인 축 반영)
- **에러/사고(incident)**: 에이전트가 유발한 실패 = **Verification** (`*.errored`/`check.failed`). 외부 인프라발 실패 = **Observation** (`infra.failed`). "판정 산출"과 "검증 자체의 폭발"을 구분.
- **행위 vs 판정**: 판정/결과를 담으면 Verification, 그 외 수행은 Action.
- **단일 물리사건 = N로그 (재결합 규칙)**: `Bash(npm test)`처럼 한 호출에 행위+판정이 동시면 — **택1 허용**: (a) `test.run`(Action)+`test.passed`(Verification) 2로그, 단 판정 로그는 `rel.cause`로 행위 로그 참조 필수, 또는 (b) 판정 우선 단일 로그(`test.passed`, payload에 행위 정보 동봉). 발행 부담 적은 (b) 권장.
- **tie-break**: 출처(Observation)와 판정(Verification)이 겹치면(예 `ci.result`) — *판정 의미를 담으면 Verification 우선*.

## 3. 로그 스키마 (LogEntry)

```
LogEntry {
  v:        int                  // ★ schema_version. 파서가 payload 열기 전에 규약 식별
  id:       ULID                 // 고유 식별. writer-local lexical 정렬만 보장 (§3.1)
  ts:       ISO8601              // 기록 시각 (발생≠수용 시 payload.observed_at)
  writer:   string               // ★ 기록한 프로세스 인스턴스 (순서/파티션 기준). actor와 별개
  actor:    string               // 행위자: "agent:<n>" | "hook:<n>" | "cli" | "system:<n>" | "external:<src>"
  ctx:      string               // ★ 실행 컨텍스트 id (세션/run). follows 끊겨도 묶는 키
  lane:     Intent | Action | Observation | Verification
  activity: string               // <noun>.<verb> 형식 강제. lane↔activity 카탈로그 등록 (§3.2)
  targets:  ObjectId[]           // 무엇에 대해 (0개 가능)
  rel: {
    follows?: LogId[]            // ★ 선행 로그 (this → 직전들). 복수 = 머지 표현. 과거만(전방참조 금지)
    part_of?: LogId[]            // 상위 묶음 (task/phase)
    cause?:   LogId[]            // 인과 (순서와 독립한 주장). 과거만. cross-writer 허용
  }
  payload:  object               // 레인/activity별 상세 (Intent/Verification은 §3.3 최소키 권장)
  evidence?: { ref: string }[]   // ★ 증거·산출물 참조 (배열). 불변 핸들 권장(vcs sha/content-hash)
  writer_seq?: int               // writer-local monotone 카운터 (같은-ms ULID 모호성 확정 + dedup 재료)
  dedup_key?: string             // 논리 동일성 키 (id 재사용 or (writer,writer_seq) or content-hash; ts/난수 제외)
}

LogId = 다른 LogEntry의 id (ULID, 전역 유일)
```

### §3.1 순서 (식별·순서 축 반영)
- ULID lexical 순서는 **writer-local 부분순서만** 보장. **전역 total order는 보장 안 함.**
- writer 경계를 넘는 순서가 필요하면 **반드시 `rel`(follows/cause)로** 표현. `ts`로 cross-writer 순서 추론 금지.

### §3.2 activity 규약 (스키마+레인 축 반영)
- 형식: `<noun>.<verb>` 소문자.점 2-segment (정규식 강제).
- lane↔activity **카탈로그에 등록** 후 사용 (자유 신규는 등록 거쳐). 카탈로그가 verb를 고정 → `file.created/modified/deleted/renamed`로 변경 종류가 스키마 레벨 보장 (payload 위임 금지).

### §3.3 payload 최소키 (파생 축 반영)
- **Intent**: `{ decision, rationale, alternatives? }` 권장 — LLM 의도↔결과 재구성용.
- **Verification**: `{ result: pass|fail|error, ... }` 권장.
- Action/Observation: 자유.

## 4. 식별 규약 (식별 축 반영)

```
ObjectId = "<type>:<canonical-id>"
   file:   레포 기준 POSIX 상대경로, NFC, 선행 ./ 금지, 심링크 비해석, 케이스 보존+민감 비교
   method: 모듈/패키지 경로 포함 FQN (동명이인 방지). 오버로드 시그니처 구분은 후순위(§6)
   task/concept: ULID 또는 안정 slug
```
- **정체성 연속성(리네임/이동)**: ObjectId는 *그 시점의 이름표*다. 같은 대상이 이름이 바뀌면 — **`file.renamed`(Action, targets=[old, new]) 로그로 명시** → L1이 이 로그로 ID 체인을 잇는다. (자동 매칭 안 함. append-only와 양립.)
- **산출물 불변 핸들**: Action(특히 `file.*`)은 변경 후 상태의 불변 핸들(git blob/commit sha 또는 content-hash)을 `evidence.ref`에 기록 권장 → L1 연결이 시간에 견딤.
- "같은 ObjectId 문자열 = 같은 대상"은 성립하나, **역은 아님**(같은 대상이 다른 이름표일 수 있음 → 리네임 로그로 해소).

## 5. 파생 충분성 (파생 축 반영)
- **L1 (출처 연결)**: `targets`+`activity`(verb 고정)+`evidence.ref`(불변 핸들)로 "어느 로그가 어느 산출물을 만들었나" 시간에 견디는 추적. (파일 *내용*은 git/디스크에, 로그는 *출처*만 — 정당.)
- **L2 (프로젝트맵)**: 구조 그래프 = **외부 analyzer**. 로그는 그 위에 시간·출처·인과를 덧입힘. (로그 fold만으로 구조 안 나옴 — 정직.)
- **L3/LLM 활용**: Intent→Action→Verification을 `rel`로 엮어 "왜 이렇게 됐나" 재구성. Intent payload 최소키가 fold 안정성 보장.
- 한계: external/Observation 대상은 provenance 미상일 수 있음(에이전트가 안 만든 변경).

## 6. 수학적 토대 · 불변식 (3축 조사 수렴: 분산병합 / 동시성·인과 / 범주·대수)

**모델**: L0 = **append-only monotone** 위의 — **G-Set CRDT(병합)** + **Prime Event Structure(인과/동시성)** + **path category(합성)** + **datom(다축 좌표)**. 3개 독립 조사가 같은 불변식으로 수렴. (새 형식 도입 아님 — 기존 설계의 이론적 못박기.)

**불변식 (위반 시 실제 버그: stale truth / 잘못된 인과추론 / 병합 비결정)**:
1. **APPEND-ONLY = MONOTONE** — 수정·삭제·**retract 금지**. 정정/철회는 *새 로그*로(`file.renamed`·`*.superseded`+`rel.follows`). → **CALM 정리: 멀티 writer가 전역 락 없이 결정론적으로 병합됨이 *증명*된다.** (retract 도입 시 즉시 non-monotone → 확장성 붕괴.)
2. **MERGE = SET UNION** — `merge(A,B)=A∪B` (key=`id`/`dedup_key`). commutative·associative·idempotent(set union이 자동 충족) → 도착 순서·배칭·중복 무관 동일 결과. 합의 프로토콜 불필요.
3. **REL ACYCLIC + PAST-ONLY** — `follows`/`cause`/`part_of`의 추이폐쇄는 strict partial order(DAG). **전방참조 금지**(과거만). commit 시 강제 검증.
4. **REL 비전이 (저장은 직접만)** — 세 관계는 비전이적 *저장 사실*. 전이 폐포는 *질의 시점*에만 계산. **self-follows 금지**.
5. **NO CROSS-WRITER TIME ORDER** — `ts`/ULID로 writer 경계를 넘는 순서·인과 추론 금지(단방향 함의뿐; event ordering ≠ wall-clock). cross-writer 순서는 **`rel.cause`로만**.
6. **CONCURRENCY/CONFLICT = 파생(저장 X)** — `concurrent(a,b) ≜ ¬(a≤*b ∨ b≤*a)` (≤* = follows∪cause 추이폐쇄). `object_conflict ≜ 같은 target ∧ 둘 다 write ∧ concurrent`. 머지는 `follows` 복수참조(=git merge). conflict 엣지 저장 안 함.
7. **자동추론 금지** — derivation/구조는 generation·use(action·evidence) 체인에서 추론하면 unsound. 출처·리네임·인과는 **명시 로그로만**.
8. **part_of = strict partial order + acyclic**, `cause`와 직교(혼용 금지). 트리 권장(DAG 허용 시 acyclic 강제).
9. **targets 단방향** (이벤트→대상). 대상→이벤트·대상→대상 금지. `LogId`(이벤트)와 `ObjectId`(대상)는 별도 ID공간.
10. **DEDUP_KEY 결정적** — 논리 동일 이벤트는 동일 키 → union 흡수(멱등). payload 판정값 결정적(`NOW()`/난수 금지, event time은 `payload.observed_at`).

**연산**: `merge`=set union · 갭연결=path query(transitive reachability) · concurrency/conflict=파생 술어 · **다축 인덱스 4개**: `(targets)` `(activity)` `(ctx)` `(writer,ts)`.

**과잉 — 채택 금지(만장일치)**: 벡터클락(O(writer수) 폭발) · Petri 실행의미론(token/firing/marking) · conflict 1급 엣지 · OR-Set/tombstone(삭제용) · 합의프로토콜/전역락 · topos/sheaf 전체 재구성 · functor/limit · PROV-O 13관계 온톨로지 · Datalog 엔진 내장 · HLC 정렬기준 · monoid 강제. (이유: 전부 append-only G-Set엔 불필요하거나, "정당화 ≠ 요구" 과적용.)

## 7. 후순위 (L0 범위, 추후)
- 메서드 오버로드 시그니처 해시 / dedup_key(멱등) / rel 참조무결성 자동검증 / follows·cause 분리 기준 정밀화 / cross-writer cause 의미론 / payload 강제 스키마(현재 권장) / activity 통제 어휘 enum화(현재 형식+카탈로그).
