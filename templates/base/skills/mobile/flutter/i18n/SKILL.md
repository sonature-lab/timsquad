---
name: i18n
description: |
  Flutter 국제화(i18n) 가이드라인.
  flutter_localizations, intl, ARB 파일 관리,
  RTL 레이아웃, 복수형/성별 처리, 런타임 로캘 전환.
version: "1.0.0"
tags: [flutter, i18n, l10n, localization, arb, intl, rtl]
user-invocable: false
---

# Internationalization (i18n) & Localization

Flutter 다국어 지원 통합 가이드.
ARB 파일 기반 번역 관리, ICU MessageFormat, RTL 대응, 런타임 로캘 전환.

## Philosophy

- 텍스트는 코드에 없다 — 모든 사용자 노출 문자열은 ARB 파일에
- 로캘은 상태 — Riverpod provider로 관리, SharedPreferences로 영속화
- RTL은 기본 — Directionality 위젯 활용, 하드코딩된 padding/margin 금지
- 번역은 프로세스 — 개발자 → 번역가 → 검수, CI에서 누락 키 자동 감지

## Resources

5개 규칙 + 1개 참조. i18n 파이프라인 전체를 커버.

| Priority | Type | Resource | Description |
|----------|------|----------|-------------|
| CRITICAL | rule | [localization-setup](rules/localization-setup.md) | flutter_localizations, intl, l10n.yaml, pubspec generate |
| CRITICAL | rule | [arb-files](rules/arb-files.md) | ARB 파일 구조, @placeholder, 네이밍 컨벤션, gen-l10n |
| HIGH | rule | [text-direction](rules/text-direction.md) | RTL 대응, EdgeInsetsDirectional, AlignmentDirectional |
| HIGH | rule | [plural-gender](rules/plural-gender.md) | ICU MessageFormat, plural, select, ordinal |
| MEDIUM | rule | [locale-switching](rules/locale-switching.md) | LocaleNotifier, SharedPreferences, 런타임 전환 |
| — | ref | [i18n-architecture](references/i18n-architecture.md) | 디렉토리 구조, 번역 워크플로우, CI 검증 |

## Quick Rules

### 설정
- `pubspec.yaml` 에 `generate: true` + `flutter_localizations`, `intl` 의존성
- `l10n.yaml` 로 ARB 디렉토리, 출력 클래스, 기본 로캘 지정
- `MaterialApp.localizationsDelegates` + `supportedLocales` 필수 설정

### ARB 파일
- `app_en.arb` 가 기본 (template ARB), `app_ko.arb` 등 로캘별 추가
- 키 네이밍: `featureName_context` (예: `matchDetail_inviteButton`)
- `@placeholder` 메타데이터로 동적 값 타입 명시
- `flutter gen-l10n` 으로 자동 생성 (`AppLocalizations` 클래스)

### RTL 대응
- `EdgeInsetsDirectional.only(start: 16)` (left/right 대신 start/end)
- `AlignmentDirectional.centerStart` (centerLeft 대신)
- 아이콘 미러링: `Directionality` 감지 후 조건부 Transform

### 복수형/성별
- ICU `{count, plural, =0{no items} =1{1 item} other{{count} items}}`
- `{gender, select, male{his} female{her} other{their}}`
- ARB 파일에 직접 ICU 구문 작성, intl이 자동 파싱

### 로캘 전환
- `LocaleNotifier` (Riverpod StateNotifier) → 현재 로캘 관리
- `SharedPreferences` 로 선택 로캘 영속화
- 앱 재시작 없이 `MaterialApp.locale` 변경으로 즉시 반영

## Checklist

| Priority | Item |
|----------|------|
| CRITICAL | `pubspec.yaml` 에 `generate: true` 설정 |
| CRITICAL | `l10n.yaml` 생성 (arb-dir, template-arb-file, output-localization-file) |
| CRITICAL | `MaterialApp.localizationsDelegates` 3종 등록 |
| CRITICAL | 모든 사용자 노출 문자열이 ARB 파일에 존재 |
| HIGH | `@placeholder` 메타데이터 완전성 (타입, 예시, 설명) |
| HIGH | RTL 레이아웃에서 Directional 위젯 사용 |
| HIGH | 복수형/성별 표현이 ICU MessageFormat 사용 |
| MEDIUM | SharedPreferences 로캘 영속화 |
| MEDIUM | CI에서 누락 키 자동 감지 |
| MEDIUM | 번역 워크플로우 문서화 (개발자 → 번역가 → 검수) |
