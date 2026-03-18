---
title: Structured Logging & Sensitive Data Masking
impact: MEDIUM
impactDescription: "로그 미관리 → 프로덕션 디버깅 불가, 민감 데이터 유출 위험"
tags: logger, structured-logging, masking, remote-logging, log-level
---

## Structured Logging & Sensitive Data Masking

**Impact: MEDIUM (로그 미관리 → 프로덕션 디버깅 불가, 민감 데이터 유출 위험)**

logger 패키지를 활용한 레벨별 로깅, JSON 구조화된 로그 출력,
릴리스 빌드 레벨 필터, 원격 로깅 연동, 민감 데이터 마스킹.

### 의존성

```yaml
# pubspec.yaml
dependencies:
  logger: ^2.5.0
```

### 기본 설정

**Incorrect (print/debugPrint 직접 사용):**
```dart
print('User logged in: ${user.email}');
debugPrint('API response: ${response.data}');
// → 레벨 구분 없음, 릴리스에서 제거 불가, PII 노출
```

**Correct (구조화된 로거):**
```dart
class AppLogger {
  static final AppLogger instance = AppLogger._();
  AppLogger._();

  late final Logger _logger;
  final List<LogOutput> _outputs = [];

  void initialize({bool isRelease = false}) {
    _logger = Logger(
      filter: isRelease ? ProductionFilter() : DevelopFilter(),
      printer: isRelease
          ? JsonPrinter()        // 프로덕션: JSON 구조화
          : PrettyPrinter(       // 개발: 색상 + 포맷팅
              methodCount: 2,
              errorMethodCount: 8,
              lineLength: 120,
              colors: true,
              printEmojis: false,
              dateTimeFormat: DateTimeFormat.onlyTimeAndSinceStart,
            ),
      output: MultiOutput(_outputs),
    );
  }

  void addOutput(LogOutput output) => _outputs.add(output);

  void verbose(String message, [dynamic error, StackTrace? stack]) =>
      _logger.t(message, error: error, stackTrace: stack);

  void debug(String message, [dynamic error, StackTrace? stack]) =>
      _logger.d(message, error: error, stackTrace: stack);

  void info(String message, [dynamic error, StackTrace? stack]) =>
      _logger.i(message, error: error, stackTrace: stack);

  void warning(String message, [dynamic error, StackTrace? stack]) =>
      _logger.w(message, error: error, stackTrace: stack);

  void error(String message, [dynamic error, StackTrace? stack]) =>
      _logger.e(message, error: error, stackTrace: stack);

  void fatal(String message, [dynamic error, StackTrace? stack]) =>
      _logger.f(message, error: error, stackTrace: stack);
}

// 사용
final log = AppLogger.instance;
log.info('User logged in', null, null);
log.error('API call failed', exception, stackTrace);
```

### 릴리스 빌드 필터

```dart
/// 프로덕션: warning 이상만 출력
class ProductionFilter extends LogFilter {
  @override
  bool shouldLog(LogEvent event) {
    return event.level.index >= Level.warning.index;
  }
}

/// 개발: 모든 레벨 출력
class DevelopFilter extends LogFilter {
  @override
  bool shouldLog(LogEvent event) {
    return true;
  }
}
```

### JSON 구조화 프린터

```dart
/// 프로덕션용 JSON 출력 (원격 로깅 시스템과 호환)
class JsonPrinter extends LogPrinter {
  @override
  List<String> log(LogEvent event) {
    final output = {
      'timestamp': DateTime.now().toUtc().toIso8601String(),
      'level': event.level.name,
      'message': event.message,
    };

    if (event.error != null) {
      output['error'] = event.error.toString();
    }
    if (event.stackTrace != null) {
      output['stackTrace'] = event.stackTrace.toString();
    }

    return [jsonEncode(output)];
  }
}
```

### 원격 로깅

```dart
/// Sentry breadcrumb로 원격 로깅
class SentryLogOutput extends LogOutput {
  @override
  void output(OutputEvent event) {
    // warning 이상만 Sentry breadcrumb으로 전송
    if (event.level.index < Level.warning.index) return;

    final level = switch (event.level) {
      Level.warning => SentryLevel.warning,
      Level.error => SentryLevel.error,
      Level.fatal => SentryLevel.fatal,
      _ => SentryLevel.info,
    };

    Sentry.addBreadcrumb(Breadcrumb(
      message: event.lines.join('\n'),
      level: level,
      category: 'app.log',
      timestamp: DateTime.now().toUtc(),
    ));
  }
}

/// Crashlytics 커스텀 로그
class CrashlyticsLogOutput extends LogOutput {
  @override
  void output(OutputEvent event) {
    if (event.level.index < Level.info.index) return;

    // Crashlytics log → 크래시 발생 시 컨텍스트로 포함 (최대 64KB)
    FirebaseCrashlytics.instance.log(
      event.lines.join('\n'),
    );
  }
}

// 초기화 시 출력 추가
void initializeLogging() {
  final log = AppLogger.instance;
  log.initialize(isRelease: kReleaseMode);

  if (kReleaseMode) {
    log.addOutput(SentryLogOutput());
    log.addOutput(CrashlyticsLogOutput());
  }
}
```

### 민감 데이터 마스킹

```dart
/// 민감 데이터 마스킹 유틸리티
class LogSanitizer {
  static final _patterns = <RegExp, String>{
    // 이메일
    RegExp(r'[\w.+-]+@[\w-]+\.[\w.]+'):
        '***@***.***',
    // 전화번호
    RegExp(r'\+?\d{10,15}'):
        '***-****-****',
    // 토큰/키 (Bearer, API key 등)
    RegExp(r'(Bearer\s+|token[=:]\s*|api[_-]?key[=:]\s*)[A-Za-z0-9\-._~+/]+=*',
           caseSensitive: false):
        r'$1[REDACTED]',
    // 카드 번호 (16자리)
    RegExp(r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b'):
        '****-****-****-****',
  };

  /// 문자열 내 민감 데이터 마스킹
  static String sanitize(String input) {
    var result = input;
    for (final entry in _patterns.entries) {
      result = result.replaceAll(entry.key, entry.value);
    }
    return result;
  }

  /// Map 내 민감 키 마스킹
  static Map<String, dynamic> sanitizeMap(Map<String, dynamic> data) {
    const sensitiveKeys = {
      'password', 'token', 'secret', 'api_key', 'apiKey',
      'authorization', 'credit_card', 'ssn', 'email', 'phone',
    };

    return data.map((key, value) {
      if (sensitiveKeys.contains(key.toLowerCase())) {
        return MapEntry(key, '[REDACTED]');
      }
      if (value is String) {
        return MapEntry(key, sanitize(value));
      }
      if (value is Map<String, dynamic>) {
        return MapEntry(key, sanitizeMap(value));
      }
      return MapEntry(key, value);
    });
  }
}

// HTTP 로깅에 마스킹 적용
class SanitizedLogInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final sanitizedHeaders = LogSanitizer.sanitizeMap(
      options.headers.cast<String, dynamic>(),
    );
    AppLogger.instance.debug(
      'HTTP ${options.method} ${options.uri}\n'
      'Headers: $sanitizedHeaders',
    );
    handler.next(options);
  }
}
```

### 규칙

- `print`/`debugPrint` 직접 사용 금지 → `AppLogger` 래퍼 사용
- 릴리스 빌드 → verbose/debug 레벨 비활성화 (ProductionFilter)
- 프로덕션 → JSON 구조화 출력 (원격 로깅 시스템 호환)
- 원격 로깅 → Sentry breadcrumb + Crashlytics log 연동
- warning 이상 → 원격 전송, info → Crashlytics 컨텍스트만
- 민감 데이터 → `LogSanitizer`로 마스킹 (토큰, PII, 카드번호)
- HTTP 로깅 → 헤더/바디 마스킹 후 출력
- 로그 레벨 가이드: verbose(개발 추적), debug(디버깅), info(흐름), warning(주의), error(복구 가능), fatal(복구 불가)
