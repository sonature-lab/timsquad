# ODD 세션 핸드오프 (2026-06-20)

> 다음 세션 진입점. 이 문서 + `memory/odd-ontology-driven-dev.md`만 읽으면 이어서 작업 가능.
> 대화 raw는 harness transcript(.jsonl)에 자동 기록됨.

---

## 1. 오늘 한 것 (흐름)

1. **ODD 비전 정립** — Ontology-Driven Development = vNext 통합 우산. (Temporal 화두 → 4층 프레임 → DDD/BDD/TDD 융합 → evidence/OKG → 로그넷)
2. **RFC v1 → v2 → v3** 작성 + **11축 적대검증**(라운드1 6축 = v1 대상, 라운드2 5축 = v2 대상) → 핵심 교정 누적.
3. **L0(로그) 확정** — 로그레인 4종 + LogEntry 스키마 + 식별/순서/관계 + **수학 불변식**(L0 적대 4축 + 수학 3축 조사 반영).
4. **데이터 모델링 로드맵** 정리 → 다음 = ① 대상 노드.

## 2. 확정된 핵심 (불변 — 다음 세션에서 다시 흔들지 말 것)

### 레이어 스택
```
L0 로그(행위·의도, append-only 진실) → L1 파생(대상+provenance) → L2 OKG/프로젝트맵(로그+analyzer) → context resolve → L3 .glog/객체/시각화
```
- **로그 = 로우데이터(진실), 그 위는 전부 파생.** LLM이 파생을 *참고*로 활용(갭메우기).

### L0 확정 내용 (`docs/rfc/odd-log-schema-L0.md`)
- **로그레인 4종**: Intent(왜) · Action(무엇 했나) · Observation(외부 도착) · Verification(검증). 한 로그=한 레인. (적대검증: "4개 OK, 유지")
- **LogEntry**: `{v, id(ULID), ts, writer, writer_seq?, actor, ctx, lane, activity(<noun>.<verb>), targets[ObjectId], rel{follows[]/part_of[]/cause[]}, payload, evidence[], dedup_key?}`
- **수학 토대**: append-only monotone 위의 **G-Set CRDT(병합=union) + Prime Event Structure(인과) + path category(합성) + datom(다축)**. 3개 독립조사 수렴.
- **핵심 불변식**: ①retract 금지(정정=새 로그; CALM에 의해 멀티writer 락없이 병합 *증명*) ②merge=set union ③rel acyclic+past-only ④rel 비전이(전이폐포는 질의시) ⑤ts로 cross-writer 순서 금지(rel.cause로만) ⑥concurrency/conflict 파생(저장X) ⑦구조 자동추론 금지(명시만) ⑧targets 단방향.

## 3. 핵심 교정·결정 (← 적대리뷰가 반복 헛다리 짚은 지점. 다시 혼동 말 것)

- **ODD는 강제 시스템이 아니다.** 핵심 = "로그 로우데이터 → 파생 → LLM 활용". gate/hook/강제는 *부차*. (데이터 레이어 먼저, 강제는 나중)
- **온톨로지 = 로그에서 파생.** 로그가 진실, OKG는 파생 정보제공 객체. (v1~v2 "OKG=ground truth"는 오기재, 정정됨)
- **재실행 = Temporal 재현 엔진 아님.** (A)상태복원 + (B)조회(=참고 활용)만. (C)결정론 재실행은 LLM이 행위자라 원리불가 + 목표도 아님. Temporal은 "이력으로 상태복원" 개념만 차용(LLM 아닌 일반 백엔드 엔진).
- **레인(성격, 4개) ≠ 묶음(part_of).** task/sequence/phase/회고는 레인이 아니라 원자 로그의 **묶음/파생**(rel.part_of). 레인 4개로 확정, 추가 불필요(닫힌 enum 아니라 비파괴 확장 가능).
- **로그=행위, 구조=analyzer.** 코드가 어떻게 엮였나(import/contains/implements)는 로그가 아니라 파일 analyzer에서. OKG=둘의 합성.
- **하네스 위 레이어로 충분.** "도구 중개=하네스 대체"는 강제(우회 차단)를 원할 때만 필요한데 사용자 목표 아님. 강제 강도는 하네스 능력별 차등(Claude Code hook 강 / git commit-gate 공통 / Codex 약).

## 4. 산출물 문서 (전부)

| 문서 | 내용 |
|---|---|
| `docs/rfc/odd-ontology-driven-development.md` | RFC v3 (ODD 전체, 11축 적대검증 반영) |
| `docs/rfc/odd-log-schema-L0.md` | **L0 확정** (로그레인+스키마+수학 불변식) ★ |
| `docs/rfc/odd-object-model.md` | **① 대상 노드 확정** (v3.1, 6타입+식별+정체성 fold+경계, 적대 4축×2) ★ |
| `docs/research/odd-object-model-synthesis-2026-06-20.md` | ① 리서치 종합 (주석ID/디렉토리샤딩/structured + 4축 리뷰) |
| `docs/rfc/odd-legacy-log-alignment.md` | **기존 3-Layer 로그 정합 설계** (흡수 통합·필드 매핑·issue 7타입 승격·용어 충돌) |
| `docs/research/odd-legacy-log-alignment-review-2026-06-20.md` | 정합성 리뷰 리포트 (2축) |
| `docs/rfc/odd-l1-provenance.md` | **② L1 Provenance 확정** (v2, resolve fold·alias·증분·캐시·게이트 freshness) ★ |
| `docs/rfc/odd-handoff-2026-06-20.md` | 이 문서 (핸드오프) |
| `docs/research/odd-prior-art-2026-06-19.md` | 7개 prior-art 조사 |
| `docs/research/odd-theory-foundations-2026-06-20.md` | 3개 이론 조사(로그레인 분류 근거) |
| `docs/research/odd-adversarial-review-2026-06-20.md` | 적대 라운드1 (6축, v1) |
| `docs/research/odd-adversarial-review-round2-2026-06-20.md` | 적대 라운드2 (5축, v2) |
| `memory/odd-ontology-driven-dev.md` | 메모리(압축) |

> L0 적대 4축(레인/스키마/식별/파생) + 수학 3축(CRDT-CALM/event structure/범주) 결과는 **L0 §6에 반영**됨. raw는 transcript.

## 5. 데이터 모델링 로드맵 (작업 순서)

```
[✓] L0 로그 — 확정
[✓] ① 대상 노드(ObjectId) — 확정 (v3.1, 적대 4축×2 + 3아이디어 리서치)
      타입 6종 file/task/decision/concept/constraint/check · task=ObjectId 단일화(part_of는 phase/seq) · method=약참조+analyzer-mint
      식별: ULID 발급(앵커)↔조회(라벨 best-effort) 분리 · 수렴 미보장 한계 · check 패턴(referent 좌표 상속)
      정체성: 방향=payload · 어휘 완비(weakened/strengthened/resumed/aliased 2축) · "현재유효tip" 정의 수정
      발행: FC enum + self-heal 3계약 + transcript=출처추적뿐(LogId 1순위) · 형식≠사실진실
[✓] ② L1 Provenance Projection — 확정 (v2, 적대 2축)
      resolve(ObjectId)→ProvenanceView: tip=종료안된 follows-leaf · payload fold=모든 기여 · forked=per-tip+canonical null+self-heal
      evidence-gated=L0 직접(forked 금지) · 증분 dirty=targets∪payload ObjectId∪reverse-dep · 캐시 2-plane(file merkle / log-native ULID prefix dirty-only)
      ★ 게이트 freshness(§7 안전): 판정 입력=L0 재fold 강제, 캐시 우회 · span cross-writer/open 한계 · 미결=diamond canonical
 ▶ ③ Analyzer 인터페이스 — 코드 파싱 구조 그래프(별도 id공간) ← 다음
      SCIP 차용 · 주석 ID analyzer-mint(structure-hash checksum) · tree-sitter syntactic vs tsc semantic · 캐시 샤드 입도(②와 공유)
 ③ Analyzer 인터페이스 — 대상↔대상 구조 그래프(별도 소스)
 ④ L2 OKG/프로젝트맵 — provenance + 구조 합성
 ⑤ context resolve — OKG 쿼리(LLM 갭메우기)
 ⑥ L3 .glog/객체/시각화
```
- 각 단계 작업법: **후보안 → 적대 다축(범위 한정) → 반영 → 확정**. 위로 갈수록(L2/L3) 파생이라 가볍게(regenerate 가능). L0·①(append-only/식별)만 신중.
- Mermaid 다이어그램: ①부터 각 레이어 산출물에 같이 그리기(텍스트 스키마=진실, mermaid=보조 view).

## 5.5 커버리지 gap 검토 (2026-06-20)

- 데이터모델 L0/①/②가 마스터플랜 **vNext Runtime Seed(A9/A10) + H1-F0 Log Taxonomy를 충분/초과 커버** (A4 append-only 계약 · A9 Entity ID · evidence-gated #55/#57 · 멀티writer · 정체성 · freshness — RFC를 앞질러 정밀화).
- **gap 아님 (의도된 별 트랙 · "범위 밖" 명시)**: 런타임 강제(L3) · CLI(`tsq event/evidence`) · EventStore · ③④.
- **데이터모델 외에서 의식적으로 챙길 것**: ① **TaskRuntime 상태 전이 표**(`open→done`+invariant) = 데이터모델 누락 아니라 **런타임 트랙 첫 단추**(상태기계=프로세스라 ①②③④ 자리 없음). ② **H1-F0↔L0 정합 선언** = 문서 한 줄(사소).
- **순서상 뒤 (로드맵 자리 있음, 누락 아님)**: context resolve=⑤(ODD 존재이유) · 런타임 강제=L3 · 방법론 카탈로그=3단계 · activity 카탈로그=③④⑤ 점진.
- **결론**: 데이터모델 단계에서 빠진 것 거의 없음. 나머지 전부 앞 단계에 자리 있음. raw: `docs/research/odd-legacy-log-alignment-review-2026-06-20.md` + transcript.

## 6. 다음 세션 시작법

1. 이 문서 + `memory/odd-ontology-driven-dev.md` + `docs/rfc/odd-object-model.md`(①) + `docs/rfc/odd-l1-provenance.md`(②) 읽기.
2. **③ Analyzer 인터페이스** 후보안부터: 코드 파싱 → 대상↔대상 구조 그래프(별도 id공간, ObjectId 아님). SCIP 포맷 차용, tree-sitter syntactic(가벼움) vs tsc/LSP semantic(calls/types), 주석 앵커 ID **analyzer-mint**(self-author 금지)+structure-hash checksum, 캐시 샤드 입도(②와 공유). L2 합성=file 축 조인.
3. 후보안 → 적대 다축 리뷰(③ 한정) → 반영 → 확정 → ④ L2 OKG로. (주석 ID 선례·실패 웹조사 ③에서 병행.)
