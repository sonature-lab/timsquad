[English](cli.en.md) | [**한국어**](cli.md)

# CLI Reference

> `tsq` (또는 `timsquad`) 명령어 레퍼런스
>
> v3.7부터 CLI는 핵심 3개 명령어만 유지하며, 나머지 기능은 슬래시 커맨드(스킬)로 전환되었습니다.

---

## `tsq init`

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
| `--workspaces <pattern>` | 모노레포 워크스페이스 glob 패턴 (쉼표 구분) | - |
| `-d, --dir <path>` | 대상 디렉토리 | `.` |
| `-y, --yes` | 확인 프롬프트 스킵 | `false` |

**프로젝트 타입**: `web-service`, `web-app`, `api-backend`, `platform`, `fintech`, `infra`, `mobile-app`

**도메인**: `general-web`, `ml-engineering`, `fintech`, `mobile`, `gamedev`, `systems`

**스택**: `react`, `nextjs`, `node`, `prisma`, `typescript`, `postgresql`, `mysql`

초기화 완료 후 Claude Code에서 `/tsq-start`로 파이프라인을 시작합니다.

---

## `tsq update`

프로젝트 템플릿을 설치된 TimSquad 버전에 동기화합니다.
CLAUDE.md 주입 블록, 에이전트, 스킬, rules, scripts, knowledge, workflow 정의를 갱신합니다.

```bash
tsq update                # 대화형 업그레이드
tsq update --yes          # 확인 스킵
tsq update --dry-run      # 미리보기 (변경 안 함)
tsq update --rollback     # 이전 버전으로 복원
```

| 옵션 | 설명 |
|------|------|
| `-y, --yes` | 확인 프롬프트 스킵 |
| `--dry-run` | 변경 사항 미리보기만 (실제 변경 안 함) |
| `--rollback` | 직전 업그레이드 이전 상태로 복원 |

**보존 항목** (update가 절대 건드리지 않는 파일):
- `.timsquad/config.yaml` (프로젝트 설정)
- `.timsquad/ssot/` (SSOT 문서)
- `.timsquad/logs/` (모든 로그)
- `.timsquad/state/` (워크플로우 상태, 메타인덱스)
- `.timsquad/knowledge/` (사용자 knowledge)
- `.timsquad/retrospective/` (메트릭, 사이클)

---

## `tsq daemon`

백그라운드 데몬 프로세스 관리. 파일 워처, Meta Index 캐시, IPC 서버, 세션 메트릭 수집을 담당합니다.
JSONL 없이도 동작하며 (lite mode), 훅 기반 IPC notify로 이벤트를 수신합니다.

```bash
tsq daemon start [--jsonl <path>]    # 데몬 시작 (JSONL 옵셔널)
tsq daemon stop                      # 데몬 중지
tsq daemon status                    # 데몬 상태 + 세션 메트릭
```

### `tsq daemon notify`

훅(Hook)이 자동 호출하는 이벤트 알림 서브커맨드입니다. 직접 호출할 필요는 없습니다.

```bash
tsq daemon notify subagent-start [--agent <type>]    # 서브에이전트 시작 알림
tsq daemon notify subagent-stop  [--agent <type>]    # 서브에이전트 종료 알림
tsq daemon notify tool-use [--tool <name>] [--status <status>]  # 도구 사용 알림
tsq daemon notify stop                               # 세션 중지 알림 (토큰 사용량)
tsq daemon notify session-end                        # 세션 종료 알림
```

---

## 스킬 전환 안내

v3.7부터 아래 CLI 명령어는 모두 삭제되었으며, Claude Code 슬래시 커맨드(스킬)로 전환되었습니다.

| 삭제된 CLI | 대체 스킬/기능 | 설명 |
|-----------|---------------|------|
| `tsq q` | `/tsq-quick` | 단일 태스크 실행 (Controller 경유) |
| `tsq f` | `/tsq-full` | 풀 파이프라인 실행 (Controller 경유) |
| `tsq status` | `/tsq-status` | 프로젝트 상태 확인 |
| `tsq log` | `/tsq-log` | 로그 관리 |
| `tsq feedback` | `/tsq-retro feedback` | 피드백 L1/L2/L3 분류 및 기록 |
| `tsq retro` | `/tsq-retro` | 회고 사이클 |
| `tsq metrics` | `/tsq-status` | 메트릭 (status에 통합) |
| `tsq mi` | daemon 메타인덱스 | Meta Index (데몬이 자동 관리) |
| `tsq wf` | Controller | 워크플로우 (Controller가 관리) |
| `tsq improve` | `/tsq-retro improve` | 회고 개선 적용 |
| `tsq knowledge` | - | 삭제 |
| `tsq commit/pr/sync/release` | - | 삭제 |
| `tsq watch` | - | 삭제 |
| `tsq session` | - | 삭제 |
| `tsq upgrade` | `tsq update` | update로 대체 |
