#!/bin/bash

# TimSquad 프로젝트 초기화 스크립트 v2.0
# 사용법: tsq init -n <name> -t <type> -l <level>

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMSQUAD_ROOT="$(dirname "$SCRIPT_DIR")"
TEMPLATES_DIR="$TIMSQUAD_ROOT/templates"
COMMON_DIR="$TEMPLATES_DIR/common"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 로고 출력
print_logo() {
    echo -e "${BLUE}"
    echo "  _____ _           ____                       _ "
    echo " |_   _(_)_ __ ___ / ___|  __ _ _   _  __ _  __| |"
    echo "   | | | | '_ \` _ \\___ \\ / _\` | | | |/ _\` |/ _\` |"
    echo "   | | | | | | | | |___) | (_| | |_| | (_| | (_| |"
    echo "   |_| |_|_| |_| |_|____/ \\__, |\\__,_|\\__,_|\\__,_|"
    echo "                            |_|                   "
    echo -e "${NC}"
    echo "  AI Agent Development Process Framework v2.0.0"
    echo ""
}

# 도움말
show_help() {
    echo "사용법: tsq init [options]"
    echo ""
    echo "Options:"
    echo "  -n, --name <name>     프로젝트 이름"
    echo "  -t, --type <type>     프로젝트 타입"
    echo "  -l, --level <level>   프로젝트 레벨 (1=MVP, 2=Standard, 3=Enterprise)"
    echo "  -d, --dir <path>      대상 디렉토리 (기본: 현재 디렉토리)"
    echo "  -h, --help            도움말 표시"
    echo ""
    echo "프로젝트 타입:"
    echo "  web-service    SaaS, 웹앱"
    echo "  api-backend    API 서버, 마이크로서비스"
    echo "  platform       프레임워크, SDK"
    echo "  fintech        거래소, 결제 시스템 (보안 강화)"
    echo "  infra          DevOps, 자동화"
    echo ""
    echo "예시:"
    echo "  tsq init -n my-app -t web-service -l 2"
    echo "  tsq init -n payment-api -t fintech -l 3"
}

# 인자 파싱
PROJECT_NAME=""
PROJECT_TYPE=""
PROJECT_LEVEL=""
TARGET_DIR="."

while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--name)
            PROJECT_NAME="$2"
            shift 2
            ;;
        -t|--type)
            PROJECT_TYPE="$2"
            shift 2
            ;;
        -l|--level)
            PROJECT_LEVEL="$2"
            shift 2
            ;;
        -d|--dir)
            TARGET_DIR="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# 필수 인자 확인
if [[ -z "$PROJECT_NAME" || -z "$PROJECT_TYPE" || -z "$PROJECT_LEVEL" ]]; then
    echo -e "${RED}Error: 필수 인자가 누락되었습니다.${NC}"
    show_help
    exit 1
fi

# 프로젝트 이름 검증 (안전한 문자만 허용: 알파벳, 숫자, 하이픈, 언더스코어)
if [[ ! "$PROJECT_NAME" =~ ^[a-zA-Z][a-zA-Z0-9_-]{0,63}$ ]]; then
    echo -e "${RED}Error: 프로젝트 이름은 영문자로 시작하고, [a-zA-Z0-9_-]만 허용됩니다 (최대 64자).${NC}"
    exit 1
fi

# 타입 검증
VALID_TYPES=("web-service" "api-backend" "platform" "fintech" "infra")
if [[ ! " ${VALID_TYPES[@]} " =~ " ${PROJECT_TYPE} " ]]; then
    echo -e "${RED}Error: 유효하지 않은 프로젝트 타입: $PROJECT_TYPE${NC}"
    echo "유효한 타입: ${VALID_TYPES[*]}"
    exit 1
fi

# 레벨 검증
if [[ ! "$PROJECT_LEVEL" =~ ^[1-3]$ ]]; then
    echo -e "${RED}Error: 유효하지 않은 레벨: $PROJECT_LEVEL (1-3)${NC}"
    exit 1
fi

# fintech 타입은 레벨 3 강제
if [[ "$PROJECT_TYPE" == "fintech" && "$PROJECT_LEVEL" -lt 3 ]]; then
    echo -e "${YELLOW}Warning: fintech 타입은 레벨 3(Enterprise)이 권장됩니다.${NC}"
    echo -e "${YELLOW}레벨을 3으로 자동 조정합니다.${NC}"
    PROJECT_LEVEL=3
fi

print_logo

echo -e "${GREEN}TimSquad 프로젝트 초기화${NC}"
echo "=========================="
echo "프로젝트명: $PROJECT_NAME"
echo "타입: $PROJECT_TYPE"
echo "레벨: $PROJECT_LEVEL"
echo "디렉토리: $TARGET_DIR"
echo ""

# 대상 디렉토리로 이동
cd "$TARGET_DIR"
TODAY=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y-%m-%dT%H:%M:%S%z)

# ============================================================
# 1. 디렉토리 구조 생성
# ============================================================
echo -e "${YELLOW}[1/9] 디렉토리 구조 생성...${NC}"

# .timsquad 구조
mkdir -p .timsquad/ssot/adr
mkdir -p .timsquad/logs
mkdir -p .timsquad/knowledge
mkdir -p .timsquad/state
mkdir -p .timsquad/process
mkdir -p .timsquad/constraints
mkdir -p .timsquad/feedback
mkdir -p .timsquad/generators
mkdir -p .timsquad/retrospective/{cycles,metrics,improvements/prompts,improvements/templates,patterns}

# .claude 구조
mkdir -p .claude/agents
mkdir -p .claude/skills

echo "  ✓ 디렉토리 구조 생성 완료"

# ============================================================
# 2. 에이전트 파일 복사
# ============================================================
echo -e "${YELLOW}[2/9] 에이전트 정의 복사...${NC}"

# 공통 에이전트
cp "$COMMON_DIR/claude/agents/tsq-planner.md" .claude/agents/
cp "$COMMON_DIR/claude/agents/tsq-developer.md" .claude/agents/
cp "$COMMON_DIR/claude/agents/tsq-qa.md" .claude/agents/
cp "$COMMON_DIR/claude/agents/tsq-security.md" .claude/agents/
cp "$COMMON_DIR/claude/agents/tsq-retro.md" .claude/agents/
cp "$COMMON_DIR/claude/agents/tsq-prompter.md" .claude/agents/
cp "$COMMON_DIR/claude/agents/tsq-dba.md" .claude/agents/
cp "$COMMON_DIR/claude/agents/tsq-designer.md" .claude/agents/

# 타입별 추가 에이전트 (있는 경우)
if [[ -d "$TEMPLATES_DIR/$PROJECT_TYPE/agents" ]]; then
    cp "$TEMPLATES_DIR/$PROJECT_TYPE/agents/"*.md .claude/agents/ 2>/dev/null || true
fi

echo "  ✓ 에이전트 정의 복사 완료"

# ============================================================
# 3. 스킬 파일 복사
# ============================================================
echo -e "${YELLOW}[3/9] 스킬 파일 복사...${NC}"

# 공통 스킬 복사
cp -r "$COMMON_DIR/claude/skills/"* .claude/skills/

echo "  ✓ 스킬 파일 복사 완료"

# ============================================================
# 4. 프로세스/제약조건 파일 복사
# ============================================================
echo -e "${YELLOW}[4/9] 프로세스/제약조건 파일 복사...${NC}"

# 공통 프로세스 파일
cp "$COMMON_DIR/timsquad/process/"*.xml .timsquad/process/

# 타입별 워크플로우 (있는 경우)
if [[ -f "$TEMPLATES_DIR/$PROJECT_TYPE/process/workflow.xml" ]]; then
    cp "$TEMPLATES_DIR/$PROJECT_TYPE/process/workflow.xml" .timsquad/process/workflow.xml
fi

# 제약조건
cp "$COMMON_DIR/timsquad/constraints/"*.xml .timsquad/constraints/

# 피드백 라우팅 규칙
if [[ -d "$COMMON_DIR/timsquad/feedback" ]]; then
    cp "$COMMON_DIR/timsquad/feedback/routing-rules.yaml" .timsquad/feedback/ 2>/dev/null || true
fi

# 문서 생성기 복사
if [[ -d "$COMMON_DIR/timsquad/generators" ]]; then
    cp "$COMMON_DIR/timsquad/generators/"*.xml .timsquad/generators/ 2>/dev/null || true
fi

echo "  ✓ 프로세스/제약조건 파일 복사 완료"

# ============================================================
# 5. SSOT 템플릿 복사
# ============================================================
echo -e "${YELLOW}[5/9] SSOT 문서 생성...${NC}"

# 템플릿 복사 및 플레이스홀더 교체 함수
copy_template() {
    local template="$1"
    local output="$2"
    sed -e "s/{{PROJECT_NAME}}/$PROJECT_NAME/g" \
        -e "s/{{DATE}}/$TODAY/g" \
        -e "s/{{TYPE}}/$PROJECT_TYPE/g" \
        -e "s/{{LEVEL}}/$PROJECT_LEVEL/g" \
        -e "s/{PROJECT_NAME}/$PROJECT_NAME/g" \
        -e "s/{DATE}/$TODAY/g" \
        -e "s/{TYPE}/$PROJECT_TYPE/g" \
        "$template" > "$output"
}

# Level 1 필수 문서
copy_template "$COMMON_DIR/timsquad/ssot/prd.template.md" ".timsquad/ssot/prd.md"
copy_template "$COMMON_DIR/timsquad/ssot/planning.template.md" ".timsquad/ssot/planning.md"
copy_template "$COMMON_DIR/timsquad/ssot/requirements.template.md" ".timsquad/ssot/requirements.md"
copy_template "$COMMON_DIR/timsquad/ssot/service-spec.template.md" ".timsquad/ssot/service-spec.md"
copy_template "$COMMON_DIR/timsquad/ssot/data-design.template.md" ".timsquad/ssot/data-design.md"

# Level 2+ 추가 문서
if [[ "$PROJECT_LEVEL" -ge 2 ]]; then
    copy_template "$COMMON_DIR/timsquad/ssot/error-codes.template.md" ".timsquad/ssot/error-codes.md"
    copy_template "$COMMON_DIR/timsquad/ssot/glossary.template.md" ".timsquad/ssot/glossary.md"
    copy_template "$COMMON_DIR/timsquad/ssot/functional-spec.template.md" ".timsquad/ssot/functional-spec.md"
    copy_template "$COMMON_DIR/timsquad/ssot/test-spec.template.md" ".timsquad/ssot/test-spec.md"

    # ADR 템플릿 복사
    cp "$COMMON_DIR/timsquad/ssot/adr/ADR-000-template.md" ".timsquad/ssot/adr/"

    # web-service 타입은 UI/UX 명세 필수
    if [[ "$PROJECT_TYPE" == "web-service" ]]; then
        copy_template "$COMMON_DIR/timsquad/ssot/ui-ux-spec.template.md" ".timsquad/ssot/ui-ux-spec.md"
    fi
fi

# Level 3 / fintech 추가 문서
if [[ "$PROJECT_LEVEL" -ge 3 || "$PROJECT_TYPE" == "fintech" ]]; then
    # security-spec 템플릿
    if [[ -f "$COMMON_DIR/timsquad/ssot/security-spec.template.md" ]]; then
        copy_template "$COMMON_DIR/timsquad/ssot/security-spec.template.md" ".timsquad/ssot/security-spec.md"
    fi

    # deployment-spec 템플릿
    if [[ -f "$COMMON_DIR/timsquad/ssot/deployment-spec.template.md" ]]; then
        copy_template "$COMMON_DIR/timsquad/ssot/deployment-spec.template.md" ".timsquad/ssot/deployment-spec.md"
    fi

    # env-config 템플릿
    if [[ -f "$COMMON_DIR/timsquad/ssot/env-config.template.md" ]]; then
        copy_template "$COMMON_DIR/timsquad/ssot/env-config.template.md" ".timsquad/ssot/env-config.md"
    fi

    # Level 3 아니었던 경우 UI/UX 명세도 추가
    if [[ "$PROJECT_LEVEL" -lt 2 && "$PROJECT_TYPE" == "fintech" ]]; then
        copy_template "$COMMON_DIR/timsquad/ssot/glossary.template.md" ".timsquad/ssot/glossary.md"
        copy_template "$COMMON_DIR/timsquad/ssot/functional-spec.template.md" ".timsquad/ssot/functional-spec.md"
        copy_template "$COMMON_DIR/timsquad/ssot/test-spec.template.md" ".timsquad/ssot/test-spec.md"
    fi
fi

# Level 3 + platform 타입: integration-spec 추가
if [[ "$PROJECT_LEVEL" -ge 3 || "$PROJECT_TYPE" == "platform" ]]; then
    if [[ -f "$COMMON_DIR/timsquad/ssot/integration-spec.template.md" ]]; then
        copy_template "$COMMON_DIR/timsquad/ssot/integration-spec.template.md" ".timsquad/ssot/integration-spec.md"
    fi
fi

# 로그 템플릿 복사
cp "$COMMON_DIR/timsquad/logs/_template.md" ".timsquad/logs/"
cp "$COMMON_DIR/timsquad/logs/_example.md" ".timsquad/logs/"

echo "  ✓ SSOT 문서 생성 완료"

# ============================================================
# 6. config.yaml 생성
# ============================================================
echo -e "${YELLOW}[6/9] 설정 파일 생성...${NC}"

# 타입별 config가 있으면 복사, 없으면 생성
if [[ -f "$TEMPLATES_DIR/$PROJECT_TYPE/config.yaml" ]]; then
    # 타입별 config 복사 후 프로젝트 정보 추가
    cat "$TEMPLATES_DIR/$PROJECT_TYPE/config.yaml" > .timsquad/config.yaml

    # 프로젝트 정보 상단에 추가
    cat > .timsquad/config.yaml.tmp << EOF
# TimSquad Project Configuration
# Generated: $TODAY

project:
  name: "$PROJECT_NAME"
  type: "$PROJECT_TYPE"
  level: $PROJECT_LEVEL
  created: "$TODAY"

# --- Type-specific configuration below ---

EOF
    cat .timsquad/config.yaml >> .timsquad/config.yaml.tmp
    mv .timsquad/config.yaml.tmp .timsquad/config.yaml
else
    # 기본 config 생성
    cat > .timsquad/config.yaml << EOF
# TimSquad Project Configuration
# Generated: $TODAY

project:
  name: "$PROJECT_NAME"
  type: "$PROJECT_TYPE"
  level: $PROJECT_LEVEL
  created: "$TODAY"

ssot:
  directory: .timsquad/ssot

agents:
  planner:
    model: opus
  developer:
    model: sonnet
  qa:
    model: sonnet
  security:
    model: sonnet

methodology:
  development: tdd
  process: agile
  branching: github-flow
  review: required

logs:
  directory: .timsquad/logs
  auto_save: true
EOF
fi

echo "  ✓ 설정 파일 생성 완료"

# ============================================================
# 7. 상태/지식 파일 초기화
# ============================================================
echo -e "${YELLOW}[7/9] 상태/지식 파일 초기화...${NC}"

# 초기 상태 파일
cat > .timsquad/state/current-phase.json << EOF
{
  "current_phase": "planning",
  "previous_phase": null,
  "entered_at": "$TIMESTAMP",
  "transition_history": [],
  "pending_actions": [],
  "blocked_by": null
}
EOF

# workspace.xml 초기화 (실시간 작업 상태)
if [[ -f "$COMMON_DIR/timsquad/state/workspace.xml" ]]; then
    sed -e "s/{{PROJECT_NAME}}/$PROJECT_NAME/g" \
        -e "s/{{TIMESTAMP}}/$TIMESTAMP/g" \
        "$COMMON_DIR/timsquad/state/workspace.xml" > .timsquad/state/workspace.xml
else
    # 템플릿 없으면 기본 생성
    cat > .timsquad/state/workspace.xml << WORKSPACE
<?xml version="1.0" encoding="UTF-8"?>
<workspace>
  <metadata>
    <project>$PROJECT_NAME</project>
    <created>$TIMESTAMP</created>
    <last-updated>$TIMESTAMP</last-updated>
  </metadata>

  <active-session>
    <agent>tsq-planner</agent>
    <started-at>$TIMESTAMP</started-at>
    <mode>planning</mode>
  </active-session>

  <current-task>
    <id>TASK-001</id>
    <title>PRD 작성</title>
    <agent>tsq-planner</agent>
    <phase>planning</phase>
    <status>in_progress</status>
  </current-task>

  <pending-tasks></pending-tasks>
  <completed-tasks></completed-tasks>
  <handoff></handoff>
  <blockers></blockers>
  <pending-approvals></pending-approvals>
  <feedback-queue></feedback-queue>
  <next-steps>
    <step order="1"><action>PRD 작성 완료</action></step>
    <step order="2"><action>요구사항 정의</action></step>
    <step order="3"><action>API 명세 작성</action></step>
    <step order="4"><action>데이터 설계</action></step>
    <step order="5"><action>User 승인 요청</action></step>
  </next-steps>
  <session-notes></session-notes>
</workspace>
WORKSPACE
fi

# knowledge 파일
cat > .timsquad/knowledge/tribal.md << 'EOF'
# Tribal Knowledge

프로젝트 진행하며 발견되는 팀 컨벤션과 암묵지를 기록합니다.

## 코딩 컨벤션

(프로젝트 진행하며 추가)

## 아키텍처 패턴

(프로젝트 진행하며 추가)

## 네이밍 규칙

(프로젝트 진행하며 추가)
EOF

cat > .timsquad/knowledge/lessons.md << 'EOF'
# Lessons Learned

프로젝트 진행하며 학습한 교훈을 기록합니다.

## 형식

```
## [날짜] 제목
- 문제:
- 원인:
- 해결:
- 교훈:
```

(프로젝트 진행하며 추가)
EOF

cat > .timsquad/knowledge/constraints.md << 'EOF'
# Constraints

프로젝트의 기술적/비즈니스적 제약사항을 기록합니다.

## 기술적 제약

(프로젝트 진행하며 추가)

## 비즈니스 제약

(프로젝트 진행하며 추가)

## 외부 의존성 제약

(프로젝트 진행하며 추가)
EOF

echo "  ✓ 상태/지식 파일 초기화 완료"

# ============================================================
# 8. 회고 시스템 초기화
# ============================================================
echo -e "${YELLOW}[8/9] 회고 시스템 초기화...${NC}"

# 회고 템플릿 복사
if [[ -d "$COMMON_DIR/timsquad/retrospective" ]]; then
    # 패턴 파일 복사
    if [[ -f "$COMMON_DIR/timsquad/retrospective/patterns/failure-patterns.md" ]]; then
        sed -e "s/{{TIMESTAMP}}/$TIMESTAMP/g" \
            "$COMMON_DIR/timsquad/retrospective/patterns/failure-patterns.md" > .timsquad/retrospective/patterns/failure-patterns.md
    fi
    if [[ -f "$COMMON_DIR/timsquad/retrospective/patterns/success-patterns.md" ]]; then
        sed -e "s/{{TIMESTAMP}}/$TIMESTAMP/g" \
            "$COMMON_DIR/timsquad/retrospective/patterns/success-patterns.md" > .timsquad/retrospective/patterns/success-patterns.md
    fi

    # 메트릭 스키마 복사
    if [[ -f "$COMMON_DIR/timsquad/retrospective/metrics/metrics-schema.json" ]]; then
        cp "$COMMON_DIR/timsquad/retrospective/metrics/metrics-schema.json" .timsquad/retrospective/metrics/
    fi

    # 리포트 템플릿 복사
    if [[ -f "$COMMON_DIR/timsquad/retrospective/cycle-report.template.md" ]]; then
        cp "$COMMON_DIR/timsquad/retrospective/cycle-report.template.md" .timsquad/retrospective/
    fi

    # 회고 설정 XML 복사
    if [[ -f "$COMMON_DIR/timsquad/retrospective/retrospective-config.xml" ]]; then
        cp "$COMMON_DIR/timsquad/retrospective/retrospective-config.xml" .timsquad/retrospective/
    fi

    # 회고 상태 XML 초기화
    if [[ -f "$COMMON_DIR/timsquad/retrospective/retrospective-state.xml" ]]; then
        sed -e "s/{{PROJECT_NAME}}/$PROJECT_NAME/g" \
            -e "s/{{TIMESTAMP}}/$TIMESTAMP/g" \
            "$COMMON_DIR/timsquad/retrospective/retrospective-state.xml" > .timsquad/retrospective/retrospective-state.xml
    fi
fi

# 역량 프레임워크 복사
if [[ -f "$COMMON_DIR/timsquad/constraints/competency-framework.xml" ]]; then
    cp "$COMMON_DIR/timsquad/constraints/competency-framework.xml" .timsquad/constraints/
fi

# 개선 이력 파일 초기화
cat > .timsquad/retrospective/improvements/prompts/changelog.md << 'EOF'
# Prompt Improvements Changelog

프롬프트 개선 이력을 기록합니다.

## 형식

```
## [날짜] v{버전} - {에이전트}
- 변경 내용:
- 개선 이유:
- 관련 패턴: FP-XXX / SP-XXX
```

(회고 사이클 진행하며 추가)
EOF

cat > .timsquad/retrospective/improvements/templates/changelog.md << 'EOF'
# Template Improvements Changelog

템플릿 개선 이력을 기록합니다.

## 형식

```
## [날짜] v{버전} - {템플릿명}
- 변경 내용:
- 개선 이유:
- 관련 패턴: FP-XXX / SP-XXX
```

(회고 사이클 진행하며 추가)
EOF

echo "  ✓ 회고 시스템 초기화 완료"

# ============================================================
# 9. CLAUDE.md 생성
# ============================================================
echo -e "${YELLOW}[8/8] CLAUDE.md 생성...${NC}"

# CLAUDE.md.template 사용
if [[ -f "$COMMON_DIR/CLAUDE.md.template" ]]; then
    sed -e "s/{{PROJECT_NAME}}/$PROJECT_NAME/g" \
        -e "s/{{PROJECT_TYPE}}/$PROJECT_TYPE/g" \
        -e "s/{{PROJECT_LEVEL}}/$PROJECT_LEVEL/g" \
        -e "s/{{INIT_DATE}}/$TODAY/g" \
        "$COMMON_DIR/CLAUDE.md.template" > CLAUDE.md
else
    # 폴백: 직접 생성
    cat > CLAUDE.md << EOF
# $PROJECT_NAME

> TimSquad로 관리되는 프로젝트입니다.

## 프로젝트 정보

- **타입**: $PROJECT_TYPE
- **레벨**: $PROJECT_LEVEL
- **생성일**: $TODAY

## 역할: Project Manager (PM)

이 세션에서 당신은 PM 역할입니다.
- 사용자와 직접 소통
- 서브에이전트에게 작업 위임
- SSOT 문서 관리

## 필수 참조

- \`.timsquad/config.yaml\`: 프로젝트 설정
- \`.timsquad/state/current-phase.json\`: 현재 Phase
- \`.timsquad/ssot/\`: SSOT 문서

## 에이전트 위임

- 기획/설계: @tsq-planner
- 코드 구현: @tsq-developer
- 검증/리뷰: @tsq-qa
- 보안 검토: @tsq-security

## 시작하기

1. \`.timsquad/ssot/prd.md\` 작성
2. Planning Phase 진행
3. User 승인 후 Implementation Phase

**TimSquad v2.0**
EOF
fi

echo "  ✓ CLAUDE.md 생성 완료"

# ============================================================
# 완료 메시지
# ============================================================
echo ""
echo -e "${GREEN}✅ TimSquad 프로젝트 초기화 완료!${NC}"
echo ""
echo -e "${CYAN}생성된 구조:${NC}"
echo "├── CLAUDE.md                    # PM 역할 정의"
echo "├── .claude/"
echo "│   ├── agents/                  # 에이전트 정의"
echo "│   │   ├── tsq-planner.md       # 기획/설계"
echo "│   │   ├── tsq-developer.md     # 구현"
echo "│   │   ├── tsq-qa.md            # 검증"
echo "│   │   ├── tsq-security.md      # 보안"
echo "│   │   ├── tsq-retro.md         # 회고"
echo "│   │   ├── tsq-prompter.md      # 프롬프트 최적화"
echo "│   │   ├── tsq-dba.md           # DB 설계"
echo "│   │   └── tsq-designer.md      # UI/UX 설계"
echo "│   └── skills/                  # 스킬 파일"
echo "│       ├── coding/, testing/, ..."
echo "│       └── methodology/tdd/, bdd/, ddd/"
echo "└── .timsquad/"
echo "    ├── config.yaml              # 프로젝트 설정"
echo "    ├── ssot/                    # SSOT 문서"
echo "    │   ├── prd.md, requirements.md, ..."
echo "    │   ├── glossary.md, functional-spec.md (L2+)"
echo "    │   ├── test-spec.md, security-spec.md (L3+)"
echo "    │   └── adr/                 # 아키텍처 결정 기록"
echo "    ├── process/                 # 프로세스 정의"
echo "    │   ├── workflow-base.xml"
echo "    │   ├── validation-rules.xml"
echo "    │   └── state-machine.xml"
echo "    ├── constraints/             # 제약조건"
echo "    │   ├── ssot-schema.xml"
echo "    │   └── competency-framework.xml"
echo "    ├── state/                   # 현재 상태"
echo "    │   └── current-phase.json"
echo "    ├── knowledge/               # 프로젝트 지식"
echo "    │   ├── tribal.md"
echo "    │   ├── lessons.md"
echo "    │   └── constraints.md"
echo "    ├── retrospective/          # 회고 시스템"
echo "    │   ├── cycles/             # 사이클별 리포트"
echo "    │   ├── metrics/            # 메트릭 데이터"
echo "    │   ├── patterns/           # 성공/실패 패턴"
echo "    │   ├── improvements/       # 개선 이력"
echo "    │   └── retrospective-config.xml"
echo "    └── logs/                    # 작업 로그"
echo ""
echo -e "${BLUE}현재 Phase: planning${NC}"
echo ""
echo -e "${CYAN}다음 단계:${NC}"
echo "1. .timsquad/ssot/prd.md 작성 시작"
echo "2. Claude Code에서 대화 시작"
echo "3. Planning Phase 완료 후 User 승인"
echo ""
echo -e "${YELLOW}Tip: Level $PROJECT_LEVEL 프로젝트는 다음 문서가 필수입니다:${NC}"

if [[ "$PROJECT_LEVEL" -eq 1 ]]; then
    echo "  - prd.md, planning.md, requirements.md"
    echo "  - service-spec.md, data-design.md"
elif [[ "$PROJECT_LEVEL" -eq 2 ]]; then
    echo "  - Level 1 + error-codes.md, glossary.md"
    echo "  - functional-spec.md, test-spec.md, ADR"
    if [[ "$PROJECT_TYPE" == "web-service" ]]; then
        echo "  - ui-ux-spec.md (web-service 필수)"
    fi
else
    echo "  - Level 2 + security-spec.md, deployment-spec.md"
    echo "  - env-config.md, integration-spec.md"
    echo "  - 전체 SSOT 문서 체계 필수"
fi

echo ""
echo -e "${CYAN}사용 가능한 에이전트:${NC}"
echo "  @tsq-planner   - 기획/설계    @tsq-developer - 구현"
echo "  @tsq-qa        - 검증/리뷰    @tsq-security  - 보안"
echo "  @tsq-dba       - DB 설계      @tsq-designer  - UI/UX 설계"
echo "  @tsq-prompter  - 프롬프트     @tsq-retro     - 회고 분석"
echo ""
