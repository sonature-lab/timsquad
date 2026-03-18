---
title: Local Notifications
impact: CRITICAL
impactDescription: "채널 미설정 → Android 8+ 알림 미표시, 초기화 누락 → 런타임 크래시"
tags: flutter-local-notifications, channel, schedule, timezone
---

## Local Notifications

**Impact: CRITICAL (채널 미설정 → Android 8+ 알림 미표시, 초기화 누락 → 런타임 크래시)**

flutter_local_notifications 설정, Android 채널, 스케줄 알림, FCM 포그라운드 연동.

### 초기화

**Incorrect (플랫폼 설정 불완전):**
```dart
final plugin = FlutterLocalNotificationsPlugin();
await plugin.initialize(const InitializationSettings());
// → Android: 아이콘 미지정 → 크래시
// → iOS: 권한 미요청 → 알림 미표시
```

**Correct (완전한 초기화):**
```dart
class NotificationService {
  static final NotificationService instance = NotificationService._();
  NotificationService._();

  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  Future<void> initialize() async {
    // Android 설정
    const androidSettings = AndroidInitializationSettings(
      '@mipmap/ic_notification', // res/mipmap 또는 res/drawable
    );

    // iOS 설정
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: false,  // 별도 타이밍에 요청
      requestBadgePermission: false,
      requestSoundPermission: false,
      // 포그라운드 알림 표시 콜백
      notificationCategories: [
        DarwinNotificationCategory(
          'match_invite',
          actions: [
            DarwinNotificationAction.plain('accept', 'Accept'),
            DarwinNotificationAction.plain('decline', 'Decline'),
          ],
        ),
      ],
    );

    await _plugin.initialize(
      const InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
      ),
      // 알림 탭 콜백
      onDidReceiveNotificationResponse: _onNotificationTap,
      // 백그라운드 알림 탭 콜백
      onDidReceiveBackgroundNotificationResponse: _onBackgroundNotificationTap,
    );

    // Android 알림 채널 생성
    await _createNotificationChannels();
  }

  void _onNotificationTap(NotificationResponse response) {
    final payload = response.payload;
    if (payload != null) {
      // 페이로드 파싱 → 딥링크 네비게이션
      final data = jsonDecode(payload) as Map<String, dynamic>;
      // NavigationService 또는 GoRouter로 네비게이션
      NavigationService.instance.navigateFromPayload(data);
    }
  }

  // 백그라운드 탭 핸들러 — top-level 또는 static 필수
  @pragma('vm:entry-point')
  static void _onBackgroundNotificationTap(NotificationResponse response) {
    // 백그라운드에서 알림 탭 시 호출
    // 앱이 다시 열리면 getInitialMessage 또는 onMessageOpenedApp에서 처리
  }
}
```

### Android 알림 채널

```dart
Future<void> _createNotificationChannels() async {
  final androidPlugin =
      _plugin.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();

  if (androidPlugin == null) return;

  // 매치 알림 (높은 중요도 → 헤드업 알림)
  await androidPlugin.createNotificationChannel(
    const AndroidNotificationChannel(
      'matches',           // channelId
      'Match Alerts',      // channelName
      description: 'Notifications for match invites and updates',
      importance: Importance.high,
      enableVibration: true,
      playSound: true,
    ),
  );

  // 채팅 메시지 (기본 중요도)
  await androidPlugin.createNotificationChannel(
    const AndroidNotificationChannel(
      'chat',
      'Chat Messages',
      description: 'New chat messages',
      importance: Importance.defaultImportance,
    ),
  );

  // 시스템 공지 (낮은 중요도 → 소리 없음)
  await androidPlugin.createNotificationChannel(
    const AndroidNotificationChannel(
      'system',
      'System Notifications',
      description: 'App updates and system alerts',
      importance: Importance.low,
      playSound: false,
    ),
  );

  // 사일런트 (최소 중요도 → 상태바에만)
  await androidPlugin.createNotificationChannel(
    const AndroidNotificationChannel(
      'silent',
      'Background Sync',
      description: 'Silent data synchronization',
      importance: Importance.min,
      playSound: false,
      enableVibration: false,
    ),
  );
}
```

### 알림 표시

```dart
/// FCM 포그라운드 메시지를 로컬 알림으로 표시
Future<void> showNotification({
  required int id,
  required String title,
  required String body,
  String? payload,
  String? imageUrl,
  String channelId = 'matches',
}) async {
  // Android 상세 설정
  final androidDetails = AndroidNotificationDetails(
    channelId,
    _getChannelName(channelId),
    importance: Importance.high,
    priority: Priority.high,
    // 큰 이미지 (선택)
    styleInformation: imageUrl != null
        ? BigPictureStyleInformation(
            FilePathAndroidBitmap(await _downloadImage(imageUrl)),
            contentTitle: title,
            summaryText: body,
          )
        : BigTextStyleInformation(body),
  );

  // iOS 상세 설정
  const iosDetails = DarwinNotificationDetails(
    presentAlert: true,
    presentBadge: true,
    presentSound: true,
  );

  await _plugin.show(
    id,
    title,
    body,
    NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    ),
    payload: payload,
  );
}
```

### 스케줄 알림

```dart
import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest_all.dart' as tz;

/// 초기화 시 timezone 설정
Future<void> initializeTimezone() async {
  tz.initializeTimeZones();
  // flutter_timezone 패키지로 디바이스 타임존 감지
  final timeZoneName = await FlutterTimezone.getLocalTimezone();
  tz.setLocalLocation(tz.getLocation(timeZoneName));
}

/// 매치 시작 30분 전 리마인더
Future<void> scheduleMatchReminder({
  required String matchId,
  required String matchTitle,
  required DateTime matchTime,
}) async {
  final scheduledTime = tz.TZDateTime.from(
    matchTime.subtract(const Duration(minutes: 30)),
    tz.local,
  );

  // 과거 시간이면 스킵
  if (scheduledTime.isBefore(tz.TZDateTime.now(tz.local))) return;

  await _plugin.zonedSchedule(
    matchId.hashCode,  // 알림 ID (취소용)
    'Match Reminder',
    '$matchTitle starts in 30 minutes!',
    scheduledTime,
    const NotificationDetails(
      android: AndroidNotificationDetails(
        'reminders',
        'Reminders',
        importance: Importance.high,
      ),
      iOS: DarwinNotificationDetails(),
    ),
    androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
    matchDateTimeComponents: null, // 1회성
    payload: jsonEncode({'type': 'match', 'id': matchId}),
  );
}

/// 특정 알림 취소
Future<void> cancelReminder(String matchId) async {
  await _plugin.cancel(matchId.hashCode);
}

/// 모든 알림 취소
Future<void> cancelAll() async {
  await _plugin.cancelAll();
}
```

### 규칙

- Android 알림 아이콘 → `res/mipmap` 또는 `res/drawable` 에 배치 (벡터 X, PNG 필수)
- Android 8+ → 채널 미생성 시 알림 미표시 (앱 시작 시 채널 생성 필수)
- 채널 중요도 → `high`(헤드업), `default`(소리), `low`(소리 X), `min`(사일런트)
- 스케줄 알림 → `timezone` + `flutter_timezone` 패키지 필수
- `zonedSchedule` → `exactAllowWhileIdle` (Doze 모드에서도 정확한 알림)
- 알림 ID → 고유값 사용 (같은 ID 시 덮어쓰기), 취소 시 동일 ID
- iOS `DarwinInitializationSettings` → 초기화 시 권한 요청 false, 별도 타이밍에 요청
- 백그라운드 탭 콜백 → `@pragma('vm:entry-point')` + static/top-level
