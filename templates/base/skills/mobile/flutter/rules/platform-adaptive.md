---
title: Platform Adaptive UI
impact: MEDIUM
tags: adaptive, responsive, material, cupertino
---

## Platform Adaptive UI

크로스플랫폼 적응형 UI. Material + Cupertino 자동 전환, 반응형 레이아웃.

### 적응형 위젯 패턴

```dart
/// 플랫폼에 따라 Material/Cupertino 자동 선택
class AdaptiveDialog {
  static Future<bool?> show(
    BuildContext context, {
    required String title,
    required String content,
  }) {
    if (Platform.isIOS || Platform.isMacOS) {
      return showCupertinoDialog<bool>(
        context: context,
        builder: (_) => CupertinoAlertDialog(
          title: Text(title),
          content: Text(content),
          actions: [
            CupertinoDialogAction(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            CupertinoDialogAction(
              isDefaultAction: true,
              onPressed: () => Navigator.pop(context, true),
              child: const Text('OK'),
            ),
          ],
        ),
      );
    }
    return showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(title),
        content: Text(content),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
}
```

### 반응형 레이아웃

```dart
class ResponsiveLayout extends StatelessWidget {
  const ResponsiveLayout({
    super.key,
    required this.mobile,
    this.tablet,
    this.desktop,
  });

  final Widget mobile;
  final Widget? tablet;
  final Widget? desktop;

  static const mobileBreakpoint = 600.0;
  static const tabletBreakpoint = 900.0;

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;

    if (width >= tabletBreakpoint && desktop != null) return desktop!;
    if (width >= mobileBreakpoint && tablet != null) return tablet!;
    return mobile;
  }
}

// 사용
ResponsiveLayout(
  mobile: const MatchListMobile(),
  tablet: const MatchListTablet(), // 2-column
);
```

### 플랫폼별 동작

```dart
// 스크롤 물리
ScrollConfiguration(
  behavior: Platform.isIOS
      ? const CupertinoScrollBehavior() // 바운스
      : const MaterialScrollBehavior(), // 글로우
  child: ListView(...),
);

// 날짜 선택
Future<DateTime?> pickDate(BuildContext context) {
  if (Platform.isIOS) {
    return showCupertinoModalPopup<DateTime>(
      context: context,
      builder: (_) => CupertinoDatePicker(...),
    );
  }
  return showDatePicker(context: context, ...);
}
```

### 규칙

- 대화상자, 스위치, 날짜피커 → 플랫폼별 네이티브 위젯 사용
- 반응형 breakpoint: mobile < 600 < tablet < 900 < desktop
- `MediaQuery.sizeOf(context)` 사용 (`MediaQuery.of` 보다 효율적)
- 플랫폼 분기는 유틸 함수로 캡슐화 (위젯 안에 if/else 산재 금지)
- `Theme.of(context).platform` 으로 플랫폼 감지 (테스트 용이)
