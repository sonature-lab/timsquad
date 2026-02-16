---
title: Testing Strategy
impact: HIGH
tags: testing, widget-test, integration, mocktail
---

## Testing Strategy

Flutter 3계층 테스트: Unit → Widget → Integration. mocktail + Patrol.

### 테스트 피라미드

```
         ╱╲
        ╱  ╲         Integration (Patrol)
       ╱    ╲        - 전체 플로우 (로그인→매칭→채팅)
      ╱──────╲       - 네이티브 상호작용 (권한, 알림)
     ╱        ╲
    ╱  Widget  ╲     Widget Test
   ╱            ╲    - 개별 위젯 렌더링 + 인터랙션
  ╱──────────────╲   - Provider override로 상태 주입
 ╱                ╲
╱      Unit        ╲  Unit Test
╱──────────────────╲  - Notifier, Repository, UseCase
                      - 순수 Dart (Flutter 의존성 없음)
```

### Unit Test (Notifier)

```dart
void main() {
  late MockMatchRepository mockRepo;
  late ProviderContainer container;

  setUp(() {
    mockRepo = MockMatchRepository();
    container = ProviderContainer(overrides: [
      matchRepositoryProvider.overrideWithValue(mockRepo),
    ]);
  });

  tearDown(() => container.dispose());

  test('초기 로드 시 매치 목록 반환', () async {
    when(() => mockRepo.getMatches(sport: Sport.tennis))
        .thenAnswer((_) async => [testMatch]);

    final notifier = container.read(matchListProvider.notifier);
    final state = await container.read(matchListProvider.future);

    expect(state, hasLength(1));
    expect(state.first.id, testMatch.id);
  });
}
```

### Widget Test

```dart
void main() {
  testWidgets('MatchCard가 매치 정보를 표시한다', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          matchProvider.overrideWithValue(AsyncData(testMatch)),
        ],
        child: const MaterialApp(
          home: Scaffold(body: MatchCard()),
        ),
      ),
    );

    expect(find.text('Tennis Match'), findsOneWidget);
    expect(find.text('Singapore Sports Hub'), findsOneWidget);

    await tester.tap(find.byType(ElevatedButton));
    await tester.pumpAndSettle();

    expect(find.text('Joined!'), findsOneWidget);
  });
}
```

### Mock (mocktail)

```dart
import 'package:mocktail/mocktail.dart';

// 코드 생성 불필요
class MockMatchRepository extends Mock implements MatchRepository {}
class MockAuthService extends Mock implements AuthService {}

// 사용
when(() => mockRepo.getMatches(sport: any(named: 'sport')))
    .thenAnswer((_) async => [testMatch]);

verify(() => mockRepo.getMatches(sport: Sport.tennis)).called(1);
```

### Integration Test (Patrol)

```dart
// integration_test/match_flow_test.dart
patrolTest('매치 생성 → 참여 → 채팅 전체 플로우', ($) async {
  await $.pumpWidgetAndSettle(const MyApp());

  // 로그인
  await $(#emailField).enterText('test@example.com');
  await $(#passwordField).enterText('password');
  await $(#loginButton).tap();

  // 네이티브 권한 허용 (Patrol 고유 기능)
  await $.native.grantPermissionWhenInUse();

  // 매치 화면
  await $.waitUntilVisible($(#matchList));
  await $(#createMatchButton).tap();

  // 확인
  expect($(#matchCreatedSnackbar), findsOneWidget);
});
```

### 규칙

- Unit test: Notifier/Repository 100% 커버리지 목표
- Widget test: 주요 화면 + 사용자 인터랙션
- Mock: `mocktail` 사용 (mockito의 codegen 불필요)
- Provider 테스트: `ProviderContainer` + `overrides`
- Integration: 핵심 사용자 플로우만 (3-5개)
- test fixtures: `test/fixtures/` 에 공유 테스트 데이터
