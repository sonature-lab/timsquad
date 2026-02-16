# TimSquad vs OmO/OMC/OMX 경쟁 분석 보고서

> 작성일: 2026-02-16
> 대상: oh-my-opencode (OmO), oh-my-claudecode (OMC), oh-my-codex (OMX)

---

## 1. 경쟁 도구 현황

| 항목 | OmO | OMC | OMX |
|------|-----|-----|-----|
| **GitHub** | code-yeongyu/oh-my-opencode | Yeachan-Heo/oh-my-claudecode | Yeachan-Heo/oh-my-codex |
| **Stars** | 31,628 | 6,363 | 359 |
| **버전** | v3.5.5 | v4.2.10 | v0.3.9 |
| **대상 플랫폼** | OpenCode (SST) | Claude Code | OpenAI Codex CLI |
| **에이전트 수** | 11 | 32 | 30 |
| **훅 수** | 41 (7 이벤트 타입) | 31 | Codex 네이티브 |
| **라이선스** | SUL-1.0 (커스텀) | MIT | MIT |
| **아키텍처** | 코드+프롬프트 혼합 플러그인 | 프롬프트+훅 혼합 플러그인 | CLI 래퍼+프롬프트+MCP |

---

## 2. 주요 기능 비교

### OmO 핵심 기능

#### Planning Triad (기획 삼인조)
- **Metis** (사전 컨설턴트): 갭 분석, 실현 가능성 평가, 리스크 식별
- **Prometheus** (기획자): claude-opus-4-6, 읽기 전용, 실행 계획 수립
- **Momus** (검토자): 계획 실행 가능성 검증, 승인 편향

세 에이전트 모두 읽기 전용 → 기획/실행 경계 보장.

#### Boulder.json (세션 연속성)
- `.sisyphus/boulder.json`에 세션 상태 영속화
- 세션 ID 추적, 중단/재개, handoff 명령
- `session.idle` 이벤트로 자율 작업 반복 (Boulder Loop)

#### Background Agent (병렬 실행)
- `BackgroundManager`: 프로바이더별 동시성 제한 (Anthropic 5, OpenAI 10 등)
- FIFO 큐, 부모-자식 추적, tmux 통합
- 2단계 런치: 즉각 응답 후 비동기 세션 생성

#### Context Window Monitor
- 매 도구 실행 후 컨텍스트 사용량 추적
- 임계값(기본 85%)에서 자동 compaction
- compaction 시 컨텍스트 + TODO 보존 훅

#### 자동 라우팅 (3단계)
1. `call_omo_agent`: Explore/Librarian 동기 직접 호출
2. `delegate-task`: 8개 카테고리 기반, 모델/온도 프리셋
3. `BackgroundManager`: 프로바이더 인지 동시성 관리

### OMC 핵심 기능

#### Skill Stacking ([실행]+[강화]+[보장])
```
[Execution] + [0-N Enhancement] + [Optional Guarantee]
```
- Execution: default, orchestrate, planner
- Enhancement: ultrawork, git-master, frontend-ui-ux, tdd
- Guarantee: ralph (검증 완료까지 반복)

#### Ultrapilot (파일 파티셔닝 병렬)
- 각 에이전트가 서로 다른 파일 세트 "소유"
- v4.1.7+: Team 모드로 통합 (plan→prd→exec→verify→fix)
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 필요

#### Notepad (컨텍스트 생존 메모리)
- `.omc/notepads/{plan-name}/`: 플랜별 지식 저장
- 3단계: 로컬 세션 → 플랜 스코프 → 글로벌
- compaction에서도 살아남는 영속 메모리

#### Lifecycle Hook 확장
- PreToolUse: 도구 입력 가로채기, JSON 파라미터 수정 가능
- PostToolUse: error-recovery, rules-injector
- Stop: continuation-enforcer (완료 강제)
- Learner Hook: 세션에서 재사용 패턴 자동 추출

#### Ralph (완료 보장 패턴)
- BUILD, TEST, LINT, FUNCTIONALITY, ARCHITECT, TODO, ERROR_FREE
- 5분 이내 "신선한 증거" 요구
- 검증 완료까지 반복

### OMX
- OMC 패턴의 Codex CLI 포트 (동일 저자)
- tmux 기반 팀 모드
- MCP 서버 4종 (state, memory, code_intel, trace)
- 아직 v0.3.x 초기 단계

---

## 3. TimSquad 현재 상태 대비 팩트체크

### "에이전트 위임이 수동" → 부분적으로 틀림
- agent-generator.ts:96-168에서 위임 규칙 XML 자동 생성
- 키워드 기반 라우팅이 CLAUDE.md에 베이킹됨
- 다만 OmO의 런타임 3단계 위임과 비교하면 빌드타임 정적 규칙

### "계획 검증이 자동화 안 됨" → 절반만 맞음
- SSOT 문서 존재 검증 + Phase Gate + 자동화 토글 구현됨
- 부족한 것: 계획 내용의 품질을 다중 에이전트가 검증하는 루프

### "세션 간 연속성 약함" → 프레이밍 오류
- WorkflowState(phase/sequence 진행 상태)는 강력함
- 약한 것: 세션 내 학습/발견의 compaction 이후 지속성 (지식 연속성)

### "병렬 실행 없음" → 틀림
- Sequence 기반 병렬 (developer + dba + designer 동시 실행)
- EventQueue가 완료 추적, isSequenceComplete()로 판정
- 없는 것: 파일 소유권 파티셔닝 (플랫폼 의존)

### "Hook이 3개뿐" → 숫자 틀림, 본질은 맞음
- SessionStart/SessionEnd 2개 이벤트 타입
- 데몬 JSONL 감시로 SubagentStart/Stop 감지 (기능적으로 더 많음)
- PreToolUse/PostToolUse는 미구현

---

## 4. TimSquad 고유 강점 (경쟁자 대비)

| 강점 | 경쟁자 대비 우위 |
|------|----------------|
| **데몬 토큰 0** | OmO 41훅, OMC 31훅이 매번 토큰 소비. TimSquad는 데몬이 토큰 없이 동일 작업 |
| **SSOT + State Machine** | OmO/OMC에 프로세스 정의 자체가 없음. "어떻게 실행"은 있지만 "어떤 프로세스로"는 없음 |
| **Contract-First** | TimSquad 고유 차별점 |
| **Meta Index (2계층)** | OmO는 LSP 의존. TimSquad의 Mechanical+Semantic+Drift+Health Score가 더 깊음 |
| **Composition Layer** | 6개 에이전트 + overlay > 32개 하드코딩. 유지보수성/확장성 우위 |
| **KPT + DORA** | OMC Learner Hook(패턴 추출)보다 구조적. 프로세스 개선 관점 |

---

## 5. 개선 영역 (실행 계획)

### 가져올 가치 높음 — 5가지

| # | 개선 영역 | 원천 | TimSquad 적용 방식 | 난이도 |
|---|----------|------|-------------------|-------|
| 1 | **계획 품질 검증 루프** | OmO Planning Triad | tsq-architect에 사전분석+검증 프롬프트 추가. State Machine Planning→Implementation 전환에 아키텍트 자기검증 단계 삽입 | 낮음 |
| 2 | **컨텍스트 생존 메모** | OMC Notepad | 데몬에 `.timsquad/state/session-notes.jsonl` 추가. 발견사항 기록 → compaction 후 데몬이 재주입. 토큰 0 유지 | 중간 |
| 3 | **Context Window 모니터** | OmO context-window-monitor | 데몬 JSONL 워처가 토큰 사용량 추적. 임계값(85%) 도달 시 자동 compaction 트리거 + session-notes 보존 | 중간 |
| 4 | **PreToolUse/PostToolUse 훅** | OmO/OMC lifecycle hooks | settings.json에 write-guard, permission-validation 등 안전장치 추가 | 낮음 |
| 5 | **완료 검증 루프 (Ralph)** | OMC Ralph 패턴 | tsq-qa에 "빌드+테스트+린트 모두 통과할 때까지 반복" 프롬프트 강화. Phase Gate와 결합 | 낮음 |

### 가져올 필요 없음

- 에이전트 32개 (Composition Layer가 더 나음)
- Skill Stacking 수동 지정 (4계층 자동 조합이 이미 동등)
- 멀티 프로바이더 (프레임워크 레벨에서 불필요)
- Learner Hook (KPT가 더 구조적)

### 드롭 (변형 항목)

- Ultrapilot → Meta Index 자동 파티셔닝: 플랫폼 의존, Sequence --scope로 충분
- boulder.json → WorkflowState 확장: #2 컨텍스트 생존 메모에 이미 포함
- 자동 라우팅 → tsq q/f 지능화: 수동 분기가 충분히 직관적

---

## 6. 실사용자 인사이트 (2026-02-16 개발자 커뮤니티)

OmC/OmX 실사용자(bellman, kevin, 김정현) 피드백에서 도출한 인사이트.

### 핵심 관찰

| 발언자 | 인사이트 | 의미 |
|--------|---------|------|
| bellman | "OmC로 빠르게 만들고 → OmX Ralph로 미세조정" | 속도(Claude) + 품질(Codex) 하이브리드가 실전 워크플로 |
| bellman | "OmX Ralplan → Plan v17까지 만들고 나서야 구현 시작" | 계획 검증 루프에 종료 조건 없으면 무한 루프 |
| bellman | 클코 = "행동대장 시니어" — "absolutely right", "done" PTSD | 에이전트 자기 보고를 신뢰하면 안 됨. 독립 검증 필수 |
| bellman | 코덱스 = "꼼꼼한 자폐천재 시니어" — 느리지만 정확 | 속도 vs 품질 트레이드오프가 플랫폼 레벨에 존재 |
| bellman | OmX 팀모드 conflict 회피가 강박적 | 파일 ownership 파티셔닝의 실제 효과 확인 |
| kevin | 클코 = 개발자용, 코덱스 = 비개발자용 | TimSquad 타겟(개발자)에 Claude Code 우선은 올바른 선택 |
| 김정현 | LLM은 연역 추론을 못 함. 인터넷에 A→B→C 있으면 따라가지만 진짜 논리 판단은 아님 | Contract-First가 단순 습관이 아니라 LLM 구조적 약점 보완 메커니즘 |

### TimSquad 반영 사항

| 인사이트 | 반영 위치 | 내용 |
|---------|----------|------|
| Plan v17 무한 루프 | 3.4.1 계획 검증 루프 | **종료 조건 추가**: 최대 2회 재검토, 3회째는 유저 승인 요청 |
| "done" 거짓 완료 | 3.4.5 완료 검증 루프 | **자기 보고 금지**: 명령 실행 결과(exit code)만 증거로 인정 |
| 연역 추론 한계 | Contract-First 문서화 | LLM이 "추론"하지 않아도 되도록 인터페이스를 먼저 정의하는 것이 핵심 가치 |

### 지금은 적용 안 함

| 인사이트 | 이유 |
|---------|------|
| 하이브리드 워크플로 (Claude→Codex) | 런타임 멀티 플랫폼 오케스트레이션 = oh-my-squad 영역 (Phase E+) |
| Meta Index 기반 파일 파티셔닝 | Claude Code experimental agent teams 의존. 플랫폼 안정화 후 재검토 |

---

## 7. 결론

TimSquad의 실질적 개선은 5가지에 집중:
1. 계획 품질 검증 (프롬프트 레벨, 낮은 난이도)
2. 컨텍스트 생존 메모 (데몬 확장, 중간 난이도)
3. Context Window 모니터 (데몬 확장, 중간 난이도)
4. Lifecycle 훅 확장 (settings.json, 낮은 난이도)
5. 완료 검증 루프 (QA 프롬프트 강화, 낮은 난이도)

모두 기존 아키텍처(데몬 + 템플릿 + Composition Layer) 안에서 구현 가능하며,
OmO/OMC의 토큰 소비 없이 달성할 수 있음.
