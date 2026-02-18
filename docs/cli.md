[English](cli.en.md) | [**한국어**](cli.md)

# CLI Reference

> `tsq` (또는 `timsquad`) 명령어 전체 레퍼런스

---

## 프로젝트 관리

### `tsq init`

프로젝트 초기화. 대화형 프롬프트 또는 CLI 옵션으로 설정.

```bash
tsq init                                              # 대화형
tsq init -n my-app -t web-service -l 2 -y             # 비대화형
tsq init -n my-app -t web-service --domain fintech --stack react,node,prisma -y
```

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `-n, --name <name>` | 프로젝트 이름 (소문자, 하이픈) | 현재 디렉토리명 |
| `-t, --type <type>` | 프로젝트 타입 | 대화형 선택 |
| `-l, --level <1\|2\|3>` | 프로젝트 레벨 | 대화형 선택 |
| `--domain <domain>` | 도메인 | `general-web` |
| `--stack <items>` | 기술 스택 (쉼표 구분) | - |
| `-d, --dir <path>` | 대상 디렉토리 | `.` |
| `-y, --yes` | 확인 프롬프트 스킵 | `false` |

**프로젝트 타입**: `web-service`, `web-app`, `api-backend`, `platform`, `fintech`, `infra`

**도메인**: `general-web`, `ml-engineering`, `fintech`, `mobile`, `gamedev`, `systems`

**스택**: `react`, `nextjs`, `node`, `prisma`, `typescript`, `postgresql`, `mysql`

### `tsq status`

프로젝트 상태 확인.

```bash
tsq status                # 전체 요약
tsq status --all          # 전체 상세
tsq status --ssot         # SSOT 문서 상태만
tsq status --phase        # 현재 Phase만
tsq status --metrics      # 메트릭만
```

### `tsq upgrade`

v2.x에서 v3.x로 마이그레이션.

```bash
tsq upgrade               # 대화형 마이그레이션
tsq upgrade --yes         # 확인 스킵
tsq upgrade --dry-run     # 미리보기 (변경 안 함)
tsq upgrade --rollback    # 마이그레이션 취소
```

---

## 작업 모드

### `tsq q` (Quick)

간단한 작업용 경량 모드. SSOT 검증 생략, `@tsq-developer` 직행.

```bash
tsq q "버튼 색상을 파란색으로 변경"
tsq quick "오타 수정"
```

복잡한 키워드("API 변경", "DB 스키마", "인증" 등) 감지 시 Full 모드 전환 제안.

### `tsq f` (Full)

본격 작업용 모드. SSOT 검증 포함, `@tsq-planner` 경유.

```bash
tsq f "사용자 인증 기능 추가"
tsq full "결제 모듈 구현"
```

| | Quick (`tsq q`) | Full (`tsq f`) |
|---|---|---|
| SSOT 검증 | 생략 | 필수 |
| 라우팅 | Developer 직행 | PM 경유 |
| 적합한 작업 | CSS 수정, 오타, 간단한 버그 | 새 기능, API 변경, DB 변경 |
| 로그 위치 | `logs/quick/` | `logs/tasks/` |

---

## 로그 관리

### `tsq log`

3계층 로그 시스템 (L1 Task → L2 Sequence → L3 Phase).

#### 기본 로그

```bash
tsq log add <agent> <type> [message]          # 로그 추가
tsq log list [agent]                          # 로그 목록
tsq log view <file>                           # 로그 보기
tsq log today [agent]                         # 오늘 로그
tsq log search <keyword>                      # 키워드 검색
tsq log summary [date]                        # 일일 요약
tsq log compact [--days <n>] [--dry-run]      # 오래된 로그 압축
tsq log enrich <agent> --json '<data>'        # semantic 데이터 병합
```

**로그 타입**: `work`, `decision`, `error`, `feedback`, `handoff`

#### L1 태스크 로그

```bash
tsq log task list [--agent <name>]            # 태스크 로그 목록
tsq log task view <file>                      # 태스크 로그 상세
tsq log task stats                            # 태스크 통계
```

#### L2 시퀀스 로그

```bash
tsq log sequence create <seq-id> --phase <id> --report <path>   # 생성
tsq log sequence list                         # 목록
tsq log sequence view <seq-id>                # 상세
tsq log sequence check <seq-id>               # L1 완성도 확인
```

#### L3 Phase 로그

```bash
tsq log phase create <phase-id> --sequences "s001,s002"        # 생성
tsq log phase list                            # 목록
tsq log phase view <phase-id>                 # 상세
tsq log phase gate <phase-id>                 # Phase Gate 체크
```

Phase Gate는 미해결 피드백(L2/L3)이 있으면 전환을 차단합니다.

---

## 피드백 시스템

### `tsq feedback`

피드백을 3단계(L1/L2/L3)로 자동 분류하고 액션을 실행합니다.

```bash
tsq feedback route <message>                  # 분류 + 로그 + 자동 액션
tsq feedback list [--status <status>]         # 피드백 목록
tsq feedback resolve <id>                     # L2 해결 처리
tsq feedback approve <id>                     # L3 승인 (사용자)
tsq feedback reject <id>                      # L3 거부
```

**하위 호환**: `tsq feedback <message>` → `route`로 자동 fallback.

#### 자동 분류 트리거 (15종)

| Level | 트리거 | 키워드 예시 |
|-------|--------|-----------|
| **1** (구현) | `test_failure` | 테스트 실패, test fail |
| **1** | `lint_error` | lint, eslint, prettier |
| **1** | `type_error` | 타입 에러, type error, TS2304 |
| **1** | `runtime_error` | 런타임 에러, crash, 500, timeout |
| **1** | `code_style_violation` | 코드 스타일, convention |
| **2** (설계) | `architecture_issue` | 아키텍처, 구조 변경, 레이어 |
| **2** | `api_mismatch` | API 불일치, 인터페이스, 스펙 |
| **2** | `performance_problem` | 성능, 느림, N+1, 메모리 |
| **2** | `scalability_concern` | 확장성, 스케일링, 부하 |
| **2** | `security_vulnerability` | 보안, 취약점, XSS, SQL injection |
| **3** (기획) | `requirement_ambiguity` | 요구사항 모호, 스펙 불명확 |
| **3** | `scope_change` | 범위 변경, 추가 기능, 일정 변경 |
| **3** | `business_logic_error` | 비즈니스 로직, 정책, 규칙 |
| **3** | `feature_request` | 기능 요청, 새 기능 |
| **3** | `stakeholder_feedback` | 피드백, 리뷰 결과, 고객 의견 |

#### 자동 액션

- **L1**: 로그 기록만 (개발자가 인라인 처리)
- **L2**: `status='in_review'`, `workflow.pending_feedback`에 추가, Phase Gate 차단
- **L3**: `status='open'`, `workflow.pending_feedback`에 추가, 사용자 approve/reject 대기

---

## 회고 시스템

### `tsq retro`

축적된 데이터를 분석하여 개선 제안을 생성합니다.

#### 수동 사이클 (5단계)

```bash
tsq retro start             # 1. 새 사이클 시작
tsq retro collect           # 2. 로그 및 메트릭 수집
tsq retro analyze           # 3. 패턴 분석
tsq retro report            # 4. 리포트 생성 + GitHub Issue
tsq retro apply             # 5. 개선 적용 (피드백 아카이브)
tsq retro status            # 현재 사이클 상태 확인
```

#### 자동 사이클

```bash
tsq retro auto              # 전체 자동 실행 (5단계 원클릭)
tsq retro auto --local      # GitHub Issue 생성 생략
```

자동 실행 시 `tsq improve fetch` + `tsq improve analyze`까지 연결.

#### Phase 회고 (KPT)

```bash
tsq retro phase planning          # planning 단계 회고
tsq retro phase implementation    # implementation 단계 회고
tsq retro phase review            # review 단계 회고
```

### `tsq improve`

회고에서 생성된 GitHub Issue를 분석하여 개선 패턴을 도출합니다.

```bash
tsq improve fetch [--limit <n>] [--repo <org/repo>]    # Issue 수집
tsq improve analyze                                     # 패턴 분석 + 개선 제안
tsq improve summary                                     # 결과 확인
```

**분석 카테고리**: `agent-prompt`, `ssot-template`, `workflow`, `feedback-routing`, `config`, `tooling`

---

## 메트릭

### `tsq metrics`

```bash
tsq metrics collect [--days <n>]    # 메트릭 수집
tsq metrics summary                 # 최신 메트릭 요약
tsq metrics trend [--n <count>]     # 기간별 트렌드 비교
tsq metrics export [--output <file>]  # JSON 내보내기
```

**수집 항목**: Log Activity, Decision Ratio, Error Rate, Feedback Level 분포, SSOT Completion Rate, Tool Efficiency, Cache Hit Rate, CLI Adoption

---

## Meta Index

### `tsq mi` (meta-index)

코드베이스 구조 인덱싱. AST(mechanical) + 에이전트(semantic) 2계층.

```bash
tsq mi rebuild [--exclude <pattern>]    # 전체 재구축 (코드 + UI)
tsq mi update [--quiet]                 # 변경분만 재파싱
tsq mi stats                            # Health Score + UI Health 통계
tsq mi stage <file> [options]           # semantic 데이터 스테이징
tsq mi find <keyword> [--json]          # 검색
tsq mi check                            # drift 감지 + 인터페이스 검증
```

#### stage 옵션

```bash
# 코드 semantic
tsq mi stage "src/auth/login.ts" \
  --method execute --algo hash-compare --tc "O(1)" --fn authenticate

# UI semantic
tsq mi stage "src/components/LoginForm.tsx" \
  --layout flex-column --color-scheme primary --spacing compact \
  --state "loading:form submit:button disabled + spinner:API 응답"

# 디렉토리 semantic
tsq mi stage "src/payment/" \
  --desc "결제 도메인 핵심 로직" --purpose domain-logic --domain fintech
```

---

## Knowledge

### `tsq knowledge`

Knowledge 파일(체크리스트, 플랫폼, 도메인) 관리.

```bash
tsq knowledge create <category> <name>    # 생성 (platforms/domains/checklists)
tsq knowledge validate                    # 필수 섹션 검증
tsq knowledge list                        # 목록 (완성도 포함)
```

---

## 워크플로우 자동화

### `tsq wf` (workflow)

```bash
tsq wf set-phase <phase-id>                            # 현재 Phase 설정
tsq wf add-sequence <seq-id> --agents "developer,dba"  # 시퀀스 등록
tsq wf remove-sequence <seq-id>                        # 시퀀스 제거
tsq wf status                                          # 워크플로우 상태
tsq wf config <key> <on|off>                           # 자동화 토글
```

**자동화 토글 키**: `sequence_log`, `phase_log`, `phase_gate`, `metrics`, `retro`, `feedback`

#### 내부 명령어 (데몬/Hook이 자동 호출)

```bash
tsq wf task-start --agent <type> [--scope <scope>]     # 태스크 컨텍스트 생성
tsq wf track-task <agent> <path>                       # 태스크 완료 추적
tsq wf check                                           # 자동화 체크 + 실행
```

---

## 데몬

### `tsq daemon`

백그라운드 데몬. 파일 워처, Meta Index 캐시, IPC 서버, L1/L2/L3 로그 자동화.
JSONL 없이도 동작하며 (lite mode), 훅 기반 IPC notify로 이벤트를 수신한다.

```bash
tsq daemon start [--jsonl <path>]    # 데몬 시작 (JSONL 옵셔널)
tsq daemon stop                      # 데몬 중지
tsq daemon status                    # 데몬 상태
tsq daemon notify subagent-start     # 서브에이전트 시작 알림
tsq daemon notify subagent-stop      # 서브에이전트 종료 알림
tsq daemon notify tool-use           # 도구 사용 알림
tsq daemon notify stop               # 세션 중지 알림 (토큰 사용량)
tsq daemon notify session-end        # 세션 종료 알림
```

---

## Git 연동

```bash
tsq commit                              # 대화형 커밋
tsq commit -m "feat: 로그인 추가"        # 메시지 지정
tsq commit -a -m "fix: 버그 수정"        # 전체 스테이지 + 커밋
tsq pr                                  # Pull Request 생성
tsq sync                                # fetch + rebase
tsq release                             # 태그 + GitHub Release
```

---

## 기타

### `tsq watch`

SSOT 파일 변경 감시.

```bash
tsq watch start       # 감시 시작
tsq watch stop        # 감시 중지
tsq watch status      # 감시 상태
```

### `tsq session`

세션 관리.

```bash
tsq session list                  # 세션 목록
tsq session view <id>             # 세션 상세
```
