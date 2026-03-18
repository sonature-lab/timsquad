---
title: Localization Setup (flutter_localizations + intl)
impact: CRITICAL
impactDescription: "설정 누락 → 번역 미적용, 런타임 에러, 날짜/숫자 포맷 불일치"
tags: flutter-localizations, intl, l10n-yaml, pubspec, setup
---

## Localization Setup (flutter_localizations + intl)

**Impact: CRITICAL (설정 누락 → 번역 미적용, 런타임 에러, 날짜/숫자 포맷 불일치)**

flutter_localizations + intl 패키지 설정, pubspec.yaml generate 플래그, l10n.yaml 구성,
MaterialApp delegate 등록. 프로젝트 초기에 반드시 완료해야 하는 i18n 인프라.

### 의존성

```yaml
# pubspec.yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_localizations:
    sdk: flutter
  intl: any  # flutter_localizations가 버전 관리

# 코드 생성 활성화 (필수!)
flutter:
  generate: true
```

### l10n.yaml 설정

**Incorrect (l10n.yaml 없이 수동 관리):**
```dart
// ARB 파일을 직접 파싱하거나 하드코딩된 Map 사용
// → 타입 안전성 없음, 키 오타 런타임까지 발견 불가
final Map<String, String> translations = {
  'hello': 'Hello',
  'welcome': 'Welcome, $name',
};
```

**Correct (l10n.yaml로 자동 코드 생성):**
```yaml
# l10n.yaml (프로젝트 루트)
arb-dir: lib/l10n
template-arb-file: app_en.arb
output-localization-file: app_localizations.dart
output-class: AppLocalizations
# nullable-getter: false  # null 안전 접근 (선택, 기본 true)
# synthetic-package: true  # .dart_tool/에 생성 (기본 true)
```

### MaterialApp 설정

**Incorrect (delegate 누락):**
```dart
MaterialApp(
  // localizationsDelegates 없음 → AppLocalizations.of(context) 실패
  // supportedLocales 없음 → 시스템 로캘 무시
  home: const HomeScreen(),
);
```

**Correct (완전한 delegate 등록):**
```dart
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);

    return MaterialApp.router(
      // 1. Localization Delegates (3종 필수)
      localizationsDelegates: const [
        AppLocalizations.delegate,              // 앱 번역
        GlobalMaterialLocalizations.delegate,   // Material 위젯 번역
        GlobalWidgetsLocalizations.delegate,    // 기본 위젯 방향성
        GlobalCupertinoLocalizations.delegate,  // Cupertino 위젯 번역
      ],
      // 2. 지원 로캘 목록
      supportedLocales: AppLocalizations.supportedLocales,
      // 3. 현재 로캘 (null → 시스템 로캘 사용)
      locale: locale,
      routerConfig: ref.watch(routerProvider),
    );
  }
}
```

### 번역 사용

```dart
// 위젯에서 번역 접근
class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // AppLocalizations.of(context) → nullable (로캘 미지원 시 null)
    final l10n = AppLocalizations.of(context)!;
    // 또는 extension 사용:
    // final l10n = context.l10n;

    return Text(l10n.welcomeMessage('Tim'));
  }
}

// 편의 Extension (선택)
extension BuildContextL10n on BuildContext {
  AppLocalizations get l10n => AppLocalizations.of(this)!;
}
```

### 코드 생성 실행

```bash
# ARB 파일 추가/수정 후 코드 생성
flutter gen-l10n

# 또는 빌드 시 자동 생성 (generate: true 설정 시)
flutter run  # 자동으로 gen-l10n 실행
flutter build  # 마찬가지
```

### 규칙

- `pubspec.yaml` → `flutter: generate: true` 필수 (자동 코드 생성 활성화)
- `l10n.yaml` → 프로젝트 루트에 반드시 생성, `arb-dir` + `template-arb-file` 지정
- `localizationsDelegates` → 4개 등록 (App + Material + Widgets + Cupertino)
- `supportedLocales` → `AppLocalizations.supportedLocales` 사용 (ARB 파일에서 자동 유도)
- 하드코딩된 문자열 Map 사용 금지 → ARB + 코드 생성으로 타입 안전 접근
- `context.l10n` Extension → 반복적인 `AppLocalizations.of(context)!` 줄이기
- `flutter gen-l10n` → ARB 파일 변경 후 반드시 실행 (빌드 시 자동이지만 IDE 지원용)
