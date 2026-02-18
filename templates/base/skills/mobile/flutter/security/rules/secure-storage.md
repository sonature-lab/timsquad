---
title: Secure Storage
impact: CRITICAL
impactDescription: "평문 저장 → 루팅/탈옥 시 토큰/시크릿 탈취, 계정 도용"
tags: flutter_secure_storage, keychain, encrypted-shared-preferences, token
---

## Secure Storage

**Impact: CRITICAL (평문 저장 → 루팅/탈옥 시 토큰/시크릿 탈취, 계정 도용)**

flutter_secure_storage를 사용한 민감 데이터 안전 저장.
iOS Keychain / Android EncryptedSharedPreferences 기반.

### 의존성

```yaml
# pubspec.yaml
dependencies:
  flutter_secure_storage: ^9.2.0
```

### 기본 사용

**Incorrect (SharedPreferences에 토큰 저장):**
```dart
// SharedPreferences → 평문 XML/plist 파일
// 루팅된 기기에서 파일 탐색기로 즉시 열람 가능
final prefs = await SharedPreferences.getInstance();
await prefs.setString('access_token', token);
await prefs.setString('refresh_token', refreshToken);
// → /data/data/com.app/shared_prefs/ 에 평문 저장
```

**Correct (flutter_secure_storage 사용):**
```dart
class SecureStorageService {
  final FlutterSecureStorage _storage;

  SecureStorageService()
      : _storage = const FlutterSecureStorage(
          aOptions: AndroidOptions(
            encryptedSharedPreferences: true, // EncryptedSharedPreferences 사용
          ),
          iOptions: IOSOptions(
            accessibility: KeychainAccessibility.first_unlock_this_device,
          ),
        );

  // === 토큰 관리 ===

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await Future.wait([
      _storage.write(key: _Keys.accessToken, value: accessToken),
      _storage.write(key: _Keys.refreshToken, value: refreshToken),
    ]);
  }

  Future<String?> getAccessToken() async {
    return _storage.read(key: _Keys.accessToken);
  }

  Future<String?> getRefreshToken() async {
    return _storage.read(key: _Keys.refreshToken);
  }

  Future<void> deleteTokens() async {
    await Future.wait([
      _storage.delete(key: _Keys.accessToken),
      _storage.delete(key: _Keys.refreshToken),
    ]);
  }

  /// 로그아웃 시 모든 민감 데이터 삭제
  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}

abstract class _Keys {
  static const accessToken = 'access_token';
  static const refreshToken = 'refresh_token';
  static const userPin = 'user_pin_hash';
  static const biometricEnabled = 'biometric_enabled';
}
```

### Android 설정

```kotlin
// android/app/build.gradle
android {
    defaultConfig {
        minSdk 23  // EncryptedSharedPreferences 최소 요구
    }
}
```

```xml
<!-- AndroidManifest.xml (선택: 백업에서 Keystore 제외) -->
<application
  android:fullBackupContent="@xml/backup_rules"
  android:dataExtractionRules="@xml/data_extraction_rules">
</application>

<!-- res/xml/backup_rules.xml -->
<!-- <exclude domain="sharedpref" path="FlutterSecureStorage"/> -->
```

### iOS 설정

```dart
// Keychain Accessibility 옵션
const iOptions = IOSOptions(
  // 기기 잠금 해제 후 접근 가능 (기기 바인딩)
  accessibility: KeychainAccessibility.first_unlock_this_device,
  // iCloud Keychain 동기화 비활성화 (기기 전용)
  synchronizable: false,
);

// Keychain Accessibility 레벨:
// - first_unlock_this_device: 기기 첫 잠금 해제 후 접근 (권장)
// - unlocked_this_device: 잠금 해제 상태에서만 접근 (더 엄격)
// - first_unlock: iCloud 동기화 가능 (덜 안전)
// - passcode: 패스코드 설정된 기기에서만
```

### Riverpod Provider 구성

```dart
final secureStorageServiceProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService();
});

/// 토큰 존재 여부 (인증 상태 판단)
final hasValidTokenProvider = FutureProvider<bool>((ref) async {
  final storage = ref.watch(secureStorageServiceProvider);
  final token = await storage.getAccessToken();
  return token != null;
});
```

### 저장해야 할 것 vs 하지 말아야 할 것

```
✅ flutter_secure_storage 저장 대상:
  - Access Token / Refresh Token
  - API 시크릿 (런타임 주입된)
  - 사용자 PIN 해시
  - 생체 인증 활성화 플래그
  - 암호화 키 (DB 암호화용)

❌ flutter_secure_storage에 저장하지 말 것:
  - 대량 데이터 (성능 저하) → 암호화된 DB 사용
  - 사용자 설정 (테마, 언어) → SharedPreferences OK
  - 캐시 데이터 → 일반 파일 시스템
  - 검색이 필요한 데이터 → DB 사용
```

### 규칙

- 토큰/시크릿 → `flutter_secure_storage` 필수 (SharedPreferences 금지)
- Android → `encryptedSharedPreferences: true` 설정 (AES-256 암호화)
- iOS → `KeychainAccessibility.first_unlock_this_device` (기기 바인딩)
- iOS → `synchronizable: false` (iCloud 동기화 비활성화)
- 로그아웃 시 → `deleteAll()` 로 모든 민감 데이터 삭제
- 대량 데이터 → secure_storage 대신 암호화된 DB (SQLCipher) 사용
- 앱 재설치 시 → Android Keystore 자동 초기화, iOS Keychain 잔존 가능 → 첫 실행 시 정리 로직
