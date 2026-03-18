---
title: Performance Optimization
impact: HIGH
tags: performance, rebuild, lazy-loading, impeller
---

## Performance Optimization

Flutter 렌더링 파이프라인 최적화. 불필요한 리빌드 차단, lazy 로딩, 메모리 관리.

### const 위젯으로 리빌드 차단

**Incorrect:**
```dart
@override
Widget build(BuildContext context) {
  return Column(
    children: [
      // 매 빌드마다 재생성 (부모 상태 변경 시)
      Header(),
      Divider(),
      Text('Fixed label'),
      // 실제로 변경되는 부분
      Text(counter.toString()),
    ],
  );
}
```

**Correct:**
```dart
@override
Widget build(BuildContext context) {
  return Column(
    children: [
      const Header(),             // 리빌드 스킵
      const Divider(),            // 리빌드 스킵
      const Text('Fixed label'),  // 리빌드 스킵
      Text(counter.toString()),   // 이것만 리빌드
    ],
  );
}
```

### 리스트 최적화

**Incorrect:**
```dart
// 모든 아이템을 한번에 빌드 → 메모리 + 프레임 드롭
ListView(
  children: matches.map((m) => MatchCard(match: m)).toList(),
);
```

**Correct:**
```dart
// lazy 빌드 → 화면에 보이는 것만 생성
ListView.builder(
  itemCount: matches.length,
  itemBuilder: (context, index) => MatchCard(
    key: ValueKey(matches[index].id),
    match: matches[index],
  ),
);

// 무한 스크롤
ListView.builder(
  itemCount: matches.length + (hasMore ? 1 : 0),
  itemBuilder: (context, index) {
    if (index == matches.length) {
      ref.read(matchListProvider.notifier).loadMore();
      return const LoadingTile();
    }
    return MatchCard(match: matches[index]);
  },
);
```

### RepaintBoundary

```dart
// 자주 업데이트되는 영역 격리
RepaintBoundary(
  child: LiveScoreBoard(matchId: matchId), // 1초마다 갱신
),
// ScoreBoard 리페인트가 부모 트리에 전파되지 않음
```

### 이미지 최적화

```dart
// cached_network_image + 적절한 크기
CachedNetworkImage(
  imageUrl: user.avatarUrl,
  width: 48,
  height: 48,
  memCacheWidth: 96,   // 2x for retina
  memCacheHeight: 96,
  placeholder: (_, __) => const CircleAvatar(child: Icon(Icons.person)),
  errorWidget: (_, __, ___) => const CircleAvatar(child: Icon(Icons.error)),
);
```

### 규칙

- `const` 가능한 위젯은 반드시 `const` (lint 강제)
- 10개 이상 아이템 → `ListView.builder` / `SliverList` (lazy)
- `RepaintBoundary` → 자주 갱신되는 서브트리에 적용
- 이미지: `memCacheWidth/Height` 설정 (원본 크기 로딩 방지)
- `setState` 범위 최소화 — 변경되는 위젯만 리빌드
- build() 안에서 `Future`/무거운 연산 금지 → Provider/Notifier에서 처리
- DevTools Performance 뷰로 jank 프레임 확인
