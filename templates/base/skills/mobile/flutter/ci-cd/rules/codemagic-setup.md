---
title: Codemagic Setup
impact: HIGH
impactDescription: "CI 미구성 → 수동 빌드, Codemagic 자동화 → Flutter 네이티브 지원"
tags: codemagic, ci, yaml, workflow, artifact, trigger
---

## Codemagic Setup

**Impact: HIGH (CI 미구성 → 수동 빌드, Codemagic 자동화 → Flutter 네이티브 지원)**

codemagic.yaml 워크플로우 구성, 환경변수/시크릿, 빌드 트리거, artifact 배포.

### codemagic.yaml

**Incorrect (GUI만 사용):**
```
Codemagic 웹 UI에서 빌드 설정 → 코드 관리 불가, 롤백 불가, 팀 차이 발생
```

**Correct (yaml 코드 관리):**
```yaml
workflows:
  ios-release:
    name: iOS Release
    max_build_duration: 30
    instance_type: mac_mini_m2
    environment:
      groups: [ios_credentials, app_store_connect]
      flutter: "3.27.0"
      xcode: latest
      cocoapods: default
    triggering:
      events: [tag]
      tag_patterns:
        - pattern: "v*"
          include: true
      cancel_previous_builds: true
    scripts:
      - name: Set up code signing
        script: |
          keychain initialize
          app-store-connect fetch-signing-files $(BUNDLE_ID) --type IOS_APP_STORE --create
          keychain add-certificates
      - name: Build
        script: |
          xcode-project use-profiles
          flutter packages pub get
          flutter build ipa --release --build-number=$PROJECT_BUILD_NUMBER \
            --export-options-plist=/Users/builder/export_options.plist
    artifacts:
      - build/ios/ipa/*.ipa
    publishing:
      app_store_connect:
        auth: integration
        submit_to_testflight: true
      slack:
        channel: "#deployments"
        notify:
          success: true
          failure: true

  android-release:
    name: Android Release
    instance_type: linux_x2
    environment:
      groups: [android_credentials, google_play]
      flutter: "3.27.0"
    triggering:
      events: [tag]
      tag_patterns:
        - pattern: "v*"
    scripts:
      - name: Set up signing + Build
        script: |
          echo $ANDROID_KEYSTORE_BASE64 | base64 --decode > android/release.keystore
          flutter packages pub get
          flutter build appbundle --release --build-number=$PROJECT_BUILD_NUMBER
    artifacts:
      - build/app/outputs/bundle/release/*.aab
    publishing:
      google_play:
        credentials: $GCLOUD_SERVICE_ACCOUNT_CREDENTIALS
        track: internal

  test:
    name: Test & Analyze
    instance_type: linux_x2
    environment:
      flutter: "3.27.0"
    triggering:
      events: [pull_request]
    scripts:
      - name: Test
        script: |
          flutter packages pub get && flutter analyze && flutter test --coverage
```

### 환경변수/시크릿

```
Codemagic UI > Environment variables:
├── ios_credentials: CERTIFICATE_PRIVATE_KEY, BUNDLE_ID, PROVISIONING_PROFILE
├── app_store_connect: ASC_KEY_ID, ASC_ISSUER_ID, ASC_API_KEY (.p8)
├── android_credentials: ANDROID_KEYSTORE_BASE64, PASSWORD, ALIAS, KEY_PASSWORD
└── google_play: GCLOUD_SERVICE_ACCOUNT_CREDENTIALS (JSON)
```

### 규칙

- `codemagic.yaml` 로 워크플로우 정의 — GUI 설정 대신 코드 관리
- 시크릿은 Codemagic UI에서만 설정 — yaml에 비밀값 금지
- `instance_type: mac_mini_m2` — iOS 빌드는 macOS 필수
- `cancel_previous_builds: true` — 동일 브랜치 중복 빌드 방지
- PR → test, 태그 → release 워크플로우 분리
- `PROJECT_BUILD_NUMBER` 활용 — 자동 증가 빌드 넘버
