# TimSquad - AI Agent Development Process Framework

## 프로젝트 개요
AI 시대의 소프트웨어 개발 표준 프로세스 프레임워크.
SSOT 기반 문서 체계, 최적화된 에이전트 롤, 회고적 학습을 통해 지속적으로 개선되는 고품질 소프트웨어 생성.

## 핵심 구조
```
/timsquad
├── templates/base/         # 에이전트, 스킬, knowledge
├── templates/platforms/    # 플랫폼별 (claude-code, cursor)
├── templates/project-types/ # 타입별 (web-service, fintech)
├── src/                    # CLI 소스 코드
├── tests/                  # 테스트 (vitest)
└── docs/                   # 설계 문서 (PRD: docs/PRD.md)
```

## 스킬 시스템
`.claude/skills/` 디렉토리의 스킬이 자동으로 제안됩니다. 주요 스킬:
- **tsq-protocol** — 에이전트 공통 프로토콜 (로그, 피드백, CLI 사용)
- **controller** — 서브에이전트 위임 및 관리
- **coding / testing / security** — 코드 작성, 테스트, 보안 가이드
- **tsq-cli** — CLI 커맨드 레퍼런스 (`tsq init`, `tsq status`, `tsq q`, `tsq f` 등)
- **/spec, /audit, /review** — 스펙 확인, 자기감사, 교차 리뷰 (슬래시 커맨드)

## 작업 원칙
- 요구사항에 여러 해석이 가능하면 조용히 선택하지 말고 선택지를 제시하라
- 구현 전에 검증 기준(테스트 or 확인 방법)을 먼저 명시하라

## 커밋 규칙
- Conventional Commits 형식 사용 (feat:, fix:, refactor: 등)
