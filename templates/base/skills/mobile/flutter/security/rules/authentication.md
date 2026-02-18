---
title: Authentication & Token Management
impact: CRITICAL
impactDescription: "토큰 미갱신 → 강제 로그아웃, 토큰 평문 저장 → 계정 탈취"
tags: token, refresh, biometric, local_auth, dio-interceptor, session
---

## Authentication & Token Management

**Impact: CRITICAL (토큰 미갱신 → 강제 로그아웃, 토큰 평문 저장 → 계정 탈취)**

Access/Refresh Token 라이프사이클, Dio interceptor 자동 갱신, biometric 인증, 세션 타임아웃.

### 의존성

```yaml
# pubspec.yaml
dependencies:
  dio: ^5.7.0
  local_auth: ^2.3.0
  flutter_secure_storage: ^9.2.0
```

### 토큰 라이프사이클

**Incorrect (Access Token만 사용, 갱신 없음):**
```dart
// Access Token 하나만 저장 → 만료 시 강제 로그아웃
final response = await dio.get('/api/data',
  options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
);
// 401 응답 → 사용자에게 "다시 로그인하세요" → UX 파괴
```

**Correct (Access + Refresh Token 분리, 자동 갱신):**
```dart
class AuthInterceptor extends Interceptor {
  final SecureStorageService _storage;
  final Dio _tokenDio; // 토큰 갱신 전용 Dio (인터셉터 없음)
  bool _isRefreshing = false;
  final _pendingRequests = <({RequestOptions options, ErrorInterceptorHandler handler})>[];

  AuthInterceptor({
    required SecureStorageService storage,
    required Dio tokenDio,
  })  : _storage = storage,
        _tokenDio = tokenDio;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await _storage.getAccessToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode != 401) {
      return handler.next(err);
    }

    // 이미 갱신 중이면 대기열에 추가
    if (_isRefreshing) {
      _pendingRequests.add((options: err.requestOptions, handler: handler));
      return;
    }

    _isRefreshing = true;

    try {
      final refreshToken = await _storage.getRefreshToken();
      if (refreshToken == null) {
        _forceLogout();
        return handler.next(err);
      }

      // 토큰 갱신 요청
      final response = await _tokenDio.post('/auth/refresh', data: {
        'refresh_token': refreshToken,
      });

      final newAccess = response.data['access_token'] as String;
      final newRefresh = response.data['refresh_token'] as String;
      await _storage.saveTokens(
        accessToken: newAccess,
        refreshToken: newRefresh,
      );

      // 원래 요청 재시도
      err.requestOptions.headers['Authorization'] = 'Bearer $newAccess';
      final retryResponse = await _tokenDio.fetch(err.requestOptions);
      handler.resolve(retryResponse);

      // 대기 중인 요청 재시도
      for (final pending in _pendingRequests) {
        pending.options.headers['Authorization'] = 'Bearer $newAccess';
        _tokenDio.fetch(pending.options).then(
          (r) => pending.handler.resolve(r),
          onError: (e) => pending.handler.reject(e as DioException),
        );
      }
    } on DioException {
      // Refresh Token도 만료 → 강제 로그아웃
      await _storage.deleteTokens();
      _forceLogout();
      handler.next(err);
    } finally {
      _isRefreshing = false;
      _pendingRequests.clear();
    }
  }

  void _forceLogout() {
    // 로그아웃 이벤트 발행 (GoRouter redirect에서 감지)
  }
}
```

### Biometric 인증 (local_auth)

**Incorrect (biometric 실패 시 폴백 없음):**
```dart
final isAuthenticated = await LocalAuthentication().authenticate(
  localizedReason: 'Verify identity',
);
if (!isAuthenticated) {
  // 실패 → 아무 처리 없음 → 사용자 막힘
}
```

**Correct (biometric + PIN 폴백):**
```dart
class BiometricService {
  final LocalAuthentication _localAuth = LocalAuthentication();

  /// 생체 인증 가능 여부 확인
  Future<bool> isAvailable() async {
    final canCheck = await _localAuth.canCheckBiometrics;
    final isDeviceSupported = await _localAuth.isDeviceSupported();
    return canCheck && isDeviceSupported;
  }

  /// 사용 가능한 인증 방식 목록
  Future<List<BiometricType>> getAvailableBiometrics() async {
    return _localAuth.getAvailableBiometrics();
  }

  /// 생체 인증 실행
  Future<bool> authenticate({String reason = '본인 확인이 필요합니다'}) async {
    try {
      return await _localAuth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(
          stickyAuth: true,         // 앱 전환 후에도 인증 유지
          biometricOnly: false,     // 기기 PIN/패턴 폴백 허용
          useErrorDialogs: true,    // 시스템 에러 다이얼로그 표시
        ),
      );
    } on PlatformException catch (e) {
      // NotAvailable, NotEnrolled, LockedOut, PermanentlyLockedOut
      debugPrint('Biometric error: ${e.code}');
      return false;
    }
  }
}

// Riverpod Provider
final biometricServiceProvider = Provider<BiometricService>((ref) {
  return BiometricService();
});

final biometricAvailableProvider = FutureProvider<bool>((ref) async {
  return ref.watch(biometricServiceProvider).isAvailable();
});
```

### 세션 타임아웃

```dart
class SessionManager {
  static const _inactivityTimeout = Duration(minutes: 5);
  Timer? _timer;
  final SecureStorageService _storage;

  SessionManager({required SecureStorageService storage})
      : _storage = storage;

  /// 사용자 활동 시마다 호출 (탭, 스크롤 등)
  void resetTimer() {
    _timer?.cancel();
    _timer = Timer(_inactivityTimeout, _onTimeout);
  }

  void _onTimeout() {
    // 민감 화면(잔액, 거래내역) → 재인증 요구
    // 일반 화면 → 경고만 표시
  }

  /// AppLifecycleState.paused → 백그라운드 진입 시간 기록
  Future<void> onBackground() async {
    await _storage.saveBackgroundTime(DateTime.now());
  }

  /// AppLifecycleState.resumed → 경과 시간 확인
  Future<bool> onForeground() async {
    final bgTime = await _storage.getBackgroundTime();
    if (bgTime == null) return true;

    final elapsed = DateTime.now().difference(bgTime);
    if (elapsed > _inactivityTimeout) {
      return false; // 재인증 필요
    }
    return true;
  }

  void dispose() {
    _timer?.cancel();
  }
}
```

### iOS/Android 설정

```xml
<!-- iOS: Info.plist (Face ID 사용 이유 설명) -->
<key>NSFaceIDUsageDescription</key>
<string>앱 잠금 해제를 위해 Face ID를 사용합니다.</string>
```

```xml
<!-- Android: MainActivity.kt 변경 불필요 -->
<!-- AndroidManifest.xml: 권한 자동 추가됨 (local_auth) -->
<uses-permission android:name="android.permission.USE_BIOMETRIC"/>
```

### 규칙

- Access Token (단수명 15-30분) + Refresh Token (장수명 7-30일) 분리
- 401 응답 → Dio interceptor에서 자동 갱신 → 원래 요청 재시도
- 동시 요청 중 401 → 갱신 1회만 실행, 나머지는 대기열 → 갱신 후 일괄 재시도
- Refresh Token 만료 → `deleteTokens()` + 강제 로그아웃
- Biometric → `biometricOnly: false` (기기 PIN/패턴 폴백 필수)
- `stickyAuth: true` → 앱 전환 후 돌아와도 인증 세션 유지
- 세션 타임아웃 → 비활성 5분 후 민감 화면 재인증 요구
- 백그라운드 → 진입 시간 기록, 복귀 시 경과 확인
- iOS → `NSFaceIDUsageDescription` plist 필수 (없으면 크래시)
