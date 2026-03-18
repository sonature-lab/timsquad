---
title: Store Deployment
impact: HIGH
impactDescription: "배포 실수 → 심사 거절/사용자 불만, 체계적 배포 → 안정적 출시"
tags: app-store, play-store, testflight, deployment, rollout, metadata
---

## Store Deployment

**Impact: HIGH (배포 실수 → 심사 거절/사용자 불만, 체계적 배포 → 안정적 출시)**

TestFlight 업로드, Play Store 트랙 관리, 메타데이터, 단계적 출시 전략.

### TestFlight (iOS) 배포

**Incorrect (Xcode에서 수동 업로드):**
```
Xcode > Archive > Distribute App → 수동 반복, 재현 불가
```

**Correct (Fastlane + API Key):**
```ruby
lane :beta do
  api_key = app_store_connect_api_key(
    key_id: ENV["ASC_KEY_ID"],
    issuer_id: ENV["ASC_ISSUER_ID"],
    key_filepath: ENV["ASC_KEY_PATH"],
  )
  build_app(workspace: "Runner.xcworkspace", scheme: "Runner",
            export_method: "app-store")
  upload_to_testflight(
    api_key: api_key,
    skip_waiting_for_build_processing: true,
    groups: ["Internal Testers"],
    changelog: ENV["RELEASE_NOTES"] || "Bug fixes and improvements",
  )
end
```

### Play Store 트랙 전략

**Incorrect (바로 production):**
```ruby
supply(track: "production", aab: "app-release.aab")
# → 테스트 없이 전체 배포 → 크래시 위험
```

**Correct (단계적 트랙 승격):**
```ruby
lane :internal do
  supply(track: "internal", aab: "app-release.aab",
         json_key: ENV["GOOGLE_PLAY_JSON_KEY_PATH"])
end

lane :promote_production do |options|
  supply(track: "internal", track_promote_to: "production",
         rollout: options[:rollout] || "0.01",
         json_key: ENV["GOOGLE_PLAY_JSON_KEY_PATH"])
end

lane :increase_rollout do |options|
  supply(track: "production", rollout: options[:rollout],
         json_key: ENV["GOOGLE_PLAY_JSON_KEY_PATH"])
end
```

### 단계적 출시 전략

```
Day 0:  internal (팀) → 크래시율/기능 확인
Day 1:  closed testing → 소규모 외부 테스터
Day 3:  production 1% → 크래시 모니터링
Day 5:  production 5% → ANR 비율 확인
Day 7:  production 20% → 사용자 피드백
Day 10: production 50%
Day 14: production 100%

중단 기준: 크래시율 > 1%, ANR > 0.5%, 평점 급락
```

### 메타데이터 관리

```
fastlane/metadata/
├── android/en-US/     # title.txt, short_description.txt, full_description.txt
├── android/ko/
├── ios/en-US/         # name.txt, subtitle.txt, description.txt, keywords.txt
├── ios/ko/
└── screenshots/en-US/ # iPhone6.5/, iPhone5.5/, iPad12.9/
```

```ruby
lane :update_metadata do
  deliver(skip_binary_upload: true, skip_screenshots: false,
          overwrite_screenshots: true, api_key_path: "fastlane/api_key.json")
end
```

### 규칙

- TestFlight 자동 업로드 — `upload_to_testflight` + API Key, 수동 금지
- Play Store 트랙 순서 — internal → closed → open → production
- 단계적 출시 — 1%부터 시작, 크래시율 모니터링 후 확대
- 메타데이터 코드 관리 — `fastlane/metadata/` 텍스트 파일
- 릴리스 노트 — CHANGELOG에서 추출, 수동 작성 금지
- 크래시율 1% 초과 → 즉시 rollout 중단
