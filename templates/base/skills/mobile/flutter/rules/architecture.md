---
title: Architecture (Feature-First + MVVM)
impact: CRITICAL
tags: architecture, feature-first, mvvm, clean-architecture
---

## Architecture (Feature-First + MVVM)

Flutter 공식 아키텍처 가이드(MVVM) + VGV 4-layer + Feature-first 구조 종합.

### 3-Layer 아키텍처

```
┌─ Presentation (UI) ─────────────────┐
│  Widget → ViewModel (Notifier)      │  UI 렌더링 + 사용자 입력
│  ref.watch로 상태 구독              │
└─────────────────────────────────────┘
          ↕ (Domain Model)
┌─ Domain ────────────────────────────┐
│  Entity, ValueObject, UseCase       │  비즈니스 규칙 (선택 레이어)
│  플랫폼/프레임워크 의존성 없음       │
└─────────────────────────────────────┘
          ↕ (Domain Model)
┌─ Data ──────────────────────────────┐
│  Repository → DataSource            │  API/DB/캐시 접근
│  DTO ↔ Domain Model 변환            │
└─────────────────────────────────────┘
```

### Feature-First 디렉토리

**Incorrect:**
```
lib/
  models/         # 모든 모델이 한 폴더
  screens/        # 모든 화면이 한 폴더
  services/       # 모든 서비스가 한 폴더
  widgets/        # 모든 위젯이 한 폴더
```

**Correct:**
```
lib/
  core/                     # 공유 인프라
    constants/
    extensions/
    router/
    theme/
    providers/              # 전역 provider (auth, locale 등)
  features/
    auth/
      data/
        datasources/        # AuthRemoteDataSource
        dtos/               # AuthResponseDto (JSON 매핑)
        repositories/       # AuthRepositoryImpl
      domain/
        entities/           # User
        repositories/       # AuthRepository (abstract)
      presentation/
        providers/          # authProvider, loginNotifier
        screens/            # LoginScreen, SignUpScreen
        widgets/            # AuthForm, SocialLoginButtons
    match/
      data/...
      domain/...
      presentation/...
  shared/
    widgets/                # 재사용 UI 컴포넌트
    utils/                  # 순수 유틸리티 함수
```

### Repository 패턴

```dart
// Domain layer — 추상 인터페이스
abstract class MatchRepository {
  Future<List<Match>> getMatches({required Sport sport});
  Future<void> joinMatch(String matchId);
  Stream<Match> watchMatch(String matchId);
}

// Data layer — 구현
class MatchRepositoryImpl implements MatchRepository {
  const MatchRepositoryImpl({
    required this.remoteDataSource,
    required this.localDataSource,
  });

  final MatchRemoteDataSource remoteDataSource;
  final MatchLocalDataSource localDataSource;

  @override
  Future<List<Match>> getMatches({required Sport sport}) async {
    try {
      final dtos = await remoteDataSource.fetchMatches(sport.name);
      final matches = dtos.map((dto) => dto.toDomain()).toList();
      await localDataSource.cacheMatches(matches);
      return matches;
    } on NetworkException {
      return localDataSource.getCachedMatches(sport);
    }
  }
}

// Provider 연결
final matchRepositoryProvider = Provider<MatchRepository>((ref) {
  return MatchRepositoryImpl(
    remoteDataSource: ref.watch(matchRemoteDataSourceProvider),
    localDataSource: ref.watch(matchLocalDataSourceProvider),
  );
});
```

### 규칙

- **Feature-first**: `lib/features/{name}/` 구조 필수
- **레이어 방향**: Presentation → Domain ← Data (의존성 역전)
- **Domain layer**: Flutter import 금지 (`dart:` 만 허용)
- **DTO ↔ Model 분리**: API 응답 구조와 도메인 모델 분리
- **Repository**: abstract (domain) + impl (data) 분리
- **1 feature = 1 독립 단위**: feature 간 직접 import 금지 → 공유 도메인은 `core/`
