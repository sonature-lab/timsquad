---
title: Data Protection
impact: MEDIUM
impactDescription: "미적용 → 로컬 DB 평문 노출, 스크린샷 유출, 클립보드 탈취"
tags: encryption, sqlcipher, screenshot, clipboard, flag-secure, screen-blur
---

## Data Protection

**Impact: MEDIUM (미적용 → 로컬 DB 평문 노출, 스크린샷 유출, 클립보드 탈취)**

로컬 데이터 암호화, 클립보드 보호, 스크린샷 방지, 백그라운드 스크린 블러.
저장 데이터와 화면 노출 보호.

### 의존성

```yaml
# pubspec.yaml
dependencies:
  encrypt: ^5.0.3           # AES/RSA 암호화
  sqflite_sqlcipher: ^3.1.0  # SQLCipher (암호화된 SQLite)
  # 또는 sqflite + 수동 암호화
```

### 로컬 DB 암호화 (SQLCipher)

**Incorrect (평문 SQLite):**
```dart
// 기본 sqflite → 평문 저장
// 루팅 기기에서 DB 파일 복사 → SQLite 브라우저로 열람
final db = await openDatabase('app.db');
await db.insert('users', {'name': '홍길동', 'phone': '010-1234-5678'});
// → /data/data/com.app/databases/app.db 평문
```

**Correct (SQLCipher 암호화):**
```dart
import 'package:sqflite_sqlcipher/sqflite.dart';

class EncryptedDatabase {
  static Database? _db;

  /// 암호화된 DB 열기
  static Future<Database> getInstance() async {
    if (_db != null) return _db!;

    // DB 암호화 키 — flutter_secure_storage에서 가져오기
    final storage = const FlutterSecureStorage();
    var dbKey = await storage.read(key: 'db_encryption_key');

    if (dbKey == null) {
      // 최초 실행: 랜덤 키 생성 후 안전 저장
      dbKey = _generateRandomKey();
      await storage.write(key: 'db_encryption_key', value: dbKey);
    }

    _db = await openDatabase(
      'app_encrypted.db',
      password: dbKey, // SQLCipher 암호화 키
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        ''');
      },
    );

    return _db!;
  }

  static String _generateRandomKey() {
    final random = Random.secure();
    final bytes = List<int>.generate(32, (_) => random.nextInt(256));
    return base64Encode(bytes);
  }
}
```

### 필드 레벨 암호화 (encrypt 패키지)

```dart
import 'package:encrypt/encrypt.dart' as encrypt;

class FieldEncryption {
  late final encrypt.Encrypter _encrypter;
  late final encrypt.IV _iv;

  FieldEncryption({required String key}) {
    // AES-256 키 (32바이트)
    final aesKey = encrypt.Key.fromUtf8(key.padRight(32).substring(0, 32));
    _iv = encrypt.IV.fromLength(16);
    _encrypter = encrypt.Encrypter(encrypt.AES(aesKey));
  }

  /// 민감 필드 암호화
  String encryptField(String plaintext) {
    return _encrypter.encrypt(plaintext, iv: _iv).base64;
  }

  /// 복호화
  String decryptField(String encrypted) {
    return _encrypter.decrypt64(encrypted, iv: _iv);
  }
}

// 사용 예시
final encryption = FieldEncryption(key: await getEncryptionKey());
final encryptedPhone = encryption.encryptField('010-1234-5678');
// DB에 암호화된 값 저장
await db.insert('users', {'phone': encryptedPhone});
```

### 스크린샷 방지

```dart
/// Android: FLAG_SECURE 설정
/// iOS: 화면 캡처 감지 + 오버레이
class ScreenshotProtection {

  /// Android: FLAG_SECURE (스크린샷 + 화면 녹화 차단)
  static Future<void> enableAndroid() async {
    if (Platform.isAndroid) {
      // MethodChannel로 네이티브 호출
      const channel = MethodChannel('com.app/security');
      await channel.invokeMethod('enableSecureFlag');
    }
  }

  static Future<void> disableAndroid() async {
    if (Platform.isAndroid) {
      const channel = MethodChannel('com.app/security');
      await channel.invokeMethod('disableSecureFlag');
    }
  }
}

// Android 네이티브 (MainActivity.kt)
// class MainActivity: FlutterActivity() {
//   override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
//     super.configureFlutterEngine(flutterEngine)
//     MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "com.app/security")
//       .setMethodCallHandler { call, result ->
//         when (call.method) {
//           "enableSecureFlag" -> {
//             window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
//             result.success(null)
//           }
//           "disableSecureFlag" -> {
//             window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
//             result.success(null)
//           }
//         }
//       }
//   }
// }
```

### 백그라운드 스크린 블러

```dart
/// 앱 백그라운드 진입 시 민감 화면 가리기 (앱 스위처에서 노출 방지)
class AppLifecycleObserver extends WidgetsBindingObserver {
  final GlobalKey<NavigatorState> navigatorKey;
  OverlayEntry? _overlayEntry;

  AppLifecycleObserver({required this.navigatorKey});

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.inactive:
      case AppLifecycleState.paused:
        // 앱 스위처에 표시될 때 오버레이
        _showSecurityOverlay();
      case AppLifecycleState.resumed:
        _removeSecurityOverlay();
      default:
        break;
    }
  }

  void _showSecurityOverlay() {
    _overlayEntry = OverlayEntry(
      builder: (_) => Container(
        color: Colors.white, // 또는 앱 로고가 있는 스플래시
        child: const Center(child: FlutterLogo(size: 100)),
      ),
    );
    navigatorKey.currentState?.overlay?.insert(_overlayEntry!);
  }

  void _removeSecurityOverlay() {
    _overlayEntry?.remove();
    _overlayEntry = null;
  }
}
```

### 클립보드 보호

```dart
/// 민감 데이터 복사 후 자동 클리어
class ClipboardProtection {
  static Timer? _clearTimer;

  /// 민감 데이터를 클립보드에 복사 + 자동 클리어
  static Future<void> copyWithAutoClean(
    String data, {
    Duration clearAfter = const Duration(seconds: 30),
  }) async {
    await Clipboard.setData(ClipboardData(text: data));

    _clearTimer?.cancel();
    _clearTimer = Timer(clearAfter, () async {
      // 클립보드 비우기
      await Clipboard.setData(const ClipboardData(text: ''));
    });
  }

  /// 즉시 클립보드 클리어
  static Future<void> clearNow() async {
    _clearTimer?.cancel();
    await Clipboard.setData(const ClipboardData(text: ''));
  }
}
```

### 안전한 텍스트 입력

```dart
/// 민감 입력 필드 (비밀번호, PIN)
class SecureTextField extends StatelessWidget {
  final TextEditingController controller;
  final String label;

  const SecureTextField({
    super.key,
    required this.controller,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      obscureText: true,
      enableSuggestions: false,     // 자동 완성 비활성화
      autocorrect: false,           // 자동 수정 비활성화
      enableIMEPersonalizedLearning: false, // 키보드 학습 비활성화
      decoration: InputDecoration(labelText: label),
    );
  }
}
```

### 규칙

- 로컬 DB 민감 데이터 → SQLCipher 또는 필드 레벨 암호화
- DB 암호화 키 → `flutter_secure_storage`에 저장 (코드 하드코딩 금지)
- 최초 실행 → 랜덤 키 생성 후 안전 저장소에 보관
- 스크린샷 방지 → Android `FLAG_SECURE`, iOS 오버레이 방식
- 민감 화면만 선별 적용 (전체 앱 적용 시 UX 저하)
- 앱 백그라운드 → 스크린 블러/오버레이 (앱 스위처 노출 방지)
- 클립보드 → 민감 데이터 복사 후 30초 내 자동 클리어
- 비밀번호/PIN 입력 → `enableSuggestions: false` + `autocorrect: false`
- `enableIMEPersonalizedLearning: false` → 키보드 학습에 민감 입력 미포함
