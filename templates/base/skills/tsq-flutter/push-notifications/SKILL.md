---
name: push-notifications
description: |
  Flutter 푸시 알림 + 백그라운드 처리 가이드라인.
  FCM(Firebase Cloud Messaging) 설정, 포그라운드/백그라운드/종료 상태 메시지 핸들링,
  flutter_local_notifications 통합, 딥링크 네비게이션, workmanager 백그라운드 태스크,
  리치 알림(이미지, 액션 버튼, 그룹), 플랫폼별 설정(APNs, Android 채널).
  알림 기능 구현 시 이 스킬을 참조.
version: "1.0.0"
tags: [flutter, fcm, push-notification, background, local-notification, deep-link]
user-invocable: false
---

# Push Notifications & Background Processing

Flutter FCM + Local Notifications + Background Processing 통합 가이드.
iOS APNs / Android FCM 채널 기반, 모든 앱 상태에서의 알림 수신 및 처리.

## Philosophy

- 알림은 서비스 — Feature-first 구조에서 `core/notifications/` 로 중앙화
- 권한은 맥락 — 앱 첫 실행이 아닌, 사용자가 가치를 인지한 순간에 요청
- 백그라운드는 격리 — top-level 함수 + 최소 의존성, UI 코드 접근 금지
- 플랫폼 차이 흡수 — 단일 인터페이스로 iOS/Android 분기 캡슐화

## Resources

7개 규칙 + 2개 참조. 알림 파이프라인 전체를 커버.

| Priority | Type | Resource | Description |
|----------|------|----------|-------------|
| CRITICAL | rule | [fcm-setup](rules/fcm-setup.md) | FCM 초기화, 토큰 관리, 서버 연동 |
| CRITICAL | rule | [notification-handling](rules/notification-handling.md) | 포그라운드/백그라운드/종료 상태 메시지 처리 |
| CRITICAL | rule | [local-notifications](rules/local-notifications.md) | flutter_local_notifications 설정, 채널, 스케줄링 |
| HIGH | rule | [notification-permissions](rules/notification-permissions.md) | 권한 요청 타이밍, 프리프롬프트, 설정 유도 |
| HIGH | rule | [deep-linking](rules/deep-linking.md) | 알림 탭 → 특정 화면 네비게이션, 페이로드 처리 |
| HIGH | rule | [rich-notifications](rules/rich-notifications.md) | 이미지, 액션 버튼, 그룹 알림, 사운드 |
| HIGH | rule | [background-processing](rules/background-processing.md) | workmanager, 백그라운드 fetch, Isolate 태스크 |
| — | ref | [platform-setup](references/platform-setup.md) | iOS APNs + Android 채널 + 권한 설정 상세 |
| — | ref | [notification-architecture](references/notification-architecture.md) | 알림 서비스 아키텍처, 디렉토리 구조, 테스트 전략 |

## Quick Rules

### FCM 설정
- `Firebase.initializeApp()` → `main()` 에서 최우선 호출
- FCM 토큰은 서버에 저장, `onTokenRefresh` 구독으로 갱신
- iOS: APNs 인증 키(.p8) 방식 사용 (인증서보다 관리 용이)
- `@pragma('vm:entry-point')` 로 백그라운드 핸들러 보호

### 메시지 핸들링
- `FirebaseMessaging.onMessage` → 포그라운드 (직접 로컬 알림 표시)
- `FirebaseMessaging.onBackgroundMessage` → top-level 함수 필수
- `getInitialMessage()` → 종료 상태에서 알림 탭 처리 (1회만 호출)
- `onMessageOpenedApp` → 백그라운드에서 알림 탭 처리

### 로컬 알림
- Android: 채널 ID 필수 (Android 8+), 중요도별 분리
- iOS: `DarwinInitializationSettings` 권한 플래그
- 스케줄링: `zonedSchedule` (timezone 패키지 필수)
- 페이로드: JSON 문자열로 직렬화, 탭 시 파싱

### 백그라운드 처리
- `workmanager` → periodic/one-off 백그라운드 태스크
- iOS: `BGTaskScheduler` (최소 15분 간격, OS 제어)
- Android: `WorkManager` (정확한 주기, 제약 조건 설정 가능)
- 백그라운드 핸들러에서 Flutter 엔진 직접 접근 금지

### 권한
- iOS 13+: 임시 알림 (provisional) → 조용히 전달, 사용자 결정 유도
- Android 13+: `POST_NOTIFICATIONS` 런타임 권한 필수
- 권한 거부 시 설정 앱으로 유도 (`openAppSettings()`)

## Checklist

| Priority | Item |
|----------|------|
| CRITICAL | `Firebase.initializeApp()` 호출 후 FCM 초기화 |
| CRITICAL | 백그라운드 핸들러가 top-level 함수인지 확인 |
| CRITICAL | Android notification channel 생성 (앱 시작 시) |
| CRITICAL | iOS APNs capability + Background Modes 활성화 |
| HIGH | FCM 토큰 서버 동기화 + 갱신 리스너 |
| HIGH | 알림 탭 → 딥링크 네비게이션 3가지 상태 모두 처리 |
| HIGH | 권한 요청 타이밍 (첫 실행 X, 가치 인지 후 O) |
| HIGH | Android 13+ POST_NOTIFICATIONS 런타임 권한 처리 |
| MEDIUM | 리치 알림 (이미지, 액션 버튼) 테스트 |
| MEDIUM | 백그라운드 태스크 배터리 최적화 고려 |
| MEDIUM | 알림 분석 (열림률, 전환율) 수집 |
