---
name: tsq-tidying
description: |
  구현 완료 후 필수 실행되는 코드 정리 + AI 안전 검증 게이트.
  Deep Module 준수, Tidying First 분리, glossary 네이밍 검증, 보안 스캔을 강제한다.
  tsq-developer가 "구현 완료"를 선언하기 전에 반드시 이 스킬의 Protocol을 통과해야 함.
  Use when: 구현 완료 직전, PR 전, 코드 리뷰 전, "tidying", "정리", "코드 품질 검증"
version: "1.0.0"
tags: [tidying, quality-gate, ai-safety, deep-module]
user-invocable: false
---

# Tidying & AI Safety Gate

구현 완료 후 자동 트리거되는 필수 품질 게이트. 통과하지 못하면 TASK 완료 불가.

## Philosophy

- Tidying 커밋과 Behavior Change 커밋은 절대 섞지 않는다
- AI가 생성한 코드는 반드시 사람이 리뷰 가능한 상태로 정리한다
- Deep Module 원칙: 인터페이스는 단순, 구현은 깊게
- glossary.md의 용어가 코드 네이밍에 100% 반영되어야 한다

## Contract

- **Trigger**: tsq-developer가 구현 완료 선언 직전 (자동)
- **Input**: 변경된 파일 목록 + glossary.md + ports.ts
- **Output**: PASS/FAIL 판정 + 위반 항목 리스트
- **Error**: FAIL 시 구현 완료 선언 차단, 위반 사항 수정 후 재실행
- **Dependencies**: tsq-coding, tsq-security

## Protocol

1. **변경 파일 수집**: `git diff --name-only` 로 변경 파일 파악
2. **Deep Module 검증**:
   - ports.ts / 인터페이스 파일: 메서드 5개 이하인지 확인
   - adapters/ 구현체: 인터페이스보다 충분히 깊은지 (최소 3배 LOC)
3. **Tidying 분리 검증**:
   - 현재 커밋에 Guard Clause 정리, 네이밍 변경, Dead Code 제거가 로직 변경과 섞여있지 않은지
   - 섞여있으면 → FAIL + "Tidying 커밋 분리 필요" 보고
4. **Glossary 네이밍 검증**:
   - glossary.md 로드
   - 변경 파일의 export된 함수/타입/변수명이 glossary 용어와 일치하는지
   - 불일치 → FAIL + 불일치 목록 보고
5. **AI 안전 스캔**:
   - 하드코딩된 시크릿 패턴 검색 (API key, password, token 리터럴)
   - SQL raw query 존재 시 → 파라미터 바인딩 사용 여부 확인
   - `any` 타입 사용 여부 (신규 코드에서)
   - `console.log` 잔존 여부
6. **결과 보고**: PASS면 구현 완료 진행 허용, FAIL이면 위반 목록 반환

## Verification

| Check | Command | Pass Criteria |
|-------|---------|---------------|
| Secret scan | `grep -rn "sk_live\|password.*=.*['\"]" src/` | 0 matches |
| Any type | `grep -rn ": any" src/ --include="*.ts"` | 0 matches in new code |
| Console.log | `grep -rn "console.log" src/ --include="*.ts"` | 0 matches |
| Deep Module ratio | ports LOC * 3 < adapters LOC | true |
| Glossary compliance | exported names match glossary.md | 100% |

## Quick Rules

### Tidying (Kent Beck)
- Guard Clauses: 조건 역전으로 중첩 제거
- Dead Code: 주석 처리 대신 삭제 (git이 기억함)
- Normalize Symmetries: 유사한 코드는 동일 구조로 통일
- Chunk Statements: 관련 코드 그룹핑 + 빈 줄 구분
- Extract Helper: 3회 이상 반복되면 추출 (그 이전은 하지 않음)

### AI Safety (타협 불가)
- `Co-Authored-By: Claude` 커밋 태그 필수
- DB 쿼리 / 외부 API 호출 코드는 반드시 리뷰 대상 표시
- 환경변수 하드코딩 절대 금지
- 인증/인가 로직은 middleware/guards에 분리
