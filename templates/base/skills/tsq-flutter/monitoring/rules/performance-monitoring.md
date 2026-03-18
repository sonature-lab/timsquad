---
title: Performance Monitoring & Custom Traces
impact: HIGH
impactDescription: "성능 미측정 → 느린 화면 방치, ANR/프리징 원인 파악 불가"
tags: firebase-performance, trace, http-metric, frame, startup
---

## Performance Monitoring & Custom Traces

**Impact: HIGH (성능 미측정 → 느린 화면 방치, ANR/프리징 원인 파악 불가)**

Firebase Performance Monitoring 초기화, custom trace, HTTP metric 수집,
프레임 렌더링 모니터링, 앱 시작 시간 추적.

### 의존성

```yaml
# pubspec.yaml
dependencies:
  firebase_core: ^3.8.0
  firebase_performance: ^0.10.0
  firebase_performance_dio: ^0.6.0  # dio 사용 시
```

### 초기화

```dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();

  // Performance Monitoring은 별도 초기화 불필요 (Firebase init 시 자동 활성화)
  // 디버그 모드에서 비활성화 (선택)
  if (kDebugMode) {
    await FirebasePerformance.instance
        .setPerformanceCollectionEnabled(false);
  }

  runApp(const ProviderScope(child: MyApp()));
}
```

### Custom Trace

**Incorrect (시작/종료 미매칭):**
```dart
final trace = FirebasePerformance.instance.newTrace('load_data');
await trace.start();
await fetchData();
// trace.stop() 누락 → 데이터 미전송, 메모리 누수
```

**Correct (안전한 trace 래핑):**
```dart
class PerformanceService {
  final FirebasePerformance _performance = FirebasePerformance.instance;

  /// 안전한 trace 실행 (자동 start/stop)
  Future<T> trace<T>(
    String name,
    Future<T> Function() operation, {
    Map<String, String>? attributes,
    Map<String, int>? metrics,
  }) async {
    final trace = _performance.newTrace(name);

    // 속성 설정 (최대 5개)
    attributes?.forEach((key, value) {
      trace.putAttribute(key, value);
    });

    await trace.start();
    try {
      final result = await operation();

      // 메트릭 설정 (최대 32개)
      metrics?.forEach((key, value) {
        trace.setMetric(key, value);
      });

      return result;
    } catch (e) {
      trace.putAttribute('error', e.runtimeType.toString());
      rethrow;
    } finally {
      await trace.stop(); // 항상 stop 보장
    }
  }
}

// 사용 예시
final perfService = ref.read(performanceServiceProvider);
final matches = await perfService.trace(
  'fetch_matches',
  () => matchRepository.getMatches(page: 1),
  attributes: {'sport': 'tennis', 'region': 'sg'},
  metrics: {'page': 1},
);
```

### 핵심 플로우 trace 예시

```dart
/// 앱 시작 시간 추적
class AppStartupTrace {
  static Trace? _trace;

  static Future<void> start() async {
    _trace = FirebasePerformance.instance.newTrace('app_startup');
    await _trace?.start();
  }

  static Future<void> markMilestone(String name) async {
    _trace?.putAttribute(name, DateTime.now().toIso8601String());
  }

  static Future<void> stop() async {
    await _trace?.stop();
    _trace = null;
  }
}

// main.dart
Future<void> main() async {
  await AppStartupTrace.start();
  WidgetsFlutterBinding.ensureInitialized();
  await AppStartupTrace.markMilestone('binding_initialized');

  await Firebase.initializeApp();
  await AppStartupTrace.markMilestone('firebase_initialized');

  runApp(const ProviderScope(child: MyApp()));
}

// 첫 화면 렌더링 완료 시
class HomeScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      AppStartupTrace.stop(); // 첫 프레임 렌더링 완료
    });
  }
}
```

### HTTP Metric (Dio Interceptor)

```dart
/// Dio에 Performance interceptor 추가
final dio = Dio()
  ..interceptors.add(
    DioFirebasePerformanceInterceptor(), // firebase_performance_dio
  );

/// 또는 수동 HTTP metric
class PerformanceInterceptor extends Interceptor {
  final Map<String, HttpMetric> _metrics = {};

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final metric = FirebasePerformance.instance.newHttpMetric(
      options.uri.toString(),
      _toHttpMethod(options.method),
    );
    metric.start();
    _metrics[options.hashCode.toString()] = metric;
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    final metric = _metrics.remove(response.requestOptions.hashCode.toString());
    if (metric != null) {
      metric
        ..responseContentType = response.headers.value('content-type')
        ..httpResponseCode = response.statusCode
        ..responsePayloadSize = response.data.toString().length;
      metric.stop();
    }
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final metric = _metrics.remove(err.requestOptions.hashCode.toString());
    if (metric != null) {
      metric.httpResponseCode = err.response?.statusCode;
      metric.putAttribute('error', err.type.name);
      metric.stop();
    }
    handler.next(err);
  }

  HttpMethod _toHttpMethod(String method) {
    return switch (method.toUpperCase()) {
      'GET' => HttpMethod.Get,
      'POST' => HttpMethod.Post,
      'PUT' => HttpMethod.Put,
      'DELETE' => HttpMethod.Delete,
      'PATCH' => HttpMethod.Patch,
      _ => HttpMethod.Get,
    };
  }
}
```

### 프레임 렌더링 모니터링

```dart
/// 느린 프레임 감지 (개발/QA용)
class FrameMonitor {
  static void start() {
    if (!kDebugMode) return;

    WidgetsBinding.instance.addTimingsCallback((timings) {
      for (final timing in timings) {
        // 60fps 기준: 16.67ms 이상이면 느린 프레임
        final buildDuration = timing.buildDuration.inMilliseconds;
        final rasterDuration = timing.rasterDuration.inMilliseconds;
        final totalDuration = timing.totalSpan.inMilliseconds;

        if (totalDuration > 16) {
          debugPrint(
            'Slow frame: total=${totalDuration}ms '
            'build=${buildDuration}ms raster=${rasterDuration}ms',
          );
        }
      }
    });
  }
}
```

### 규칙

- Custom trace → `start()`/`stop()` 반드시 매칭 (try-finally 패턴)
- Trace 이름 → 소문자 + 언더스코어, 100자 이하
- Trace 속성 → 최대 5개 (key 32자, value 100자)
- Trace 메트릭 → 최대 32개 (정수값)
- HTTP metric → dio interceptor 또는 수동 래핑으로 API 응답 시간 수집
- 앱 시작 trace → main() 시작 ~ 첫 프레임 렌더링 완료
- 핵심 플로우 (로그인, 검색, 매치 생성) → custom trace 적용
- 디버그 모드 → `setPerformanceCollectionEnabled(false)` (선택)
- 프레임 모니터링 → 16ms (60fps) / 8ms (120fps) 초과 시 경고
