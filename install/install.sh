#!/bin/bash

# TimSquad 설치 스크립트 v2.0
# 전역 커맨드와 설정 설치

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMSQUAD_ROOT="$(dirname "$SCRIPT_DIR")"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 버전
VERSION="2.0.0"

echo -e "${BLUE}"
echo "  _____ _           ____                       _ "
echo " |_   _(_)_ __ ___ / ___|  __ _ _   _  __ _  __| |"
echo "   | | | | '_ \` _ \\___ \\ / _\` | | | |/ _\` |/ _\` |"
echo "   | | | | | | | | |___) | (_| | |_| | (_| | (_| |"
echo "   |_| |_|_| |_| |_|____/ \\__, |\\__,_|\\__,_|\\__,_|"
echo "                            |_|                   "
echo -e "${NC}"
echo "  Installing TimSquad Framework v$VERSION..."
echo ""

# ============================================================
# 1. 전역 커맨드 디렉토리 생성
# ============================================================
echo -e "${YELLOW}[1/4] 전역 커맨드 설치...${NC}"

mkdir -p ~/.claude/commands
mkdir -p ~/.claude/skills

# tsq-init.md 생성 (Claude Code 슬래시 커맨드)
cat > ~/.claude/commands/tsq-init.md << EOF
---
name: tsq-init
description: TimSquad 프로젝트 초기화
---

# TimSquad 프로젝트 초기화

TimSquad 프레임워크로 새 프로젝트를 초기화합니다.

## 수집할 정보

사용자에게 다음 정보를 질문하세요:

1. **프로젝트명**: 프로젝트 이름 (영문, kebab-case 권장)
2. **프로젝트 타입**:
   - \`web-service\`: SaaS, 웹앱
   - \`api-backend\`: API 서버, 마이크로서비스
   - \`platform\`: 프레임워크, SDK
   - \`fintech\`: 거래소, 결제 시스템 (보안 강화)
   - \`infra\`: DevOps, 자동화
3. **프로젝트 레벨**:
   - \`1\` (MVP): 최소 문서, 빠른 개발
   - \`2\` (Standard): 표준 문서, 균형
   - \`3\` (Enterprise): 전체 문서, 완전한 추적

## 초기화 실행

정보를 수집한 후 다음 스크립트를 실행하세요:

\`\`\`bash
$TIMSQUAD_ROOT/scripts/init.sh -n "<프로젝트명>" -t "<프로젝트타입>" -l <레벨>
\`\`\`

## 레벨별 필수 문서

| 문서 | Level 1 | Level 2 | Level 3 |
|-----|:-------:|:-------:|:-------:|
| prd.md | ✅ | ✅ | ✅ |
| requirements.md | ✅ | ✅ | ✅ |
| service-spec.md | ✅ | ✅ | ✅ |
| data-design.md | ✅ | ✅ | ✅ |
| error-codes.md | - | ✅ | ✅ |
| ADR | - | ✅ | ✅ |
| security-spec.md | - | - | ✅ |

## 타입별 특이사항

- **fintech**: 자동으로 레벨 3 적용, 보안 검토 필수
- **web-service**: UI/UX 명세 추가 권장

## 완료 후 안내

초기화 완료 후 다음 내용을 안내하세요:

1. 생성된 디렉토리 구조 설명
2. 현재 Phase: \`planning\`
3. 다음 단계: \`.timsquad/ssot/prd.md\` 작성 시작
4. 사용 가능한 에이전트: \`@tsq-planner\`, \`@tsq-developer\`, \`@tsq-qa\`, \`@tsq-security\`
EOF

echo "  ✓ ~/.claude/commands/tsq-init.md 설치됨"

# tsq-status.md 생성
cat > ~/.claude/commands/tsq-status.md << 'EOF'
---
name: tsq-status
description: TimSquad 프로젝트 상태 확인
---

# TimSquad 프로젝트 상태 확인

현재 프로젝트의 TimSquad 상태를 확인합니다.

## 확인 사항

1. **초기화 여부**: `.timsquad/` 디렉토리 존재 확인
2. **현재 Phase**: `.timsquad/state/current-phase.json` 읽기
3. **SSOT 문서 상태**: `.timsquad/ssot/` 내 문서 목록
4. **최근 로그**: `.timsquad/logs/` 최근 항목

## 출력 형식

```
## TimSquad 프로젝트 상태

**프로젝트**: {project_name}
**타입**: {project_type}
**레벨**: {project_level}

### 현재 Phase
{current_phase} (since: {entered_at})

### SSOT 문서 상태
| 문서 | 상태 | 최종 수정 |
|-----|------|----------|
| prd.md | ✅/⏳/❌ | {date} |
| ... | ... | ... |

### 최근 활동
- {recent_log_1}
- {recent_log_2}

### 다음 단계
{next_steps}
```

## 참조 파일

- `.timsquad/config.yaml`
- `.timsquad/state/current-phase.json`
- `.timsquad/ssot/*`
- `.timsquad/logs/*`
EOF

echo "  ✓ ~/.claude/commands/tsq-status.md 설치됨"

# tsq-log.md 생성
cat > ~/.claude/commands/tsq-log.md << 'EOF'
---
name: tsq-log
description: TimSquad 작업 로그 기록
---

# TimSquad 작업 로그 기록

현재 작업 내용을 로그로 기록합니다.

## 로그 형식

`.timsquad/logs/` 에 다음 형식으로 기록:

```markdown
## {timestamp} | {agent} | {task_title}

### What (작업 내용)
{task_description}

### Why (작업 이유)
{reason}
- 관련 ADR: {adr_link}

### Reference (참조)
- SSOT: {ssot_files}
- 외부: {external_refs}

### Changes (변경 파일)
{changed_files}

### Result (결과)
{success|failure}
- 테스트: {test_result}
- 비고: {notes}
```

## 파일명 규칙

`{YYYY-MM-DD}_{agent}_{task_id}.md`

예: `2026-02-03_developer_implement-auth.md`

## 자동화

가능하면 작업 완료 시 자동으로 로그를 생성하세요.
EOF

echo "  ✓ ~/.claude/commands/tsq-log.md 설치됨"

# tsq-retro.md 생성 (회고 시스템)
cat > ~/.claude/commands/tsq-retro.md << 'EOF'
---
name: tsq-retro
description: TimSquad 회고 시스템
---

# TimSquad 회고 시스템

프로젝트의 회고 분석을 수행하고 개선 사항을 제안합니다.

## 역할

너는 TimSquad의 회고 분석 전문가다.

### 페르소나
10년 경력의 애자일 코치. 팀의 성장을 돕는 데 열정적.
데이터 기반 분석과 건설적인 피드백에 능함.

## 수행 작업

### 1. 메트릭 수집
`.timsquad/retrospective/metrics/` 확인

### 2. 패턴 분석
- 로그 파일 분석 (`.timsquad/logs/`)
- 피드백 이력 분석
- 반복되는 실패/성공 패턴 식별

### 3. 리포트 작성
`.timsquad/retrospective/cycles/cycle-N.md` 작성

### 4. 개선 제안
- 프롬프트 개선안
- 템플릿 개선안
- 프로세스 개선안

## 분석 프레임워크

### 질문
1. 무엇이 잘 되었나? (Keep)
2. 무엇이 문제였나? (Problem)
3. 어떻게 개선할까? (Try)

### 패턴 분류
- **실패 패턴 (FP-XXX)**: 반복되는 문제
- **성공 패턴 (SP-XXX)**: 효과적인 방법

## 출력 형식

cycle-report.template.md 형식 참조:
- 메트릭 요약
- 에이전트별 성과
- 발견된 패턴
- 개선 조치
- 다음 목표

## 개선 적용

제안된 개선 사항은 사용자 승인 후:
1. SKILL.md 업데이트
2. 템플릿 업데이트
3. lessons.md 추가

## 중요

- 데이터 기반 분석
- 건설적인 피드백
- 구체적인 개선안
- 사용자 승인 필수
EOF

echo "  ✓ ~/.claude/commands/tsq-retro.md 설치됨"

# ============================================================
# 2. 전역 스킬 설치 (선택적)
# ============================================================
echo -e "${YELLOW}[2/4] 전역 스킬 설치...${NC}"

# tsq-pm 스킬 (PM 역할 가이드)
cat > ~/.claude/skills/tsq-pm.md << 'EOF'
---
name: tsq-pm
description: TimSquad PM 역할 가이드
---

# TimSquad PM 역할

TimSquad 프로젝트의 PM(Project Manager) 역할을 수행합니다.

## 핵심 책임

1. **사용자와 직접 소통**: 요구사항 수집, 진행 보고, 승인 요청
2. **작업 분류 및 위임**: 적절한 서브에이전트 선택
3. **SSOT 관리**: 문서 일관성 유지
4. **품질 보증**: 산출물 표준 준수 확인
5. **피드백 라우팅**: Level 1/2/3 분류

## 에이전트 위임 규칙

| 작업 유형 | 위임 대상 |
|---------|---------|
| 기획, PRD, 아키텍처 | @tsq-planner |
| 코드 구현, 테스트 | @tsq-developer |
| 코드 리뷰, 검증 | @tsq-qa |
| 보안 검토 | @tsq-security |

## Phase 관리

- planning → implementation → review → security → complete
- Phase 전환 조건 확인 필수
- User 승인 지점 준수

## 피드백 라우팅

- **Level 1**: Developer에게 (코드 수정)
- **Level 2**: Planner에게 (설계 수정)
- **Level 3**: User에게 (기획 수정, 승인 필요)
EOF

echo "  ✓ ~/.claude/skills/tsq-pm.md 설치됨"

# ============================================================
# 3. 환경 설정 파일 생성
# ============================================================
echo -e "${YELLOW}[3/4] 환경 설정...${NC}"

cat > ~/.timsquad << EOF
# TimSquad Configuration
# Generated: $(date +%Y-%m-%d)

TIMSQUAD_ROOT="$TIMSQUAD_ROOT"
TIMSQUAD_VERSION="$VERSION"
EOF

echo "  ✓ ~/.timsquad 설정 파일 생성됨"

# ============================================================
# 4. CLI 심볼릭 링크 생성
# ============================================================
echo -e "${YELLOW}[4/4] CLI 설정...${NC}"

# tsq 명령어 래퍼 스크립트 생성
cat > "$TIMSQUAD_ROOT/scripts/tsq" << 'WRAPPER'
#!/bin/bash

# TimSquad CLI Wrapper
# 사용법: tsq <command> [options]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "$1" in
    init)
        shift
        "$SCRIPT_DIR/init.sh" "$@"
        ;;
    status)
        shift
        "$SCRIPT_DIR/status.sh" "$@"
        ;;
    log)
        shift
        "$SCRIPT_DIR/log.sh" "$@"
        ;;
    retro)
        shift
        "$SCRIPT_DIR/retro.sh" "$@"
        ;;
    feedback)
        shift
        "$SCRIPT_DIR/feedback.sh" "$@"
        ;;
    watch)
        shift
        "$SCRIPT_DIR/automation/ssot-watcher.sh" "$@"
        ;;
    metrics)
        shift
        "$SCRIPT_DIR/automation/metrics-collector.sh" "$@"
        ;;
    help|--help|-h)
        echo "TimSquad CLI v2.0.0"
        echo ""
        echo "Commands:"
        echo "  init      프로젝트 초기화"
        echo "  status    프로젝트 상태 확인"
        echo "  log       작업 로그 기록"
        echo "  retro     회고 시스템"
        echo "  feedback  피드백 라우팅"
        echo "  watch     SSOT 변경 감시"
        echo "  metrics   메트릭 수집"
        echo ""
        echo "Examples:"
        echo "  tsq init -n my-app -t web-service -l 2"
        echo "  tsq status"
        echo "  tsq retro start"
        echo "  tsq feedback \"test failed\""
        echo "  tsq watch start"
        echo "  tsq metrics summary"
        echo ""
        ;;
    *)
        echo "Unknown command: $1"
        echo "Run 'tsq help' for usage"
        exit 1
        ;;
esac
WRAPPER

chmod +x "$TIMSQUAD_ROOT/scripts/tsq"

# /usr/local/bin에 심볼릭 링크 생성 시도
if [[ -d /usr/local/bin && -w /usr/local/bin ]]; then
    ln -sf "$TIMSQUAD_ROOT/scripts/tsq" /usr/local/bin/tsq
    echo "  ✓ /usr/local/bin/tsq 링크 생성됨"
else
    echo -e "  ${YELLOW}⚠ /usr/local/bin에 쓰기 권한 없음${NC}"
    echo "  다음 명령으로 수동 설정하세요:"
    echo "    sudo ln -sf $TIMSQUAD_ROOT/scripts/tsq /usr/local/bin/tsq"
    echo "  또는 PATH에 추가:"
    echo "    export PATH=\"\$PATH:$TIMSQUAD_ROOT/scripts\""
fi

# ============================================================
# 완료 메시지
# ============================================================
echo ""
echo -e "${GREEN}✅ TimSquad v$VERSION 설치 완료!${NC}"
echo ""
echo -e "${CYAN}설치된 항목:${NC}"
echo "├── ~/.claude/commands/"
echo "│   ├── tsq-init.md      # /tsq-init 슬래시 커맨드"
echo "│   ├── tsq-status.md    # /tsq-status 슬래시 커맨드"
echo "│   ├── tsq-log.md       # /tsq-log 슬래시 커맨드"
echo "│   └── tsq-retro.md     # /tsq-retro 슬래시 커맨드"
echo "├── ~/.claude/skills/"
echo "│   └── tsq-pm.md        # PM 역할 스킬"
echo "└── ~/.timsquad          # 설정 파일"
echo ""
echo -e "${CYAN}사용법:${NC}"
echo "  Claude Code에서:"
echo "    /tsq-init              프로젝트 초기화"
echo "    /tsq-status            상태 확인"
echo "    /tsq-retro             회고 분석"
echo ""
echo "  터미널에서:"
echo "    tsq init -n <name> -t <type> -l <level>"
echo "    tsq status"
echo "    tsq help"
echo ""
echo -e "${BLUE}TimSquad 경로: $TIMSQUAD_ROOT${NC}"
echo ""
