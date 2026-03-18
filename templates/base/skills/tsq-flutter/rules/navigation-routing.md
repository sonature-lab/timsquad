---
title: Navigation & Routing
impact: HIGH
tags: go-router, navigation, deep-link, routing
---

## Navigation & Routing

go_router 기반 선언적 라우팅. 딥링크, 가드, 중첩 네비게이션.

### 라우터 설정

```dart
final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final isLoggedIn = authState.valueOrNull != null;
      final isAuthRoute = state.matchedLocation.startsWith('/auth');

      if (!isLoggedIn && !isAuthRoute) return '/auth/login';
      if (isLoggedIn && isAuthRoute) return '/';
      return null; // 리다이렉트 불필요
    },
    routes: [
      // 인증 라우트 (바텀 네비 없음)
      GoRoute(
        path: '/auth/login',
        builder: (context, state) => const LoginScreen(),
      ),
      // 메인 앱 (바텀 네비 + 중첩 라우팅)
      StatefulShellRoute.indexedStack(
        builder: (context, state, child) => MainShell(child: child),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/',
              builder: (_, __) => const HomeScreen(),
              routes: [
                GoRoute(
                  path: 'match/:id',
                  builder: (_, state) => MatchDetailScreen(
                    matchId: state.pathParameters['id']!,
                  ),
                ),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/community',
              builder: (_, __) => const CommunityScreen(),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/profile',
              builder: (_, __) => const ProfileScreen(),
            ),
          ]),
        ],
      ),
    ],
  );
});
```

### 네비게이션 호출

**Incorrect:**
```dart
// 명령형 — 히스토리 관리 어려움
Navigator.push(
  context,
  MaterialPageRoute(builder: (_) => MatchDetailScreen(id: matchId)),
);
```

**Correct:**
```dart
// 선언적 — URL 기반
context.go('/match/$matchId');        // 교체
context.push('/match/$matchId');      // 스택 추가
context.pop();                         // 뒤로가기
```

### 딥링크 설정

```dart
// go_router는 자동으로 URL 파싱
// Android: AndroidManifest.xml
// <intent-filter android:autoVerify="true">
//   <data android:scheme="https" android:host="app.example.com" />
// </intent-filter>

// iOS: Info.plist
// Associated Domains: applinks:app.example.com

// Flutter 측: 라우트만 정의하면 딥링크 자동 처리
GoRoute(
  path: '/match/:id',
  builder: (_, state) => MatchDetailScreen(
    matchId: state.pathParameters['id']!,
  ),
),
```

### 규칙

- `go_router` 선언적 라우팅 사용 (Navigator.push 금지)
- 라우트 정의는 `core/router/` 에 중앙화
- `redirect` 로 인증 가드 구현 (미들웨어 패턴)
- `StatefulShellRoute` 로 바텀 네비 + 각 탭 스택 유지
- path parameter는 `/:id` 패턴, query는 `state.uri.queryParameters`
- 라우트 경로 상수화 (`RouteNames` 또는 `RoutePaths` 클래스)
