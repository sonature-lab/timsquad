---
title: TSQ CLI Full Reference
category: reference
---

# TSQ CLI Full Reference

## tsq init
```bash
tsq init --type web-service   # 프로젝트 초기화
tsq init -n my-project -t web-app -l 2 --domain general-web
tsq init --stack react,node,prisma --workspaces "packages/*"
tsq init -y                   # 대화형 프롬프트 스킵
```

Options:
- `-n, --name <name>` — 프로젝트명
- `-t, --type <type>` — web-service|web-app|api-backend|platform|fintech|infra|mobile-app
- `-l, --level <level>` — 1(MVP)|2(Standard)|3(Enterprise)
- `--domain <domain>` — general-web|ml-engineering|fintech|mobile|gamedev|systems
- `--stack <items>` — 기술 스택 (콤마 구분)
- `--workspaces <pattern>` — 모노레포 워크스페이스 glob
- `-y, --yes` — 확인 프롬프트 스킵

## tsq status
```bash
tsq status                    # 프로젝트 상태 확인
```

## tsq q / tsq f
```bash
tsq q "버튼 색상 변경"          # Quick 모드 — 간단한 작업
tsq f "새 기능 추가"            # Full 모드 — SSOT 기반 작업
```

## Meta Index (tsq mi)
```bash
tsq mi rebuild                # 전체 코드+UI 인덱스 재구축
tsq mi update                 # 변경분만 반영
tsq mi stats                  # 통계 (Health Score, UI Health)
tsq mi stage <file> [options] # semantic 데이터 추가
tsq mi query [options]        # 인덱스 조회
tsq mi validate               # semantic 완성도 검증
```

## Log (L1/L2/L3)
```bash
tsq log add <agent> work "msg"         # 작업 로그 추가
tsq log add <agent> decision "msg"     # 결정 로그 추가
tsq log enrich <agent> --json '{...}'  # semantic 데이터 병합
tsq log task list [--agent <name>]     # L1 태스크 로그 목록
tsq log task view <file>               # L1 태스크 로그 상세
tsq log task stats                     # L1 통계
tsq log sequence create <seq-id> --phase <id> --report <path>  # L2 생성
tsq log sequence list                  # L2 목록
tsq log sequence check <seq-id>        # L1 완성도 확인
tsq log phase create <phase-id> --sequences "..."  # L3 생성
tsq log phase gate <phase-id>          # L3 전환 게이트
```

## Knowledge
```bash
tsq knowledge create <category> <name> # 지식 파일 생성
tsq knowledge validate                 # 지식 파일 검증
tsq knowledge list                     # 지식 파일 목록
```

## Workflow (tsq wf)
```bash
tsq wf set-phase <phase-id>                           # Phase 설정
tsq wf add-sequence <seq-id> --agents "developer,dba"  # 시퀀스 등록
tsq wf remove-sequence <seq-id>                        # 시퀀스 제거
tsq wf status                                          # 상태 확인
tsq wf config <key> <on|off>                           # 자동화 토글
# keys: sequence_log, phase_log, phase_gate, metrics, retro
```

## Audit
```bash
tsq audit validate <report>            # 감사 리포트 검증
tsq audit diff <before> <after>        # 감사 전후 비교
tsq audit fp list                      # FP Registry 목록
tsq audit fp add <item> --reason "msg" # FP 등록
```

## Other
```bash
tsq feedback "이슈 설명"               # 피드백 제출
tsq commit -m "메시지"                 # 커밋 (developer/dba만)
tsq retro                              # 회고 실행
tsq metrics                            # 메트릭 확인
```
