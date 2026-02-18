---
title: HTTP Caching Strategy
impact: MEDIUM
impactDescription: "캐시 미사용 → 불필요한 네트워크 호출, 느린 로딩, 데이터 요금 낭비"
tags: cache, dio-cache-interceptor, etag, offline, performance
---

## HTTP Caching Strategy

**Impact: MEDIUM (캐시 미사용 → 불필요한 네트워크 호출, 느린 로딩, 데이터 요금 낭비)**

dio_cache_interceptor로 HTTP 응답 캐시.
ETag/Last-Modified 검증, 오프라인 fallback, 정책별 캐시 전략.

### 의존성

```yaml
# pubspec.yaml
dependencies:
  dio: ^5.7.0
  dio_cache_interceptor: ^3.5.0
  dio_cache_interceptor_hive_store: ^3.2.0  # 영구 저장소
```

### 캐시 인터셉터 설정

**Incorrect (캐시 없이 매번 네트워크 호출):**
```dart
final dio = Dio();
// → 동일 데이터 반복 요청, 배터리 + 데이터 낭비
// → 오프라인 시 데이터 표시 불가
```

**Correct (dio_cache_interceptor 통합):**
```dart
/// 캐시 저장소 초기화
Future<CacheStore> initCacheStore() async {
  final dir = await getApplicationDocumentsDirectory();
  return HiveCacheStore(
    '${dir.path}/http_cache',
    hiveBoxName: 'dio_cache',
  );
}

/// 캐시 옵션 팩토리
class CacheConfig {
  /// 기본 캐시 정책 — 네트워크 우선, 실패 시 캐시
  static CacheOptions defaultPolicy(CacheStore store) {
    return CacheOptions(
      store: store,
      policy: CachePolicy.request, // 네트워크 요청 + 캐시 갱신
      maxStale: const Duration(days: 7), // 오프라인 시 7일간 캐시 유효
      hitCacheOnErrorExcept: [401, 403], // 에러 시 캐시 반환 (인증 에러 제외)
    );
  }

  /// 강제 캐시 — 네트워크 미사용 (빠른 로딩)
  static CacheOptions forceCache(CacheStore store) {
    return CacheOptions(
      store: store,
      policy: CachePolicy.forceCache,
    );
  }

  /// 캐시 무시 — 항상 최신 데이터
  static CacheOptions noCache(CacheStore store) {
    return CacheOptions(
      store: store,
      policy: CachePolicy.noCache,
    );
  }

  /// stale-while-revalidate — 캐시 먼저 반환, 백그라운드 갱신
  static CacheOptions refreshIfStale(CacheStore store) {
    return CacheOptions(
      store: store,
      policy: CachePolicy.refreshForceCache,
      maxStale: const Duration(hours: 1),
    );
  }
}

/// Dio에 캐시 인터셉터 추가
final cacheStoreProvider = FutureProvider<CacheStore>((ref) async {
  return await initCacheStore();
});

final cacheDioProvider = Provider<Dio>((ref) {
  final dio = ref.watch(dioProvider);
  final cacheStore = ref.watch(cacheStoreProvider).valueOrNull;

  if (cacheStore != null) {
    final cacheOptions = CacheConfig.defaultPolicy(cacheStore);
    dio.interceptors.add(
      DioCacheInterceptor(options: cacheOptions),
    );
  }

  return dio;
});
```

### 요청별 캐시 정책 오버라이드

```dart
/// API에서 요청별 캐시 정책 지정
class ProductRepository {
  final Dio _dio;
  final CacheStore _cacheStore;

  ProductRepository({required Dio dio, required CacheStore cacheStore})
      : _dio = dio,
        _cacheStore = cacheStore;

  /// 상품 목록 — 기본 캐시 (네트워크 + 캐시 갱신)
  Future<Result<List<Product>>> getProducts() async {
    try {
      final response = await _dio.get('/products');
      return Success(_parseProducts(response.data));
    } on DioException catch (e) {
      return Failure(NetworkFailure.fromDioException(e));
    }
  }

  /// 상품 상세 — 캐시 우선 (자주 변경되지 않음)
  Future<Result<Product>> getProduct(String id) async {
    try {
      final response = await _dio.get(
        '/products/$id',
        options: CacheConfig.refreshIfStale(_cacheStore).toOptions(),
      );
      return Success(Product.fromJson(response.data));
    } on DioException catch (e) {
      return Failure(NetworkFailure.fromDioException(e));
    }
  }

  /// 결제 정보 — 캐시 금지 (항상 최신)
  Future<Result<PaymentInfo>> getPaymentInfo() async {
    try {
      final response = await _dio.get(
        '/payment/info',
        options: CacheConfig.noCache(_cacheStore).toOptions(),
      );
      return Success(PaymentInfo.fromJson(response.data));
    } on DioException catch (e) {
      return Failure(NetworkFailure.fromDioException(e));
    }
  }
}
```

### ETag / Last-Modified 활용

```dart
// dio_cache_interceptor가 자동 처리하는 HTTP 헤더:
//
// 서버 응답:
//   ETag: "abc123"
//   Last-Modified: Wed, 15 Jan 2026 10:00:00 GMT
//   Cache-Control: max-age=3600
//
// 클라이언트 재요청 (자동):
//   If-None-Match: "abc123"
//   If-Modified-Since: Wed, 15 Jan 2026 10:00:00 GMT
//
// 서버 응답:
//   304 Not Modified → 캐시된 데이터 사용 (전송 비용 없음)
//   200 OK → 새 데이터로 캐시 갱신

// 서버가 ETag/Last-Modified를 지원하면 자동으로 최적화됨
// 별도 클라이언트 코드 필요 없음
```

### 캐시 관리

```dart
/// 캐시 클리어 (로그아웃 시, 디버깅 시)
class CacheManager {
  final CacheStore _store;

  CacheManager({required CacheStore store}) : _store = store;

  /// 전체 캐시 클리어
  Future<void> clearAll() async {
    await _store.clean();
  }

  /// 특정 URL 캐시 삭제
  Future<void> invalidate(String url) async {
    await _store.delete(CacheOptions.defaultCacheKeyBuilder(
      RequestOptions(path: url),
    ));
  }
}

final cacheManagerProvider = Provider<CacheManager>((ref) {
  final store = ref.watch(cacheStoreProvider).valueOrNull;
  if (store == null) throw StateError('Cache store not initialized');
  return CacheManager(store: store);
});
```

### 규칙

- GET 요청에만 캐시 적용 — POST/PUT/DELETE는 캐시 금지
- 기본 정책: 네트워크 우선 + 실패 시 캐시 fallback (`hitCacheOnErrorExcept`)
- 결제/인증 관련 API는 `CachePolicy.noCache` 강제
- `maxStale: 7일` — 오프라인 시 캐시 유효 기간
- 인증 에러(401, 403)는 캐시 반환 제외 — 만료 토큰으로 캐시된 데이터 방지
- 로그아웃 시 전체 캐시 클리어 — 사용자 데이터 잔류 방지
- HiveCacheStore 사용 — 앱 재시작 후에도 캐시 유지 (메모리 캐시보다 안정)
