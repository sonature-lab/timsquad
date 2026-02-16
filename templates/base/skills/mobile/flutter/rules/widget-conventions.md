---
title: Widget Conventions
impact: CRITICAL
tags: widget, composition, const, key
---

## Widget Conventions

Flutter 위젯은 합성(composition)으로 설계. 상속보다 조합, const로 성능 확보.

### 위젯 구조 템플릿

```dart
/// 사용자 프로필 카드.
class UserProfileCard extends StatelessWidget {
  const UserProfileCard({
    super.key,
    required this.user,
    this.onTap,
  });

  final UserProfile user;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              UserAvatar(url: user.avatarUrl),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(user.name, style: theme.textTheme.titleMedium),
                    Text(user.email, style: theme.textTheme.bodySmall),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

### const 생성자

**Incorrect:**
```dart
class AppLogo extends StatelessWidget {
  // const 없음 → 부모 리빌드마다 재생성
  AppLogo({super.key});

  @override
  Widget build(BuildContext context) {
    return Image.asset('assets/logo.png', width: 48);
  }
}

// 사용 시
Column(children: [AppLogo(), ...]) // const 불가
```

**Correct:**
```dart
class AppLogo extends StatelessWidget {
  const AppLogo({super.key});

  @override
  Widget build(BuildContext context) {
    return Image.asset('assets/logo.png', width: 48);
  }
}

// 사용 시
Column(children: [const AppLogo(), ...]) // 리빌드 스킵
```

### Key 사용 기준

**Incorrect:**
```dart
ListView(
  children: items.map((item) => ItemTile(item: item)).toList(),
  // Key 없음 → 순서 변경/삽입 시 위젯 상태 꼬임
);
```

**Correct:**
```dart
ListView(
  children: items.map((item) => ItemTile(
    key: ValueKey(item.id), // 고유 식별자
    item: item,
  )).toList(),
);
```

### 분리 기준

- **200줄 초과** → 서브 위젯으로 추출
- **재사용 가능** → `shared/widgets/`로 이동
- **build() 안 조건 분기 3개 이상** → 별도 위젯
- **GlobalKey** → 거의 사용 금지 (Form 제외). `ValueKey`/`ObjectKey` 우선

### 규칙

- `const` 생성자 가능하면 항상 선언 (`prefer_const_constructors` 린트)
- `super.key` 파라미터 필수 (모든 위젯)
- trailing comma 필수 (위젯 트리 가독성)
- `build()` 안에서 데이터 가공/API 호출 금지
- `SizedBox` > `Container` (빈 공간에 Container 쓰지 않기)
