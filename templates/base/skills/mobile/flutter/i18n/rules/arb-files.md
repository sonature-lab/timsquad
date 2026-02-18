---
title: ARB File Management
impact: CRITICAL
impactDescription: "ARB 구조 불일치 → 빌드 실패, 키 누락 → 런타임 null, 네이밍 비일관 → 유지보수 비용 증가"
tags: arb, app-resource-bundle, placeholder, gen-l10n, naming
---

## ARB File Management

**Impact: CRITICAL (ARB 구조 불일치 → 빌드 실패, 키 누락 → 런타임 null, 네이밍 비일관 → 유지보수 비용 증가)**

ARB (Application Resource Bundle) 파일 구조, @placeholder 메타데이터, 네이밍 컨벤션,
자동 생성 워크플로우. 모든 번역의 원본 소스.

### 기본 ARB 파일 구조

**Incorrect (메타데이터 없는 평면 구조):**
```json
{
  "hello": "Hello",
  "welcome": "Welcome, {name}",
  "items": "You have {count} items"
}
```

**Correct (메타데이터 포함 구조화된 ARB):**
```json
{
  "@@locale": "en",
  "@@last_modified": "2026-02-18T10:00:00+09:00",

  "appTitle": "MyApp",
  "@appTitle": {
    "description": "The application title shown in AppBar"
  },

  "welcomeMessage": "Welcome, {userName}!",
  "@welcomeMessage": {
    "description": "Greeting shown on home screen after login",
    "placeholders": {
      "userName": {
        "type": "String",
        "example": "Tim"
      }
    }
  },

  "matchCount": "{count, plural, =0{No matches} =1{1 match} other{{count} matches}}",
  "@matchCount": {
    "description": "Number of available matches",
    "placeholders": {
      "count": {
        "type": "int",
        "example": "5"
      }
    }
  }
}
```

### 키 네이밍 컨벤션

```
패턴: featureName_context_element

예시:
  ✅ matchDetail_inviteButton       → 매치 상세 화면의 초대 버튼
  ✅ matchDetail_playerCount         → 매치 상세의 참가자 수
  ✅ settings_languageLabel          → 설정 화면의 언어 레이블
  ✅ common_cancelButton             → 공통 취소 버튼
  ✅ error_networkTimeout            → 에러 메시지: 네트워크 타임아웃
  ✅ validation_emailInvalid         → 유효성 검사: 이메일 형식 오류

  ❌ invite                          → 맥락 없음 (어디서 사용?)
  ❌ button1                         → 의미 없는 번호
  ❌ match_detail_invite_button      → snake_case 혼용 (camelCase 사용)
  ❌ MATCH_INVITE                    → 대문자 (camelCase 사용)
```

### 다국어 ARB 파일 관리

```json
// lib/l10n/app_en.arb (기본 — template ARB)
{
  "@@locale": "en",
  "matchDetail_inviteButton": "Invite to Match",
  "@matchDetail_inviteButton": {
    "description": "Button to invite a player to the match"
  },
  "matchDetail_playerCount": "{count, plural, =0{No players} =1{1 player} other{{count} players}}",
  "@matchDetail_playerCount": {
    "description": "Number of players in the match",
    "placeholders": {
      "count": { "type": "int" }
    }
  }
}

// lib/l10n/app_ko.arb
{
  "@@locale": "ko",
  "matchDetail_inviteButton": "매치 초대",
  "matchDetail_playerCount": "{count, plural, =0{참가자 없음} =1{1명} other{{count}명}}"
}

// lib/l10n/app_ms.arb
{
  "@@locale": "ms",
  "matchDetail_inviteButton": "Jemput ke Perlawanan",
  "matchDetail_playerCount": "{count, plural, =0{Tiada pemain} =1{1 pemain} other{{count} pemain}}"
}
```

### @placeholder 메타데이터

```json
{
  "orderSummary": "Order #{orderId} — {itemCount} items, {totalPrice}",
  "@orderSummary": {
    "description": "Order summary displayed in confirmation screen",
    "placeholders": {
      "orderId": {
        "type": "String",
        "example": "A1234"
      },
      "itemCount": {
        "type": "int",
        "format": "compact",
        "example": "3"
      },
      "totalPrice": {
        "type": "double",
        "format": "currency",
        "optionalParameters": {
          "decimalDigits": 2,
          "symbol": "$"
        },
        "example": "29.99"
      }
    }
  },

  "lastUpdated": "Last updated: {date}",
  "@lastUpdated": {
    "description": "Timestamp for last data refresh",
    "placeholders": {
      "date": {
        "type": "DateTime",
        "format": "yMMMd",
        "example": "Feb 18, 2026"
      }
    }
  }
}
```

### 자동 생성

```bash
# ARB 파일에서 Dart 코드 생성
flutter gen-l10n

# 생성 결과 (synthetic-package: true 기본):
# .dart_tool/flutter_gen/gen_l10n/
#   ├── app_localizations.dart         # 추상 클래스
#   ├── app_localizations_en.dart      # English 구현
#   └── app_localizations_ko.dart      # Korean 구현

# import 경로:
# import 'package:flutter_gen/gen_l10n/app_localizations.dart';
```

### 규칙

- `app_en.arb` → template ARB (기본), 모든 키와 `@` 메타데이터 포함
- 번역 ARB (app_ko.arb 등) → 키와 값만 포함, `@` 메타데이터 생략 가능
- `@@locale` → 각 ARB 파일 최상단에 로캘 코드 명시
- 키 네이밍 → `featureName_context` camelCase, 공통 키는 `common_` 접두사
- `@placeholder` → 모든 동적 값에 `type`, `example` 필수, 숫자/날짜는 `format` 추가
- template ARB의 모든 키 → 번역 ARB에도 존재해야 함 (누락 시 gen-l10n 경고)
- ARB 파일 변경 후 `flutter gen-l10n` 실행 (빌드 시 자동이지만 IDE 자동완성용)
- description → 번역가를 위한 맥락 설명, 화면 위치/용도 명시
