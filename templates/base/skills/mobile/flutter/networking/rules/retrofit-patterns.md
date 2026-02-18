---
title: Retrofit Code Generation Patterns
impact: HIGH
impactDescription: "수동 API 코드 → 오타, 타입 불일치, 유지보수 비용 증가"
tags: retrofit, code-generation, build-runner, freezed, rest-api
---

## Retrofit Code Generation Patterns

**Impact: HIGH (수동 API 코드 → 오타, 타입 불일치, 유지보수 비용 증가)**

Retrofit으로 타입 안전한 API 클라이언트 자동 생성.
freezed 모델과 연동하여 불변 데이터 클래스 + JSON 직렬화.

### 의존성

```yaml
# pubspec.yaml
dependencies:
  dio: ^5.7.0
  retrofit: ^4.4.0
  json_annotation: ^4.9.0
  freezed_annotation: ^2.4.0

dev_dependencies:
  retrofit_generator: ^9.1.0
  build_runner: ^2.4.0
  json_serializable: ^6.8.0
  freezed: ^2.5.0
```

### API 클라이언트 정의

**Incorrect (수동 HTTP 호출):**
```dart
class UserApi {
  final Dio dio;
  UserApi(this.dio);

  Future<User> getUser(String id) async {
    final response = await dio.get('/users/$id');
    return User.fromJson(response.data);
    // → 경로 오타, 파라미터 누락 가능, 타입 안전하지 않음
  }
}
```

**Correct (Retrofit 어노테이션 + 코드 생성):**
```dart
// lib/core/networking/api/user_api.dart
import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';

part 'user_api.g.dart';

@RestApi()
abstract class UserApi {
  factory UserApi(Dio dio, {String baseUrl}) = _UserApi;

  @GET('/users/{id}')
  Future<UserResponse> getUser(@Path('id') String id);

  @GET('/users')
  Future<PaginatedResponse<UserResponse>> getUsers(
    @Query('page') int page,
    @Query('limit') int limit,
  );

  @POST('/users')
  Future<UserResponse> createUser(@Body() CreateUserRequest request);

  @PUT('/users/{id}')
  Future<UserResponse> updateUser(
    @Path('id') String id,
    @Body() UpdateUserRequest request,
  );

  @DELETE('/users/{id}')
  Future<void> deleteUser(@Path('id') String id);

  @POST('/users/{id}/avatar')
  @MultiPart()
  Future<AvatarResponse> uploadAvatar(
    @Path('id') String id,
    @Part(name: 'file') File avatar,
  );
}
```

### freezed 응답 모델

```dart
// lib/features/user/data/models/user_response.dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'user_response.freezed.dart';
part 'user_response.g.dart';

@freezed
class UserResponse with _$UserResponse {
  const factory UserResponse({
    required String id,
    required String name,
    required String email,
    String? avatarUrl,
    @JsonKey(name: 'created_at') required DateTime createdAt,
    @Default(false) bool isVerified,
  }) = _UserResponse;

  factory UserResponse.fromJson(Map<String, dynamic> json) =>
      _$UserResponseFromJson(json);
}

/// 페이지네이션 래퍼
@freezed
class PaginatedResponse<T> with _$PaginatedResponse<T> {
  const factory PaginatedResponse({
    required List<T> data,
    required int total,
    required int page,
    required int lastPage,
  }) = _PaginatedResponse<T>;

  factory PaginatedResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Object?) fromJsonT,
  ) => _$PaginatedResponseFromJson(json, fromJsonT);
}
```

### 요청 모델

```dart
@freezed
class CreateUserRequest with _$CreateUserRequest {
  const factory CreateUserRequest({
    required String name,
    required String email,
    String? phoneNumber,
  }) = _CreateUserRequest;

  factory CreateUserRequest.fromJson(Map<String, dynamic> json) =>
      _$CreateUserRequestFromJson(json);
}
```

### Riverpod Provider 구성

```dart
/// API Provider
final userApiProvider = Provider<UserApi>((ref) {
  return UserApi(ref.watch(dioProvider));
});

/// Repository — API + 에러 변환
final userRepositoryProvider = Provider<UserRepository>((ref) {
  return UserRepository(api: ref.watch(userApiProvider));
});

class UserRepository {
  final UserApi _api;

  UserRepository({required UserApi api}) : _api = api;

  Future<Result<UserResponse>> getUser(String id) async {
    try {
      final response = await _api.getUser(id);
      return Success(response);
    } on DioException catch (e) {
      return Failure(NetworkFailure.fromDioException(e));
    }
  }
}
```

### 코드 생성

```bash
# 1회 실행
dart run build_runner build --delete-conflicting-outputs

# 개발 중 자동 생성 (파일 변경 감지)
dart run build_runner watch --delete-conflicting-outputs
```

### 규칙

- `@RestApi(baseUrl: '')` — baseUrl은 빈 문자열, Dio BaseOptions에서 관리
- 응답/요청 모델은 freezed + json_serializable (불변 + 자동 직렬화)
- `@JsonKey(name: 'snake_case')` — 서버 필드명과 클라이언트 필드명 매핑
- `@Part(name: 'file')` — multipart 업로드 시 서버 기대 필드명 명시
- `.g.dart` 파일은 버전 관리에 포함하지 않음 (`.gitignore` 에 추가 가능)
- `build_runner watch` 로 개발 중 자동 생성 — 수동 생성 후 커밋 잊음 방지
- API 클라이언트와 Repository 분리 — API는 순수 HTTP, Repository에서 에러 변환
