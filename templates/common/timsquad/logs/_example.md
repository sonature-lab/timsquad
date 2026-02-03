# developer 작업 로그 - 2026-02-02

---

## 15:30 | 소셜 로그인 콜백 처리 구현

### What (작업 내용)
- Google OAuth 콜백 핸들러 구현
- Apple OAuth 콜백 핸들러 구현
- 신규 사용자 자동 생성 로직 추가
- JWT 토큰 발급 및 쿠키 설정

### Why (작업 이유)
MVP 인증 시스템 구현. 소셜 로그인만 지원하기로 결정되어 Google/Apple OAuth만 구현.

**관련 결정:** [ADR-001 소셜 로그인만 지원](../ssot/adr/ADR-001-social-login-only.md)

### Reference (근거/참조)
| 유형 | 링크 | 설명 |
|-----|------|-----|
| SSOT | [service-spec.md#auth](../ssot/service-spec.md#auth) | 인증 API 명세 |
| ADR | [ADR-001](../ssot/adr/ADR-001.md) | 소셜 로그인만 지원 결정 |
| 외부 | [Google OAuth 문서](https://developers.google.com/identity) | 구현 참고 |
| 외부 | [Apple Sign-in 문서](https://developer.apple.com/sign-in-with-apple/) | 구현 참고 |

### 변경 파일
```
src/routes/auth/callback.ts (신규)
src/services/oauth.service.ts (신규)
src/services/user.service.ts (수정 - createFromOAuth 추가)
src/utils/jwt.ts (수정 - 쿠키 설정 옵션 추가)
```

### 결과
- ✅ 성공
- 테스트: 8/8 통과
- Google 로그인 E2E 확인 완료
- Apple은 실기기 테스트 필요

### 후속 작업 / 피드백 요청
- [ ] @qa Apple 로그인 실기기 테스트 요청
- [ ] @frontend 콜백 후 리다이렉트 URL 협의 필요

---

## 11:00 | 로그인 모달 컴포넌트 구현

### What (작업 내용)
- LoginModal 컴포넌트 생성
- Google/Apple 로그인 버튼 추가
- 모달 열기/닫기 애니메이션

### Why (작업 이유)
로그인 UI를 별도 페이지가 아닌 모달로 구현. 페이지 이동 없이 빠른 로그인 경험 제공.

**관련 결정:** [ADR-002 로그인 모달 방식](../ssot/adr/ADR-002-login-modal.md)

### Reference (근거/참조)
| 유형 | 링크 | 설명 |
|-----|------|-----|
| SSOT | [ui-ux-spec.md#login-modal](../ssot/ui-ux-spec.md#login-modal) | 모달 디자인 명세 |
| ADR | [ADR-002](../ssot/adr/ADR-002.md) | 모달 방식 결정 |
| 외부 | [Radix Dialog](https://radix-ui.com/docs/primitives/components/dialog) | 컴포넌트 참고 |
| 논의 | Slack #design 02/01 | 애니메이션 방향 논의 |

### 변경 파일
```
src/components/auth/LoginModal.tsx (신규)
src/components/auth/SocialButton.tsx (신규)
src/hooks/useLoginModal.ts (신규)
```

### 결과
- ✅ 성공
- Storybook 스토리 추가 완료
- 디자이너 리뷰 완료

### 후속 작업 / 피드백 요청
- [ ] @backend OAuth 콜백 URL 연동 대기

---
