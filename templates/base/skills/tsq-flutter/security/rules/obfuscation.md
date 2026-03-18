---
title: Code Obfuscation
impact: HIGH
impactDescription: "미적용 → 앱 디컴파일 시 비즈니스 로직/API 엔드포인트 노출"
tags: obfuscation, proguard, r8, dsym, split-debug-info, crashlytics
---

## Code Obfuscation

**Impact: HIGH (미적용 → 앱 디컴파일 시 비즈니스 로직/API 엔드포인트 노출)**

Dart 난독화, Android ProGuard/R8 shrinking, iOS dSYM 관리,
Crashlytics 디버그 심볼 업로드. 릴리즈 빌드 보호.

### Dart 난독화

**Incorrect (난독화 없이 릴리즈 빌드):**
```bash
flutter build apk --release
# → Dart 코드 디컴파일 시 함수명/클래스명 그대로 노출
# → 비즈니스 로직, API 엔드포인트, 검증 로직 분석 가능
```

**Correct (난독화 + 디버그 심볼 분리):**
```bash
# APK (Android)
flutter build apk --release \
  --obfuscate \
  --split-debug-info=build/debug-info/android

# App Bundle (Android — Play Store 권장)
flutter build appbundle --release \
  --obfuscate \
  --split-debug-info=build/debug-info/android

# iOS
flutter build ipa --release \
  --obfuscate \
  --split-debug-info=build/debug-info/ios

# --obfuscate: Dart 심볼 이름 난독화 (클래스, 함수, 변수명)
# --split-debug-info: 디버그 심볼을 별도 디렉토리에 분리 (크래시 분석용)
```

### 디버그 심볼 보관

```bash
# 디버그 심볼 구조
build/debug-info/
├── android/
│   ├── app.android-arm.symbols    # ARM32
│   ├── app.android-arm64.symbols  # ARM64
│   └── app.android-x64.symbols    # x86_64
└── ios/
    └── app.ios-arm64.symbols      # iOS ARM64

# 버전별 보관 (크래시 리포트 해석에 필수)
# CI/CD에서 자동 아카이브 권장
mkdir -p symbols/v1.2.3
cp -r build/debug-info/* symbols/v1.2.3/
```

### Android ProGuard/R8

```groovy
// android/app/build.gradle
android {
    buildTypes {
        release {
            // R8 (ProGuard 후속) — 코드 축소 + 난독화
            minifyEnabled true
            shrinkResources true

            proguardFiles(
                getDefaultProguardFile('proguard-android-optimize.txt'),
                'proguard-rules.pro'
            )
        }
    }
}
```

```
# android/app/proguard-rules.pro

# Flutter 관련 유지
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# firebase_messaging 관련
-keep class com.google.firebase.messaging.** { *; }

# flutter_secure_storage 관련
-keep class com.it_nomads.fluttersecurestorage.** { *; }

# Gson / JSON 직렬화 (사용 시)
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# Crashlytics
-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception
```

### iOS dSYM

```bash
# Xcode → Build Settings
# DEBUG_INFORMATION_FORMAT = dwarf-with-dsym (Release)
# STRIP_SWIFT_SYMBOLS = YES

# dSYM 위치 (Xcode 빌드 후)
# ~/Library/Developer/Xcode/DerivedData/Runner-xxx/Build/Products/Release-iphoneos/Runner.app.dSYM

# Archive 빌드 시 자동 포함
# Xcode → Product → Archive → dSYM 포함
```

### Crashlytics 심볼 업로드

```yaml
# pubspec.yaml
dependencies:
  firebase_crashlytics: ^4.1.0
```

```bash
# Dart 난독화 심볼 업로드
firebase crashlytics:symbols:upload \
  --app=1:123456:android:abcdef \
  build/debug-info/android/

# iOS dSYM 업로드 (Fastlane 사용 시)
# fastlane에서 자동 업로드 설정 또는:
firebase crashlytics:symbols:upload \
  --app=1:123456:ios:abcdef \
  build/debug-info/ios/
```

```dart
// Crashlytics 초기화 (main.dart)
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();

  // Crashlytics 에러 핸들링
  FlutterError.onError = FirebaseCrashlytics.instance.recordFlutterFatalError;

  // 비동기 에러
  PlatformDispatcher.instance.onError = (error, stack) {
    FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
    return true;
  };

  runApp(const ProviderScope(child: MyApp()));
}
```

### CI/CD 통합

```yaml
# GitHub Actions 예시
- name: Build Release APK
  run: |
    flutter build apk --release \
      --obfuscate \
      --split-debug-info=build/debug-info/android \
      --dart-define=API_KEY=${{ secrets.API_KEY }}

- name: Upload debug symbols to Crashlytics
  run: |
    firebase crashlytics:symbols:upload \
      --app=${{ secrets.FIREBASE_APP_ID_ANDROID }} \
      build/debug-info/android/

- name: Archive debug symbols
  uses: actions/upload-artifact@v4
  with:
    name: debug-symbols-${{ github.sha }}
    path: build/debug-info/
    retention-days: 90
```

### 난독화 효과 확인

```bash
# 난독화 전 (디컴파일 시)
class UserRepository {
  Future<User> fetchUserProfile(String userId) async { ... }
  Future<void> updatePaymentMethod(PaymentCard card) async { ... }
}

# 난독화 후 (디컴파일 시)
class a {
  Future<b> c(String d) async { ... }
  Future<void> e(f g) async { ... }
}
# → 함수명/클래스명만 난독화, 문자열 리터럴은 그대로
# → API 키/URL은 별도 보호 필요 (envied obfuscate 등)
```

### 규칙

- 릴리즈 빌드 → `--obfuscate --split-debug-info=<path>` 필수
- `--split-debug-info` → 버전별 보관 (크래시 리포트 해석에 필수)
- Android → `minifyEnabled true` + `shrinkResources true` (R8)
- `proguard-rules.pro` → Flutter/Firebase/보안 라이브러리 keep 규칙
- iOS → `DEBUG_INFORMATION_FORMAT = dwarf-with-dsym` (Release)
- Crashlytics → 난독화 심볼 업로드 필수 (미업로드 시 크래시 로그 해석 불가)
- CI/CD → 심볼 아카이브 (최소 90일 보관)
- 문자열 리터럴 → 난독화 대상 아님 → API 키는 `envied obfuscate` 별도 처리
- 디버그 빌드 → 난독화 적용하지 않음 (개발 생산성)
