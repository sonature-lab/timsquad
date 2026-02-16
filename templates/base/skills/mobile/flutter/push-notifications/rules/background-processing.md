---
title: Background Processing
impact: HIGH
impactDescription: "백그라운드 미처리 → 데이터 미동기화, 사용자 재진입 시 stale 데이터"
tags: workmanager, background-fetch, isolate, periodic-task
---

## Background Processing

**Impact: HIGH (백그라운드 미처리 → 데이터 미동기화, 사용자 재진입 시 stale 데이터)**

workmanager 패키지 기반 백그라운드 태스크. 주기적 동기화, 데이터 프리페치, 오프라인 큐 처리.

### 의존성

```yaml
dependencies:
  workmanager: ^0.5.2
```

### 초기화

**Incorrect (콜백을 클래스 메서드로 등록):**
```dart
class BackgroundService {
  // 클래스 인스턴스 메서드 → top-level 아니므로 실패
  void callbackDispatcher() {
    Workmanager().executeTask((task, inputData) async {
      return true;
    });
  }
}
```

**Correct (top-level 함수로 콜백 등록):**
```dart
// background_tasks.dart — top-level 함수 필수
@pragma('vm:entry-point')
void callbackDispatcher() {
  Workmanager().executeTask((taskName, inputData) async {
    // 백그라운드 Isolate에서 실행
    // → 앱 상태, Provider, Navigator 접근 불가
    // → DB, SharedPreferences, HTTP 직접 사용

    switch (taskName) {
      case BackgroundTasks.syncMatches:
        return await _syncMatches();
      case BackgroundTasks.cleanCache:
        return await _cleanCache();
      case BackgroundTasks.uploadPendingData:
        return await _uploadPendingData(inputData);
      case Workmanager.iOSBackgroundTask:
        // iOS 백그라운드 fetch (시스템이 자동 호출)
        return await _syncMatches();
      default:
        return Future.value(true);
    }
  });
}

/// 태스크 이름 상수
abstract class BackgroundTasks {
  static const syncMatches = 'sync_matches';
  static const cleanCache = 'clean_cache';
  static const uploadPendingData = 'upload_pending_data';
}

// main.dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Workmanager 초기화
  await Workmanager().initialize(
    callbackDispatcher,
    isInDebugMode: kDebugMode, // 디버그 시 알림으로 태스크 실행 확인
  );

  runApp(const ProviderScope(child: MyApp()));
}
```

### 주기적 태스크 등록

```dart
class BackgroundTaskManager {
  /// 앱 시작 시 또는 로그인 후 등록
  Future<void> registerPeriodicTasks() async {
    // === 매치 데이터 동기화 (15분 간격) ===
    await Workmanager().registerPeriodicTask(
      'sync-matches-periodic',  // uniqueName (취소용)
      BackgroundTasks.syncMatches,
      frequency: const Duration(minutes: 15), // 최소 15분 (OS 제어)
      constraints: Constraints(
        networkType: NetworkType.connected, // 네트워크 필요
        requiresBatteryNotLow: true,        // 배터리 부족 시 스킵
      ),
      existingWorkPolicy: ExistingWorkPolicy.keep, // 기존 등록 유지
      backoffPolicy: BackoffPolicy.exponential,
      initialDelay: const Duration(minutes: 5),
    );

    // === 캐시 정리 (1일 간격) ===
    await Workmanager().registerPeriodicTask(
      'clean-cache-daily',
      BackgroundTasks.cleanCache,
      frequency: const Duration(hours: 24),
      constraints: Constraints(
        requiresCharging: true,    // 충전 중일 때만
        requiresDeviceIdle: true,  // 유휴 상태일 때만 (Android)
      ),
    );
  }

  /// 1회성 태스크 (즉시 또는 지연 실행)
  Future<void> scheduleOneOffTask({
    required String data,
  }) async {
    await Workmanager().registerOneOffTask(
      'upload-pending-${DateTime.now().millisecondsSinceEpoch}',
      BackgroundTasks.uploadPendingData,
      inputData: {'data': data}, // 태스크에 전달할 데이터
      constraints: Constraints(
        networkType: NetworkType.connected,
      ),
      initialDelay: const Duration(seconds: 10),
    );
  }

  /// 모든 태스크 취소 (로그아웃 시)
  Future<void> cancelAll() async {
    await Workmanager().cancelAll();
  }

  /// 특정 태스크 취소
  Future<void> cancelTask(String uniqueName) async {
    await Workmanager().cancelByUniqueName(uniqueName);
  }
}
```

### 백그라운드 태스크 구현

```dart
/// 매치 데이터 동기화 (백그라운드 Isolate에서 실행)
Future<bool> _syncMatches() async {
  try {
    // 직접 HTTP 호출 (Dio/http 패키지)
    // Provider/Repository 사용 불가 → 직접 구현
    final client = http.Client();
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token');

    if (token == null) return true; // 미로그인 → 스킵

    final response = await client.get(
      Uri.parse('https://api.example.com/matches/sync'),
      headers: {'Authorization': 'Bearer $token'},
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body) as List;
      // 로컬 DB에 저장 (SQLite/Hive 직접 접근)
      final db = await openDatabase('app.db');
      for (final match in data) {
        await db.insert(
          'matches',
          match as Map<String, dynamic>,
          conflictAlgorithm: ConflictAlgorithm.replace,
        );
      }
    }

    client.close();
    return true; // 성공
  } catch (e) {
    debugPrint('Background sync failed: $e');
    return false; // 실패 → OS가 재시도 스케줄
  }
}

/// 오프라인 데이터 업로드 (네트워크 복구 시)
Future<bool> _uploadPendingData(Map<String, dynamic>? inputData) async {
  try {
    final prefs = await SharedPreferences.getInstance();
    final pendingJson = prefs.getString('pending_uploads');
    if (pendingJson == null) return true;

    final pendingList = jsonDecode(pendingJson) as List;
    final client = http.Client();
    final token = prefs.getString('auth_token');

    for (final item in pendingList) {
      await client.post(
        Uri.parse('https://api.example.com/data'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode(item),
      );
    }

    // 업로드 완료 → 대기열 비우기
    await prefs.remove('pending_uploads');
    client.close();
    return true;
  } catch (e) {
    return false;
  }
}

/// 캐시 정리
Future<bool> _cleanCache() async {
  try {
    final cacheDir = await getTemporaryDirectory();
    final now = DateTime.now();

    await for (final entity in cacheDir.list()) {
      if (entity is File) {
        final stat = await entity.stat();
        // 7일 이상 된 캐시 파일 삭제
        if (now.difference(stat.modified).inDays > 7) {
          await entity.delete();
        }
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}
```

### iOS 백그라운드 설정

```dart
// iOS는 BGTaskScheduler 기반
// Info.plist에 등록 필요:
// <key>BGTaskSchedulerPermittedIdentifiers</key>
// <array>
//   <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
// </array>
//
// Runner/AppDelegate.swift에서 추가 설정 불필요 (workmanager가 자동 처리)
//
// iOS 제약사항:
// - 주기적 태스크 최소 간격: OS가 결정 (15분보다 길 수 있음)
// - 실행 시점: OS 최적화에 따라 지연 가능
// - 배터리/네트워크 상태에 따라 스킵 가능
// - Background App Refresh가 꺼져 있으면 미실행
```

### Isolate 직접 사용 (무거운 연산)

```dart
/// 이미지 처리, 대량 데이터 파싱 등 CPU 집약적 태스크
Future<List<MatchSummary>> processMatchDataInBackground(
    String rawJson) async {
  // compute() → 별도 Isolate에서 실행 (UI 스레드 블로킹 방지)
  return await compute(_parseMatchData, rawJson);
}

// top-level 또는 static 함수만 가능
List<MatchSummary> _parseMatchData(String rawJson) {
  final data = jsonDecode(rawJson) as List;
  return data.map((e) => MatchSummary.fromJson(e)).toList();
}

/// 장기 실행 Isolate (양방향 통신)
Future<void> startLongRunningIsolate() async {
  final receivePort = ReceivePort();
  await Isolate.spawn(_isolateEntryPoint, receivePort.sendPort);

  receivePort.listen((message) {
    if (message is SendPort) {
      // 메인 → Isolate 통신용 SendPort
      message.send({'action': 'process', 'data': '...'});
    } else {
      // Isolate → 메인 결과 수신
      debugPrint('Isolate result: $message');
    }
  });
}

void _isolateEntryPoint(SendPort mainSendPort) {
  final receivePort = ReceivePort();
  mainSendPort.send(receivePort.sendPort);

  receivePort.listen((message) {
    // 메인에서 받은 데이터 처리
    final result = _heavyComputation(message);
    mainSendPort.send(result);
  });
}
```

### 규칙

- `callbackDispatcher` → top-level 함수, `@pragma('vm:entry-point')` 필수
- 백그라운드 태스크 → Provider/Navigator/BuildContext 접근 불가
- HTTP/DB → 직접 인스턴스 생성 (앱 상태와 독립)
- 주기적 태스크 최소 간격 → 15분 (OS가 실제 실행 시점 결정)
- `constraints` → 네트워크/배터리/충전 조건 설정 (배터리 소모 방지)
- `existingWorkPolicy.keep` → 중복 등록 방지 (앱 재시작 시)
- 태스크 반환값 → `true` (성공), `false` (실패 → OS 재시도)
- 로그아웃 시 → `cancelAll()` 로 모든 백그라운드 태스크 해제
- CPU 집약적 작업 → `compute()` 또는 `Isolate.spawn` (UI 스레드 보호)
- iOS → Background App Refresh 설정에 의존, 실행 보장 없음
