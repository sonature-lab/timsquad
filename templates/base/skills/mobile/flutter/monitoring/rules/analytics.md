---
title: Analytics Event Taxonomy & Screen Tracking
impact: HIGH
impactDescription: "이벤트 미설계 → 무의미한 데이터 축적, 의사결정 근거 부재"
tags: firebase-analytics, event, screen-view, user-property, observer
---

## Analytics Event Taxonomy & Screen Tracking

**Impact: HIGH (이벤트 미설계 → 무의미한 데이터 축적, 의사결정 근거 부재)**

Firebase Analytics 초기화, 이벤트 택소노미 설계, 사용자 속성,
AnalyticsObserver를 통한 화면 추적, 디버그 모드.

### 의존성

```yaml
# pubspec.yaml
dependencies:
  firebase_core: ^3.8.0
  firebase_analytics: ^11.4.0
```

### 이벤트 택소노미 설계

**Incorrect (무분별한 이벤트 로깅):**
```dart
// 이벤트 이름이 일관성 없고 파라미터 미정의
analytics.logEvent(name: 'clicked_button');
analytics.logEvent(name: 'user_did_something');
analytics.logEvent(name: 'pageView', parameters: {'p': 'home'});
// → 분석 불가능한 데이터 축적
```

**Correct (구조화된 택소노미):**
```dart
/// 이벤트 이름 상수 (snake_case, 40자 이하)
abstract class AnalyticsEvents {
  // 화면 이벤트
  static const screenView = 'screen_view';

  // 사용자 액션
  static const buttonClick = 'button_click';
  static const featureUse = 'feature_use';
  static const search = 'search';

  // 비즈니스 이벤트
  static const matchCreated = 'match_created';
  static const matchJoined = 'match_joined';
  static const matchCompleted = 'match_completed';

  // 전환 이벤트
  static const signUp = 'sign_up';
  static const login = 'login';
  static const subscriptionStarted = 'subscription_started';

  // 에러 이벤트
  static const errorOccurred = 'error_occurred';
}

/// 파라미터 이름 상수
abstract class AnalyticsParams {
  static const screenName = 'screen_name';
  static const screenClass = 'screen_class';
  static const buttonName = 'button_name';
  static const featureName = 'feature_name';
  static const sportType = 'sport_type';
  static const errorType = 'error_type';
  static const errorMessage = 'error_message';
  static const source = 'source';
}
```

### Analytics 서비스

```dart
class AnalyticsService {
  final FirebaseAnalytics _analytics = FirebaseAnalytics.instance;

  /// 화면 조회
  Future<void> logScreenView({
    required String screenName,
    String? screenClass,
  }) async {
    await _analytics.logScreenView(
      screenName: screenName,
      screenClass: screenClass ?? screenName,
    );
  }

  /// 버튼 클릭
  Future<void> logButtonClick({
    required String buttonName,
    required String screenName,
  }) async {
    await _analytics.logEvent(
      name: AnalyticsEvents.buttonClick,
      parameters: {
        AnalyticsParams.buttonName: buttonName,
        AnalyticsParams.screenName: screenName,
      },
    );
  }

  /// 기능 사용
  Future<void> logFeatureUse({
    required String featureName,
    Map<String, Object>? extra,
  }) async {
    await _analytics.logEvent(
      name: AnalyticsEvents.featureUse,
      parameters: {
        AnalyticsParams.featureName: featureName,
        ...?extra,
      },
    );
  }

  /// 비즈니스 이벤트
  Future<void> logMatchCreated({
    required String sportType,
    required int maxPlayers,
  }) async {
    await _analytics.logEvent(
      name: AnalyticsEvents.matchCreated,
      parameters: {
        AnalyticsParams.sportType: sportType,
        'max_players': maxPlayers,
      },
    );
  }
}

// Riverpod Provider
final analyticsServiceProvider = Provider<AnalyticsService>((ref) {
  return AnalyticsService();
});
```

### 사용자 속성

```dart
/// 사용자 세그먼트 설정 (최대 25개 속성)
Future<void> setUserProperties({
  required String userId,
  String? userType,
  String? subscriptionTier,
  String? preferredSport,
  String? region,
}) async {
  final analytics = FirebaseAnalytics.instance;

  await analytics.setUserId(id: userId);

  if (userType != null) {
    await analytics.setUserProperty(name: 'user_type', value: userType);
  }
  if (subscriptionTier != null) {
    await analytics.setUserProperty(
      name: 'subscription_tier',
      value: subscriptionTier,
    );
  }
  if (preferredSport != null) {
    await analytics.setUserProperty(
      name: 'preferred_sport',
      value: preferredSport,
    );
  }
  if (region != null) {
    await analytics.setUserProperty(name: 'region', value: region);
  }
}
```

### go_router 화면 추적 (AnalyticsObserver)

```dart
// GoRouter 설정에 observer 추가
final goRouter = GoRouter(
  routes: [...],
  observers: [
    FirebaseAnalyticsObserver(
      analytics: FirebaseAnalytics.instance,
      nameExtractor: (settings) {
        // route 이름을 screen_name으로 매핑
        return settings.name ?? settings.arguments?.toString() ?? 'unknown';
      },
    ),
  ],
);

// GoRoute에 name 명시 (observer가 이름 추출)
GoRoute(
  path: '/match/:id',
  name: 'match_detail',
  builder: (context, state) => MatchDetailScreen(
    matchId: state.pathParameters['id']!,
  ),
),
```

### 디버그 모드

```
# Android: DebugView 활성화
adb shell setprop debug.firebase.analytics.app <package_name>

# 이벤트가 실시간으로 Firebase Console > DebugView에 표시
# 비활성화:
adb shell setprop debug.firebase.analytics.app .none.

# iOS: Xcode Scheme > Arguments
-FIRDebugEnabled   # 활성화
-FIRDebugDisabled  # 비활성화
```

### 규칙

- 이벤트 택소노미 → 구현 전에 문서화 (이름, 파라미터, 트리거 조건)
- 이벤트 이름 → snake_case, 40자 이하, 자동 수집 이벤트와 충돌 금지
- 파라미터 → 최대 25개/이벤트, 값 100자 이하
- 사용자 속성 → 세그먼트 기준만 (최대 25개, 값 36자 이하)
- `AnalyticsObserver` → go_router 연동으로 화면 전환 자동 추적
- `setUserId` → 로그인 시 설정, 로그아웃 시 `null` 로 해제
- 디버그 → DebugView로 실시간 이벤트 검증 후 프로덕션 배포
- PII (개인식별정보) → 이벤트 파라미터에 이름/이메일/전화번호 금지
