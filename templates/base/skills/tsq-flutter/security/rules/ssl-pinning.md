---
title: SSL Pinning
impact: HIGH
impactDescription: "미적용 → MITM 공격에 API 통신 노출, 토큰/데이터 탈취"
tags: ssl, tls, certificate-pinning, public-key-pinning, dio, mitm
---

## SSL Pinning

**Impact: HIGH (미적용 → MITM 공격에 API 통신 노출, 토큰/데이터 탈취)**

Dio SecurityContext 기반 인증서/공개키 pinning.
프록시 도구(Charles, mitmproxy)를 통한 API 통신 감청 방지.

### 의존성

```yaml
# pubspec.yaml
dependencies:
  dio: ^5.7.0
```

### 인증서 Pinning

**Incorrect (pinning 없이 기본 HTTP 클라이언트 사용):**
```dart
final dio = Dio(BaseOptions(baseUrl: 'https://api.example.com'));
// → 루팅 기기 + Charles Proxy → 모든 API 통신 감청 가능
// → 사용자 토큰, 개인정보 탈취
```

**Correct (인증서 pinning 적용):**
```dart
class PinnedHttpClient {
  /// 인증서 pinning이 적용된 Dio 인스턴스 생성
  static Dio create({required String baseUrl}) {
    final securityContext = SecurityContext(withTrustedRoots: false);

    // 서버 인증서를 앱에 번들
    // assets/certificates/api_cert.pem
    final certData = rootBundle.load('assets/certificates/api_cert.pem');

    return Dio(BaseOptions(baseUrl: baseUrl))
      ..httpClientAdapter = IOHttpClientAdapter(
        createHttpClient: () {
          final client = HttpClient(context: securityContext);

          client.badCertificateCallback = (cert, host, port) {
            // 핀 검증 실패 → 연결 거부
            return false;
          };

          return client;
        },
      );
  }
}
```

### 공개키 Pinning (권장)

```dart
/// 공개키 pinning — 인증서 갱신 시에도 공개키가 동일하면 동작
class PublicKeyPinnedClient {
  // SHA-256 공개키 해시 (base64)
  // openssl 명령어로 추출:
  // openssl s_client -connect api.example.com:443 | \
  //   openssl x509 -pubkey -noout | \
  //   openssl pkey -pubin -outform der | \
  //   openssl dgst -sha256 -binary | base64
  static const _pinnedKeys = [
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', // 현재 키
    'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=', // 백업 키
  ];

  static Dio create({required String baseUrl}) {
    return Dio(BaseOptions(baseUrl: baseUrl))
      ..httpClientAdapter = IOHttpClientAdapter(
        createHttpClient: () {
          final client = HttpClient();

          client.badCertificateCallback = (X509Certificate cert, String host, int port) {
            // 공개키 해시 비교
            final certHash = sha256
                .convert(cert.der)
                .toString();

            // 핀 목록에 포함되어 있으면 허용
            return _pinnedKeys.contains(certHash);
          };

          return client;
        },
      );
  }
}
```

### 핀 업데이트 전략

```dart
/// 원격 핀 설정 — 인증서 만료 시 앱 업데이트 없이 핀 교체
class RemotePinManager {
  final SecureStorageService _storage;
  final Dio _bootstrapDio; // pinning 없는 초기 요청용 (최초 1회)

  RemotePinManager({
    required SecureStorageService storage,
    required Dio bootstrapDio,
  })  : _storage = storage,
        _bootstrapDio = bootstrapDio;

  /// 앱 시작 시 핀 목록 갱신
  Future<List<String>> fetchPins() async {
    // 1. 로컬 캐시 확인
    final cached = await _storage.getPinnedKeys();
    if (cached != null && cached.isNotEmpty) {
      return cached;
    }

    // 2. 서버에서 핀 목록 가져오기 (최초 또는 캐시 만료)
    try {
      final response = await _bootstrapDio.get('/security/pins');
      final pins = (response.data['pins'] as List).cast<String>();
      await _storage.savePinnedKeys(pins);
      return pins;
    } catch (e) {
      // 3. 하드코딩 폴백 (앱 번들)
      return PublicKeyPinnedClient._pinnedKeys;
    }
  }
}
```

### 디버그/개발 환경 처리

```dart
/// 개발 환경에서만 pinning 비활성화
Dio createApiClient({required String baseUrl}) {
  if (kDebugMode) {
    // 개발 환경: Charles Proxy 등 디버깅 도구 허용
    return Dio(BaseOptions(baseUrl: baseUrl));
  }

  // 프로덕션: pinning 적용
  return PublicKeyPinnedClient.create(baseUrl: baseUrl);
}

// 주의: kDebugMode가 아닌 커스텀 플래그 사용 시
// Release 빌드에서 실수로 pinning 비활성화 위험
// → kDebugMode (컴파일 타임 상수) 사용 권장
```

### 플랫폼별 고려사항

```
iOS:
- App Transport Security (ATS) → TLS 1.2 이상 강제 (기본)
- NSAllowsArbitraryLoads: false 유지 (HTTP 차단)
- 개발 서버 예외: NSExceptionDomains에 로컬 서버만 추가

Android:
- Network Security Config (res/xml/network_security_config.xml)
- 기본: 시스템 CA만 신뢰 (Android 7+)
- 사용자 CA 차단: <trust-anchors><certificates src="system"/></trust-anchors>
- 디버그 빌드 예외: <debug-overrides><trust-anchors><certificates src="user"/></trust-anchors></debug-overrides>
```

```xml
<!-- android/app/src/main/res/xml/network_security_config.xml -->
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system"/>
    </trust-anchors>
  </base-config>
  <debug-overrides>
    <trust-anchors>
      <certificates src="user"/>
    </trust-anchors>
  </debug-overrides>
</network-security-config>
```

### 규칙

- 프로덕션 → SSL pinning 필수 (인증서 또는 공개키)
- 공개키 pinning 권장 → 인증서 갱신 시에도 동일 키면 동작
- 백업 핀 최소 1개 → 키 롤오버 시 앱 업데이트 없이 전환
- `badCertificateCallback` → 핀 불일치 시 `return false` (연결 거부)
- 디버그 모드 → `kDebugMode`로 pinning 비활성화 (프록시 디버깅용)
- `kDebugMode` 외 커스텀 플래그 → Release에서 실수로 비활성화 위험
- Android → `network_security_config.xml` 에서 cleartext 차단 + 사용자 CA 차단
- iOS → ATS 기본 유지, `NSAllowsArbitraryLoads: false`
- 핀 만료 대비 → 원격 핀 업데이트 또는 하드코딩 백업 핀
- 인증서 교체 주기 → 핀 업데이트 배포 일정과 동기화
