---
title: Animations
impact: MEDIUM
tags: animation, implicit, explicit, hero
---

## Animations

Flutter 애니메이션 패턴. 암시적(간단) → 명시적(복잡) 선택 기준.

### 선택 기준

| 복잡도 | 사용 | 예시 |
|--------|------|------|
| 단순 속성 변경 | `AnimatedContainer`, `AnimatedOpacity` | 페이드, 크기 변경 |
| 여러 위젯 전환 | `AnimatedSwitcher` | 탭 전환, 상태 전환 |
| 화면 간 공유 요소 | `Hero` | 카드 → 상세 전환 |
| 커스텀 곡선/시퀀스 | `AnimationController` + `Tween` | 복잡한 모션 |
| 반복/물리 기반 | `AnimationController` + `SpringSimulation` | 풀투리프레시 |

### 암시적 애니메이션 (간단)

```dart
// 상태에 따라 자동 전환
AnimatedContainer(
  duration: const Duration(milliseconds: 300),
  curve: Curves.easeInOut,
  width: isExpanded ? 200 : 100,
  height: isExpanded ? 200 : 100,
  decoration: BoxDecoration(
    color: isSelected ? Colors.blue : Colors.grey,
    borderRadius: BorderRadius.circular(isExpanded ? 16 : 8),
  ),
  child: content,
);

// 위젯 교체 시 전환
AnimatedSwitcher(
  duration: const Duration(milliseconds: 200),
  child: isLoading
      ? const CircularProgressIndicator(key: ValueKey('loading'))
      : ContentView(key: ValueKey('content'), data: data),
);
```

### Hero 전환

```dart
// 리스트 아이템
Hero(
  tag: 'match-${match.id}',
  child: MatchCard(match: match),
);

// 상세 화면
Hero(
  tag: 'match-${match.id}',
  child: MatchDetailHeader(match: match),
);
```

### 명시적 애니메이션 (복잡)

```dart
class PulseWidget extends StatefulWidget {
  const PulseWidget({super.key, required this.child});
  final Widget child;

  @override
  State<PulseWidget> createState() => _PulseWidgetState();
}

class _PulseWidgetState extends State<PulseWidget>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    )..repeat(reverse: true);

    _scale = Tween(begin: 1.0, end: 1.1).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScaleTransition(scale: _scale, child: widget.child);
  }
}
```

### 규칙

- 단순 속성 변경 → 암시적 (`Animated*` 위젯) 우선
- 위젯 교체 → `AnimatedSwitcher` + `key` 필수
- 화면 전환 공유 요소 → `Hero` (동일 tag)
- 커스텀 애니메이션 → `AnimationController` + `dispose()` 필수
- duration: 200-300ms (UI), 300-500ms (페이지 전환)
- `vsync: this` + `TickerProviderStateMixin` (프레임 동기화)
- 복잡한 시퀀스는 `staggered_animations` 패키지 검토
