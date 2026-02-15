---
description: Phase 관리 규칙. Phase 전환, 허용/금지 작업, 종료 조건.
globs:
  - ".timsquad/state/**"
  - ".timsquad/ssot/**"
---

# Phase 관리

현재 Phase: `.timsquad/state/current-phase.json` 확인

| Phase | 허용 작업 | 금지 | 종료 조건 |
|-------|----------|------|----------|
| planning | SSOT 작성, 아키텍처 설계, ADR | 코드 구현 | User 승인 |
| design | UI/UX 설계, 와이어프레임 | 코드 구현 | User 승인 |
| implementation | 코드 구현, 테스트 작성 | SSOT 임의 수정 | 테스트+린트 통과 |
| review | 코드 리뷰, 검증 | 코드 직접 수정 | QA 체크리스트 통과 |
| security | 보안 검토 | 코드 직접 수정 | Critical/High 취약점 없음 |
| deployment | 배포 | - | 배포 완료 |

## Phase 종료 시
- `skills/retrospective/SKILL.md`를 활용하여 회고 실행
- Phase 전환 조건 미충족 시 다음 Phase 진행 금지
