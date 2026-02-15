# TimSquad - AI Agent Development Process Framework

## 프로젝트 개요
AI 시대의 소프트웨어 개발 표준 프로세스 프레임워크.
SSOT 기반 문서 체계, 최적화된 에이전트 롤, 회고적 학습을 통해 지속적으로 개선되는 고품질 소프트웨어 생성.

## 상세 문서
- **PRD**: [docs/PRD.md](docs/PRD.md) - 전체 기획 문서

## 핵심 구조
```
/timsquad
├── templates/
│   ├── base/              # 플랫폼 무관 (에이전트, 스킬, knowledge)
│   ├── platforms/         # 플랫폼별 (claude-code/, cursor/ 등)
│   ├── project-types/     # 타입별 (web-service, fintech 등)
│   └── domains/           # 도메인 오버레이 (향후)
├── src/                   # CLI 소스 코드
├── tests/                 # 테스트 (vitest)
└── docs/                  # 설계 문서
```

## 핵심 개념
1. **SSOT** - Single Source of Truth 문서 체계
2. **분수 모델** - SSOT 순차 + 작업 병렬
3. **피드백 라우팅** - Level 1/2/3 분류
4. **회고적 학습** - 프롬프트/템플릿 자동 개선
5. **Quick Mode** - 간단한 작업용 경량 파이프라인

## CLI
```bash
tsq init --type web-service   # 프로젝트 초기화
tsq status                    # 현재 상태 확인
tsq q "버튼 색상 변경"          # Quick 모드
tsq f "새 기능 추가"            # Full 모드
tsq retro                     # 회고 실행
tsq metrics                   # 메트릭 확인

# Meta Index
tsq mi rebuild                # 전체 코드+UI 인덱스 재구축
tsq mi update                 # 변경분만 반영
tsq mi stats                  # 통계 (Health Score, UI Health)
tsq mi stage <file> [options] # semantic 데이터 추가
tsq mi query [options]        # 인덱스 조회
tsq mi validate               # semantic 완성도 검증

# Log (L1/L2/L3)
tsq log enrich <agent> --json '{...}'       # semantic 데이터 병합
tsq log task list [--agent <name>]          # L1 태스크 로그 목록
tsq log task view <file>                    # L1 태스크 로그 상세
tsq log task stats                          # L1 통계
tsq log sequence create <seq-id> --phase <id> --report <path>  # L2 시퀀스 로그 생성
tsq log sequence list                       # L2 목록
tsq log sequence check <seq-id>             # L1 완성도 확인
tsq log phase create <phase-id> --sequences "..."  # L3 페이즈 로그 생성
tsq log phase gate <phase-id>               # L3 전환 게이트

# Knowledge
tsq knowledge create <category> <name>      # 지식 파일 생성 (platforms/domains/checklists)
tsq knowledge validate                      # 지식 파일 검증
tsq knowledge list                          # 지식 파일 목록

# Workflow (자동화)
tsq wf set-phase <phase-id>                 # 현재 Phase 설정
tsq wf add-sequence <seq-id> --agents "developer,dba"  # 시퀀스 등록
tsq wf remove-sequence <seq-id>             # 시퀀스 제거
tsq wf status                               # 워크플로우 상태 + 자동화 토글
tsq wf config <key> <on|off>                # 자동화 토글 (sequence_log, phase_log, phase_gate, metrics, retro)
# (내부) tsq wf track-task / tsq wf check — Hook이 자동 호출
```

## 작업 원칙
- 요구사항에 여러 해석이 가능하면 조용히 선택하지 말고 선택지를 제시하라
- 구현 전에 검증 기준(테스트 or 확인 방법)을 먼저 명시하라

## 작업 시 참고
- PRD 수정 시 `docs/PRD.md` 직접 편집
- 템플릿 작업 시 `templates/` 하위 파일 확인
- 스크립트 작업 시 `scripts/` 확인

## 커밋 규칙
- Conventional Commits 형식 사용 (feat:, fix:, refactor: 등)
