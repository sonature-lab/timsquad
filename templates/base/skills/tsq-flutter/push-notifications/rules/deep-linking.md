---
title: Deep Linking from Notifications
impact: HIGH
impactDescription: "탭 후 홈으로만 이동 → 전환율 30% 하락, 딥링크 → 전환율 2-3x"
tags: deep-link, go-router, payload, navigation
---

## Deep Linking from Notifications

**Impact: HIGH (탭 후 홈으로만 이동 → 전환율 30% 하락, 딥링크 → 전환율 2-3x)**

알림 탭 → 특정 화면 네비게이션. FCM 페이로드 → go_router 딥링크 통합.

### 페이로드 설계

**Incorrect (구조 없는 페이로드):**
```dart
// 서버에서 보내는 데이터
// { "data": { "screen": "match_detail_123" } }
// → 파싱 로직이 복잡해지고, 새 화면 추가 시 분기문 증가
```

**Correct (타입 + ID 분리, 라우트 매핑):**
```dart
// 서버에서 보내는 데이터 구조
// {
//   "data": {
//     "type": "match",       // 알림 카테고리
//     "id": "match_123",     // 리소스 ID
//     "action": "invite",    // 세부 액션 (선택)
//     "route": "/match/match_123"  // 직접 라우트 (선택, 백업)
//   }
// }

/// 페이로드 모델
class NotificationPayload {
  final String type;
  final String? id;
  final String? action;
  final String? route;

  const NotificationPayload({
    required this.type,
    this.id,
    this.action,
    this.route,
  });

  factory NotificationPayload.fromMap(Map<String, dynamic> data) {
    return NotificationPayload(
      type: data['type'] as String? ?? 'default',
      id: data['id'] as String?,
      action: data['action'] as String?,
      route: data['route'] as String?,
    );
  }

  /// 페이로드 → go_router 경로 변환
  String toRoute() {
    // 직접 라우트가 있으면 우선 사용
    if (route != null) return route!;

    // 타입 + ID 기반 라우트 생성
    return switch (type) {
      'match' => id != null ? '/match/$id' : '/matches',
      'chat' => id != null ? '/chat/$id' : '/chat',
      'profile' => id != null ? '/profile/$id' : '/profile',
      'announcement' => '/announcements',
      'reminder' => id != null ? '/match/$id' : '/matches',
      _ => '/notifications',
    };
  }
}
```

### go_router 통합

```dart
/// 알림 딥링크 네비게이션 서비스
class NotificationNavigator {
  final GoRouter _router;

  NotificationNavigator({required GoRouter router}) : _router = router;

  /// FCM RemoteMessage에서 네비게이션
  void navigateFromMessage(RemoteMessage message) {
    final payload = NotificationPayload.fromMap(message.data);
    _navigate(payload);
  }

  /// flutter_local_notifications 페이로드에서 네비게이션
  void navigateFromLocalPayload(String? payloadJson) {
    if (payloadJson == null) return;
    try {
      final data = jsonDecode(payloadJson) as Map<String, dynamic>;
      final payload = NotificationPayload.fromMap(data);
      _navigate(payload);
    } catch (e) {
      debugPrint('Invalid notification payload: $e');
      _router.go('/notifications');
    }
  }

  void _navigate(NotificationPayload payload) {
    final route = payload.toRoute();

    // push vs go 결정:
    // - go: 스택을 교체 (뒤로가기 시 홈으로)
    // - push: 스택에 추가 (뒤로가기 시 이전 화면으로)
    // 알림에서는 push가 일반적 (사용자가 돌아갈 수 있도록)
    _router.push(route);
  }
}

// Riverpod Provider
final notificationNavigatorProvider = Provider<NotificationNavigator>((ref) {
  return NotificationNavigator(router: ref.watch(routerProvider));
});
```

### 3가지 앱 상태에서 딥링크 처리

```dart
class NotificationDeepLinkHandler {
  final NotificationNavigator _navigator;
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localPlugin;

  NotificationDeepLinkHandler({
    required NotificationNavigator navigator,
    required FlutterLocalNotificationsPlugin localPlugin,
  })  : _navigator = navigator,
        _localPlugin = localPlugin;

  Future<void> initialize() async {
    // === 1. 종료 상태 (Terminated) → 알림 탭으로 앱 시작 ===
    final initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      // 라우터 초기화 대기
      await Future.delayed(const Duration(milliseconds: 800));
      _navigator.navigateFromMessage(initialMessage);
    }

    // === 2. 백그라운드 → 알림 탭으로 앱 복귀 ===
    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      _navigator.navigateFromMessage(message);
    });

    // === 3. 로컬 알림 탭 처리 ===
    // flutter_local_notifications의 앱 시작 시 탭 확인
    final launchDetails =
        await _localPlugin.getNotificationAppLaunchDetails();
    if (launchDetails?.didNotificationLaunchApp == true) {
      final response = launchDetails!.notificationResponse;
      if (response != null) {
        await Future.delayed(const Duration(milliseconds: 800));
        _navigator.navigateFromLocalPayload(response.payload);
      }
    }
  }
}
```

### 인증 가드와 딥링크 조합

```dart
// go_router redirect에서 딥링크 보존
GoRouter(
  redirect: (context, state) {
    final isLoggedIn = /* auth check */;
    final isAuthRoute = state.matchedLocation.startsWith('/auth');

    if (!isLoggedIn && !isAuthRoute) {
      // 딥링크 목적지를 쿼리 파라미터로 보존
      final redirectTo = state.matchedLocation;
      return '/auth/login?redirect=${Uri.encodeComponent(redirectTo)}';
    }
    if (isLoggedIn && isAuthRoute) {
      // 로그인 완료 → 원래 딥링크 목적지로 이동
      final redirect = state.uri.queryParameters['redirect'];
      return redirect != null ? Uri.decodeComponent(redirect) : '/';
    }
    return null;
  },
  // ...routes
);
```

### 알림 분석 (Analytics)

```dart
/// 알림 탭 이벤트 추적
void _navigate(NotificationPayload payload) {
  // 분석 이벤트 기록
  AnalyticsService.instance.logEvent(
    'notification_opened',
    parameters: {
      'type': payload.type,
      'action': payload.action ?? 'tap',
      'source': 'push',
    },
  );

  final route = payload.toRoute();
  _router.push(route);
}
```

### 규칙

- 페이로드 구조 → `type` + `id` + `action` 표준화, 서버와 합의
- `toRoute()` → 중앙 라우트 매핑 (분산 switch 문 방지)
- 3가지 상태 모두 처리: `getInitialMessage` + `onMessageOpenedApp` + 로컬 알림 launch
- `getInitialMessage()` → cold start 시 라우터 초기화 대기 후 네비게이션
- 인증 가드 → 딥링크 목적지 보존 (`?redirect=` 쿼리 파라미터)
- 알림 탭 시 `push` 사용 (스택 추가 → 뒤로가기 가능)
- 알림 탭 분석 이벤트 필수 (열림률, 전환율 측정)
