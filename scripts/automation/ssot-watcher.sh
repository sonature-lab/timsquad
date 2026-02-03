#!/bin/bash

# TimSquad SSOT Watcher v1.0
# SSOT 문서 변경 감지 및 알림 (토큰 0)
#
# 사용법: tsq watch [start|stop|status]

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# TimSquad 루트 찾기
find_timsquad_root() {
    local dir="$PWD"
    while [[ "$dir" != "/" ]]; do
        if [[ -d "$dir/.timsquad" ]]; then
            echo "$dir"
            return 0
        fi
        dir="$(dirname "$dir")"
    done
    return 1
}

TSQ_ROOT=$(find_timsquad_root) || {
    echo -e "${RED}Error: TimSquad 프로젝트가 아닙니다.${NC}"
    exit 1
}

SSOT_DIR="$TSQ_ROOT/.timsquad/ssot"
STATE_DIR="$TSQ_ROOT/.timsquad/state"
WATCH_PID_FILE="$STATE_DIR/.ssot-watcher.pid"
WATCH_LOG_FILE="$STATE_DIR/ssot-changes.log"

# 도움말
show_help() {
    echo "사용법: tsq watch [command]"
    echo ""
    echo "Commands:"
    echo "  start     SSOT 감시 시작"
    echo "  stop      SSOT 감시 중지"
    echo "  status    감시 상태 확인"
    echo "  changes   최근 변경 목록"
    echo "  check     현재 변경 사항 확인"
    echo ""
}

# 체크섬 계산
calculate_checksums() {
    local checksum_file="$STATE_DIR/.ssot-checksums"

    find "$SSOT_DIR" -name "*.md" -type f 2>/dev/null | while read -r file; do
        local checksum=$(md5 -q "$file" 2>/dev/null || md5sum "$file" 2>/dev/null | cut -d' ' -f1)
        echo "$file:$checksum"
    done > "$checksum_file"
}

# 변경 감지
detect_changes() {
    local old_checksums="$STATE_DIR/.ssot-checksums"
    local new_checksums="$STATE_DIR/.ssot-checksums.new"
    local changes=()

    # 새 체크섬 계산
    find "$SSOT_DIR" -name "*.md" -type f 2>/dev/null | while read -r file; do
        local checksum=$(md5 -q "$file" 2>/dev/null || md5sum "$file" 2>/dev/null | cut -d' ' -f1)
        echo "$file:$checksum"
    done > "$new_checksums"

    # 이전 체크섬이 없으면 초기화
    if [[ ! -f "$old_checksums" ]]; then
        mv "$new_checksums" "$old_checksums"
        return
    fi

    # 변경 비교
    local changed=false
    while IFS=: read -r file checksum; do
        local old_checksum=$(grep "^$file:" "$old_checksums" 2>/dev/null | cut -d: -f2)

        if [[ -z "$old_checksum" ]]; then
            # 새 파일
            echo -e "${GREEN}[NEW]${NC} $(basename "$file")"
            changed=true
        elif [[ "$checksum" != "$old_checksum" ]]; then
            # 수정된 파일
            echo -e "${YELLOW}[MOD]${NC} $(basename "$file")"
            changed=true
        fi
    done < "$new_checksums"

    # 삭제된 파일 확인
    while IFS=: read -r file checksum; do
        if ! grep -q "^$file:" "$new_checksums" 2>/dev/null; then
            echo -e "${RED}[DEL]${NC} $(basename "$file")"
            changed=true
        fi
    done < "$old_checksums"

    # 새 체크섬으로 업데이트
    mv "$new_checksums" "$old_checksums"

    $changed && return 0 || return 1
}

# 변경 로깅
log_change() {
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    echo "[$timestamp] SSOT 변경 감지" >> "$WATCH_LOG_FILE"
}

# 감시 시작
cmd_start() {
    if [[ -f "$WATCH_PID_FILE" ]]; then
        local pid=$(cat "$WATCH_PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${YELLOW}이미 실행 중입니다 (PID: $pid)${NC}"
            return
        fi
    fi

    # 초기 체크섬 계산
    calculate_checksums

    echo -e "${GREEN}SSOT 감시를 시작합니다...${NC}"
    echo "  대상: $SSOT_DIR"

    # 백그라운드에서 감시
    (
        while true; do
            sleep 5
            if detect_changes > /dev/null 2>&1; then
                log_change
            fi
        done
    ) &

    echo $! > "$WATCH_PID_FILE"
    echo -e "${GREEN}✓ 감시 시작됨 (PID: $(cat "$WATCH_PID_FILE"))${NC}"
}

# 감시 중지
cmd_stop() {
    if [[ -f "$WATCH_PID_FILE" ]]; then
        local pid=$(cat "$WATCH_PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid"
            rm "$WATCH_PID_FILE"
            echo -e "${GREEN}✓ 감시 중지됨${NC}"
        else
            rm "$WATCH_PID_FILE"
            echo -e "${YELLOW}프로세스가 이미 종료됨${NC}"
        fi
    else
        echo -e "${YELLOW}실행 중인 감시 프로세스가 없습니다${NC}"
    fi
}

# 상태 확인
cmd_status() {
    if [[ -f "$WATCH_PID_FILE" ]]; then
        local pid=$(cat "$WATCH_PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${GREEN}● 실행 중${NC} (PID: $pid)"
        else
            echo -e "${RED}● 중지됨${NC} (비정상 종료)"
            rm "$WATCH_PID_FILE"
        fi
    else
        echo -e "${YELLOW}● 중지됨${NC}"
    fi
}

# 최근 변경 목록
cmd_changes() {
    if [[ -f "$WATCH_LOG_FILE" ]]; then
        echo -e "${CYAN}━━━ 최근 SSOT 변경 ━━━${NC}"
        tail -20 "$WATCH_LOG_FILE"
    else
        echo "변경 이력이 없습니다."
    fi
}

# 현재 변경 확인
cmd_check() {
    echo -e "${CYAN}━━━ SSOT 변경 사항 ━━━${NC}"

    if detect_changes; then
        echo ""
        echo -e "${YELLOW}변경된 파일이 있습니다.${NC}"
    else
        echo "변경 사항 없음"
    fi
}

# 메인 실행
case "${1:-status}" in
    start)
        cmd_start
        ;;
    stop)
        cmd_stop
        ;;
    status)
        cmd_status
        ;;
    changes)
        cmd_changes
        ;;
    check)
        cmd_check
        ;;
    -h|--help|help)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        show_help
        exit 1
        ;;
esac
