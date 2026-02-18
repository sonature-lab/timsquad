---
title: Connectivity & Offline Queue
impact: HIGH
impactDescription: "오프라인 미처리 → 요청 유실, 무한 로딩, 사용자 혼란"
tags: connectivity, offline, queue, retry, connectivity-plus
---

## Connectivity & Offline Queue

**Impact: HIGH (오프라인 미처리 → 요청 유실, 무한 로딩, 사용자 혼란)**

connectivity_plus로 네트워크 상태 실시간 감지.
오프라인 시 요청 큐잉, 연결 복구 시 자동 재시도.

### 의존성

```yaml
# pubspec.yaml
dependencies:
  connectivity_plus: ^6.1.0
  flutter_riverpod: ^2.6.0
```

### ConnectivityNotifier

**Incorrect (단발 체크만):**
```dart
Future<bool> isOnline() async {
  final result = await Connectivity().checkConnectivity();
  return result != ConnectivityResult.none;
  // → 상태 변화 미감지, UI 갱신 없음
}
```

**Correct (Riverpod + 실시간 스트림):**
```dart
/// 연결 상태 열거형
enum NetworkStatus { online, offline }

/// 연결 상태 Provider — 앱 전역 스트림
final connectivityProvider =
    StreamNotifierProvider<ConnectivityNotifier, NetworkStatus>(
  ConnectivityNotifier.new,
);

class ConnectivityNotifier extends StreamNotifier<NetworkStatus> {
  @override
  Stream<NetworkStatus> build() {
    return Connectivity().onConnectivityChanged.map((results) {
      final hasConnection = results.any((r) => r != ConnectivityResult.none);
      return hasConnection ? NetworkStatus.online : NetworkStatus.offline;
    });
  }
}

/// 현재 온라인 여부 (동기 체크용)
final isOnlineProvider = Provider<bool>((ref) {
  final status = ref.watch(connectivityProvider).valueOrNull;
  return status == NetworkStatus.online;
});
```

### 오프라인 배너 UI

```dart
/// 오프라인 상태 배너 — 앱 최상단에 배치
class OfflineBanner extends ConsumerWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isOnline = ref.watch(isOnlineProvider);

    if (isOnline) return const SizedBox.shrink();

    return MaterialBanner(
      content: const Text('인터넷 연결이 끊어졌습니다'),
      leading: const Icon(Icons.wifi_off, color: Colors.white),
      backgroundColor: Colors.red.shade700,
      actions: [
        TextButton(
          onPressed: () async {
            // 수동 재시도
            final result = await Connectivity().checkConnectivity();
            if (result.any((r) => r != ConnectivityResult.none)) {
              ref.invalidate(connectivityProvider);
            }
          },
          child: const Text('재시도', style: TextStyle(color: Colors.white)),
        ),
      ],
    );
  }
}
```

### 오프라인 요청 큐

```dart
/// 오프라인 시 보류된 요청
class PendingRequest {
  final String id;
  final RequestOptions options;
  final DateTime createdAt;
  final int retryCount;

  const PendingRequest({
    required this.id,
    required this.options,
    required this.createdAt,
    this.retryCount = 0,
  });

  bool get isExpired =>
      DateTime.now().difference(createdAt) > const Duration(hours: 1);
}

/// 오프라인 큐 매니저
class OfflineQueueManager {
  final Dio _dio;
  final List<PendingRequest> _queue = [];
  bool _isProcessing = false;

  OfflineQueueManager({required Dio dio}) : _dio = dio;

  /// 오프라인 시 큐에 추가
  void enqueue(RequestOptions options) {
    _queue.add(PendingRequest(
      id: const Uuid().v4(),
      options: options,
      createdAt: DateTime.now(),
    ));
  }

  /// 연결 복구 시 큐 처리
  Future<void> processQueue() async {
    if (_isProcessing || _queue.isEmpty) return;
    _isProcessing = true;

    try {
      // 만료된 요청 제거
      _queue.removeWhere((r) => r.isExpired);

      final pending = List<PendingRequest>.from(_queue);
      for (final request in pending) {
        try {
          await _dio.fetch(request.options);
          _queue.remove(request);
        } on DioException {
          // 실패 → 큐에 유지, 다음 복구 시 재시도
          break; // 첫 실패 시 중단 (아직 불안정할 수 있음)
        }
      }
    } finally {
      _isProcessing = false;
    }
  }

  int get pendingCount => _queue.length;
  bool get hasPending => _queue.isNotEmpty;
}

/// Provider
final offlineQueueProvider = Provider<OfflineQueueManager>((ref) {
  final queue = OfflineQueueManager(dio: ref.watch(dioProvider));

  // 온라인 복구 시 자동 처리
  ref.listen(connectivityProvider, (prev, next) {
    if (next.valueOrNull == NetworkStatus.online) {
      queue.processQueue();
    }
  });

  return queue;
});
```

### Connectivity Interceptor

```dart
/// Dio 인터셉터로 오프라인 감지 (선택적)
class ConnectivityInterceptor extends Interceptor {
  final OfflineQueueManager _queueManager;
  final Ref _ref;

  ConnectivityInterceptor({
    required OfflineQueueManager queueManager,
    required Ref ref,
  })  : _queueManager = queueManager,
        _ref = ref;

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.type == DioExceptionType.connectionError) {
      // POST/PUT 요청을 큐에 추가 (GET은 캐시 fallback)
      if (err.requestOptions.method != 'GET') {
        _queueManager.enqueue(err.requestOptions);
      }
    }
    handler.next(err);
  }
}
```

### 규칙

- `connectivity_plus` 스트림으로 실시간 감지 — 단발 체크 금지
- 오프라인 배너를 앱 최상단에 항상 표시
- 오프라인 큐: POST/PUT/DELETE 요청만 큐잉 (GET은 캐시 fallback)
- 만료된 큐 요청 자동 제거 (1시간 기본)
- 연결 복구 시 큐 자동 처리 — `ref.listen(connectivityProvider)` 활용
- 큐 처리 중 실패 시 중단 (네트워크 아직 불안정할 수 있음)
- Wi-Fi 연결 ≠ 인터넷 접속 — 실제 HTTP 핑으로 검증 고려
