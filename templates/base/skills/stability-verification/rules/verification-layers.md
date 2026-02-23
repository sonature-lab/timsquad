---
title: Verification Layers
description: 6-Layer 안정성 검증 정의. 각 레이어의 검사 항목, 도구, 실패 정책.
globs:
  - "**/*"
---

# Verification Layers

## L0: 정적 분석 (Syntax/Lint) — ~5초, Fail-Closed

| 검사 | 명령 | 대상 |
|------|------|------|
| TypeScript 컴파일 | `tsc --noEmit` | src/**/*.ts |
| ShellCheck | `shellcheck --severity=warning` | **/*.sh |
| Bash 구문 | `bash -n` | **/*.sh |
| JSON 유효성 | `jq empty < file.json` | **/*.json |

## L1: 유닛 테스트 — ~10초, Fail-Closed

| 검사 | 명령 |
|------|------|
| 전체 유닛 테스트 | `npm run test:unit` |
| 신규 모듈 테스트 존재 확인 | 수동 확인 |

## L2: 보안 스캔 — ~15초, Critical=Fail-Closed

| 검사 | 명령 | 실패 정책 |
|------|------|-----------|
| npm 취약점 | `npm audit --audit-level=high` | critical/high: 차단, moderate/low: 경고 |
| execSync 인젝션 | `grep -rn 'execSync(' src/` → 변수 보간 확인 | Fail-closed |
| eval 사용 | `grep -rn 'eval ' **/*.sh` | Fail-closed |
| 하드코딩 시크릿 | `check-secrets.sh` 또는 수동 검색 | Fail-closed |
| JSON 문자열 보간 | 쉘 스크립트에서 `echo "{...\"$VAR\"}"` 패턴 확인 | HIGH |
| .gitignore 보안 | .env, *.pem, *.key 항목 존재 확인 | MEDIUM |

## L3: 쉘 스크립트 테스트 — ~10초, Fail-Closed

| 검사 | 방법 |
|------|------|
| 빈 stdin → fail-open | `echo "" \| bash script.sh` |
| malformed JSON → fail-open | `echo "not json" \| bash script.sh` |
| 정상 입력 → 기대 출력 | 정상 JSON 파이프 |
| 특수문자 입력 → JSON 무결성 | 인용부호/개행 포함 입력 |
| jq fallback 동작 확인 | `|| echo ""` 패턴 존재 확인 |

## L4: 통합/E2E 테스트 — ~30초, Fail-Closed

| 검사 | 명령 |
|------|------|
| 통합 테스트 | `npm run test:integration` (있을 경우) |
| E2E 테스트 | `npm run test:e2e` (있을 경우) |
| CLI 스모크 테스트 | `node bin/tsq.js --version` |

## L5: 패키지 무결성 — ~10초, Fail-Closed

| 검사 | 명령 |
|------|------|
| 빌드 성공 | `npm run build` |
| 버전 출력 | `node bin/tsq.js --version` |
| 패키지 내용물 | `npm pack --dry-run` |
| 민감 파일 미포함 | grep .env/.key/.pem in pack output |
| 유료 콘텐츠 미포함 | `templates/domains/` 미포함 확인 |

## L6: 릴리스 준비 (수동) — Fail-Closed

`references/release-checklist.md` 참조.
