---
title: Code Signing
impact: CRITICAL
impactDescription: "서명 누락 → 스토어 업로드 불가, 키 유출 → 앱 탈취 위험"
tags: code-signing, ios, android, provisioning, keystore, match
---

## Code Signing

**Impact: CRITICAL (서명 누락 → 스토어 업로드 불가, 키 유출 → 앱 탈취 위험)**

iOS provisioning profile, Android keystore 관리. CI 환경에서 안전한 서명 키 주입.

### iOS 코드 서명 (match)

**Incorrect (수동 관리):**
```
Xcode > Automatically manage signing 체크
→ 개발자마다 다른 profile, CI 빌드 실패, 인증서 충돌
```

**Correct (match로 중앙 관리):**
```ruby
# fastlane/Matchfile
git_url(ENV["MATCH_GIT_URL"])
storage_mode("git")
type("appstore")
app_identifier("com.yourapp.id")

# CI에서 실행
create_keychain(
  name: "ci_keychain",
  password: ENV["KEYCHAIN_PASSWORD"],
  default_keychain: true, unlock: true, timeout: 3600,
)
match(
  type: "appstore",
  keychain_name: "ci_keychain",
  keychain_password: ENV["KEYCHAIN_PASSWORD"],
  readonly: true,  # CI에서는 readonly — 인증서 생성 금지
)
```

### Android 코드 서명

**Incorrect (keystore를 레포에 포함):**
```
android/app/release.keystore  # 절대 금지!
android/key.properties        # 비밀번호 하드코딩
```

**Correct (CI 환경변수로 주입):**
```groovy
// android/app/build.gradle
android {
    signingConfigs {
        release {
            if (System.getenv("ANDROID_KEYSTORE_BASE64")) {
                storeFile file("../release.keystore")
                storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias System.getenv("ANDROID_KEY_ALIAS")
                keyPassword System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
    }
}
```

```bash
# CI에서 keystore 복원
echo "$ANDROID_KEYSTORE_BASE64" | base64 --decode > android/release.keystore
```

### 개발/배포 인증서 분리

```
├── Development  — 디버그/테스트 (iOS provisioning, Android debug.keystore)
├── Ad Hoc       — 내부 테스트 배포 (iOS only)
└── Distribution — 스토어 제출 (iOS App Store, Android release.keystore)
```

### 키 로테이션

- iOS: Apple 인증서 1년 만료 → `match nuke distribution` → `match appstore`
- Android: Play App Signing 활성화 → Google이 앱 서명 키 관리, upload key만 팀 관리
- Upload Key 분실 시 → Google Play Console에서 리셋 요청

### .gitignore 필수 항목

```gitignore
*.mobileprovision
*.p12
*.cer
*.keystore
*.jks
key.properties
```

### 규칙

- `match` 로 iOS 인증서 관리 — 수동 Xcode 서명 관리 금지
- CI에서 `match(readonly: true)` — 인증서 신규 생성 방지
- Android keystore → base64 → CI 환경변수 주입
- `key.properties` `.gitignore` 추가 — 레포 커밋 금지
- Play App Signing 활성화 — upload key만 팀 관리
- 개발/배포 인증서 분리 — 동일 인증서 혼용 금지
