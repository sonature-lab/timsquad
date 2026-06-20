# ODD ① 대상 노드 — 리서치 종합 & 통합 권고 (2026-06-20)

> 적대 4축 리뷰(타입/식별/정체성/경계) + 사용자 3아이디어 웹리서치(주석ID / 디렉토리샤딩 / structured-FunctionCalling)를 종합.
> 대상: [odd-object-model.md](../rfc/odd-object-model.md) v2 → v2.1 반영 근거. raw 리서치는 transcript.

---

## 1. 세 아이디어 평결

| 아이디어 | 평결 | 핵심 근거 |
|---|---|---|
| ① 주석 앵커 ID (method) | **방향 맞음, 출처 교정 필요** | opaque ID 직감 옳음(protobuf/Unison). 단 에이전트 self-author = 최악 신뢰 |
| ② 디렉토리 샤딩 캐시 | **검증됨** | git tree merkle = Bazel 차용. 2단 입도 + 역인덱스로 정제 |
| ③ AutoBE structured/FC | **채용 권장 + 한계 명확** | 6.75%→99.8% = 하네스 효과. "컴파일 성공 ≠ 진실" |

## 2. 아이디어 ① 주석 앵커 ID — 핵심 교정

### 리서치 발견
- **진짜 rename-stable 시스템은 identity를 name과 분리 + editable text 밖에 저장**: protobuf wire number, Unison content-hash(SHA3-512, 이름은 가변 메타). 이름을 인코딩한 ID(Roslyn DocumentationCommentId, SCIP descriptor)는 **rename-stable 아님**. → 사용자 opaque-ID 직감은 옳으나 **주석(inline) 저장은 Unison이 피한 fragility 재도입**.
- **에이전트 self-author = 최악 신뢰 사분면**: `Cline #8354`("Cline claims tasks complete without verification") = 에이전트가 메타데이터 수정 완료라 거짓 보고, 실제 프로덕션 누락. 에이전트는 "기억 + 정직" 둘 다 최약점.
- constrained decoding은 "필드 존재"만 보장, "값 정확/유일"은 미보장. 자유텍스트 코드 내 주석은 schema 강제 밖.
- 부트스트랩 갭(기존 코드 0% 커버), 어노테이션이 리팩토링 엔진 깨뜨림(refactoring-in-presence-of-annotations), 주석-요소 바인딩 자체가 미해결 추적 문제.
- **2-tier(precise-if-ID / heuristic-if-absent)는 검증됨**: SCIP precise-vs-search, i18next explicit-vs-fallback, FormatJS explicit-vs-contenthash. 단 휴리스틱 tier가 standalone으로 충분해야(부트스트랩·비채택 경험).

### 교정 (v2 §5 → v2.1)
- precision tier ID 출처 = **에이전트 self-author 금지 → analyzer-mint(tool-side 결정론) 또는 constrained structured field**(하네스가 주석 write).
- **`(odd-id → structure-hash)` checksum**(Liquibase changeset 방식): analyze마다 본문 해시 대조, 불일치 시 zombie/transplant로 판정 → 휴리스틱 fallback. 주석 ID = trust root 아니라 **검증 대상 가속기**.
- **휴리스틱 tier 먼저 standalone 출시**(GumTree식 structure-hash+유사도 매칭). 코드 진실, ID는 accelerator. ID 부재가 *correctness* 아니라 *confidence*만 낮춤.

## 3. 아이디어 ② 디렉토리 샤딩 — 검증 + 정제

### 리서치 발견
- **git tree merkle 무효화는 코드 캐시에 차용 가능, 이미 Bazel이 함**(action key = 입력 merkle digest, 동일 subtree 재사용). "변경 디렉토리 + 조상만 재해시, 형제 재사용" = ODD regenerate 파생 캐시와 정합.
- **2단 입도가 검증된 절충**: TS `.tsbuildinfo` = 프로젝트/디렉토리 샤드 + per-file 해시. 과대샤드=O(N) 순회(rust-analyzer #74), 과소샤드=그래프 메타 오버헤드(Salsa durability).
- **cross-dir 엣지 = 양쪽 중복 금지, 별도 역인덱스**: Kythe 역정규화 xref 테이블, Glean ownership-set(interval map ~7% 오버헤드). 무효화 전파는 역인덱스가 담당. (Glean은 fanout을 질의로 on-demand 계산하는 대안)
- **early cutoff**: TS `exportedModulesMap`(public 표면만 전파), Salsa backdating → 해시 바뀌어도 외부 시그니처 불변이면 전파 중단. false-invalidation 대폭 감소.

### 반영 (②/③ 단계 — ① §8 미결로 기록)
- 레이아웃: `디렉토리 → { 파일: {provenance, 구조요약} }`, 디렉토리 샤드 + per-file content-hash.
- content-addressed merkle 무효화(파일→샤드→조상 샤드 해시).
- cross-dir = 소스 샤드에 forward edge + **별도 reverse-dep 인덱스**. 무효화 전파 책임.
- early cutoff(외부 시그니처 불변 시 전파 중단).
- L1 provenance + analyzer 구조 = 동일 샤딩 정책 공유(단일 무효화 트리거).

## 4. 아이디어 ③ AutoBE structured/Function Calling — 채용 + 한계

### 리서치 발견 (수치 출처: typia.io, dev.to AutoBE, arXiv)
- **AutoBE**: LLM이 자유텍스트 대신 JSON Schema=AST를 Function Calling으로 채움. `AutoBeDatabase` 필드타입 7개만 허용 → `"varchar"` **입력 자체 불가**("금지가 아니라 부재"). typia 3층 복구(parse→강제변환→validate, 인라인 `// ❌` 피드백 self-heal).
- 수치: `qwen3-coder-next` 첫시도 FC 성공률 **6.75%** → self-healing 후 **컴파일 성공률 99.8%+**. **단 저자 명시: "100%는 컴파일 성공이지 런타임 정확성 아님."**
- constrained decoding = **형식 유효성 결정론 보장, 값/의미 정확성 거의 못 올림**. JSONSchemaBench(ICLR2025): 단순 스키마 86% → **복잡 스키마 3% 붕괴 + 38건 silent under-constraining**(위반 JSON 조용히 통과 = 컴파일 실패보다 위험). "Let Me Speak Freely?"(arXiv 2408.02442): 분류 태스크는 enum 강제가 *향상*, **추론 태스크는 형식강제가 저하**(결론을 추론 앞에 두면 CoT 무력화).
- **ESAA(arXiv 2602.23193) = ODD 최근접 선례**: 에이전트가 상태 직접변경 못 하고 "structured intention을 contract 검증 후 결정론 orchestrator가 적용" = ODD "런타임=observer/validator(NOT owner)" 동형.

### 반영 (v2 §3.4 → v2.1)
- LogEntry/ObjectId를 **Function Calling typed schema**로 발행. **lane/activity/type = enum 강제**(AutoBE 7-타입 패턴) → 잘못된 lane 생성 불가. **분류성 필드라 enum이 정확도까지 향상**.
- slug **조회후참조(§3.3)도 tool로** 강제(키 분기 차단).
- **발행 후 독립 validate 한 번 더**(생성-시 강제와 별개, silent under-constraining 대비).
- **형식진실 / 사실진실 분리**: 발행 게이트 = (1)스키마 형식 (2)enum 카탈로그 (3)ObjectId 참조 무결성 = "well-formed intent"까지. **"schema-valid log ≠ true log"** — 사실 진실성은 evidence projection(L0 evidence)이 담당. (AutoBE "clean commit ≠ working feature"의 ODD판)
- 추론 섞인 payload는 reason을 typed-field 앞에(CoT 보존).
- AutoBE AST → analyzer 입력: 패턴만 차용(다언어면 직접 채택 불가, typia식 "타입1개→schema+parser+validator 자동생성").

## 5. 4축 리뷰 × 3아이디어 시너지 맵

| 리뷰 미해결 High | 메우는 아이디어 |
|---|---|
| 식별축: slug 발급 프로토콜 부재 | ③ FC enum 강제 + 조회후참조 tool |
| 정체성축: method silent failure | ① analyzer-mint ID + structure-hash checksum |
| 경계축: analyzer=제3 id공간 저장 | ② 디렉토리 샤딩 + cross-dir 역인덱스 (analyzer-mint ID도 제3공간 안착) |
| 타입축: 발행 신뢰성 | ③ 모든 타입 생성에 enum 강제 |

## 6. v2.1 반영 항목 (확정)
1. §5 method: 주석 ID = analyzer-mint/constrained(self-author 금지) + structure-hash checksum + 휴리스틱 standalone 우선.
2. §3.4 발행 게이트: FC typed schema(enum) + 조회후참조 tool + 발행후 독립 validate + 형식/사실 진실 분리.
3. §8 미결: 파생 캐시 = 디렉토리/파일 2단 샤딩 + merkle + cross-dir 역인덱스 + early cutoff(②/③).
4. prior-art: ESAA(런타임=validator 선례), JSONSchemaBench(silent under-constraining 경고), typia 수치.

## 핵심 출처
- 주석ID: protobuf.dev/best-practices, unison-lang.org/docs/the-big-idea, github.com/dotnet/roslyn DocumentationCommentId, github.com/cline/cline/issues/8354, GumTree(SpoonLabs)
- 샤딩: git-scm Packfiles, bazel.build/remote/caching, TS incremental(.tsbuildinfo), rust-analyzer durable-incrementality, glean.software/blog/incremental, kythe.io/docs/kythe-storage
- structured: typia.io(6.75%→100%), dev.to/samchon AutoBE, openai structured-outputs, arXiv 2501.10868(JSONSchemaBench), 2408.02442(Let Me Speak Freely), 2602.23193(ESAA)
