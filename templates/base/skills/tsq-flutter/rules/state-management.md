---
title: State Management (Riverpod)
impact: CRITICAL
tags: riverpod, provider, notifier, state
---

## State Management (Riverpod)

Riverpod 기반 상태 관리. 선언적 의존성, 자동 dispose, 타입 안전.

### Provider 타입 선택

| 용도 | Provider 타입 | 예시 |
|------|-------------|------|
| 동기 파생 값 | `Provider` | 필터링된 리스트, 계산값 |
| 비동기 단발 | `FutureProvider` | API 호출, 초기 데이터 로드 |
| 실시간 스트림 | `StreamProvider` | WebSocket, Firestore 스냅샷 |
| UI 상태 (CRUD) | `NotifierProvider` | 폼 상태, 필터, 페이지네이션 |
| 비동기 UI 상태 | `AsyncNotifierProvider` | 서버 데이터 + 뮤테이션 |

### ref 사용 구분

**Incorrect:**
```dart
class MatchListScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // build에서 ref.read → 변경 감지 안 됨
    final matches = ref.read(matchListProvider);

    return ElevatedButton(
      // 이벤트에서 ref.watch → 불필요한 구독
      onPressed: () => ref.watch(matchListProvider.notifier).refresh(),
      child: Text('Refresh'),
    );
  }
}
```

**Correct:**
```dart
class MatchListScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // build에서 ref.watch → 변경 시 리빌드
    final matchesAsync = ref.watch(matchListProvider);

    return matchesAsync.when(
      data: (matches) => MatchListView(matches: matches),
      loading: () => const MatchListSkeleton(),
      error: (e, _) => ErrorView(error: e),
    );
  }

  void _onRefresh(WidgetRef ref) {
    // 이벤트에서 ref.read → 1회성 접근
    ref.read(matchListProvider.notifier).refresh();
  }
}
```

### Notifier 패턴

```dart
// Domain model
sealed class MatchListState {}
class MatchListInitial extends MatchListState {}
class MatchListLoaded extends MatchListState {
  final List<Match> matches;
  MatchListLoaded(this.matches);
}

// Provider 선언
final matchListProvider =
    AsyncNotifierProvider<MatchListNotifier, List<Match>>(
  MatchListNotifier.new,
);

// Notifier 구현
class MatchListNotifier extends AsyncNotifier<List<Match>> {
  @override
  Future<List<Match>> build() async {
    // 의존성 주입: ref.watch로 다른 provider 구독
    final sport = ref.watch(selectedSportProvider);
    final repo = ref.watch(matchRepositoryProvider);
    return repo.getMatches(sport: sport);
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => build());
  }

  Future<void> joinMatch(String matchId) async {
    final repo = ref.read(matchRepositoryProvider);
    await repo.joinMatch(matchId);
    ref.invalidateSelf(); // 데이터 새로고침
  }
}
```

### 규칙

- `ref.watch` → build() 안에서만 (리액티브 구독)
- `ref.read` → 이벤트 핸들러, 콜백에서 (1회 접근)
- `ref.listen` → side effect (스낵바, 네비게이션)
- `autoDispose` 기본 사용 (화면 벗어나면 해제)
- Provider 파일 위치: `features/{name}/presentation/providers/`
- 전역 상태는 `core/providers/`에 배치
- `.when()` 패턴으로 loading/error/data 처리
