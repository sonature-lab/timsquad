---
title: Async Patterns
impact: CRITICAL
tags: async, future, stream, isolate
---

## Async Patterns

Dart의 비동기 프로그래밍 핵심 패턴. async/await, Stream, Isolate.

### async/await 우선

**Incorrect:**
```dart
Future<User> fetchUser(String id) {
  return api.get('/users/$id')
    .then((response) => User.fromJson(response.data))
    .catchError((e) => throw FetchException(e.toString()));
}
```

**Correct:**
```dart
Future<User> fetchUser(String id) async {
  try {
    final response = await api.get('/users/$id');
    return User.fromJson(response.data);
  } on DioException catch (e) {
    throw FetchException(e.message ?? 'Unknown error');
  }
}
```

### 병렬 실행

**Incorrect:**
```dart
final user = await fetchUser(id);      // 1초
final posts = await fetchPosts(id);    // 1초
final friends = await fetchFriends(id); // 1초  → 총 3초
```

**Correct:**
```dart
final (user, posts, friends) = await (
  fetchUser(id),
  fetchPosts(id),
  fetchFriends(id),
).wait;  // 총 ~1초 (Dart 3 record destructuring)
```

### Stream 관리

**Incorrect:**
```dart
class _ChatState extends State<ChatScreen> {
  @override
  void initState() {
    super.initState();
    chatStream.listen((msg) => setState(() => messages.add(msg)));
    // 구독 해제 안 됨 → 메모리 누수
  }
}
```

**Correct:**
```dart
class _ChatState extends State<ChatScreen> {
  StreamSubscription<Message>? _subscription;

  @override
  void initState() {
    super.initState();
    _subscription = chatStream.listen(
      (msg) => setState(() => messages.add(msg)),
      onError: (e) => _handleError(e),
    );
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}
```

### Isolate (무거운 연산)

**Incorrect:**
```dart
// 메인 스레드에서 JSON 파싱 → UI 프레임 드롭
final data = jsonDecode(hugeJsonString) as Map<String, dynamic>;
final items = (data['items'] as List).map(Item.fromJson).toList();
```

**Correct:**
```dart
// Isolate에서 실행 → UI 프레임 유지
final items = await Isolate.run(() {
  final data = jsonDecode(hugeJsonString) as Map<String, dynamic>;
  return (data['items'] as List).map(Item.fromJson).toList();
});
```

### 규칙

- `then()` 체이닝 금지 → async/await
- 독립 Future는 `.wait` (Dart 3) 또는 `Future.wait([])`로 병렬
- Stream 구독은 반드시 `cancel()` (dispose에서)
- 100ms+ 연산은 `Isolate.run()` 검토
- `completer` 직접 사용 금지 (async/await로 대체 가능)
