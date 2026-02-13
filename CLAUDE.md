# TimSquad - AI Agent Development Process Framework

## 프로젝트 개요
AI 시대의 소프트웨어 개발 표준 프로세스 프레임워크.
SSOT 기반 문서 체계, 최적화된 에이전트 롤, 회고적 학습을 통해 지속적으로 개선되는 고품질 소프트웨어 생성.

## 상세 문서
- **PRD**: [docs/PRD.md](docs/PRD.md) - 전체 기획 문서

## 핵심 구조
```
/timsquad
├── templates/          # 프로젝트 타입별 템플릿
│   ├── common/         # 공통 (에이전트, 스킬, SSOT)
│   ├── web-service/
│   ├── api-backend/
│   ├── platform/
│   ├── fintech/
│   └── infra/
├── scripts/            # CLI 스크립트
├── install/            # 설치 스크립트
└── docs/               # 문서
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
```

## 작업 시 참고
- PRD 수정 시 `docs/PRD.md` 직접 편집
- 템플릿 작업 시 `templates/` 하위 파일 확인
- 스크립트 작업 시 `scripts/` 확인

## 커밋 규칙
- Conventional Commits 형식 사용 (feat:, fix:, refactor: 등)
