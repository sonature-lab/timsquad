---
title: Notification Handling (All App States)
impact: CRITICAL
impactDescription: "상태별 미처리 → 알림 누락/중복, 사용자 혼란"
tags: fcm, foreground, background, terminated, onMessage
---

## Notification Handling (All App States)

**Impact: CRITICAL (상태별 미처리 → 알림 누락/중복, 사용자 혼란)**

FCM 메시지는 앱 상태(포그라운드/백그라운드/종료)에 따라 처리 경로가 다름.
3가지 상태 모두 빠짐없이 처리해야 알림 누락 없음.

### 앱 상태별 메시지 수신 경로

```
┌──────────────────────────────────────────────────────────┐
│                    FCM Message 도착                       │
├──────────────┬──────────────────┬────────────────────────┤
│  Foreground  │   Background     │    Terminated          │
│  (앱 활성)    │  (앱 최소화)      │   (앱 종료)             │
├──────────────┼──────────────────┼────────────────────────┤
│ onMessage    │ onBackgroundMsg  │ onBackgroundMsg        │
│ 스트림 수신   │ top-level 함수   │ top-level 함수          │
│              │                  │                        │
│ 자동 표시 X   │ 자동 표시 O       │ 자동 표시 O             │
│ → 로컬 알림   │ (notification    │ (notification          │
│   직접 표시   │  payload 있으면)  │  payload 있으면)        │
├──────────────┼──────────────────┼────────────────────────┤
│       알림 탭 시                                          │
├──────────────┬──────────────────┬────────────────────────┤
│ (이미 활성)   │ onMessageOpened  │ getInitialMessage      │
│              │ App 스트림       │ (1회, cold start)       │
└──────────────┴──────────────────┴────────────────────────┘
```

### 포그라운드 메시지 처리

**Incorrect (포그라운드에서 알림 미표시):**
```dart
FirebaseMessaging.onMessage.listen((message) {
  // 데이터만 처리하고 사용자에게 알림 미표시
  print('Got message: ${message.notification?.title}');
  // → 사용자는 알림이 왔는지 모름
});
```

**Correct (로컬 알림으로 포그라운드 표시):**
```dart
class NotificationHandler {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final NotificationService _notificationService;
  final GoRouter _router;

  NotificationHandler({
    required NotificationService notificationService,
    required GoRouter router,
  })  : _notificationService = notificationService,
        _router = router;

  void initialize() {
    // 1. 포그라운드 메시지 → 로컬 알림 표시
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    // 2. 백그라운드에서 알림 탭 → 네비게이션
    FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

    // 3. 종료 상태에서 알림 탭 → 네비게이션 (cold start)
    _handleInitialMessage();
  }

  Future<void> _handleForegroundMessage(RemoteMessage message) async {
    final notification = message.notification;
    if (notification == null) {
      // data-only 메시지 → 사일런트 처리 (데이터 동기화 등)
      await _handleDataMessage(message.data);
      return;
    }

    // 포그라운드: FCM이 자동 표시하지 않으므로 로컬 알림으로 직접 표시
    await _notificationService.showNotification(
      id: message.hashCode,
      title: notification.title ?? '',
      body: notification.body ?? '',
      payload: jsonEncode(message.data),
      imageUrl: notification.android?.imageUrl ?? notification.apple?.imageUrl,
    );
  }

  Future<void> _handleNotificationTap(RemoteMessage message) async {
    _navigateFromPayload(message.data);
  }

  Future<void> _handleInitialMessage() async {
    // 종료 상태에서 알림 탭으로 앱 시작 시
    // getInitialMessage()는 1회만 값을 반환 (이후 null)
    final initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      // 약간의 지연 — 라우터 초기화 대기
      await Future.delayed(const Duration(milliseconds: 500));
      _navigateFromPayload(initialMessage.data);
    }
  }

  void _navigateFromPayload(Map<String, dynamic> data) {
    final type = data['type'] as String?;
    final id = data['id'] as String?;

    switch (type) {
      case 'match':
        if (id != null) _router.push('/match/$id');
      case 'chat':
        if (id != null) _router.push('/chat/$id');
      case 'announcement':
        _router.push('/announcements');
      default:
        _router.push('/notifications');
    }
  }

  Future<void> _handleDataMessage(Map<String, dynamic> data) async {
    // 사일런트 푸시: 데이터 동기화, 캐시 무효화 등
    final action = data['action'] as String?;
    switch (action) {
      case 'sync_matches':
        // 매치 데이터 새로고침 트리거
        break;
      case 'invalidate_cache':
        // 특정 캐시 무효화
        break;
    }
  }
}
```

### 백그라운드 메시지 핸들러

```dart
// main.dart (또는 별도 파일) — 반드시 top-level
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // 백그라운드에서는 별도 Isolate로 실행
  // → 앱 상태, Provider, 싱글톤 인스턴스 접근 불가
  await Firebase.initializeApp();

  // 가벼운 처리만 수행
  // 1. 로컬 DB 저장 (SQLite/Hive 직접 접근)
  // 2. 알림 배지 카운트 업데이트
  // 3. 로컬 알림 표시 (커스텀 알림 필요 시)

  debugPrint('Background message: ${message.messageId}');
}
```

### iOS 포그라운드 표시 옵션

```dart
// iOS에서 포그라운드 알림을 시스템 배너로 표시하려면:
await FirebaseMessaging.instance.setForegroundNotificationPresentationOptions(
  alert: true,  // 배너 표시
  badge: true,  // 뱃지 업데이트
  sound: true,  // 사운드 재생
);
// 이 옵션 사용 시 flutter_local_notifications 포그라운드 표시 불필요 (iOS만)
// Android는 여전히 flutter_local_notifications 필요
```

### 메시지 타입별 처리 전략

```dart
// FCM 메시지 구조:
// 1. notification + data → 알림 표시 + 데이터 전달
// 2. data-only → 사일런트 (앱이 직접 처리)
// 3. notification-only → 단순 알림

// 서버에서 보내는 JSON 예시 (notification + data):
// {
//   "message": {
//     "token": "device_token",
//     "notification": {
//       "title": "새 매치 초대",
//       "body": "오후 3시 테니스 매치에 초대되었습니다"
//     },
//     "data": {
//       "type": "match",
//       "id": "match_123",
//       "action": "invite"
//     },
//     "android": {
//       "notification": { "channel_id": "matches" }
//     },
//     "apns": {
//       "payload": {
//         "aps": { "sound": "default", "badge": 1 }
//       }
//     }
//   }
// }
```

### 규칙

- 포그라운드 → `onMessage` + 로컬 알림 직접 표시 (FCM은 포그라운드 자동 표시 안 함)
- 백그라운드 핸들러 → top-level 함수, `@pragma('vm:entry-point')` 필수
- 백그라운드 핸들러 → Provider/싱글톤 접근 불가, DB 직접 접근만
- `getInitialMessage()` → cold start 시 1회 체크, 라우터 준비 후 네비게이션
- `onMessageOpenedApp` → 백그라운드 탭 처리, `getInitialMessage` 와 중복 방지
- data-only 메시지 → 사일런트 데이터 동기화에 활용 (알림 미표시)
- iOS `setForegroundNotificationPresentationOptions` → iOS 전용 포그라운드 배너
