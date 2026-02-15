# {PROJECT_NAME} 서비스 명세서

**Version**: 1.0
**Created**: {DATE}
**Base URL**: `https://api.example.com/v1`

---

## 1. 개요

### 1.1 API 규칙

- **인증**: Bearer Token (JWT)
- **Content-Type**: `application/json`
- **날짜 형식**: ISO 8601 (`YYYY-MM-DDTHH:mm:ssZ`)

### 1.2 공통 응답 형식

```json
{
  "success": true,
  "data": { },
  "error": null
}
```

### 1.3 에러 응답 형식

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

→ 에러 코드 상세: [error-codes.md](./error-codes.md)

---

## 2. Auth

### 2.1 로그인

| 항목 | 값 |
|-----|---|
| **Endpoint** | `POST /auth/login` |
| **설명** | 사용자 로그인 및 토큰 발급 |
| **인증** | 불필요 |

#### Request

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| email | string | ✅ | 이메일 주소 |
| password | string | ✅ | 비밀번호 |

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Response (200 OK)

| Field | Type | Description |
|-------|------|-------------|
| accessToken | string | JWT 액세스 토큰 |
| refreshToken | string | 리프레시 토큰 |
| expiresIn | number | 만료 시간 (초) |
| user | object | 사용자 정보 |

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG...",
    "expiresIn": 3600,
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "홍길동"
    }
  }
}
```

#### Errors

| Code | HTTP | Description |
|------|------|-------------|
| AUTH_001 | 401 | 잘못된 이메일 또는 비밀번호 |
| AUTH_002 | 403 | 계정 비활성화 |

---

### 2.2 토큰 갱신

| 항목 | 값 |
|-----|---|
| **Endpoint** | `POST /auth/refresh` |
| **설명** | 액세스 토큰 갱신 |
| **인증** | 불필요 |

#### Request

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| refreshToken | string | ✅ | 리프레시 토큰 |

#### Response (200 OK)

| Field | Type | Description |
|-------|------|-------------|
| accessToken | string | 새 JWT 액세스 토큰 |
| expiresIn | number | 만료 시간 (초) |

#### Errors

| Code | HTTP | Description |
|------|------|-------------|
| AUTH_003 | 401 | 유효하지 않은 리프레시 토큰 |
| AUTH_004 | 401 | 만료된 리프레시 토큰 |

---

## 3. Users

### 3.1 사용자 조회

| 항목 | 값 |
|-----|---|
| **Endpoint** | `GET /users/:id` |
| **설명** | 사용자 정보 조회 |
| **인증** | ✅ Bearer Token |
| **권한** | 본인 또는 Admin |

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | 사용자 ID |

#### Response (200 OK)

| Field | Type | Description |
|-------|------|-------------|
| id | string | 사용자 ID |
| email | string | 이메일 |
| name | string | 이름 |
| createdAt | string | 가입일 (ISO 8601) |

---

## 4. [Resource Name]

### 4.1 [Action Name]

| 항목 | 값 |
|-----|---|
| **Endpoint** | `METHOD /path` |
| **설명** | |
| **인증** | |

#### Request

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| | | | |

#### Response (200 OK)

| Field | Type | Description |
|-------|------|-------------|
| | | |

#### Errors

| Code | HTTP | Description |
|------|------|-------------|
| | | |

---

## 5. 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|-----|-----|----------|-------|
| 1.0 | {DATE} | 최초 작성 | |
