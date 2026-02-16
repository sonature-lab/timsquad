---
title: FCM Setup & Token Management
impact: CRITICAL
impactDescription: "알림 미수신 → 사용자 이탈, 토큰 미갱신 → 전달률 하락"
tags: fcm, firebase, token, setup
---

## FCM Setup & Token Management

**Impact: CRITICAL (알림 미수신 → 사용자 이탈, 토큰 미갱신 → 전달률 하락)**

FCM 초기화, 토큰 관리, 서버 동기화. 앱 시작 시 반드시 설정해야 하는 핵심 인프라.

### 의존성

```yaml
# pubspec.yaml
dependencies:
  firebase_core: ^3.8.0
  firebase_messaging: ^15.1.0
  flutter_local_notifications: ^18.0.0
```

### 초기화

**Incorrect (순서 무시, 백그라운드 핸들러 미등록):**
```dart
void main() {
  runApp(const MyApp());
  // Firebase 초기화 없이 FCM 사용 → 크래시
}
```

**Correct (완전한 초기화 순서):**
```dart
// top-level 함수 — 클래스 멤버/클로저 불가
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  // 백그라운드 메시지 처리 (DB 저장, 로컬 알림 등)
  // 주의: 여기서 UI 코드, Navigator, BuildContext 접근 불가
  debugPrint('Background message: ${message.messageId}');
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 1. Firebase 초기화
  await Firebase.initializeApp();

  // 2. 백그라운드 메시지 핸들러 등록 (main 에서 1회)
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  // 3. 로컬 알림 초기화 (포그라운드 표시용)
  await NotificationService.instance.initialize();

  runApp(const ProviderScope(child: MyApp()));
}
```

### FCM 토큰 관리

**Incorrect (토큰 갱신 미처리):**
```dart
// 앱 시작 시 토큰 1번만 가져오고 끝
final token = await FirebaseMessaging.instance.getToken();
await sendTokenToServer(token!);
// → 토큰 갱신되면 서버에 잘못된 토큰 → 알림 전달 실패
```

**Correct (토큰 갱신 구독 + 서버 동기화):**
```dart
class FcmTokenManager {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final AuthRepository _authRepo;

  FcmTokenManager({required AuthRepository authRepo}) : _authRepo = authRepo;

  /// 초기 토큰 등록 + 갱신 구독
  Future<void> initialize() async {
    // 초기 토큰
    final token = await _messaging.getToken();
    if (token != null) {
      await _syncTokenToServer(token);
    }

    // 토큰 갱신 구독 (앱 재설치, OS 토큰 리프레시 등)
    _messaging.onTokenRefresh.listen(_syncTokenToServer);
  }

  Future<void> _syncTokenToServer(String token) async {
    try {
      await _authRepo.updateFcmToken(token);
    } catch (e) {
      // 실패 시 로컬 저장 → 다음 앱 시작 시 재시도
      await _saveTokenLocally(token);
    }
  }

  /// 로그아웃 시 토큰 해제
  Future<void> deleteToken() async {
    await _messaging.deleteToken();
    await _authRepo.removeFcmToken();
  }

  Future<void> _saveTokenLocally(String token) async {
    // SharedPreferences 등에 저장, 다음 시작 시 재동기화
  }
}

// Riverpod Provider
final fcmTokenManagerProvider = Provider<FcmTokenManager>((ref) {
  return FcmTokenManager(authRepo: ref.watch(authRepositoryProvider));
});
```

### iOS APNs 토큰 (선택)

```dart
// iOS에서 APNs 토큰 직접 필요한 경우 (서버에서 APNs 직접 발송 시)
final apnsToken = await FirebaseMessaging.instance.getAPNSToken();
// 대부분의 경우 FCM이 APNs 토큰을 자동 관리하므로 직접 사용 불필요
```

### 토픽 구독

```dart
class TopicManager {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  /// 사용자 관심사 기반 토픽 구독
  Future<void> subscribeToUserTopics(UserPreferences prefs) async {
    // 전체 공지
    await _messaging.subscribeToTopic('announcements');

    // 관심 스포츠
    for (final sport in prefs.favoriteSports) {
      await _messaging.subscribeToTopic('sport_${sport.name}');
    }

    // 지역
    if (prefs.region != null) {
      await _messaging.subscribeToTopic('region_${prefs.region}');
    }
  }

  /// 로그아웃 시 토픽 해제
  Future<void> unsubscribeAll(UserPreferences prefs) async {
    await _messaging.unsubscribeFromTopic('announcements');
    for (final sport in prefs.favoriteSports) {
      await _messaging.unsubscribeFromTopic('sport_${sport.name}');
    }
  }
}
```

### 규칙

- `Firebase.initializeApp()` → `WidgetsFlutterBinding.ensureInitialized()` 직후
- `onBackgroundMessage` → `main()` 에서 등록, top-level 함수만 가능
- `@pragma('vm:entry-point')` → 백그라운드 핸들러에 필수 (트리쉐이킹 방지)
- FCM 토큰 → 서버 동기화 필수 + `onTokenRefresh` 구독
- 로그아웃 시 `deleteToken()` + 서버에서 토큰 제거
- 토픽 구독 → 사용자 설정 변경 시 구독/해제 동기화
