---
title: CI/CD Pipeline Architecture
category: reference
source: internal
tags: pipeline, architecture, environment, secrets, rollback, diagram
---

# CI/CD Pipeline Architecture

파이프라인 아키텍처 다이어그램, 환경별 설정, 시크릿 관리 전략, 롤백 절차.

## Key Concepts

- **파이프라인**: 코드 변경 → 테스트 → 빌드 → 배포 자동화 흐름
- **환경 분리**: dev/staging/prod 각각 독립 설정, 시크릿, 배포 대상
- **시크릿 관리**: 서명 키, API 키, 서비스 계정을 안전하게 저장/주입
- **롤백**: 문제 발생 시 이전 버전으로 빠르게 복원

## Pipeline Architecture

```
코드 변경 흐름:

Feature Branch    PR (→ main)       Tag (v*)         Store
    │                 │                │               │
    ▼                 ▼                ▼               ▼
  [Lint]          [Test]          [Build]         [Deploy]
  분석 +          단위 테스트       iOS IPA          TestFlight
  포맷 검사       통합 테스트       Android AAB      Play Store
                  커버리지                           단계적 출시
    │                 │                │               │
    ▼                 ▼                ▼               ▼
  피드백           PR 체크           Artifact        Notify
  즉시 알림        통과/실패          저장            Slack/Email
```

### 상세 파이프라인

```
PR 생성/업데이트:
  ├─ 1. Checkout
  ├─ 2. flutter pub get (캐시)
  ├─ 3. flutter analyze
  ├─ 4. flutter test --coverage
  ├─ 5. 커버리지 리포트 업로드
  └─ 6. PR 상태 업데이트 (pass/fail)

태그 푸시 (v1.2.3):
  ├─ 1. Checkout + 태그에서 버전 추출
  ├─ 2. flutter pub get
  ├─ 3. flutter test (릴리스 전 최종 검증)
  ├─ 4. 코드 서명 설정
  │     ├─ iOS: match (provisioning + 인증서)
  │     └─ Android: keystore 복원
  ├─ 5. 빌드
  │     ├─ iOS: flutter build ipa --release
  │     └─ Android: flutter build appbundle --release
  ├─ 6. 스토어 업로드
  │     ├─ iOS: upload_to_testflight
  │     └─ Android: supply (internal track)
  ├─ 7. Artifact 저장 (30일)
  ├─ 8. GitHub Release 생성 + CHANGELOG
  └─ 9. Slack 알림 (#deployments)
```

## Environment Configuration

### Flavor/Scheme 기반 환경 분리

```dart
// lib/config/environment.dart
enum Environment { dev, staging, prod }

class EnvConfig {
  final Environment env;
  final String apiBaseUrl;
  final String sentryDsn;
  final bool enableAnalytics;

  const EnvConfig({
    required this.env,
    required this.apiBaseUrl,
    required this.sentryDsn,
    required this.enableAnalytics,
  });

  static const dev = EnvConfig(
    env: Environment.dev,
    apiBaseUrl: 'https://api-dev.yourapp.com',
    sentryDsn: '',
    enableAnalytics: false,
  );

  static const staging = EnvConfig(
    env: Environment.staging,
    apiBaseUrl: 'https://api-staging.yourapp.com',
    sentryDsn: 'https://xxx@sentry.io/staging',
    enableAnalytics: false,
  );

  static const prod = EnvConfig(
    env: Environment.prod,
    apiBaseUrl: 'https://api.yourapp.com',
    sentryDsn: 'https://xxx@sentry.io/prod',
    enableAnalytics: true,
  );
}
```

### --dart-define 으로 빌드 시 주입

```bash
# Dev
flutter run \
  --dart-define=ENV=dev \
  --dart-define=API_URL=https://api-dev.yourapp.com

# Staging
flutter build apk \
  --dart-define=ENV=staging \
  --dart-define=API_URL=https://api-staging.yourapp.com

# Production
flutter build appbundle \
  --release \
  --dart-define=ENV=prod \
  --dart-define=API_URL=https://api.yourapp.com
```

```dart
// 빌드 시 주입된 값 읽기
class BuildConfig {
  static const env = String.fromEnvironment('ENV', defaultValue: 'dev');
  static const apiUrl = String.fromEnvironment('API_URL');

  static bool get isProduction => env == 'prod';
  static bool get isDev => env == 'dev';
}
```

### CI 환경별 워크플로우

```yaml
# Codemagic: 환경별 워크플로우
workflows:
  dev-build:
    triggering:
      events: [push]
      branch_patterns:
        - pattern: "develop"
    scripts:
      - name: Build dev
        script: |
          flutter build apk --dart-define=ENV=dev

  staging-build:
    triggering:
      events: [push]
      branch_patterns:
        - pattern: "release/*"
    scripts:
      - name: Build staging
        script: |
          flutter build appbundle --dart-define=ENV=staging

  prod-build:
    triggering:
      events: [tag]
      tag_patterns:
        - pattern: "v*"
    scripts:
      - name: Build production
        script: |
          flutter build appbundle --release --dart-define=ENV=prod
```

## Secrets Management

### 시크릿 분류

```
Level 1 — 최고 기밀 (유출 시 앱 탈취):
├── Android keystore + 비밀번호
├── iOS Distribution 인증서 + 개인키
└── App Store Connect API Key (.p8)

Level 2 — 기밀 (유출 시 서비스 악용):
├── Google Play 서비스 계정 키
├── Firebase 서비스 계정
├── Sentry DSN (prod)
└── match 암호화 비밀번호

Level 3 — 일반 (유출 시 정보 노출):
├── Slack Webhook URL
├── Codecov Token
└── Firebase App ID
```

### 시크릿 저장 위치

```
GitHub Actions:
  Repository > Settings > Secrets and variables > Actions
  ├── Repository secrets (레포 전체)
  └── Environment secrets (환경별 분리)
      ├── production (승인 필요 설정 가능)
      └── staging

Codemagic:
  App Settings > Environment variables
  ├── Variable groups (그룹별 관리)
  └── Secure 체크 → 로그에 마스킹

Fastlane:
  .env 파일 (로컬) + CI 환경변수 (CI)
  ├── .env.default (공통, .gitignore)
  └── .env.production (.gitignore)
```

### 시크릿 접근 제한

```yaml
# GitHub Actions: 환경별 보호 규칙
# Repository > Settings > Environments > production
# ├── Required reviewers: 2명
# ├── Wait timer: 5분
# └── Deployment branches: main only

jobs:
  deploy-production:
    runs-on: ubuntu-latest
    environment: production  # 승인 필요
    steps:
      - name: Deploy
        env:
          # production 환경의 시크릿만 접근 가능
          KEYSTORE: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
        run: ...
```

## Rollback Procedures

### iOS 롤백

```
App Store:
1. 이전 버전으로 롤백 불가 (Apple 정책)
2. 대안: 핫픽스 빌드를 새 버전으로 긴급 제출
   - Expedited Review 요청 (App Store Connect)
   - 심사 시간: 보통 24시간 → 긴급 시 수시간
3. TestFlight: 이전 빌드 재활성화 가능

긴급 핫픽스 절차:
  git checkout -b hotfix/v1.2.4 v1.2.3
  # 수정 적용
  git tag v1.2.4
  git push origin v1.2.4
  # → CI 자동 빌드 → TestFlight 업로드 → 긴급 심사 요청
```

### Android 롤백

```
Play Store:
1. Console > Release > Production > Release history
2. 이전 릴리스의 "..." > "Release to Production"
   (이전 버전을 새 릴리스로 재배포)
3. 또는 단계적 출시 중이라면 "Halt rollout"

자동 롤백 (Fastlane):
  lane :rollback do |options|
    version_code = options[:version_code]
    # Play Store에서 이전 AAB 다운로드 후 재배포
    # 또는 CI artifact에서 이전 빌드 가져와 재업로드
    supply(
      track: "production",
      rollout: "1.0",
      version_code: version_code,
      json_key: ENV["GOOGLE_PLAY_JSON_KEY_PATH"],
    )
  end
```

### 롤백 판단 기준

```
즉시 롤백 (< 1시간 이내 판단):
├── 크래시율 > 2% (이전 버전 대비 3배 이상 증가)
├── ANR 비율 > 1%
├── 결제/인증 등 핵심 기능 장애
└── 데이터 손실 발생

모니터링 후 판단 (24시간):
├── 크래시율 1-2%
├── 특정 기기/OS 버전에서만 발생
├── 사용자 리뷰 평점 급락
└── 비핵심 기능 장애

유지 + 핫픽스:
├── 크래시율 < 1% (경미)
├── UI 버그 (기능 작동)
└── 성능 저하 (크래시 아님)
```

## Common Pitfalls

1. **빌드 넘버 충돌**: iOS/Android 빌드 넘버를 별도 관리 → 동일 CI 변수 사용 권장
2. **캐시 오염**: Flutter/Gradle/CocoaPods 캐시가 오래되면 빌드 실패 → 주기적 캐시 무효화
3. **시크릿 로그 노출**: `echo $SECRET` → CI 로그에 노출 → 항상 마스킹 확인
4. **인증서 만료**: match 인증서 1년 만료 → 알림 설정 필수
5. **Xcode 버전 차이**: CI와 로컬 Xcode 버전 불일치 → `xcode: 16.2` 고정
6. **Gradle 메모리**: Android 빌드 OOM → `org.gradle.jvmargs=-Xmx4g` 설정
7. **동시 빌드**: 같은 브랜치 여러 빌드 → `cancel_previous_builds` 설정
8. **태그 실수**: 잘못된 태그 푸시 → production 빌드 트리거 → 태그 보호 규칙 설정
