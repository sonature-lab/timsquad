# 작업 프로세스 프로토콜

**작성일**: 2026-03-07
**적용 범위**: 2026-03-07 Sprint 전체
**목적**: AI 역할 분업, 수정 기록, 완료 검사, 리마인더를 표준화

---

## 1. 역할별 전문 에이전트 배치

하나의 AI에게 모든 것을 시키지 않고 역할별 전문 팀원을 배치한다.

### 에이전트 역할 정의

| 역할 | 책임 | 도구 권한 | 산출물 |
|------|------|-----------|--------|
| **Architect** | 설계 검증, 인터페이스 계약, 의존성 분석 | Read, Grep, Glob (읽기 전용) | 영향 분석 리포트, 스키마 설계안 |
| **Developer** | 코드 구현, 단위 테스트 작성 | Read, Edit, Write, Bash | 소스 코드, 테스트 코드 |
| **Reviewer** | 코드 리뷰, 교차 검증 | Read, Grep, Glob (읽기 전용) | 리뷰 코멘트, 승인/거절 |
| **QA** | DoD 검증, 통합/E2E 테스트 | Read, Bash (테스트 실행만) | 테스트 결과 리포트, DoD 체크리스트 |
| **Security** | 보안 감사, OWASP 체크 | Read, Grep (읽기 전용) | 보안 리뷰 리포트 |

### 에이전트 간 핸드오프 규칙

```
Architect -> Developer:   설계 검증 완료 후 구현 시작
Developer -> Reviewer:    구현 완료 + 단위 테스트 통과 후
Reviewer -> Developer:    리뷰 거절 시 수정 요청
Reviewer -> QA:           리뷰 승인 후 통합 검증
QA -> (완료):             DoD 전체 충족 시
QA -> Developer:          DoD 미충족 시 수정 요청
```

### 핸드오프 페이로드

각 핸드오프 시 다음 정보를 구조화하여 전달:

```yaml
handoff:
  from: developer
  to: reviewer
  task_id: "5-B"
  changed_files:
    - src/lib/compile-rules.ts
    - src/lib/compiler.ts
    - tests/unit/compiler.test.ts
  test_results:
    exit_code: 0
    passed: 12
    failed: 0
  warnings: []
  security_flags: []
```

---

## 2. 수정 기록 (CCTV)

모든 파일 변경을 추적하여 투명성을 확보한다.

### 기록 방법

각 태스크 완료 시 Developer가 기록:

```bash
# 태스크별 변경 추적
git diff --stat HEAD~1  # 마지막 커밋 대비
git diff --name-only    # 변경 파일 목록
```

### 기록 포맷

```markdown
## 수정 기록 - [태스크 ID]

### 변경 파일
| 파일 | 변경 유형 | 라인 수 | 설명 |
|------|-----------|---------|------|
| src/lib/compiler.ts | modified | +45/-3 | affected_e2e 필드 추가 |
| src/lib/compile-rules.ts | modified | +12/-0 | CompileRule 스키마 확장 |
| tests/unit/compiler.test.ts | added | +89 | E2E 매핑 단위 테스트 |

### 영향 범위
- 기존 API: 하위 호환 (optional 필드만 추가)
- 관련 이슈: #5
```

### CCTV 규칙
1. **모든 파일 변경은 기록한다** -- 예외 없음
2. **변경 유형 명시**: added / modified / deleted / renamed
3. **영향 범위 명시**: 기존 API 호환성, 관련 이슈
4. **태스크 경계 준수**: 태스크 범위 밖 파일 변경 시 경고

---

## 3. 완료 후 검사 (Post-Completion Check)

답변이 완전히 끝난 시점에 자동 체크를 수행한다.

### 자동 검사 체크리스트

```bash
# 1. 빌드 검사
npm run build

# 2. 단위 테스트
npm run test:unit

# 3. 통합 테스트 (해당 시)
npm run test:integration

# 4. 린트 (훅 스크립트)
shellcheck templates/platforms/claude-code/scripts/*.sh 2>/dev/null || true

# 5. 지식 검증 (스킬 변경 시)
npx tsq knowledge validate 2>/dev/null || true

# 6. 타입 체크
npx tsc --noEmit
```

### 검사 결과 처리

| 결과 | 조치 |
|------|------|
| 전체 통과 | -> Reviewer 핸드오프 |
| 빌드 실패 | -> 즉시 수정 (Developer) |
| 테스트 실패 | -> 원인 분석 + 수정 (Developer) |
| ShellCheck 경고 | -> 수정 후 재검사 |
| 타입 에러 | -> 즉시 수정 |

### 실패 시 재검사 루프

```
Developer 구현
  -> 자동 검사 실행
  -> 실패 발견
  -> 즉시 수정
  -> 재검사
  -> 통과 시 Reviewer 핸드오프
```

---

## 4. 리마인더 (Self-Review Prompts)

각 태스크 완료 시 AI가 스스로 다음 질문을 던져 결과물을 보완한다.

### 보안 리마인더

- "새로 추가한 파일 경로에 path traversal 위험은 없는가?"
- "사용자 입력을 직접 shell 명령에 넣는 곳은 없는가?" (command injection)
- "민감 정보(토큰, 비밀번호)가 로그에 노출되지 않는가?"
- "새 훅 스크립트에서 `eval`이나 unquoted variable expansion 사용은 없는가?"

### 호환성 리마인더

- "기존 API와 하위 호환되는가? (optional 필드만 추가했는가?)"
- "기존 설정 파일이 새 스키마에서도 정상 파싱되는가?"
- "새 CLI 옵션이 기존 옵션과 충돌하지 않는가?"

### 에지케이스 리마인더

- "데몬이 실행되지 않은 상태에서도 정상 동작하는가?"
- "파일이 없거나 빈 경우 graceful하게 처리하는가?"
- "동시 접근(race condition) 가능성은 없는가?"
- "네트워크 없는 환경에서도 작동하는가?"

### 완성도 리마인더

- "이 태스크의 DoD를 모두 충족했는가?"
- "변경한 코드에 대한 테스트를 작성했는가?"
- "관련 문서(SKILL.md, 가이드)를 업데이트했는가?"

---

## 5. 교차 검증 매트릭스

각 태스크에 대해 최소 2가지 검증을 거친다.

| 검증 유형 | 수행자 | 시점 | 방법 |
|-----------|--------|------|------|
| 설계 검증 | Architect | 구현 전 | 인터페이스 영향 분석 |
| 코드 리뷰 | Reviewer | 구현 후 | 변경 diff 검토 |
| 자동 테스트 | QA | 리뷰 후 | npm test + integration |
| 보안 감사 | Security | 리뷰 후 | OWASP + ShellCheck |
| 리마인더 | 자동 | 매 태스크 | 4개 카테고리 질문 |
| CCTV 확인 | QA | 매 태스크 | 수정 기록 vs 실제 diff 대조 |

---

## 6. 업무 순서 추적 (Checklist Workflow)

### 태스크 생명주기

```
[planned] -> [in_progress] -> [review] -> [testing] -> [done]
                  |               |            |
                  v               v            v
              [blocked]      [rejected]   [failed]
                  |               |            |
                  v               v            v
              (해결 후      (수정 후       (수정 후
               재개)         재리뷰)       재테스트)
```

### 일일 체크 포인트

매 Wave 시작 전:
1. 이전 Wave DoD 충족 확인
2. 블로커 식별 + 해결 방안
3. 변경 파일 CCTV 대조
4. 리마인더 체크리스트 실행

### 스프린트 종료 조건

- [ ] 13개 이슈 전체 DoD 충족
- [ ] `npm test` 전체 통과
- [ ] `npm run test:integration` 통과
- [ ] `shellcheck` 모든 .sh 통과
- [ ] `tsq knowledge validate` 통과
- [ ] 수정 기록 (CCTV) 전체 작성
- [ ] 보안 리마인더 전체 통과
- [ ] 호환성 리마인더 전체 통과

---

## 7. 스킬 활용 교차 검증

기존 TimSquad 스킬을 활용한 자동화된 검증:

| 스킬 | 용도 | 적용 시점 |
|------|------|-----------|
| `stability-verification` | 6-Layer 검증 + verify.sh | Phase 0 완료 시 |
| `testing` | TDD 사이클 준수 확인 | 매 태스크 |
| `security` | OWASP 체크리스트 | 훅 스크립트 작성 시 |
| `coding` | 코드 품질 규칙 | 매 구현 태스크 |
| `controller` | 위임 프로세스 준수 | Phase 1 #11 |
| `tsq-protocol` | TimSquad 프로세스 준수 | 전체 스프린트 |
