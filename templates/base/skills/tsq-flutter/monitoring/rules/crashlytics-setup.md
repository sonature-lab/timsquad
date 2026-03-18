---
title: Crashlytics Setup & Error Capture
impact: CRITICAL
impactDescription: "크래시 미수집 → 프로덕션 장애 감지 불가, 사용자 이탈 원인 파악 불가"
tags: crashlytics, firebase, crash, error, fatal
---

## Crashlytics Setup & Error Capture

**Impact: CRITICAL (크래시 미수집 → 프로덕션 장애 감지 불가, 사용자 이탈 원인 파악 불가)**

Firebase Crashlytics 초기화, Flutter/Dart 에러 캡처, 비치명 에러 기록,
사용자 식별자 및 커스텀 키 설정.

### 의존성

```yaml
# pubspec.yaml
dependencies:
  firebase_core: ^3.8.0
  firebase_crashlytics: ^4.3.0
```

### 초기화

**Incorrect (에러 핸들러 미연결):**
```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  // Crashlytics 에러 핸들러 미등록 → 크래시 미수집
  runApp(const MyApp());
}
```

**Correct (완전한 에러 캡처 파이프라인):**
```dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();

  // 1. Flutter 프레임워크 에러 (위젯 빌드 에러 등)
  FlutterError.onError = FirebaseCrashlytics.instance.recordFlutterFatalError;

  // 2. 비동기 에러 (Future, Isolate 등)
  PlatformDispatcher.instance.onError = (error, stack) {
    FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
    return true;
  };

  // 3. Dart Zone 에러 (runZonedGuarded)
  runZonedGuarded<Future<void>>(
    () async {
      runApp(const ProviderScope(child: MyApp()));
    },
    (error, stack) {
      FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
    },
  );
}
```

### 디버그 모드 제어

```dart
// 개발 중 Crashlytics 비활성화 (크래시 대시보드 오염 방지)
await FirebaseCrashlytics.instance
    .setCrashlyticsCollectionEnabled(!kDebugMode);

// 또는 환경별 분리
final isProduction = const String.fromEnvironment('ENV') == 'production';
await FirebaseCrashlytics.instance
    .setCrashlyticsCollectionEnabled(isProduction);
```

### 비치명 에러 기록

**Incorrect (try-catch만 하고 기록 안 함):**
```dart
try {
  await apiService.fetchData();
} catch (e) {
  debugPrint('Error: $e');
  // → 프로덕션에서 에러 발생 사실을 알 수 없음
}
```

**Correct (비치명 에러 Crashlytics 기록):**
```dart
try {
  await apiService.fetchData();
} catch (error, stack) {
  // fatal: false → 비치명 에러 (앱 크래시 아님)
  await FirebaseCrashlytics.instance.recordError(
    error,
    stack,
    fatal: false,
    reason: 'fetchData API call failed',
  );
  // 사용자에게 에러 UI 표시
  rethrow; // 또는 적절한 에러 핸들링
}
```

### 사용자 식별자

```dart
class CrashlyticsService {
  final FirebaseCrashlytics _crashlytics = FirebaseCrashlytics.instance;

  /// 로그인 시 사용자 식별자 설정
  Future<void> setUser(String userId) async {
    await _crashlytics.setUserIdentifier(userId);
  }

  /// 로그아웃 시 식별자 제거
  Future<void> clearUser() async {
    await _crashlytics.setUserIdentifier('');
  }

  /// 커스텀 키 설정 (크래시 컨텍스트)
  Future<void> setContext({
    required String appVersion,
    required String buildNumber,
    String? subscriptionTier,
    bool? isOnboarded,
  }) async {
    await _crashlytics.setCustomKey('app_version', appVersion);
    await _crashlytics.setCustomKey('build_number', buildNumber);
    if (subscriptionTier != null) {
      await _crashlytics.setCustomKey('subscription_tier', subscriptionTier);
    }
    if (isOnboarded != null) {
      await _crashlytics.setCustomKey('is_onboarded', isOnboarded);
    }
  }

  /// 커스텀 로그 (크래시 발생 직전 흐름 추적)
  void log(String message) {
    _crashlytics.log(message);
  }

  /// 비치명 에러 기록
  Future<void> recordNonFatal(
    dynamic error,
    StackTrace stack, {
    String? reason,
  }) async {
    await _crashlytics.recordError(
      error,
      stack,
      fatal: false,
      reason: reason,
    );
  }
}

// Riverpod Provider
final crashlyticsServiceProvider = Provider<CrashlyticsService>((ref) {
  return CrashlyticsService();
});
```

### dSYM / ProGuard 설정

```
iOS (dSYM 업로드):
  Xcode > Build Settings > Debug Information Format = DWARF with dSYM File
  firebase_crashlytics가 빌드 스크립트 자동 추가 (Run Script Phase)
  수동: firebase crashlytics:symbols:upload --app=<APP_ID> path/to/dSYMs

Android (ProGuard/R8 mapping):
  android/app/build.gradle:
    buildTypes {
      release {
        minifyEnabled true
        shrinkResources true
        // firebase_crashlytics Gradle 플러그인이 mapping 자동 업로드
      }
    }
  android/build.gradle:
    plugins { id 'com.google.firebase.crashlytics' }
```

### 규칙

- `FlutterError.onError` → Crashlytics 연결 필수 (Flutter 프레임워크 에러)
- `PlatformDispatcher.instance.onError` → 비동기 에러 캡처 필수
- `runZonedGuarded` → Dart Zone 에러까지 포괄 (선택이지만 강력 권장)
- 디버그 모드 → `setCrashlyticsCollectionEnabled(false)` (대시보드 오염 방지)
- 비치명 에러 → `recordError(fatal: false)` + reason 명시
- `setUserIdentifier` → 로그인/로그아웃 시 설정/해제
- `setCustomKey` → 구독 등급, 기능 플래그 등 비즈니스 컨텍스트
- `log()` → 크래시 직전 사용자 흐름 기록 (최대 64KB)
- dSYM (iOS) / ProGuard mapping (Android) → 릴리스 빌드 심볼 업로드 필수
