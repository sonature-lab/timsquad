---
title: API Key Protection
impact: HIGH
impactDescription: "키 하드코딩 → git history 영구 노출, 앱 디컴파일 시 즉시 탈취"
tags: dart-define, envied, environment, api-key, secret, build-injection
---

## API Key Protection

**Impact: HIGH (키 하드코딩 → git history 영구 노출, 앱 디컴파일 시 즉시 탈취)**

API 키, 시크릿을 소스 코드에서 분리. 빌드 시 주입하고 런타임에 안전하게 참조.

### 방법 1: --dart-define (빌드 인자)

**Incorrect (소스 코드에 키 하드코딩):**
```dart
class ApiConfig {
  // 소스 코드에 직접 → git push 시 영구 노출
  // 앱 디컴파일 시 문자열 검색으로 즉시 발견
  static const apiKey = 'sk-1234567890abcdef';
  static const googleMapsKey = 'AIzaSyB_XXXXXXXXXXXXXXXXXXXXXXX';
}
```

**Correct (--dart-define로 빌드 시 주입):**
```dart
class ApiConfig {
  // 컴파일 타임 상수 — 빌드 시 --dart-define으로 주입
  static const apiKey = String.fromEnvironment('API_KEY');
  static const googleMapsKey = String.fromEnvironment('GOOGLE_MAPS_KEY');
  static const sentryDsn = String.fromEnvironment('SENTRY_DSN');

  /// 필수 키 검증 (앱 시작 시)
  static void validate() {
    assert(apiKey.isNotEmpty, 'API_KEY not provided via --dart-define');
    assert(googleMapsKey.isNotEmpty, 'GOOGLE_MAPS_KEY not provided');
  }
}
```

```bash
# 빌드 명령어
flutter run \
  --dart-define=API_KEY=sk-1234567890abcdef \
  --dart-define=GOOGLE_MAPS_KEY=AIzaSyB_XXX \
  --dart-define=SENTRY_DSN=https://xxx@sentry.io/123

# 릴리즈 빌드
flutter build apk \
  --dart-define=API_KEY=$API_KEY \
  --dart-define=GOOGLE_MAPS_KEY=$GOOGLE_MAPS_KEY \
  --release

# --dart-define-from-file (Flutter 3.7+)
flutter run --dart-define-from-file=config/dev.env
```

```properties
# config/dev.env (gitignore 대상)
API_KEY=sk-dev-1234567890
GOOGLE_MAPS_KEY=AIzaSyB_dev_XXX
SENTRY_DSN=https://dev@sentry.io/123
```

### 방법 2: envied 패키지 (코드 생성 + 난독화)

```yaml
# pubspec.yaml
dependencies:
  envied: ^0.5.4
dev_dependencies:
  envied_generator: ^0.5.4
  build_runner: ^2.4.0
```

```dart
// lib/config/env.dart
import 'package:envied/envied.dart';

part 'env.g.dart';

@Envied(path: '.env', obfuscate: true) // obfuscate: 문자열 난독화
abstract class Env {
  @EnviedField(varName: 'API_KEY')
  static const String apiKey = _Env.apiKey;

  @EnviedField(varName: 'GOOGLE_MAPS_KEY')
  static const String googleMapsKey = _Env.googleMapsKey;

  @EnviedField(varName: 'SENTRY_DSN', defaultValue: '')
  static const String sentryDsn = _Env.sentryDsn;
}

// .env (프로젝트 루트, .gitignore 필수)
// API_KEY=sk-1234567890abcdef
// GOOGLE_MAPS_KEY=AIzaSyB_XXXXXXX
```

```bash
# 코드 생성
dart run build_runner build --delete-conflicting-outputs

# env.g.dart 생성됨 (obfuscate: true → XOR 난독화된 바이트 배열)
# → 단순 문자열 검색으로 키 추출 불가
```

### 환경별 설정 분리

```dart
// lib/config/app_config.dart
enum AppEnvironment { dev, staging, prod }

class AppConfig {
  final String apiBaseUrl;
  final String apiKey;
  final bool enableLogging;

  const AppConfig._({
    required this.apiBaseUrl,
    required this.apiKey,
    required this.enableLogging,
  });

  factory AppConfig.fromEnvironment() {
    const env = String.fromEnvironment('APP_ENV', defaultValue: 'dev');

    switch (env) {
      case 'prod':
        return const AppConfig._(
          apiBaseUrl: 'https://api.example.com',
          apiKey: String.fromEnvironment('API_KEY'),
          enableLogging: false,
        );
      case 'staging':
        return const AppConfig._(
          apiBaseUrl: 'https://staging-api.example.com',
          apiKey: String.fromEnvironment('API_KEY'),
          enableLogging: true,
        );
      default: // dev
        return const AppConfig._(
          apiBaseUrl: 'https://dev-api.example.com',
          apiKey: String.fromEnvironment('API_KEY', defaultValue: 'dev-key'),
          enableLogging: true,
        );
    }
  }
}

// Riverpod Provider
final appConfigProvider = Provider<AppConfig>((ref) {
  return AppConfig.fromEnvironment();
});
```

### .gitignore 설정

```gitignore
# 환경 파일
.env
.env.*
config/dev.env
config/staging.env
config/prod.env

# envied 생성 파일 (선택: 커밋 vs 생성)
# lib/config/env.g.dart

# Firebase 설정 파일 (키 포함)
google-services.json
GoogleService-Info.plist
firebase_options.dart
```

### CI/CD 연동

```yaml
# GitHub Actions 예시
# 시크릿은 GitHub Secrets에 저장
- name: Build APK
  run: |
    flutter build apk --release \
      --dart-define=API_KEY=${{ secrets.API_KEY }} \
      --dart-define=GOOGLE_MAPS_KEY=${{ secrets.GOOGLE_MAPS_KEY }}

# 또는 .env 파일 생성 (envied 사용 시)
- name: Create .env
  run: |
    echo "API_KEY=${{ secrets.API_KEY }}" >> .env
    echo "GOOGLE_MAPS_KEY=${{ secrets.GOOGLE_MAPS_KEY }}" >> .env
- name: Generate env
  run: dart run build_runner build
```

### 규칙

- API 키/시크릿 → 소스 코드에 절대 하드코딩 금지
- `--dart-define` 또는 `--dart-define-from-file` → 빌드 시 주입
- `String.fromEnvironment()` → 컴파일 타임 상수로 참조
- `envied` + `obfuscate: true` → 디컴파일 시 문자열 검색 방지
- `.env` 파일 → `.gitignore` 필수
- `google-services.json` / `GoogleService-Info.plist` → `.gitignore` 권장
- 환경별 (dev/staging/prod) → 설정 분리, 프로덕션 키는 CI/CD에서만 주입
- `assert()` → 앱 시작 시 필수 키 존재 검증 (디버그 빌드에서 조기 발견)
- 키 노출 사고 시 → 즉시 키 로테이션 + git history에서 제거 (`git filter-branch`)
