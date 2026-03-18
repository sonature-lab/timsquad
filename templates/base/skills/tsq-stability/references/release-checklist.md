---
title: Release Checklist
category: guide
---

# L6: 릴리스 체크리스트 (수동)

릴리스 전 사람이 확인하는 항목. `verify.sh`가 커버하지 않는 영역.

## 버전 관리
- [ ] `package.json` version이 의도한 릴리스 버전과 일치
- [ ] CHANGELOG.md에 모든 변경사항 반영
- [ ] Breaking changes 별도 섹션에 기술

## 문서
- [ ] README.md에 새 기능/명령 반영
- [ ] PRD.md 버전 히스토리 업데이트
- [ ] 메모리 파일 현재 상태 반영

## Git
- [ ] `main` 브랜치에서 릴리스 (clean working tree)
- [ ] 모든 변경이 커밋됨 (`git status` clean)
- [ ] 릴리스 태그 생성 (`git tag v{version}`)

## npm 배포
- [ ] `npm run build` 성공
- [ ] `npm pack --dry-run` 검토 — 의도한 파일만 포함
- [ ] `templates/domains/` 미포함 (유료 콘텐츠)
- [ ] `.env`, `*.key` 등 민감 파일 미포함
- [ ] `npm publish` 실행

## 배포 후
- [ ] `npm info timsquad version` 으로 배포 확인
- [ ] GitHub Release 생성 (해당 시)
