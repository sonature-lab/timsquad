---
title: Mobile Security Checklist (OWASP MASVS)
category: reference
source: owasp
tags: owasp, masvs, checklist, mobsf, frida, penetration-testing
---

# Mobile Security Checklist (OWASP MASVS)

OWASP Mobile Application Security Verification Standard (MASVS) L1/L2 기준 체크리스트.
Flutter 앱 보안 검증을 위한 참조 문서.

## Key Concepts

- **MASVS L1**: 표준 보안 (모든 모바일 앱 필수)
- **MASVS L2**: 심층 방어 (금융, 의료, 개인정보 처리 앱)
- **MASTG**: Mobile Application Security Testing Guide (테스트 방법론)

## MASVS L1 체크리스트 (필수)

### MASVS-STORAGE: 데이터 저장

| # | 항목 | Flutter 구현 |
|---|------|-------------|
| S-1 | 민감 데이터를 안전한 저장소에 보관 | `flutter_secure_storage` (Keychain/EncryptedSharedPreferences) |
| S-2 | 로그에 민감 데이터 미출력 | Release 빌드에서 `debugPrint` 제거, `kDebugMode` 체크 |
| S-3 | 백업에서 민감 데이터 제외 | Android `backup_rules.xml`, iOS `isExcludedFromBackup` |
| S-4 | 클립보드에 민감 데이터 자동 클리어 | `Clipboard.setData` 후 타이머로 클리어 |
| S-5 | 키보드 캐시에 민감 데이터 미저장 | `enableSuggestions: false`, `autocorrect: false` |
| S-6 | 서드파티 라이브러리에 민감 데이터 미전달 | Analytics에 PII 미포함 확인 |

### MASVS-CRYPTO: 암호화

| # | 항목 | Flutter 구현 |
|---|------|-------------|
| C-1 | 검증된 암호화 알고리즘 사용 | AES-256 (`encrypt` 패키지), SHA-256 |
| C-2 | 커스텀 암호화 구현 금지 | 표준 라이브러리만 사용 (자체 구현 X) |
| C-3 | 하드코딩된 암호화 키 없음 | 키는 `flutter_secure_storage` 또는 빌드 주입 |
| C-4 | 적절한 키 길이 사용 | AES: 256비트, RSA: 2048비트+ |

### MASVS-AUTH: 인증

| # | 항목 | Flutter 구현 |
|---|------|-------------|
| A-1 | 서버 측 인증 구현 | 클라이언트 인증은 UX, 실제 검증은 서버 |
| A-2 | 세션 토큰 안전 저장 | `flutter_secure_storage` |
| A-3 | 세션 만료 처리 | Dio interceptor 401 자동 갱신 |
| A-4 | 생체 인증 적용 (해당 시) | `local_auth`, PIN 폴백 |

### MASVS-NETWORK: 네트워크

| # | 항목 | Flutter 구현 |
|---|------|-------------|
| N-1 | TLS 1.2+ 사용 | Dart HttpClient 기본 지원 |
| N-2 | 인증서 검증 활성화 | `badCertificateCallback` 기본 거부 |
| N-3 | 인증서/공개키 pinning | Dio `IOHttpClientAdapter` + `SecurityContext` |
| N-4 | cleartext 트래픽 차단 | Android `network_security_config.xml`, iOS ATS |

### MASVS-RESILIENCE: 복원력

| # | 항목 | Flutter 구현 |
|---|------|-------------|
| R-1 | 코드 난독화 | `--obfuscate --split-debug-info` |
| R-2 | 디버그 감지 | `kDebugMode`, `kReleaseMode` 분기 |
| R-3 | 루팅/탈옥 감지 | `flutter_jailbreak_detection` 패키지 |
| R-4 | 무결성 검증 | 앱 서명 검증, 변조 감지 |

## MASVS L2 추가 항목 (금융/의료)

| # | 항목 | Flutter 구현 |
|---|------|-------------|
| L2-1 | 스크린샷 방지 | Android `FLAG_SECURE`, iOS 오버레이 |
| L2-2 | 앱 스위처 블러 | `WidgetsBindingObserver` + 오버레이 |
| L2-3 | 고급 루팅 감지 | Magisk/Frida 감지 로직 |
| L2-4 | 런타임 무결성 검증 | 코드 주입 감지, 후킹 방지 |
| L2-5 | SSL pinning 우회 감지 | 핀 실패 시 서버 리포트 |
| L2-6 | 화이트박스 암호화 | 키 보호 강화 (HSM 연동) |

## 보안 테스트 도구

### MobSF (Mobile Security Framework)

```bash
# 설치 및 실행
docker run -it --rm -p 8000:8000 opensecurity/mobile-security-framework-mobsf

# 사용법:
# 1. http://localhost:8000 접속
# 2. APK/IPA 파일 업로드
# 3. 자동 정적 분석 (하드코딩 키, 취약 API, 권한 등)
# 4. 보고서 확인 및 취약점 수정

# 분석 항목:
# - 하드코딩된 시크릿/API 키
# - 안전하지 않은 권한
# - 취약한 암호화 사용
# - 디버그 모드 활성화
# - 백업 허용 여부
# - cleartext 트래픽 허용
```

### Frida (동적 분석)

```bash
# Frida 설치
pip install frida-tools

# 앱 프로세스 확인
frida-ps -U

# SSL pinning 우회 테스트 (자체 앱 검증용)
frida -U -f com.example.app -l ssl_bypass.js

# 주요 테스트:
# - SSL pinning 우회 가능 여부
# - 메모리 내 토큰 노출 여부
# - 루팅 감지 우회 가능 여부
# - 암호화 키 메모리 노출 여부
```

### 기타 도구

```
정적 분석:
- MobSF: APK/IPA 자동 정적 분석
- semgrep: 소스 코드 패턴 매칭 (시크릿 하드코딩 등)
- gitleaks: git history에서 시크릿 검색

동적 분석:
- Frida: 런타임 후킹/분석
- Objection: Frida 기반 모바일 분석 도구
- Charles Proxy: 네트워크 트래픽 분석

Android 전용:
- apktool: APK 디컴파일/리패키징
- jadx: DEX → Java 소스 변환
- drozer: Android 보안 감사

iOS 전용:
- Hopper: 바이너리 역공학
- class-dump: Objective-C 헤더 덤프
```

## 보안 리뷰 프로세스

```
릴리즈 전 보안 체크:
1. MobSF 정적 분석 → 하드코딩 키, 취약 설정 확인
2. MASVS L1 체크리스트 통과
3. SSL pinning 동작 확인 (Charles Proxy 차단 확인)
4. 난독화 확인 (jadx/apktool로 디컴파일 시 심볼 난독화)
5. flutter_secure_storage 동작 확인 (루팅 기기 테스트)
6. Crashlytics 디버그 심볼 업로드 확인
7. (L2) Frida 동적 분석 → 런타임 보호 검증

주기적 보안 감사:
- 분기별: 의존성 취약점 스캔 (flutter pub outdated)
- 반기별: 외부 보안 감사 (해당 시)
- 상시: gitleaks pre-commit 훅 (시크릿 커밋 방지)
```

## References

- [OWASP MASVS](https://mas.owasp.org/MASVS/)
- [OWASP MASTG](https://mas.owasp.org/MASTG/)
- [MobSF Documentation](https://mobsf.github.io/docs/)
- [Frida Documentation](https://frida.re/docs/)
- [Flutter Security Best Practices](https://docs.flutter.dev/security)
