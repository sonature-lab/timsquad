---
title: Runtime Locale Switching
impact: MEDIUM
impactDescription: "전환 미지원 → 앱 재시작 필요, 영속화 누락 → 매 시작 시 시스템 로캘로 리셋"
tags: locale, riverpod, shared-preferences, runtime, system-locale
---

## Runtime Locale Switching

**Impact: MEDIUM (전환 미지원 → 앱 재시작 필요, 영속화 누락 → 매 시작 시 시스템 로캘로 리셋)**

런타임 로캘 전환. Riverpod 기반 LocaleNotifier, SharedPreferences 영속화,
시스템 로캘 감지, 앱 재시작 없이 즉시 반영.

### LocaleNotifier (Riverpod)

**Incorrect (전역 변수 + setState):**
```dart
// 전역 변수로 로캘 관리 → 위젯 트리 재빌드 불완전
Locale currentLocale = const Locale('en');

void changeLocale(Locale locale) {
  currentLocale = locale;
  // setState? → MaterialApp 레벨까지 전파 불가
}
```

**Correct (Riverpod StateNotifier + 영속화):**
```dart
/// 지원 로캘 목록
enum AppLocale {
  en(Locale('en'), 'English'),
  ko(Locale('ko'), '한국어'),
  ms(Locale('ms'), 'Bahasa Melayu'),
  id(Locale('id'), 'Bahasa Indonesia');

  const AppLocale(this.locale, this.displayName);
  final Locale locale;
  final String displayName;

  static AppLocale fromCode(String code) {
    return AppLocale.values.firstWhere(
      (l) => l.locale.languageCode == code,
      orElse: () => AppLocale.en,
    );
  }
}

/// 로캘 상태 관리 + 영속화
class LocaleNotifier extends StateNotifier<Locale?> {
  final SharedPreferences _prefs;
  static const _key = 'app_locale';

  LocaleNotifier(this._prefs) : super(null) {
    _loadSavedLocale();
  }

  void _loadSavedLocale() {
    final saved = _prefs.getString(_key);
    if (saved != null) {
      state = AppLocale.fromCode(saved).locale;
    }
    // null → 시스템 로캘 사용 (MaterialApp.locale = null)
  }

  /// 로캘 변경 (즉시 반영 + 영속화)
  Future<void> setLocale(AppLocale appLocale) async {
    state = appLocale.locale;
    await _prefs.setString(_key, appLocale.locale.languageCode);
  }

  /// 시스템 로캘로 리셋
  Future<void> resetToSystem() async {
    state = null;
    await _prefs.remove(_key);
  }

  /// 현재 유효 로캘 (상태 또는 시스템)
  Locale effectiveLocale(BuildContext context) {
    return state ?? Localizations.localeOf(context);
  }
}

/// Riverpod Providers
final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('Override in ProviderScope');
});

final localeNotifierProvider =
    StateNotifierProvider<LocaleNotifier, Locale?>((ref) {
  return LocaleNotifier(ref.watch(sharedPreferencesProvider));
});

final localeProvider = Provider<Locale?>((ref) {
  return ref.watch(localeNotifierProvider);
});
```

### MaterialApp 연동

```dart
class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);

    return MaterialApp.router(
      locale: locale,  // null → 시스템 로캘 사용
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: AppLocalizations.supportedLocales,
      // 시스템 로캘과 지원 로캘 매칭 전략
      localeResolutionCallback: (deviceLocale, supportedLocales) {
        for (final supported in supportedLocales) {
          if (supported.languageCode == deviceLocale?.languageCode) {
            return supported;
          }
        }
        return supportedLocales.first;  // 폴백: 첫 번째 (en)
      },
      routerConfig: ref.watch(routerProvider),
    );
  }
}
```

### main.dart 초기화

```dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // SharedPreferences 초기화 (앱 시작 시 1회)
  final prefs = await SharedPreferences.getInstance();

  runApp(
    ProviderScope(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
      ],
      child: const MyApp(),
    ),
  );
}
```

### 설정 화면 UI

```dart
class LanguageSettingsScreen extends ConsumerWidget {
  const LanguageSettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentLocale = ref.watch(localeProvider);

    return Scaffold(
      appBar: AppBar(title: Text(context.l10n.settings_languageTitle)),
      body: ListView(
        children: [
          // 시스템 로캘 옵션
          RadioListTile<Locale?>(
            title: Text(context.l10n.settings_systemLanguage),
            subtitle: Text(_getSystemLocaleName(context)),
            value: null,
            groupValue: currentLocale,
            onChanged: (_) {
              ref.read(localeNotifierProvider.notifier).resetToSystem();
            },
          ),
          const Divider(),
          // 지원 로캘 목록
          ...AppLocale.values.map((appLocale) {
            return RadioListTile<Locale?>(
              title: Text(appLocale.displayName),
              value: appLocale.locale,
              groupValue: currentLocale,
              onChanged: (_) {
                ref.read(localeNotifierProvider.notifier).setLocale(appLocale);
              },
            );
          }),
        ],
      ),
    );
  }

  String _getSystemLocaleName(BuildContext context) {
    final systemLocale = WidgetsBinding.instance.platformDispatcher.locale;
    return systemLocale.languageCode.toUpperCase();
  }
}
```

### 시스템 로캘 변경 감지

```dart
// WidgetsBindingObserver로 시스템 로캘 변경 감지
class LocaleObserver extends WidgetsBindingObserver {
  final VoidCallback onLocaleChanged;

  LocaleObserver({required this.onLocaleChanged});

  @override
  void didChangeLocales(List<Locale>? locales) {
    // 사용자가 "시스템 로캘 사용" 선택한 경우에만 반응
    onLocaleChanged();
  }
}
```

### 규칙

- `LocaleNotifier` → Riverpod StateNotifier, `Locale?` 상태 (null = 시스템 로캘)
- `SharedPreferences` → 선택 로캘 영속화, 앱 재시작 시 복원
- `MaterialApp.locale` → `null` 전달 시 시스템 로캘 자동 사용
- `localeResolutionCallback` → 지원 로캘과 시스템 로캘 매칭, 미지원 시 폴백
- 앱 재시작 없이 전환 → `locale` 변경 시 MaterialApp 재빌드 → 즉시 반영
- "시스템 언어 사용" 옵션 → 사용자에게 항상 제공 (기본값)
- `didChangeLocales` → 시스템 언어 변경 시 실시간 반영 (시스템 모드일 때만)
