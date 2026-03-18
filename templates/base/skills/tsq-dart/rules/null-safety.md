---
title: Sound Null Safety
impact: CRITICAL
tags: null-safety, dart3, patterns
---

## Sound Null Safety

Dart의 null safety는 컴파일 타임에 null 참조를 방지한다.
`!`와 `late` 남용은 런타임 크래시를 초래하므로 패턴으로 해결.

### Bang Operator (!) 금지

**Incorrect:**
```dart
final user = users.firstWhere((u) => u.id == id);
print(user!.name); // NoSuchElementException 위험
```

**Correct:**
```dart
final user = users.where((u) => u.id == id).firstOrNull;
if (user case final found?) {
  print(found.name);
} else {
  throw UserNotFoundException(id);
}
```

### Nullable Collection 처리

**Incorrect:**
```dart
final List<String?> items = getData();
for (final item in items) {
  print(item!.length); // null이면 크래시
}
```

**Correct:**
```dart
final List<String?> items = getData();
final validItems = items.whereType<String>(); // null 필터링 + 타입 내로잉
for (final item in validItems) {
  print(item.length); // String 보장
}
```

### late 사용 기준

**Incorrect:**
```dart
class MyWidget extends StatefulWidget { ... }
class _MyWidgetState extends State<MyWidget> {
  late final ApiService api; // dispose 전에 접근하면 크래시
  late String userName;      // 초기화 보장 없음
}
```

**Correct:**
```dart
class _MyWidgetState extends State<MyWidget> {
  late final TextEditingController _controller; // initState에서 반드시 초기화

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}
```

### 규칙

- `late` 는 lifecycle 보장 컨텍스트에서만: `initState`, `setUp`, 생성자 body
- `!` 대신 `case`, `??`, `?.` 사용
- `firstWhere` → `firstOrNull` + null 체크
- 함수 파라미터에서 `required` 키워드로 null 방지
