---
title: Text Direction & RTL Layout Support
impact: HIGH
impactDescription: "RTL 미대응 → 아랍어/히브리어 사용자 UX 파괴, 레이아웃 반전 오류"
tags: rtl, ltr, directionality, edge-insets-directional, alignment-directional
---

## Text Direction & RTL Layout Support

**Impact: HIGH (RTL 미대응 → 아랍어/히브리어 사용자 UX 파괴, 레이아웃 반전 오류)**

RTL (Right-to-Left) 레이아웃 지원. Directionality 위젯, EdgeInsetsDirectional,
AlignmentDirectional, 아이콘 미러링. RTL 로캘 지원 시 필수.

### Directional 위젯 사용

**Incorrect (하드코딩된 left/right):**
```dart
Container(
  padding: const EdgeInsets.only(left: 16, right: 8),
  alignment: Alignment.centerLeft,
  child: Row(
    children: [
      const Icon(Icons.arrow_back),  // RTL에서도 왼쪽 화살표
      const SizedBox(width: 8),
      Text(title),
    ],
  ),
);
```

**Correct (Directional 위젯으로 RTL 자동 대응):**
```dart
Container(
  padding: const EdgeInsetsDirectional.only(start: 16, end: 8),
  alignment: AlignmentDirectional.centerStart,
  child: Row(
    children: [
      Icon(
        // RTL에서는 자동으로 arrow_forward (오른쪽→왼쪽 방향)
        Directionality.of(context) == TextDirection.rtl
            ? Icons.arrow_forward
            : Icons.arrow_back,
      ),
      const SizedBox(width: 8),
      Text(title),
    ],
  ),
);
```

### EdgeInsets → EdgeInsetsDirectional 변환

```dart
// ❌ 물리적 방향 (RTL에서 반전 안 됨)
EdgeInsets.only(left: 16)
EdgeInsets.fromLTRB(16, 8, 0, 8)
EdgeInsets.symmetric(horizontal: 16)  // ✅ 대칭은 OK

// ✅ 논리적 방향 (RTL에서 자동 반전)
EdgeInsetsDirectional.only(start: 16)
EdgeInsetsDirectional.fromSTEB(16, 8, 0, 8)  // Start, Top, End, Bottom
EdgeInsetsDirectional.only(start: 16, end: 8)

// Padding 위젯도 동일
Padding(
  padding: const EdgeInsetsDirectional.only(start: 16),
  child: child,
);
```

### Alignment → AlignmentDirectional 변환

```dart
// ❌ 물리적 정렬
Alignment.centerLeft
Alignment.topRight

// ✅ 논리적 정렬
AlignmentDirectional.centerStart  // LTR: left, RTL: right
AlignmentDirectional.topEnd       // LTR: right, RTL: left

// Container, Align, Positioned 등에 적용
Container(
  alignment: AlignmentDirectional.centerStart,
  child: child,
);

Align(
  alignment: AlignmentDirectional.topEnd,
  child: badge,
);
```

### Positioned → PositionedDirectional

```dart
// ❌ 물리적 위치 (RTL 미대응)
Positioned(
  left: 16,
  top: 8,
  child: badge,
);

// ✅ 논리적 위치 (RTL 자동 반전)
PositionedDirectional(
  start: 16,
  top: 8,
  child: badge,
);
```

### 아이콘 미러링

```dart
/// 방향성을 가진 아이콘 (화살표, 체브론 등)은 RTL에서 미러링
class DirectionalIcon extends StatelessWidget {
  final IconData icon;
  final double? size;
  final Color? color;

  const DirectionalIcon(this.icon, {super.key, this.size, this.color});

  @override
  Widget build(BuildContext context) {
    final isRtl = Directionality.of(context) == TextDirection.rtl;

    // 방향성 아이콘만 미러링 (체크마크, 플러스 등은 미러링 X)
    if (isRtl) {
      return Transform.flip(
        flipX: true,
        child: Icon(icon, size: size, color: color),
      );
    }

    return Icon(icon, size: size, color: color);
  }
}

// 사용 예
DirectionalIcon(Icons.arrow_forward_ios, size: 16),  // RTL에서 자동 반전
Icon(Icons.check, size: 16),                          // 방향 무관 → 미러링 불필요
```

### RTL 테스트

```dart
// 테스트에서 RTL 환경 시뮬레이션
testWidgets('renders correctly in RTL', (tester) async {
  await tester.pumpWidget(
    Directionality(
      textDirection: TextDirection.rtl,
      child: MediaQuery(
        data: const MediaQueryData(),
        child: Material(
          child: MyWidget(),
        ),
      ),
    ),
  );

  // start padding이 RTL에서 오른쪽에 적용되는지 확인
  final container = tester.widget<Container>(find.byType(Container));
  // ...assertions
});

// 전체 앱을 RTL로 실행 (디버그 확인용)
MaterialApp(
  locale: const Locale('ar'),  // 아랍어 → RTL 자동 적용
  // ...
);
```

### Row/Column 방향

```dart
// Row는 TextDirection을 자동 반영
// LTR: [icon] [text] [chevron →]
// RTL: [← chevron] [text] [icon]
Row(
  children: [
    const Icon(Icons.person),
    Expanded(child: Text(context.l10n.profileLabel)),
    const DirectionalIcon(Icons.chevron_right),
  ],
);
// → Row 내부 순서 변경 불필요, Flutter가 자동 반전
```

### 규칙

- `EdgeInsets` → `EdgeInsetsDirectional` 로 교체 (left/right → start/end)
- `Alignment` → `AlignmentDirectional` 로 교체 (centerLeft → centerStart)
- `Positioned` → `PositionedDirectional` 로 교체 (left → start)
- 대칭 padding/margin (`symmetric`) → 그대로 사용 가능 (반전 불필요)
- 방향성 아이콘 (화살표, 체브론) → RTL에서 `Transform.flip` 미러링
- 방향 무관 아이콘 (체크, 플러스, 검색) → 미러링 금지
- RTL 테스트 → `Directionality(textDirection: TextDirection.rtl)` 로 래핑
- `Row`/`ListView` → TextDirection 자동 반영, 순서 변경 불필요
