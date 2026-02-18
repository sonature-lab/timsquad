---
name: security
description: |
  Flutter 모바일 보안 가이드라인.
  flutter_secure_storage, biometric 인증, SSL pinning,
  코드 난독화, API 키 보호, 데이터 암호화.
version: "1.0.0"
tags: [flutter, security, encryption, biometric, ssl-pinning, obfuscation]
user-invocable: false
---

# Security

Flutter 모바일 보안 가이드. 저장소 암호화, 전송 보안, 실행 보호, 인증 강화.
OWASP MASVS 기준 L1/L2 준수를 목표로 레이어별 독립 방어.

## Philosophy

- 보안은 레이어 — 저장(암호화), 전송(TLS+pinning), 실행(난독화) 각각 독립 방어
- 키는 코드에 없다 — 빌드 시 주입, 런타임 안전 저장소
- 인증은 로컬 + 원격 이중 — biometric은 UX, 토큰은 보안

## Resources

6개 규칙 + 1개 참조. 모바일 보안 전체 레이어를 커버.

| Priority | Type | Resource | Description |
|----------|------|----------|-------------|
| CRITICAL | rule | [secure-storage](rules/secure-storage.md) | flutter_secure_storage (Keychain/EncryptedSharedPreferences), 민감 데이터 저장 |
| CRITICAL | rule | [authentication](rules/authentication.md) | 토큰 라이프사이클, 자동 갱신, biometric 인증, 세션 관리 |
| HIGH | rule | [ssl-pinning](rules/ssl-pinning.md) | Dio SecurityContext, 인증서/공개키 pinning, 핀 업데이트 전략 |
| HIGH | rule | [api-key-protection](rules/api-key-protection.md) | --dart-define 빌드 주입, envied 패키지, 하드코딩 금지 |
| HIGH | rule | [obfuscation](rules/obfuscation.md) | --obfuscate, ProGuard, dSYM, Crashlytics 심볼 업로드 |
| MEDIUM | rule | [data-protection](rules/data-protection.md) | 로컬 DB 암호화, 클립보드 보호, 스크린샷 방지 |
| — | ref | [mobile-security-checklist](references/mobile-security-checklist.md) | OWASP MASVS L1/L2 체크리스트, 추천 도구 |

## Quick Rules

### 저장소 보안
- 토큰/시크릿 → `flutter_secure_storage` (Keychain iOS / EncryptedSharedPreferences Android)
- `SharedPreferences`에 민감 데이터 저장 금지 — 평문 저장, 루팅 시 노출
- 로컬 DB → SQLCipher 또는 encrypt 패키지로 암호화

### 인증
- Access Token (단수명) + Refresh Token (장수명) 분리
- Dio interceptor로 401 감지 → 자동 갱신 → 재요청
- Biometric → `local_auth` 패키지, 실패 시 PIN/패턴 폴백

### 전송 보안
- TLS 1.2+ 필수, 인증서 pinning으로 MITM 차단
- Dio `SecurityContext` + `badCertificateCallback` 조합
- 핀 만료 대비 → 백업 핀 + 원격 업데이트 전략

### API 키 보호
- `--dart-define=API_KEY=xxx` → 빌드 시 주입
- `String.fromEnvironment('API_KEY')` → 런타임 참조
- `.env` → `envied` 패키지 (코드 생성, 난독화 옵션)
- 하드코딩 → 절대 금지 (git history에 영구 노출)

### 난독화
- `flutter build --obfuscate --split-debug-info=debug-info/`
- Android: ProGuard/R8 shrinking 활성화
- iOS: Bitcode (Xcode 설정) + dSYM 보관
- Crashlytics → 디버그 심볼 업로드 (크래시 리포트 해석용)

### 데이터 보호
- 스크린샷 방지 → Android `FLAG_SECURE`, iOS `UITextField` 오버레이
- 클립보드 → autofill 후 일정 시간 뒤 클리어
- 앱 백그라운드 진입 시 → 스크린 블러/오버레이

## Checklist

| Priority | Item |
|----------|------|
| CRITICAL | 토큰/시크릿은 flutter_secure_storage에만 저장 |
| CRITICAL | SharedPreferences에 민감 데이터 저장하지 않음 |
| CRITICAL | Access/Refresh Token 분리 + 자동 갱신 구현 |
| CRITICAL | API 키 하드코딩 없음 (--dart-define 또는 envied) |
| HIGH | SSL pinning 적용 (인증서 또는 공개키) |
| HIGH | 릴리즈 빌드 시 --obfuscate 플래그 사용 |
| HIGH | ProGuard/R8 shrinking 활성화 (Android) |
| HIGH | Biometric 인증 + PIN 폴백 구현 |
| MEDIUM | 로컬 DB 암호화 (SQLCipher) |
| MEDIUM | 스크린샷 방지 (FLAG_SECURE) 적용 |
| MEDIUM | Crashlytics 디버그 심볼 업로드 |
| MEDIUM | OWASP MASVS L1 체크리스트 통과 |
