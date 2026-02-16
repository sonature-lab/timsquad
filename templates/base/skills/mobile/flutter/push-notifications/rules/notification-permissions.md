---
title: Notification Permissions
impact: HIGH
impactDescription: "잘못된 타이밍 → 거부율 40-60%, 적절한 타이밍 → 수락률 70%+"
tags: permission, ios, android, provisional, runtime
---

## Notification Permissions

**Impact: HIGH (잘못된 타이밍 → 거부율 40-60%, 적절한 타이밍 → 수락률 70%+)**

알림 권한 요청 타이밍, 프리프롬프트 전략, 플랫폼별 권한 처리.

### 권한 요청 타이밍

**Incorrect (앱 시작 즉시 요청):**
```dart
// main.dart 또는 스플래시에서 바로 요청
// → 사용자가 앱 가치를 모르는 상태에서 거부 → 복구 어려움
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  // 즉시 권한 요청 → 거부율 높음
  await FirebaseMessaging.instance.requestPermission();
  runApp(const MyApp());
}
```

**Correct (가치 인지 후 맥락적 요청):**
```dart
/// 권한 요청 서비스
class NotificationPermissionService {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  /// 현재 권한 상태 확인
  Future<AuthorizationStatus> checkPermission() async {
    final settings = await _messaging.getNotificationSettings();
    return settings.authorizationStatus;
  }

  /// iOS: 임시(provisional) 권한으로 조용히 시작
  Future<AuthorizationStatus> requestProvisional() async {
    final settings = await _messaging.requestPermission(
      provisional: true,  // iOS만: 알림 센터에 조용히 전달
      alert: true,
      badge: true,
      sound: true,
    );
    return settings.authorizationStatus;
  }

  /// 정식 권한 요청 (프리프롬프트 후)
  Future<AuthorizationStatus> requestFull() async {
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      announcement: false,
      carPlay: false,
      criticalAlert: false,  // 긴급 알림 (별도 Apple 승인 필요)
      provisional: false,
    );
    return settings.authorizationStatus;
  }

  /// Android 13+ 런타임 권한 요청
  Future<bool> requestAndroidPermission() async {
    if (Platform.isAndroid) {
      final androidPlugin = FlutterLocalNotificationsPlugin()
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>();
      // Android 13 (API 33)+ 에서만 필요
      final granted = await androidPlugin?.requestNotificationsPermission();
      return granted ?? true; // Android 12 이하는 자동 허용
    }
    return true;
  }
}
```

### 프리프롬프트 패턴 (권한 요청 전 설명)

```dart
/// 매치 참가 후 알림 권한 요청 (맥락적)
class MatchJoinedPermissionPrompt extends ConsumerWidget {
  const MatchJoinedPermissionPrompt({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final permissionStatus = ref.watch(notificationPermissionProvider);

    // 이미 허용됨 → 표시 안 함
    if (permissionStatus == AuthorizationStatus.authorized) {
      return const SizedBox.shrink();
    }

    // 이미 명시적 거부 → 표시 안 함 (설정 유도는 별도)
    if (permissionStatus == AuthorizationStatus.denied) {
      return const SizedBox.shrink();
    }

    return Card(
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.notifications_active, size: 48),
            const SizedBox(height: 12),
            const Text(
              'Get match updates',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'We\'ll notify you when your match time approaches '
              'and when teammates send messages.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                TextButton(
                  onPressed: () {
                    // "나중에" — 다음 적절한 시점에 다시 표시
                    ref.read(permissionDismissCountProvider.notifier)
                        .increment();
                  },
                  child: const Text('Maybe Later'),
                ),
                FilledButton(
                  onPressed: () async {
                    final service = ref.read(
                      notificationPermissionServiceProvider,
                    );
                    await service.requestFull();
                  },
                  child: const Text('Enable Notifications'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
```

### 권한 거부 → 설정 유도

```dart
/// 알림이 필요한 기능 사용 시 설정 유도
Future<void> handleNotificationRequired(BuildContext context) async {
  final status = await FirebaseMessaging.instance.getNotificationSettings();

  if (status.authorizationStatus == AuthorizationStatus.denied) {
    if (!context.mounted) return;

    final goToSettings = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Notifications Disabled'),
        content: const Text(
          'To receive match alerts, please enable notifications '
          'in your device settings.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Open Settings'),
          ),
        ],
      ),
    );

    if (goToSettings == true) {
      await AppSettings.openAppSettings(type: AppSettingsType.notification);
    }
  }
}
```

### 권한 상태 Provider

```dart
/// 알림 권한 상태 추적
final notificationPermissionProvider =
    StreamProvider<AuthorizationStatus>((ref) async* {
  // 초기 상태
  final settings =
      await FirebaseMessaging.instance.getNotificationSettings();
  yield settings.authorizationStatus;

  // 앱 라이프사이클 변경 시 재확인 (설정에서 돌아온 후)
  // AppLifecycleState.resumed 시 재확인 로직은 별도 리스너에서
});

/// 프리프롬프트 dismiss 횟수 (너무 자주 표시 방지)
final permissionDismissCountProvider =
    NotifierProvider<PermissionDismissNotifier, int>(
  PermissionDismissNotifier.new,
);

class PermissionDismissNotifier extends Notifier<int> {
  @override
  int build() {
    // SharedPreferences에서 로드
    return 0;
  }

  void increment() {
    state++;
    // SharedPreferences에 저장
  }

  /// 3회 이상 dismiss → 더 이상 표시 안 함
  bool get shouldShow => state < 3;
}
```

### 플랫폼별 차이

| 항목 | iOS | Android |
|------|-----|---------|
| 권한 요청 | 1번만 시스템 다이얼로그 | Android 13+: 런타임 권한 |
| 임시 알림 | `provisional: true` 지원 | 해당 없음 |
| 거부 후 복구 | 설정 앱에서만 가능 | 설정 앱에서만 가능 |
| 기본 상태 | `notDetermined` | Android 12 이하: 자동 허용 |
| 채널별 제어 | 없음 (전체 on/off) | 채널별 개별 제어 가능 |

### 규칙

- 앱 첫 실행 시 즉시 권한 요청 금지 — 가치 인지 후 맥락적 요청
- iOS: `provisional` 먼저 → 사용자가 알림 가치 확인 → 정식 요청
- Android 13+: `POST_NOTIFICATIONS` 런타임 권한 처리 필수
- 프리프롬프트 → 시스템 다이얼로그 전에 앱 내 설명 UI 표시
- 거부 시 → 설정 앱 유도 (`app_settings` 패키지)
- dismiss 횟수 추적 → 3회 이상 거부 시 더 이상 표시하지 않음
- 권한 상태 → Provider로 추적, 앱 resume 시 재확인
