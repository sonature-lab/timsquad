---
title: Project Structure (Feature-First + Melos)
category: guide
tags: structure, monorepo, melos, feature-first
---

## Project Structure

Flutter Feature-first 디렉토리 구조 + Melos 모노레포 관리.

### 단일 앱 구조

```
my_app/
├── lib/
│   ├── main.dart                    # 엔트리포인트
│   ├── app.dart                     # MaterialApp + ProviderScope
│   ├── core/
│   │   ├── constants/
│   │   │   ├── app_colors.dart
│   │   │   ├── app_spacing.dart
│   │   │   └── api_endpoints.dart
│   │   ├── extensions/
│   │   │   ├── context_ext.dart     # BuildContext 확장
│   │   │   └── string_ext.dart
│   │   ├── router/
│   │   │   ├── app_router.dart      # GoRouter 정의
│   │   │   └── route_names.dart     # 경로 상수
│   │   ├── theme/
│   │   │   ├── app_theme.dart       # ThemeData
│   │   │   └── typography.dart
│   │   ├── network/
│   │   │   ├── api_client.dart      # Dio/http 설정
│   │   │   └── api_interceptor.dart
│   │   └── providers/
│   │       ├── auth_provider.dart   # 전역 인증 상태
│   │       └── locale_provider.dart
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── data/
│   │   │   │   ├── datasources/
│   │   │   │   │   └── auth_remote_datasource.dart
│   │   │   │   ├── dtos/
│   │   │   │   │   └── auth_response_dto.dart
│   │   │   │   │   └── auth_response_dto.g.dart    # json_serializable
│   │   │   │   │   └── auth_response_dto.freezed.dart
│   │   │   │   └── repositories/
│   │   │   │       └── auth_repository_impl.dart
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   └── user.dart
│   │   │   │   │   └── user.freezed.dart
│   │   │   │   └── repositories/
│   │   │   │       └── auth_repository.dart  # abstract
│   │   │   └── presentation/
│   │   │       ├── providers/
│   │   │       │   └── auth_provider.dart
│   │   │       ├── screens/
│   │   │       │   ├── login_screen.dart
│   │   │       │   └── signup_screen.dart
│   │   │       └── widgets/
│   │   │           └── social_login_buttons.dart
│   │   │
│   │   ├── match/
│   │   │   ├── data/...
│   │   │   ├── domain/...
│   │   │   └── presentation/...
│   │   │
│   │   └── community/
│   │       ├── data/...
│   │       ├── domain/...
│   │       └── presentation/...
│   │
│   └── shared/
│       ├── widgets/
│       │   ├── app_button.dart
│       │   ├── app_text_field.dart
│       │   └── loading_indicator.dart
│       └── utils/
│           ├── date_formatter.dart
│           └── validators.dart
│
├── test/
│   ├── features/
│   │   ├── auth/
│   │   │   ├── data/repositories/auth_repository_impl_test.dart
│   │   │   └── presentation/providers/auth_provider_test.dart
│   │   └── match/...
│   ├── fixtures/
│   │   └── test_data.dart           # 공유 테스트 데이터
│   └── helpers/
│       └── pump_app.dart            # testWidgets 헬퍼
│
├── integration_test/
│   └── match_flow_test.dart
│
├── assets/
│   ├── images/
│   ├── icons/
│   └── translations/                # ARB 파일 (i18n)
│
├── pubspec.yaml
├── analysis_options.yaml
└── l10n.yaml                        # 국제화 설정
```

### Melos 모노레포 구조

```
project_root/
├── melos.yaml
├── apps/
│   ├── mobile/                      # Flutter 앱
│   │   ├── lib/
│   │   └── pubspec.yaml
│   └── admin/                       # 관리자 웹 (선택)
│       ├── lib/
│       └── pubspec.yaml
├── packages/
│   ├── core/                        # 공유 코어 (모델, 유틸)
│   │   ├── lib/
│   │   └── pubspec.yaml
│   ├── ui_kit/                      # 공유 UI 컴포넌트
│   │   ├── lib/
│   │   └── pubspec.yaml
│   ├── api_client/                  # API 클라이언트
│   │   ├── lib/
│   │   └── pubspec.yaml
│   └── auth/                        # 인증 모듈
│       ├── lib/
│       └── pubspec.yaml
└── tools/
    └── custom_lint_rules/           # 프로젝트 커스텀 린트
```

### melos.yaml

```yaml
name: my_project
packages:
  - apps/*
  - packages/*

scripts:
  analyze:
    exec: dart analyze --fatal-infos
  test:
    exec: flutter test --coverage
  format:
    exec: dart format --set-exit-if-changed .
  build_runner:
    exec: dart run build_runner build --delete-conflicting-outputs
    packageFilters:
      dependsOn: build_runner
  clean:
    exec: flutter clean

command:
  bootstrap:
    usePubspecOverrides: true
```

### 규칙

- feature 안에서 다른 feature 직접 import 금지
- 공유 로직은 `core/` 또는 `shared/`
- 모노레포: `melos bootstrap`으로 의존성 연결
- 테스트 디렉토리는 `lib/` 미러링 구조
- generated 파일 (`.g.dart`, `.freezed.dart`) → `.gitignore`에 추가하지 않음 (CI에서 재생성 비용)
