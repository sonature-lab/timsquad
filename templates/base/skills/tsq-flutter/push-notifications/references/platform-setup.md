---
title: Platform-Specific Setup (iOS APNs + Android)
category: guide
source: internal
tags: apns, android-channel, xcode, manifest, entitlements
---

# Platform-Specific Setup (iOS APNs + Android)

iOS APNs 인증 키 설정, Xcode 설정, Android 매니페스트, 알림 채널 상세.
프로젝트 초기 설정 시 참조.

## Key Concepts

- **iOS**: APNs (Apple Push Notification service) → FCM이 APNs를 통해 iOS 기기에 전달
- **Android**: FCM이 직접 기기에 전달, Android 8+ (API 26) 채널 필수
- **인증 방식**: APNs Auth Key (.p8) 권장 (인증서보다 관리 용이, 만료 없음)

## iOS Setup

### 1. Apple Developer Console

```
1. Apple Developer > Certificates, Identifiers & Profiles
2. Keys > Create a Key
   - Name: "FCM APNs Auth Key"
   - Enable: Apple Push Notifications service (APNs)
   - Download .p8 파일 (1회만 다운로드 가능!)
   - Key ID 기록

3. App ID 설정
   - Identifiers > 앱 선택 > Capabilities
   - Push Notifications 활성화

4. Team ID 확인
   - Membership 페이지에서 Team ID 확인
```

### 2. Firebase Console에 APNs 키 등록

```
1. Firebase Console > Project Settings > Cloud Messaging
2. iOS app 선택
3. APNs authentication key 업로드:
   - .p8 파일 업로드
   - Key ID 입력
   - Team ID 입력
```

### 3. Xcode 설정

```
1. Runner.xcworkspace 열기

2. Signing & Capabilities:
   + Push Notifications         (알림 수신)
   + Background Modes:
     ✓ Background fetch         (백그라운드 데이터 가져오기)
     ✓ Remote notifications     (사일런트 푸시)
     ✓ Background processing    (workmanager용, iOS 13+)

3. Info.plist (자동 생성되지만 확인):
   - FirebaseAppDelegateProxyEnabled: YES (기본값)

4. (선택) Notification Service Extension:
   - File > New > Target > Notification Service Extension
   - 리치 알림 (이미지 수정, 암호화 해제 등)에 필요
```

### 4. AppDelegate 설정

```swift
// ios/Runner/AppDelegate.swift
import UIKit
import Flutter
import Firebase

@main
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    FirebaseApp.configure()

    // APNs 등록 (firebase_messaging이 자동 처리하지만 명시적으로 해도 무방)
    if #available(iOS 10.0, *) {
      UNUserNotificationCenter.current().delegate = self
    }

    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // 사일런트 푸시 수신
  override func application(
    _ application: UIApplication,
    didReceiveRemoteNotification userInfo: [AnyHashable : Any],
    fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
  ) {
    completionHandler(.newData)
  }
}
```

### 5. Podfile 설정

```ruby
# ios/Podfile
platform :ios, '14.0'  # Firebase 최소 요구사항

target 'Runner' do
  use_frameworks!
  use_modular_headers!

  flutter_install_all_ios_pods File.dirname(File.realpath(__FILE__))
end

# Notification Service Extension (리치 알림 사용 시)
# target 'NotificationService' do
#   use_frameworks!
#   pod 'Firebase/Messaging'
# end

post_install do |installer|
  installer.pods_project.targets.each do |target|
    flutter_additional_ios_build_settings(target)
  end
end
```

## Android Setup

### 1. Firebase Console

```
1. Firebase Console > Project Settings > 앱 추가 > Android
2. Android 패키지명 입력 (build.gradle의 applicationId)
3. google-services.json 다운로드
4. android/app/google-services.json 에 배치
```

### 2. build.gradle 설정

```groovy
// android/build.gradle (프로젝트 레벨)
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.4.2'
    }
}

// android/app/build.gradle (앱 레벨)
plugins {
    id 'com.google.gms.google-services'
}

android {
    compileSdk 35

    defaultConfig {
        minSdk 23  // FCM 최소 요구
        targetSdk 35
    }
}
```

### 3. AndroidManifest.xml

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

  <!-- 알림 권한 (Android 13+) -->
  <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>

  <!-- 정확한 알림 스케줄링 (선택) -->
  <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM"/>

  <!-- 백그라운드 작업 (workmanager) -->
  <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>

  <!-- 진동 (알림용) -->
  <uses-permission android:name="android.permission.VIBRATE"/>

  <application
    android:name="${applicationName}"
    android:icon="@mipmap/ic_launcher">

    <!-- FCM 기본 알림 채널 (앱이 자체 채널 생성 전 폴백) -->
    <meta-data
      android:name="com.google.firebase.messaging.default_notification_channel_id"
      android:value="default_channel" />

    <!-- FCM 기본 알림 아이콘 -->
    <meta-data
      android:name="com.google.firebase.messaging.default_notification_icon"
      android:resource="@mipmap/ic_notification" />

    <!-- FCM 기본 알림 색상 -->
    <meta-data
      android:name="com.google.firebase.messaging.default_notification_color"
      android:resource="@color/notification_color" />

    <activity
      android:name=".MainActivity"
      android:launchMode="singleTop">
      <!-- 딥링크 인텐트 필터 -->
      <intent-filter>
        <action android:name="FLUTTER_NOTIFICATION_CLICK"/>
        <category android:name="android.intent.category.DEFAULT"/>
      </intent-filter>
    </activity>

  </application>
</manifest>
```

### 4. 알림 아이콘 준비

```
Android 알림 아이콘 요구사항:
- 흰색 + 투명 배경 (시스템이 색상 적용)
- PNG 형식 (벡터 SVG 불가)
- 크기별 배치:
  android/app/src/main/res/
  ├── mipmap-mdpi/ic_notification.png      (24x24)
  ├── mipmap-hdpi/ic_notification.png      (36x36)
  ├── mipmap-xhdpi/ic_notification.png     (48x48)
  ├── mipmap-xxhdpi/ic_notification.png    (72x72)
  └── mipmap-xxxhdpi/ic_notification.png   (96x96)

알림 색상:
  android/app/src/main/res/values/colors.xml
  <resources>
    <color name="notification_color">#FF6B35</color>
  </resources>
```

### 5. Android 알림 채널 가이드

```
채널 설계 원칙:
- 사용자가 개별 제어할 수 있는 단위로 분리
- 중요도(Importance)에 따라 분류
- 한번 생성된 채널의 중요도는 코드로 변경 불가 (사용자만 변경 가능)

권장 채널 구성:
┌──────────────┬─────────────┬──────────────────────────────┐
│ Channel ID   │ Importance  │ 용도                          │
├──────────────┼─────────────┼──────────────────────────────┤
│ matches      │ HIGH        │ 매치 초대, 변경, 시작 알림     │
│ chat         │ DEFAULT     │ 채팅 메시지                    │
│ reminders    │ HIGH        │ 매치 시작 전 리마인더          │
│ system       │ LOW         │ 앱 업데이트, 공지              │
│ silent       │ MIN         │ 백그라운드 동기화 (사용자 미표시) │
└──────────────┴─────────────┴──────────────────────────────┘

Importance 레벨:
- MAX: 화면 상단 피크 + 소리 + 진동
- HIGH: 헤드업 알림 + 소리 + 진동
- DEFAULT: 소리 + 진동 (헤드업 X)
- LOW: 소리 X, 진동 X (상태바에만)
- MIN: 상태바에도 최소 표시 (접으면 보임)
```

## Common Pitfalls

### iOS
1. **APNs 키 vs 인증서**: .p8 Auth Key 사용 권장 (만료 없음, 모든 앱에 공유 가능)
2. **시뮬레이터**: iOS 시뮬레이터는 APNs 미지원 → 실제 기기에서만 푸시 테스트
3. **Provisional 알림**: iOS 12+ 임시 권한 → 알림 센터에 조용히 전달
4. **Background Modes 누락**: Xcode에서 Remote notifications 체크 안 하면 사일런트 푸시 미수신
5. **Production vs Sandbox**: APNs 환경 자동 전환 (Debug=Sandbox, Release=Production)

### Android
1. **채널 생성 타이밍**: 앱 시작 시 채널 생성 필수 (알림 표시 전)
2. **알림 아이콘**: 흰색+투명이 아니면 회색 사각형으로 표시
3. **targetSdk 34+**: `SCHEDULE_EXACT_ALARM` 권한이 기본 거부 → `canScheduleExactAlarms()` 체크
4. **Doze 모드**: 고우선순위 FCM은 Doze 통과, 일반 메시지는 지연 가능
5. **채널 중요도 변경**: 코드로 변경 불가 → 새 채널 ID 생성하거나 사용자가 직접 변경

### 공통
1. **google-services.json / GoogleService-Info.plist**: 반드시 .gitignore에 추가 (보안)
2. **FlutterFire CLI**: `flutterfire configure` 로 자동 설정 권장
3. **에뮬레이터**: Android 에뮬레이터는 Google Play Services 포함 이미지 필요
