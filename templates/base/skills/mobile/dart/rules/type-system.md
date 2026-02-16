---
title: Type System (Dart 3+)
impact: HIGH
tags: sealed-class, pattern-matching, records, extension-type
---

## Type System (Dart 3+)

Dart 3의 sealed class, 패턴 매칭, records, extension type으로 타입 안전한 코드 작성.

### Sealed Class (상태 모델링)

**Incorrect:**
```dart
enum LoadState { loading, success, error }

class ScreenState {
  final LoadState state;
  final List<Item>? data;   // success일 때만 유효
  final String? error;       // error일 때만 유효
  // 불가능한 조합이 가능: state=loading + data!=null
}
```

**Correct:**
```dart
sealed class ScreenState {}
class Loading extends ScreenState {}
class Success extends ScreenState {
  final List<Item> data;
  Success(this.data);
}
class Failure extends ScreenState {
  final String message;
  Failure(this.message);
}

// exhaustive switch — 새 상태 추가 시 컴파일 에러
Widget build(BuildContext context) => switch (state) {
  Loading() => const CircularProgressIndicator(),
  Success(:final data) => ItemList(items: data),
  Failure(:final message) => ErrorView(message: message),
};
```

### 패턴 매칭

**Incorrect:**
```dart
if (response is Map<String, dynamic>) {
  if (response.containsKey('data')) {
    final data = response['data'];
    if (data is List) {
      // 중첩 if 지옥
    }
  }
}
```

**Correct:**
```dart
if (response case {'data': List<Map<String, dynamic>> items}) {
  final users = items.map(User.fromJson).toList();
}
```

### Records (경량 튜플)

**Incorrect:**
```dart
// 위치 좌표를 위한 불필요한 클래스
class LatLng {
  final double lat;
  final double lng;
  LatLng(this.lat, this.lng);
}
```

**Correct:**
```dart
// Named record로 간결하게
typedef LatLng = ({double lat, double lng});

LatLng getLocation() => (lat: 1.3521, lng: 103.8198);

final (:lat, :lng) = getLocation(); // 구조 분해
```

### Extension Type (Zero-Cost Wrapper)

```dart
extension type UserId(String value) {
  factory UserId.fromInt(int id) => UserId('user_$id');
}

extension type PostId(String value) {}

// 컴파일 타임에 타입 구분, 런타임 오버헤드 0
void fetchUser(UserId id) { ... }
void fetchPost(PostId id) { ... }

fetchUser(PostId('abc')); // 컴파일 에러!
```

### 규칙

- 상태/에러/결과는 `sealed class` + exhaustive switch
- Map 접근은 패턴 매칭 `case` 사용
- 2-3개 값 반환은 Record `(int, String)` 사용 (클래스 불필요)
- ID 타입은 `extension type`으로 구분
- `dynamic` 타입 금지 → `Object?` + 패턴 매칭
