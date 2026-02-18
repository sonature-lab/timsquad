---
title: Fastlane Setup
impact: HIGH
impactDescription: "수동 배포 → 휴먼 에러, Fastlane 자동화 → 일관된 빌드/배포"
tags: fastlane, match, supply, deliver, ios, android, automation
---

## Fastlane Setup

**Impact: HIGH (수동 배포 → 휴먼 에러, Fastlane 자동화 → 일관된 빌드/배포)**

Fastfile 구성, match (iOS 인증서), supply (Google Play), deliver (App Store), 환경 관리.

### Fastfile 구성

**Incorrect (빌드와 배포 혼합, 하드코딩):**
```ruby
lane :deploy do
  build_app(scheme: "Runner")
  upload_to_testflight(username: "me@email.com")
  # → 인증서 관리 없음, 환경 분리 없음, 2FA 문제
end
```

**Correct (레인 분리, API Key):**
```ruby
# ios/fastlane/Fastfile
platform :ios do
  lane :setup_signing do
    create_keychain(name: "ci_keychain", password: ENV["KEYCHAIN_PASSWORD"],
                    default_keychain: true, unlock: true, timeout: 3600)
    match(type: "appstore", keychain_name: "ci_keychain",
          keychain_password: ENV["KEYCHAIN_PASSWORD"], readonly: true)
  end

  lane :beta do
    setup_signing
    build_app(workspace: "Runner.xcworkspace", scheme: "Runner",
              export_method: "app-store")
    upload_to_testflight(
      skip_waiting_for_build_processing: true,
      api_key_path: "fastlane/api_key.json",
    )
  end
end
```

```ruby
# android/fastlane/Fastfile
platform :android do
  lane :beta do
    sh("cd ../.. && flutter build appbundle --release")
    supply(
      track: "internal",
      aab: "../build/app/outputs/bundle/release/app-release.aab",
      json_key: ENV["GOOGLE_PLAY_JSON_KEY_PATH"],
      skip_upload_metadata: true,
      skip_upload_images: true,
    )
  end

  lane :release do |options|
    sh("cd ../.. && flutter build appbundle --release")
    supply(
      track: "production",
      aab: "../build/app/outputs/bundle/release/app-release.aab",
      json_key: ENV["GOOGLE_PLAY_JSON_KEY_PATH"],
      rollout: options[:rollout] || "0.1",
    )
  end
end
```

### App Store Connect API Key

```json
// fastlane/api_key.json (CI 환경변수로 생성, .gitignore 필수)
{
  "key_id": "YOUR_KEY_ID",
  "issuer_id": "YOUR_ISSUER_ID",
  "key": "-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----",
  "in_house": false
}
```

### .env 관리

```bash
# ios/fastlane/.env.default (.gitignore 추가)
APPLE_ID=ci@yourteam.com
TEAM_ID=XXXXXXXXXX
MATCH_GIT_URL=https://github.com/your-org/certificates

# ios/fastlane/.env.production
APP_IDENTIFIER=com.yourapp.id
```

### 규칙

- `Fastfile` 레인 분리 — `setup_signing`, `beta`, `release` 독립
- `match(readonly: true)` — CI에서 인증서 신규 생성 금지
- App Store Connect API Key — 2FA 우회, CI 호환
- `supply` 에 `json_key` — Google Play 서비스 계정 키
- `.env` 로 환경 분리 — 하드코딩 금지, `.gitignore` 추가
- 단계적 출시 — `supply(rollout: "0.1")` 소규모 배포 후 확대
