---
title: Freezed + JSON Serializable Patterns
category: guide
tags: freezed, json-serializable, immutable, dto
---

## Freezed + JSON Serializable

불변 데이터 모델 + JSON 직렬화 패턴. Domain Entity와 DTO 분리.

### 기본 설정

```yaml
# pubspec.yaml
dependencies:
  freezed_annotation: ^2.4.0
  json_annotation: ^4.9.0

dev_dependencies:
  freezed: ^2.5.0
  json_serializable: ^6.8.0
  build_runner: ^2.4.0
```

```bash
# 코드 생성
dart run build_runner build --delete-conflicting-outputs

# 감시 모드 (개발 중)
dart run build_runner watch --delete-conflicting-outputs
```

### Domain Entity (freezed)

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'match.freezed.dart';

@freezed
class Match with _$Match {
  const factory Match({
    required String id,
    required Sport sport,
    required String title,
    required DateTime scheduledAt,
    required MatchLocation location,
    required int maxPlayers,
    @Default([]) List<String> playerIds,
    @Default(MatchStatus.open) MatchStatus status,
  }) = _Match;

  // 커스텀 getter (const factory 밑에 private 생성자 필요)
  const Match._();

  bool get isFull => playerIds.length >= maxPlayers;
  bool get isUpcoming => scheduledAt.isAfter(DateTime.now());
  int get availableSlots => maxPlayers - playerIds.length;
}

enum Sport { tennis, badminton, pickleball, paddle }
enum MatchStatus { open, full, inProgress, completed, cancelled }
```

### DTO (freezed + json_serializable)

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'match_dto.freezed.dart';
part 'match_dto.g.dart';

@freezed
class MatchDto with _$MatchDto {
  const factory MatchDto({
    required String id,
    required String sport,
    required String title,
    @JsonKey(name: 'scheduled_at') required String scheduledAt,
    required MatchLocationDto location,
    @JsonKey(name: 'max_players') required int maxPlayers,
    @JsonKey(name: 'player_ids') @Default([]) List<String> playerIds,
    @Default('open') String status,
  }) = _MatchDto;

  factory MatchDto.fromJson(Map<String, dynamic> json) =>
      _$MatchDtoFromJson(json);

  const MatchDto._();

  /// DTO → Domain 변환
  Match toDomain() => Match(
    id: id,
    sport: Sport.values.byName(sport),
    title: title,
    scheduledAt: DateTime.parse(scheduledAt),
    location: location.toDomain(),
    maxPlayers: maxPlayers,
    playerIds: playerIds,
    status: MatchStatus.values.byName(status),
  );

  /// Domain → DTO 변환
  factory MatchDto.fromDomain(Match match) => MatchDto(
    id: match.id,
    sport: match.sport.name,
    title: match.title,
    scheduledAt: match.scheduledAt.toIso8601String(),
    location: MatchLocationDto.fromDomain(match.location),
    maxPlayers: match.maxPlayers,
    playerIds: match.playerIds,
    status: match.status.name,
  );
}
```

### Sealed Class + Freezed (상태)

```dart
@freezed
sealed class AuthState with _$AuthState {
  const factory AuthState.initial() = AuthInitial;
  const factory AuthState.loading() = AuthLoading;
  const factory AuthState.authenticated(User user) = AuthAuthenticated;
  const factory AuthState.unauthenticated() = AuthUnauthenticated;
  const factory AuthState.error(String message) = AuthError;
}

// 사용: 패턴 매칭
Widget build(BuildContext context) {
  final authState = ref.watch(authProvider);

  return authState.when(
    initial: () => const SplashScreen(),
    loading: () => const LoadingScreen(),
    authenticated: (user) => const HomeScreen(),
    unauthenticated: () => const LoginScreen(),
    error: (msg) => ErrorScreen(message: msg),
  );
}
```

### copyWith (불변 업데이트)

```dart
// freezed가 자동 생성하는 copyWith
final updatedMatch = match.copyWith(
  status: MatchStatus.full,
  playerIds: [...match.playerIds, newPlayerId],
);
// 원본 match는 변경 없음 (불변)
```

### 규칙

- Domain Entity: `@freezed` (JSON 직렬화 없음, 순수 도메인)
- DTO: `@freezed` + `@JsonKey` + `fromJson`/`toJson`
- DTO → Domain: `.toDomain()` 메서드
- Domain → DTO: `DTO.fromDomain()` factory
- API 응답 key naming: `@JsonKey(name: 'snake_case')`
- 상태 모델: `@freezed sealed class` + `.when()` 패턴 매칭
- `build_runner watch` 개발 중 항상 실행
