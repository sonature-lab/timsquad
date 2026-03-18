---
title: Notification Service Architecture
category: guide
source: internal
tags: architecture, service, directory, testing, analytics
---

# Notification Service Architecture

알림 서비스 전체 아키텍처. 디렉토리 구조, 서비스 레이어, 테스트 전략, 분석.

## Key Concepts

- **중앙화**: 알림 관련 코드를 `core/notifications/` 에 집중 (feature 횡단 관심사)
- **추상화**: `NotificationService` 인터페이스 → FCM/Local/Mock 구현 분리
- **페이로드 표준화**: 서버-클라이언트 간 알림 데이터 계약
- **테스트 가능성**: Mock 구현으로 알림 로직 단위 테스트

## Directory Structure

```
lib/
├── core/
│   └── notifications/
│       ├── notification_service.dart           # 추상 인터페이스
│       ├── notification_service_impl.dart      # 통합 구현체
│       ├── fcm/
│       │   ├── fcm_service.dart                # FCM 초기화 + 토큰
│       │   ├── fcm_token_manager.dart          # 토큰 서버 동기화
│       │   └── fcm_message_handler.dart        # 메시지 라우팅
│       ├── local/
│       │   ├── local_notification_service.dart  # flutter_local_notifications 래퍼
│       │   ├── notification_channels.dart       # Android 채널 정의
│       │   └── scheduled_notification.dart      # 스케줄 알림 관리
│       ├── models/
│       │   ├── notification_payload.dart        # 페이로드 모델
│       │   ├── notification_channel.dart        # 채널 enum + 설정
│       │   └── notification_action.dart         # 액션 버튼 모델
│       ├── navigation/
│       │   └── notification_navigator.dart      # 딥링크 네비게이션
│       ├── permission/
│       │   ├── permission_service.dart          # 권한 관리
│       │   └── permission_prompt_controller.dart # 프리프롬프트 로직
│       ├── background/
│       │   ├── background_tasks.dart            # top-level 콜백
│       │   └── background_task_manager.dart     # 태스크 등록/취소
│       └── providers/
│           └── notification_providers.dart       # Riverpod providers
│
├── features/
│   └── notifications/                           # 알림 목록 UI (feature)
│       ├── data/
│       │   ├── datasources/
│       │   │   └── notification_local_datasource.dart
│       │   └── repositories/
│       │       └── notification_repository_impl.dart
│       ├── domain/
│       │   ├── entities/
│       │   │   └── app_notification.dart        # 앱 내 알림 모델
│       │   └── repositories/
│       │       └── notification_repository.dart  # abstract
│       └── presentation/
│           ├── screens/
│           │   └── notification_list_screen.dart
│           ├── widgets/
│           │   └── notification_card.dart
│           └── providers/
│               └── notification_list_provider.dart
```

## Service Layer Design

```dart
/// 알림 서비스 인터페이스 (테스트 용이성)
abstract class NotificationService {
  Future<void> initialize();
  Future<void> showNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
    String? imageUrl,
    String channelId,
  });
  Future<void> scheduleNotification({
    required int id,
    required String title,
    required String body,
    required DateTime scheduledTime,
    String? payload,
  });
  Future<void> cancelNotification(int id);
  Future<void> cancelAll();
  Future<String?> getFcmToken();
  Stream<String> get onTokenRefresh;
  Future<AuthorizationStatus> requestPermission();
  Future<AuthorizationStatus> getPermissionStatus();
}

/// 통합 구현체
class NotificationServiceImpl implements NotificationService {
  final FcmService _fcmService;
  final LocalNotificationService _localService;
  final PermissionService _permissionService;

  NotificationServiceImpl({
    required FcmService fcmService,
    required LocalNotificationService localService,
    required PermissionService permissionService,
  })  : _fcmService = fcmService,
        _localService = localService,
        _permissionService = permissionService;

  @override
  Future<void> initialize() async {
    await _fcmService.initialize();
    await _localService.initialize();
  }

  @override
  Future<void> showNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
    String? imageUrl,
    String channelId = 'default_channel',
  }) async {
    await _localService.show(
      id: id,
      title: title,
      body: body,
      payload: payload,
      imageUrl: imageUrl,
      channelId: channelId,
    );
  }

  // ... 나머지 구현
}

/// Riverpod Provider 구성
final notificationServiceProvider = Provider<NotificationService>((ref) {
  return NotificationServiceImpl(
    fcmService: ref.watch(fcmServiceProvider),
    localService: ref.watch(localNotificationServiceProvider),
    permissionService: ref.watch(permissionServiceProvider),
  );
});
```

## Initialization Flow

```
앱 시작 (main.dart)
  │
  ├─ 1. WidgetsFlutterBinding.ensureInitialized()
  ├─ 2. Firebase.initializeApp()
  ├─ 3. FirebaseMessaging.onBackgroundMessage(handler) ← top-level 등록
  ├─ 4. NotificationService.initialize()
  │     ├─ FcmService.initialize()
  │     │   ├─ FCM 토큰 획득 + 서버 동기화
  │     │   └─ onTokenRefresh 구독
  │     └─ LocalNotificationService.initialize()
  │         ├─ Android 채널 생성
  │         └─ 탭 콜백 등록
  ├─ 5. Workmanager.initialize(callbackDispatcher)
  └─ 6. runApp(ProviderScope(child: MyApp()))
        │
        └─ MyApp.initState()
            └─ NotificationDeepLinkHandler.initialize()
                ├─ getInitialMessage() → 딥링크 (cold start)
                ├─ onMessageOpenedApp.listen → 딥링크 (background)
                └─ onMessage.listen → 포그라운드 알림 표시
```

## Testing Strategy

```dart
/// Mock 알림 서비스 (단위 테스트용)
class MockNotificationService implements NotificationService {
  final List<Map<String, dynamic>> shownNotifications = [];
  final List<Map<String, dynamic>> scheduledNotifications = [];
  AuthorizationStatus _permissionStatus = AuthorizationStatus.authorized;

  @override
  Future<void> showNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
    String? imageUrl,
    String channelId = 'default_channel',
  }) async {
    shownNotifications.add({
      'id': id,
      'title': title,
      'body': body,
      'payload': payload,
      'channelId': channelId,
    });
  }

  @override
  Future<AuthorizationStatus> requestPermission() async {
    return _permissionStatus;
  }

  void setPermissionStatus(AuthorizationStatus status) {
    _permissionStatus = status;
  }

  // ... 나머지 Mock 구현
}

/// 알림 네비게이션 테스트
void main() {
  group('NotificationNavigator', () {
    late MockGoRouter mockRouter;
    late NotificationNavigator navigator;

    setUp(() {
      mockRouter = MockGoRouter();
      navigator = NotificationNavigator(router: mockRouter);
    });

    test('match payload navigates to match detail', () {
      navigator.navigateFromMessage(RemoteMessage(
        data: {'type': 'match', 'id': 'match_123'},
      ));

      verify(() => mockRouter.push('/match/match_123')).called(1);
    });

    test('unknown type navigates to notifications', () {
      navigator.navigateFromMessage(RemoteMessage(
        data: {'type': 'unknown'},
      ));

      verify(() => mockRouter.push('/notifications')).called(1);
    });
  });

  group('NotificationPayload', () {
    test('toRoute generates correct path', () {
      final payload = NotificationPayload(type: 'chat', id: 'chat_456');
      expect(payload.toRoute(), '/chat/chat_456');
    });

    test('toRoute with explicit route overrides type', () {
      final payload = NotificationPayload(
        type: 'match',
        id: 'match_123',
        route: '/custom/path',
      );
      expect(payload.toRoute(), '/custom/path');
    });
  });
}
```

## Notification Analytics

```dart
/// 알림 분석 이벤트
class NotificationAnalytics {
  final AnalyticsService _analytics;

  NotificationAnalytics(this._analytics);

  /// 알림 수신 (포그라운드)
  void trackReceived(RemoteMessage message) {
    _analytics.logEvent('notification_received', parameters: {
      'type': message.data['type'] ?? 'unknown',
      'source': 'fcm',
      'app_state': 'foreground',
    });
  }

  /// 알림 탭 (열림)
  void trackOpened(NotificationPayload payload, String appState) {
    _analytics.logEvent('notification_opened', parameters: {
      'type': payload.type,
      'action': payload.action ?? 'tap',
      'app_state': appState, // foreground, background, terminated
    });
  }

  /// 액션 버튼 탭
  void trackAction(String actionId, NotificationPayload payload) {
    _analytics.logEvent('notification_action', parameters: {
      'action_id': actionId,
      'type': payload.type,
    });
  }

  /// 권한 요청 결과
  void trackPermission(AuthorizationStatus status) {
    _analytics.logEvent('notification_permission', parameters: {
      'status': status.name,
    });
  }

  /// 프리프롬프트 결과
  void trackPrePrompt(bool accepted) {
    _analytics.logEvent('notification_pre_prompt', parameters: {
      'accepted': accepted.toString(),
    });
  }
}
```

## Common Pitfalls

1. **Provider 접근 in Background**: 백그라운드 핸들러에서 Riverpod Provider 사용 불가 → 직접 의존성 생성
2. **초기화 순서**: Firebase → FCM 핸들러 등록 → 로컬 알림 → Workmanager (순서 중요)
3. **딥링크 레이스 컨디션**: `getInitialMessage()` 호출 시 라우터 미준비 → 지연 후 네비게이션
4. **토큰 갱신 누락**: `onTokenRefresh` 미구독 → 서버에 잘못된 토큰 → 전달 실패 증가
5. **채널 중요도 변경 불가**: Android 채널 생성 후 중요도 코드 변경 무효 → 새 채널 ID 필요
6. **iOS 시뮬레이터**: APNs 미지원 → FCM 토큰 발급 불가 → 실기기 필수
7. **Release 빌드 차이**: Debug에서만 동작하는 로깅이 Release에서 크래시 유발 가능
8. **동시 알림**: 같은 ID로 show() 호출 시 덮어쓰기 → 고유 ID 전략 필수

## Examples

### 최소 구현 체크리스트

```
[ ] pubspec.yaml: firebase_core, firebase_messaging, flutter_local_notifications
[ ] flutterfire configure (google-services.json, GoogleService-Info.plist 자동 생성)
[ ] iOS: Push Notifications + Background Modes capability
[ ] Android: AndroidManifest.xml 권한 + 메타데이터
[ ] Android: 알림 아이콘 (흰색+투명, PNG, 5종 크기)
[ ] main.dart: 초기화 순서 (Firebase → FCM → Local → Workmanager)
[ ] 백그라운드 핸들러: top-level, @pragma
[ ] 알림 채널: 앱 시작 시 생성 (Android)
[ ] FCM 토큰: 서버 동기화 + 갱신 구독
[ ] 딥링크: 3가지 앱 상태 (foreground/background/terminated) 처리
[ ] 권한: 맥락적 요청 + 프리프롬프트 + 설정 유도
```
