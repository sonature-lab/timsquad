---
title: Plural & Gender (ICU MessageFormat)
impact: HIGH
impactDescription: "복수형 미처리 → '1 items' 문법 오류, 성별 미처리 → 포용성 저하"
tags: icu, plural, gender, select, ordinal, message-format
---

## Plural & Gender (ICU MessageFormat)

**Impact: HIGH (복수형 미처리 → '1 items' 문법 오류, 성별 미처리 → 포용성 저하)**

ICU MessageFormat 기반 복수형, 성별, 서수 처리. ARB 파일에 직접 ICU 구문 작성,
intl 패키지가 자동 파싱. 언어별 복수형 규칙 차이를 올바르게 처리.

### 복수형 (Plural)

**Incorrect (조건문으로 복수형 처리):**
```dart
// 코드에서 직접 분기 → 번역 불가, 언어별 규칙 대응 불가
String getItemText(int count) {
  if (count == 0) return 'No items';
  if (count == 1) return '1 item';
  return '$count items';
}
// → 러시아어는 1, 2-4, 5-20, 21 등 복수형 규칙이 다름
// → 아랍어는 6가지 복수형 (zero, one, two, few, many, other)
```

**Correct (ARB 파일에 ICU plural 구문):**
```json
{
  "matchCount": "{count, plural, =0{No matches} =1{1 match} other{{count} matches}}",
  "@matchCount": {
    "description": "Number of available matches on the board",
    "placeholders": {
      "count": {
        "type": "int",
        "example": "5"
      }
    }
  }
}
```

### 복수형 카테고리

```
ICU 복수형 카테고리 (언어별로 사용하는 카테고리가 다름):

  =0     → 정확히 0 (선택, 없으면 other 사용)
  =1     → 정확히 1 (선택, 없으면 one 사용)
  =2     → 정확히 2 (선택)
  zero   → 0 범주 (아랍어 등)
  one    → 1 범주 (대부분 언어의 단수)
  two    → 2 범주 (아랍어, 웨일스어)
  few    → 소수 범주 (슬라브어: 2-4, 아랍어: 3-10)
  many   → 다수 범주 (슬라브어: 5+, 아랍어: 11-99)
  other  → 기본 (필수! 모든 언어에서 폴백)
```

### 언어별 복수형 예시

```json
// English (en) — one, other
{
  "messageCount": "{count, plural, =0{No messages} one{1 message} other{{count} messages}}"
}

// Korean (ko) — other만 사용 (복수형 구분 없음)
{
  "messageCount": "{count, plural, =0{메시지 없음} other{메시지 {count}개}}"
}

// Russian (ru) — one, few, many, other
{
  "messageCount": "{count, plural, =0{Нет сообщений} one{{count} сообщение} few{{count} сообщения} many{{count} сообщений} other{{count} сообщений}}"
}

// Arabic (ar) — zero, one, two, few, many, other
{
  "messageCount": "{count, plural, zero{لا رسائل} one{رسالة واحدة} two{رسالتان} few{{count} رسائل} many{{count} رسالة} other{{count} رسالة}}"
}
```

### 성별 (Select)

```json
{
  "profileGreeting": "{gender, select, male{He joined} female{She joined} other{They joined}} the match",
  "@profileGreeting": {
    "description": "Greeting text when a player joins a match",
    "placeholders": {
      "gender": {
        "type": "String",
        "example": "male"
      }
    }
  }
}

// Korean (성별 구분 불필요한 언어)
{
  "profileGreeting": "{gender, select, male{매치에 참가했습니다} female{매치에 참가했습니다} other{매치에 참가했습니다}}"
}
```

### 복합 (Plural + 다른 변수)

```json
{
  "matchInvite": "{userName} invited you to {count, plural, =1{a match} other{{count} matches}}",
  "@matchInvite": {
    "description": "Match invitation notification text",
    "placeholders": {
      "userName": { "type": "String", "example": "Tim" },
      "count": { "type": "int", "example": "2" }
    }
  }
}
```

### 서수 (Ordinal — 선택)

```json
{
  "rankPosition": "You are {position, select, 1{1st} 2{2nd} 3{3rd} other{{position}th}} place",
  "@rankPosition": {
    "description": "User ranking position in leaderboard",
    "placeholders": {
      "position": { "type": "int", "example": "3" }
    }
  }
}
```

### Dart 코드에서 사용

```dart
// 자동 생성된 AppLocalizations 메서드 사용
Text(context.l10n.matchCount(0));      // "No matches"
Text(context.l10n.matchCount(1));      // "1 match"
Text(context.l10n.matchCount(42));     // "42 matches"

Text(context.l10n.profileGreeting('female'));  // "She joined the match"
Text(context.l10n.profileGreeting('other'));   // "They joined the match"

Text(context.l10n.matchInvite('Tim', 3));  // "Tim invited you to 3 matches"
```

### 규칙

- 복수형 → ARB 파일에 ICU `{count, plural, ...}` 구문 사용, 코드 분기 금지
- `other` 카테고리 → 필수 (모든 복수형/select에서 폴백)
- 언어별 복수형 규칙 → 번역가에게 언어 규칙 안내 (CLDR 참조)
- 성별 → `{gender, select, male{...} female{...} other{...}}` 사용
- `other` in select → 성 중립 표현 (포용성)
- 복합 구문 → plural + 변수 결합 가능, 중첩은 가독성 위해 최소화
- placeholder type → `int` (plural), `String` (select) 정확히 지정
- 한국어/일본어 등 → 복수형 구분 불필요해도 `other` 필수 (ICU 규격)
