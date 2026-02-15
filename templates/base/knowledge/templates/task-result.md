# Task Result Template

모든 에이전트가 태스크 완료 시 사용하는 공통 리턴 형식.

## TASK-{id} Result

### Summary
{1줄 요약}

### Changes
| File | Lines | Action | Description |
|------|-------|--------|-------------|

### Techniques Applied
- {패턴/기법}: {적용 이유}

### SSOT Alignment
- {ssot-문서}#{섹션}: {구현 상태}

### Decisions
- {결정}: {근거}

### Issues / Handoff Notes
- {전달 사항} 또는 "없음"

### UI Meta Index Updates (컴포넌트 작업 시, 선택)
| component | layout | colorScheme | spacing | states | responsive |
|-----------|--------|-------------|---------|--------|------------|

### TSQ Log Enrich (필수)
위 내용을 기반으로 반드시 tsq log enrich를 호출하세요:
```bash
tsq log enrich {agent} --json '{"summary":"...", "techniques":[...], "ssot_refs":[...], "decisions":[...], "issues":[...]}'
```

---

## Few-shot 예제

### 예제 1: Developer — API 엔드포인트 구현

```
## P3-S001-T001 Result

### Summary
POST /auth/login 엔드포인트 구현 + 단위 테스트 3개 작성

### Changes
| File | Lines | Action | Description |
|------|-------|--------|-------------|
| src/routes/auth/login.ts | 1-45 | created | 로그인 핸들러 (Zod 검증 + Supabase Auth) |
| src/routes/auth/login.test.ts | 1-62 | created | 성공/실패/입력검증 3 케이스 |
| src/types/auth.ts | 12-18 | modified | LoginRequest/Response 타입 추가 |

### Techniques Applied
- Zod validation: 런타임 입력 검증으로 타입 안전성 확보
- Repository pattern: Supabase 직접 호출 대신 AuthRepository 추상화

### SSOT Alignment
- service-spec.md#POST-auth-login: aligned (명세대로 구현)
- data-design.md#users-table: aligned (email + hashed_password 컬럼 활용)
- error-codes.md#AUTH-001: aligned (잘못된 자격증명 에러 코드 적용)

### Decisions
- session-based auth 선택: Supabase RLS와의 호환성 (JWT는 RLS 정책과 충돌)

### Issues / Handoff Notes
- 없음

### TSQ Log Enrich
```

```bash
tsq log enrich developer --json '{"summary":"POST /auth/login 엔드포인트 구현 + 단위 테스트 3개","techniques":[{"name":"Zod validation","reason":"런타임 입력 검증"},{"name":"Repository pattern","reason":"Supabase 추상화"}],"ssot_refs":[{"doc":"service-spec.md","section":"POST-auth-login","status":"aligned"},{"doc":"data-design.md","section":"users-table","status":"aligned"}],"decisions":[{"decision":"session-based auth","rationale":"Supabase RLS 호환성"}],"issues":[]}'
```

### 예제 2: QA — 리뷰 결과

```
## P3-S001-T003 Result

### Summary
인증 시퀀스 코드 리뷰 — Level 1 이슈 2건, Level 2 이슈 1건 발견

### Changes
| File | Lines | Action | Description |
|------|-------|--------|-------------|
| (리뷰 대상) src/routes/auth/ | - | reviewed | 3개 파일 검토 |

### Techniques Applied
- SSOT 교차 검증: service-spec.md vs 실제 응답 형식 대조
- 경계값 분석: 비밀번호 길이 제한 미검증 발견

### SSOT Alignment
- service-spec.md#POST-auth-login: partial (응답의 token 필드명이 access_token으로 불일치)
- error-codes.md#AUTH-002: misaligned (계정 잠금 에러코드 미구현)

### Decisions
- 없음 (리뷰 역할)

### Issues / Handoff Notes
- Level 1: 비밀번호 최소 길이 검증 누락 (src/routes/auth/login.ts:23) → @developer 수정 요청
- Level 1: 로그인 실패 시 응답에 email 노출 (src/routes/auth/login.ts:38) → @developer 수정 요청
- Level 2: token → access_token 필드명 SSOT 불일치 → PM 보고 (명세 vs 구현 어느 쪽이 정확한지 확인 필요)
```
