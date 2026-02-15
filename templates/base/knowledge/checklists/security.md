# Security Checklist

> 스택별 보안 체크리스트. 에이전트가 보안 검토 시 참조합니다.

## 공통 (모든 프로젝트)

### 인증/인가
- [ ] 비밀번호 해싱 (bcrypt/argon2, cost factor 적절)
- [ ] JWT 검증 (서명, 만료, audience)
- [ ] 세션 관리 (만료, 갱신, 무효화)
- [ ] 권한 검사 (모든 엔드포인트)
- [ ] Rate Limiting (로그인, API)

### 입력 검증
- [ ] 서버 사이드 검증 (클라이언트 검증만 의존 금지)
- [ ] SQL Injection 방지 (파라미터화 쿼리)
- [ ] XSS 방지 (출력 인코딩)
- [ ] CSRF 방지 (토큰 또는 SameSite Cookie)
- [ ] 파일 업로드 검증 (타입, 크기, 경로)

### 데이터 보호
- [ ] HTTPS 강제
- [ ] 민감 데이터 암호화 (저장 시)
- [ ] PII 마스킹 (로그, 에러 메시지)
- [ ] .env 파일 .gitignore 포함
- [ ] 하드코딩된 시크릿 없음

### 의존성
- [ ] npm audit / yarn audit 통과
- [ ] 알려진 취약점 없는 버전 사용
- [ ] lock 파일 커밋

## Supabase 특화
- [ ] RLS (Row Level Security) 활성화 (모든 테이블)
- [ ] Service Role Key 서버 사이드만 사용
- [ ] Anon Key 권한 최소화
- [ ] Storage 접근 정책 설정
- [ ] Edge Functions 환경변수로 시크릿 관리

## Vercel 특화
- [ ] 환경변수 Preview/Production 분리
- [ ] CORS 설정 적절성
- [ ] Edge Middleware 인증 체크
- [ ] 빌드 시 시크릿 노출 없음

## Fintech 추가
- [ ] 서버사이드 금액 검증 (클라이언트 값 신뢰 금지)
- [ ] 감사 로그 (모든 금전 관련 작업)
- [ ] 거래 멱등성 (중복 처리 방지)
- [ ] PCI-DSS 관련 (카드 정보 미저장)
