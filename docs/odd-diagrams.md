# ODD 다이어그램 — L0 로그 · ① ObjectId · ② Provenance

> 데이터 모델링 ①②까지 시각화. VSCode Mermaid 프리뷰 또는 GitHub에서 바로 렌더됨.
> 먼저 흐름도(flowchart/sequence)로 구조를 잡고, §10 UML(classDiagram)로 스키마 정밀화.
> 상세: [odd-log-schema-L0.md](./rfc/odd-log-schema-L0.md) · [odd-object-model.md](./rfc/odd-object-model.md) · [odd-l1-provenance.md](./rfc/odd-l1-provenance.md)

---

## 1. 레이어 스택 — 로그가 진실, 나머지는 파생

```mermaid
flowchart TB
  L0["L0 로그 레인<br/>append-only 진실<br/>Intent / Action / Observation / Verification"]
  N1["① 대상 노드 ObjectId<br/>타입 · 식별 · 정체성 계약"]
  N2["② Provenance<br/>resolve fold · 이력 · alias · 캐시"]
  N3["③ analyzer 구조 그래프<br/>코드 파싱 · 별도 id공간"]
  N4["④ OKG / 프로젝트맵<br/>② + ③ 합성 (file 축 조인)"]
  L0 -->|"targets[ObjectId]"| N1
  N1 -->|계약 실행| N2
  N2 --> N4
  N3 -->|코드 구조| N4
```

- 코드 구조(import/calls)는 ③ analyzer, 의도·이력은 L0+②. 둘은 `file:` 경로를 공유 축으로 ④에서 조인.

## 2. L0 로그 = 진실, ② = 파생 뷰

```mermaid
flowchart LR
  subgraph T["진실 (보존)"]
    LOG["L0 로그<br/>append-only<br/>retract 금지"]
  end
  subgraph D["파생 (regenerate)"]
    PV["② Provenance"]
    AN["③ analyzer 캐시"]
    OKG["④ OKG"]
  end
  LOG -->|fold| PV
  LOG -.dirty.-> AN
  PV --> OKG
  AN --> OKG
  D -. "날아가도 L0 재fold로 복원" .-> LOG
```

## 3. ① 대상 노드 — 7종 (file + 로그네이티브 6)

```mermaid
flowchart TB
  OID["ObjectId<br/>= type : canonical-id<br/>(런타임 = 문자열 1개)"]
  subgraph EXT["외부 소유 — 진실은 디스크/git"]
    F["file<br/>repo경로 · NFC · git sha"]
  end
  subgraph LN["로그 네이티브 — 진실은 로그 (ULID)"]
    T["task<br/>evidence-gated done 표적"]
    D["decision<br/>독립 추적 · supersede"]
    C["concept<br/>+ alias[] (도메인 용어)"]
    K["constraint<br/>DDD invariant"]
    CH["check<br/>+ verifies → 대상"]
    I["issue<br/>level gate · filed_as<br/>(정합 반영 예정)"]
  end
  OID --> EXT
  OID --> LN
```

- 제외: `method` = 약참조(③ analyzer regenerate) · `adr` = file + decision 분해.

## 4. 식별 — ULID 발급 ↔ 조회 분리 (핵심 교정)

```mermaid
flowchart TB
  subgraph ISSUE["발급 (앵커)"]
    A["태어나는 로그가 ULID 발급<br/>decision.made → decision:01J…"]
    A2["✅ 결정적 · 불변 · 같은 ULID = 같은 대상"]
    A --> A2
  end
  subgraph LOOKUP["조회 (수렴)"]
    B["라벨(payload.title) / alias 매칭"]
    B2["⚠️ best-effort · 비결정<br/>못 찾으면 새 발급 → 분기"]
    B --> B2
  end
  ISSUE -. "두 역할 분리" .-> LOOKUP
  NOTE["목표 축소: 멀티writer 키일치(불가) → 식별자 안정 + best-effort 수렴<br/>check가 모범: verifies 대상 좌표를 상속해 부분 수렴"]
  LOOKUP --> NOTE
```

## 5. 정체성 연속 어휘 — 방향은 payload, targets는 단방향 집합

```mermaid
flowchart LR
  v1["decision v1"] -->|superseded| v2["decision v2"] -->|superseded| v3["decision v3 ⭐현재 tip"]
  ca["concept a"] -->|merged| cc["concept c (canonical)"]
  cb["concept b"] -->|merged| cc
  t0["task"] -->|retired| tR["⊘ retired"] -->|resumed| tA["task ⭐재개"]
  k0["constraint P0"] -->|strengthened| k1["constraint P1 ⭐tip"]
```

| 어휘 | 성격 | 적용 타입 |
|---|---|---|
| renamed | 정체성 | file |
| superseded | 정체성 (라인 종료) | decision · task |
| merged / split | 정체성 (합류/분기) | concept |
| weakened / strengthened | 정체성 + predicate 변경 | constraint |
| amended | 비정체성 (내용 진화) | 전 로그네이티브 |
| retired / resumed | 정체성 (종료/재개) | task · check · issue |
| aliased | 비정체성 (라벨 lookup) | concept |

## 6. ② resolve() — 정체성 fold

```mermaid
flowchart TB
  IN["resolve(ObjectId | label)"]
  ALIAS{"라벨인가?"}
  CAND["alias-index 조회<br/>다대다 → 각 후보 walk"]
  WALK["정체성 walk<br/>follows DAG · 방문 기록 → 사이클 차단"]
  TIPS["tips = 종료어휘(superseded / merged_from /<br/>split-consumed / retired)에 소비 안 된 leaf"]
  FORK{"tips ≥ 2 ?"}
  CONF["forked = identity_conflict<br/>canonical = null · per-tip view<br/>→ self-heal 위임 (자동선택 금지)"]
  OK["단일 tip<br/>payload = 기여 갖는 모든 이벤트 fold<br/>(amended.field + weakened.to_predicate)"]
  IN --> ALIAS
  ALIAS -->|yes| CAND --> WALK
  ALIAS -->|no| WALK
  WALK --> TIPS --> FORK
  FORK -->|yes| CONF
  FORK -->|no| OK
```

- **v1 버그 수정**: tip을 "전진 어휘 열거"로 정의했더니 weakened/strengthened가 빠졌음 → "종료 안 된 leaf"로 일반화해 자동 포함.

## 7. evidence-gated completion — task.done 게이트

```mermaid
sequenceDiagram
  participant A as 에이전트
  participant L0 as L0 로그 (진실)
  participant G as task.done 게이트
  A->>L0: task.created targets [task X]
  A->>L0: file.modified targets [file foo.ts] (Action)
  A->>L0: decision.made (Intent)
  A->>L0: test.passed +evidence (Verification)
  A->>G: task X 완료 선언 요청
  G->>L0: resolve(task X) — 직접 필터 (캐시 우회)
  L0-->>G: Verification AND pass AND evidence 존재?
  alt 존재 + not forked
    G-->>A: 통과 (done)
  else 없음 또는 forked
    G-->>A: 거부 (미해소 우선)
  end
```

## 8. 게이트 freshness — stale truth 차단 (안전 최우선)

```mermaid
flowchart LR
  LOG["L0 로그 (진실)"]
  FOLD["② fold"]
  CACHE["집계 캐시<br/>(재생성 가능 · 진실 아님)"]
  UX["탐색 · 표시 (UX)"]
  GATE{"게이트<br/>task.done / phase"}
  DIRECT["L0 직접 재fold<br/>(또는 frontier watermark) ⭐"]
  LOG --> FOLD --> CACHE -->|best-effort| UX
  GATE -->|"판정 입력 ✅"| DIRECT --> LOG
  CACHE -.->|"❌ 신뢰 금지"| GATE
```

- ② 캐시는 파생이라 "진실 아님" — 하지만 게이트가 그걸 믿으면 stale truth가 판정으로 부활. 그래서 판정 입력은 항상 L0 직접.

## 9. 캐시 2-plane — file vs ULID

```mermaid
flowchart TB
  DIRTY["dirty = targets ∪ payload의 ObjectId(canonical 등) ∪ reverse-dep 폐포"]
  subgraph FP["file-plane"]
    F1["디렉토리 2단 샤딩"]
    F2["content-hash merkle<br/>파일 → 샤드 → 조상 (early cutoff)"]
    F1 --> F2
  end
  subgraph LP["log-native-plane (ULID)"]
    L1["ULID prefix(timestamp) 버킷"]
    L2["dirty-set 무효화만<br/>(merkle 아님 — L0 로그 도착이 트리거)"]
    L1 --> L2
  end
  DIRTY --> FP
  DIRTY --> LP
```

---

## 10. UML — 스키마 정밀화 (classDiagram)

> §1~9 흐름이 확정되면 여기를 정교화. 아래는 기본 골격.

### 10.1 L0 LogEntry

```mermaid
classDiagram
  class LogEntry {
    +int v
    +ULID id
    +ISO8601 ts
    +string writer
    +string actor
    +string ctx
    +Lane lane
    +string activity
    +ObjectId[] targets
    +Rel rel
    +object payload
    +Evidence[] evidence
  }
  class Lane {
    <<enumeration>>
    Intent
    Action
    Observation
    Verification
  }
  class Rel {
    +LogId[] follows
    +LogId[] part_of
    +LogId[] cause
  }
  class Evidence {
    +string ref
  }
  LogEntry --> Lane
  LogEntry --> Rel
  LogEntry "1" --> "*" Evidence
```

### 10.2 ① ObjectId 타입 계층

```mermaid
classDiagram
  class ObjectId {
    <<abstract>>
    +string type
    +string canonicalId
  }
  class file {
    +path canonicalId
  }
  class task {
    +ULID canonicalId
  }
  class decision {
    +ULID canonicalId
  }
  class concept {
    +ULID canonicalId
    +string[] aliases
  }
  class constraint {
    +ULID canonicalId
  }
  class check {
    +ObjectId verifies
  }
  class issue {
    +int level
    +string filedAs
  }
  ObjectId <|-- file
  ObjectId <|-- task
  ObjectId <|-- decision
  ObjectId <|-- concept
  ObjectId <|-- constraint
  ObjectId <|-- check
  ObjectId <|-- issue
```

### 10.3 ② ProvenanceView (resolve 반환)

```mermaid
classDiagram
  class ProvenanceView {
    +ObjectId canonical
    +ObjectId[] tips
    +bool forked
    +Status status
    +Map~ObjectId, TipView~ byTip
    +Provenance provenance
  }
  class TipView {
    +Status status
    +object payload
    +LogRef[] history
  }
  class Status {
    <<enumeration>>
    active
    retired
    open
  }
  class Provenance {
    +LogRef generatedBy
    +LogRef[] derivedFrom
    +LogRef[] used
  }
  ProvenanceView --> Status
  ProvenanceView "1" --> "*" TipView
  ProvenanceView --> Provenance
```
