---
title: Code Style (Effective Dart)
impact: HIGH
tags: style, naming, linting, documentation
---

## Code Style (Effective Dart)

Effective Dart 기반 코딩 컨벤션. `dart_style` 포매터 + strict analysis_options.

### analysis_options.yaml

```yaml
include: package:flutter_lints/flutter.yaml
# 또는 non-Flutter: package:lints/recommended.yaml

linter:
  rules:
    # 필수 추가 규칙
    - prefer_const_constructors
    - prefer_const_declarations
    - avoid_dynamic_calls
    - unawaited_futures
    - cancel_subscriptions
    - close_sinks
    - prefer_final_locals
    - avoid_print        # debugPrint 사용
    - require_trailing_commas

analyzer:
  errors:
    missing_return: error
    unawaited_futures: warning
  language:
    strict-casts: true
    strict-inference: true
    strict-raw-types: true
```

### 네이밍

| 종류 | 규칙 | 예시 |
|------|------|------|
| 클래스, enum, typedef | UpperCamelCase | `UserProfile`, `AuthState` |
| 변수, 함수, 파라미터 | lowerCamelCase | `userName`, `fetchData()` |
| 상수 | lowerCamelCase | `defaultTimeout` (UPPER_SNAKE 금지) |
| 파일 | snake_case | `user_profile.dart` |
| 라이브러리 접두사 | snake_case | `import 'x' as my_lib` |

**Incorrect:**
```dart
const MAX_RETRY_COUNT = 3;  // UPPER_SNAKE
class user_service { }       // snake_case 클래스
String UserName = '';         // UpperCamel 변수
```

**Correct:**
```dart
const maxRetryCount = 3;
class UserService { }
String userName = '';
```

### Import 정리

```dart
// 1. dart: 표준 라이브러리
import 'dart:async';
import 'dart:convert';

// 2. package: 외부 패키지
import 'package:flutter/material.dart';
import 'package:riverpod/riverpod.dart';

// 3. 프로젝트 내부 (상대 경로 금지)
import 'package:my_app/features/auth/domain/user.dart';
```

### 문서화

```dart
/// 사용자 프로필을 가져온다.
///
/// [userId]에 해당하는 사용자가 없으면 null 반환.
/// 네트워크 에러 시 [FetchException] 발생.
Future<UserProfile?> fetchProfile(String userId) async { ... }
```

### 규칙

- `dart format .` 자동 포매팅 (커밋 전 필수)
- 상대 import 금지 → `package:` import
- `print()` 금지 → `debugPrint()` 또는 logger
- `part`/`part of` 금지 → 파일 분리
- trailing comma 필수 (위젯 트리 가독성)
- `prefer_final_locals` 활성화
