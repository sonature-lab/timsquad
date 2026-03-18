---
title: i18n Architecture & Translation Workflow
category: reference
source: internal
tags: architecture, directory, workflow, ci, missing-keys, translation
---

# i18n Architecture & Translation Workflow

i18n 서비스 아키텍처. 디렉토리 구조, 번역 워크플로우, CI 자동 검증, 누락 키 감지.

## Key Concepts

- **ARB 중심**: 모든 번역의 원본은 ARB 파일 (코드에 문자열 하드코딩 금지)
- **코드 생성**: `flutter gen-l10n` → 타입 안전한 `AppLocalizations` 클래스 자동 생성
- **CI 검증**: 빌드 파이프라인에서 누락 키, 미사용 키, 포맷 오류 자동 감지
- **번역 프로세스**: 개발자 (키 추가) → 번역가 (번역) → 검수 (QA) → 머지

## Directory Structure

```
lib/
├── l10n/
│   ├── app_en.arb                    # 기본 (template) — 모든 키 + 메타데이터
│   ├── app_ko.arb                    # 한국어
│   ├── app_ms.arb                    # 말레이어
│   ├── app_id.arb                    # 인도네시아어
│   └── app_zh.arb                    # 중국어 (간체)
│
├── core/
│   └── l10n/
│       ├── locale_notifier.dart      # LocaleNotifier (Riverpod)
│       ├── app_locale.dart           # AppLocale enum (지원 로캘 목록)
│       ├── l10n_extension.dart       # BuildContext.l10n extension
│       └── locale_observer.dart      # 시스템 로캘 변경 감지
│
├── features/
│   └── settings/
│       └── presentation/
│           └── screens/
│               └── language_settings_screen.dart  # 언어 설정 UI
│
└── .dart_tool/
    └── flutter_gen/
        └── gen_l10n/                 # 자동 생성 (커밋 X)
            ├── app_localizations.dart
            ├── app_localizations_en.dart
            ├── app_localizations_ko.dart
            └── ...
```

## Translation Workflow

```
┌──────────────────────────────────────────────────────────┐
│                    번역 워크플로우                          │
├──────────┬────────────────┬──────────────┬───────────────┤
│ 1. 개발자  │  2. 번역가       │  3. 검수       │  4. 머지      │
├──────────┼────────────────┼──────────────┼───────────────┤
│ app_en.arb│ app_ko.arb    │ 화면 확인     │ PR 승인       │
│ 키 추가   │ app_ms.arb    │ 문맥 확인     │ CI 통과       │
│ @메타데이터│ app_id.arb    │ 길이 확인     │ 머지          │
│ 설명 작성  │ 번역 작성      │ RTL 확인     │ 배포          │
├──────────┼────────────────┼──────────────┼───────────────┤
│ PR 생성   │ 번역 PR 생성    │ 리뷰 코멘트  │ gen-l10n 실행  │
└──────────┴────────────────┴──────────────┴───────────────┘
```

### 단계별 상세

```
1. 개발자 (키 추가)
   - app_en.arb에 새 키 + @메타데이터 추가
   - description에 화면 위치, 용도, 맥락 설명
   - placeholder에 type, example 명시
   - 스크린샷/화면 위치 정보 첨부 (번역가 맥락 전달)

2. 번역가 (번역)
   - 각 로캘 ARB 파일에 번역 추가
   - ICU 복수형/성별 규칙 적용 (언어별)
   - placeholder 위치 조정 (언어 어순에 맞게)

3. 검수 (QA)
   - 실제 화면에서 번역 확인 (텍스트 잘림, 줄바꿈)
   - RTL 레이아웃 확인 (해당 시)
   - 복수형/성별 변형 모두 확인
   - 문화적 적절성 확인

4. 머지
   - CI 자동 검증 통과 확인
   - flutter gen-l10n 빌드 성공 확인
   - 머지 후 릴리스 포함
```

## CI Automated Verification

### 누락 키 감지 스크립트

```bash
#!/bin/bash
# scripts/check_l10n.sh — CI에서 실행

set -e

echo "=== i18n Key Verification ==="

# 1. gen-l10n 빌드 테스트
flutter gen-l10n
echo "✓ gen-l10n succeeded"

# 2. 누락 키 체크 (template ARB 기준)
TEMPLATE="lib/l10n/app_en.arb"
ERRORS=0

for ARB in lib/l10n/app_*.arb; do
  if [ "$ARB" = "$TEMPLATE" ]; then continue; fi

  LOCALE=$(basename "$ARB" .arb | sed 's/app_//')

  # template의 비-메타 키 추출
  TEMPLATE_KEYS=$(grep -oP '^\s*"(?!@|@@)\K[^"]+' "$TEMPLATE" | sort)
  LOCALE_KEYS=$(grep -oP '^\s*"(?!@|@@)\K[^"]+' "$ARB" | sort)

  # 누락 키 찾기
  MISSING=$(comm -23 <(echo "$TEMPLATE_KEYS") <(echo "$LOCALE_KEYS"))
  if [ -n "$MISSING" ]; then
    echo "✗ $LOCALE: Missing keys:"
    echo "$MISSING" | sed 's/^/    /'
    ERRORS=$((ERRORS + 1))
  else
    echo "✓ $LOCALE: All keys present"
  fi
done

if [ $ERRORS -gt 0 ]; then
  echo "FAIL: $ERRORS locale(s) have missing keys"
  exit 1
fi

echo "=== All i18n checks passed ==="
```

### 미사용 키 감지

```bash
#!/bin/bash
# scripts/check_unused_l10n.sh

TEMPLATE="lib/l10n/app_en.arb"
UNUSED=0

# template의 키 목록 추출
KEYS=$(grep -oP '^\s*"(?!@|@@)\K[^"]+' "$TEMPLATE")

for KEY in $KEYS; do
  # Dart 코드에서 사용 여부 확인 (.l10n.$KEY 또는 l10n.$KEY)
  if ! grep -rq "\.$KEY" lib/ --include="*.dart" 2>/dev/null; then
    echo "⚠ Potentially unused: $KEY"
    UNUSED=$((UNUSED + 1))
  fi
done

if [ $UNUSED -gt 0 ]; then
  echo "WARNING: $UNUSED potentially unused key(s)"
fi
```

## ARB Key Organization

```json
// 키 그룹화 전략 (featureName_ 접두사로 자연 정렬)
{
  "@@locale": "en",

  // === Common (공통) ===
  "common_cancelButton": "Cancel",
  "common_confirmButton": "Confirm",
  "common_deleteButton": "Delete",
  "common_loadingMessage": "Loading...",
  "common_retryButton": "Retry",

  // === Error (에러) ===
  "error_networkTimeout": "Network timeout. Please try again.",
  "error_serverError": "Server error. Please try later.",
  "error_unauthorized": "Please log in again.",

  // === Match (매치) ===
  "matchDetail_inviteButton": "Invite to Match",
  "matchDetail_playerCount": "{count, plural, =0{No players} =1{1 player} other{{count} players}}",
  "matchList_emptyState": "No matches available",
  "matchList_title": "Available Matches",

  // === Settings (설정) ===
  "settings_languageTitle": "Language",
  "settings_systemLanguage": "System Language"
}
```

## Common Pitfalls

1. **gen-l10n 미실행**: ARB 수정 후 코드 생성 안 하면 IDE 자동완성 미반영
2. **@@locale 누락**: ARB 파일에 로캘 코드 없으면 파일명에서 유추 (명시 권장)
3. **ICU 구문 오류**: 중괄호 불일치, other 누락 → gen-l10n 빌드 실패
4. **텍스트 길이**: 독일어 등 긴 번역 → UI 레이아웃 깨짐 (Expanded/Flexible 사용)
5. **날짜/숫자 포맷**: ARB placeholder format 미지정 → 로캘별 포맷 미적용
6. **컨텍스트 없는 description**: 번역가가 맥락 모르면 오역 → 화면 위치/용도 필수
7. **하드코딩된 문자열**: 로그, 에러 메시지도 ARB로 (사용자 노출 가능성)
8. **synthetic-package 이해**: `.dart_tool/` 에 생성 → `.gitignore` 에 이미 포함 (커밋 X)

## Examples

### 최소 구현 체크리스트

```
[ ] pubspec.yaml: flutter_localizations + intl + generate: true
[ ] l10n.yaml: arb-dir, template-arb-file, output-localization-file
[ ] lib/l10n/app_en.arb: 기본 키 + @메타데이터
[ ] lib/l10n/app_ko.arb (등): 번역 ARB
[ ] MaterialApp: localizationsDelegates (4종) + supportedLocales
[ ] core/l10n/: LocaleNotifier + AppLocale enum
[ ] main.dart: SharedPreferences 초기화 + ProviderScope override
[ ] 설정 화면: 언어 선택 UI
[ ] CI: 누락 키 검증 스크립트
[ ] 위젯 테스트: RTL 레이아웃 확인
```
