---
title: GitHub Actions
impact: HIGH
impactDescription: "CI 없음 → 릴리스 품질 불안정, GitHub Actions → 코드 변경마다 자동 검증"
tags: github-actions, ci, workflow, flutter-action, cache, artifact
---

## GitHub Actions

**Impact: HIGH (CI 없음 → 릴리스 품질 불안정, GitHub Actions → 코드 변경마다 자동 검증)**

Flutter 빌드 워크플로우, flutter-action, 테스트-빌드-업로드 파이프라인, 캐시.

### 테스트 워크플로우

**Incorrect (Flutter 수동 설치, 캐시 없음):**
```yaml
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: git clone https://github.com/flutter/flutter.git
      - run: flutter test  # 매번 전체 다운로드 → 느림
```

**Correct (flutter-action + 캐시):**
```yaml
# .github/workflows/test.yml
name: Test & Analyze
on:
  pull_request:
    branches: [main, develop]
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: "3.27.0"
          cache: true
      - uses: actions/cache@v4
        with:
          path: ${{ env.PUB_CACHE }}
          key: pub-${{ runner.os }}-${{ hashFiles('**/pubspec.lock') }}
      - run: flutter pub get
      - run: flutter analyze --no-fatal-infos
      - run: flutter test --coverage
```

### 릴리스 워크플로우 (iOS + Android)

```yaml
# .github/workflows/ios-release.yml — 태그 푸시 트리거
name: iOS Release
on: { push: { tags: ["v*"] } }
jobs:
  ios-build:
    runs-on: macos-latest
    timeout-minutes: 45
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with: { flutter-version: "3.27.0", cache: true }
      - uses: ruby/setup-ruby@v1
        with: { ruby-version: "3.2", bundler-cache: true, working-directory: ios }
      - run: |
          VERSION=${GITHUB_REF#refs/tags/v}
          flutter build ipa --release --build-name=$VERSION --build-number=$GITHUB_RUN_NUMBER
          cd ios && bundle exec fastlane beta
        env:
          MATCH_GIT_URL: ${{ secrets.MATCH_GIT_URL }}
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
```

```yaml
# .github/workflows/android-release.yml
name: Android Release
on: { push: { tags: ["v*"] } }
jobs:
  android-build:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: "temurin", java-version: "17" }
      - uses: subosito/flutter-action@v2
        with: { flutter-version: "3.27.0", cache: true }
      - run: echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 --decode > android/release.keystore
      - run: flutter build appbundle --release --build-number=${{ github.run_number }}
      - uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.GOOGLE_PLAY_SERVICE_ACCOUNT }}
          packageName: com.yourapp.id
          releaseFiles: build/app/outputs/bundle/release/app-release.aab
          track: internal
```

### 규칙

- `subosito/flutter-action@v2` — Flutter SDK 설치 + `cache: true`
- pub 캐시 — `actions/cache@v4` + `pubspec.lock` 해시 키
- `concurrency` — 동일 PR 중복 빌드 취소
- `timeout-minutes` — 테스트 15분, iOS 45분, Android 30분
- 태그 `v*` 트리거 — 릴리스 빌드, PR → 테스트만
- 시크릿 — `${{ secrets.* }}` 로 주입, 하드코딩 금지
