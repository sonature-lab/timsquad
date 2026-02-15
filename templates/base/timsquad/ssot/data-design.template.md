# {PROJECT_NAME} 데이터 설계서

**Version**: 1.0
**Created**: {DATE}
**Database**: PostgreSQL / MySQL / MongoDB

---

## 1. ERD

```
┌─────────────────┐       ┌─────────────────┐
│     users       │       │     posts       │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │───┐   │ id (PK)         │
│ email           │   │   │ user_id (FK)    │──┐
│ name            │   └──▶│ title           │  │
│ password_hash   │       │ content         │  │
│ created_at      │       │ created_at      │  │
│ updated_at      │       │ updated_at      │  │
└─────────────────┘       └─────────────────┘  │
                                               │
                          ┌─────────────────┐  │
                          │    comments     │  │
                          ├─────────────────┤  │
                          │ id (PK)         │  │
                          │ post_id (FK)    │◀─┘
                          │ user_id (FK)    │
                          │ content         │
                          │ created_at      │
                          └─────────────────┘
```

---

## 2. 테이블 정의

### 2.1 users

사용자 정보를 저장하는 테이블.

| Column | Type | Nullable | Default | Description |
|--------|------|:--------:|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| email | VARCHAR(255) | NO | | 이메일 (UNIQUE) |
| name | VARCHAR(100) | NO | | 이름 |
| password_hash | VARCHAR(255) | NO | | 암호화된 비밀번호 |
| status | VARCHAR(20) | NO | 'active' | active, inactive, suspended |
| created_at | TIMESTAMP | NO | now() | 생성일 |
| updated_at | TIMESTAMP | NO | now() | 수정일 |

**Indexes:**
| Name | Columns | Type | Description |
|------|---------|------|-------------|
| users_pkey | id | PK | |
| users_email_unique | email | UNIQUE | 이메일 중복 방지 |
| users_status_idx | status | INDEX | 상태 조회용 |

---

### 2.2 [table_name]

[테이블 설명]

| Column | Type | Nullable | Default | Description |
|--------|------|:--------:|---------|-------------|
| | | | | |

**Indexes:**
| Name | Columns | Type | Description |
|------|---------|------|-------------|
| | | | |

**Foreign Keys:**
| Column | References | On Delete | On Update |
|--------|------------|-----------|-----------|
| | | | |

---

## 3. ENUM 정의

### 3.1 user_status

| Value | Description |
|-------|-------------|
| active | 활성 |
| inactive | 비활성 |
| suspended | 정지 |

---

## 4. 데이터 마이그레이션

### 4.1 초기 데이터

```sql
-- Admin 사용자
INSERT INTO users (email, name, password_hash, status)
VALUES ('admin@example.com', 'Admin', '$2b$...', 'active');
```

### 4.2 마이그레이션 이력

| Version | Date | Description |
|---------|------|-------------|
| 001 | {DATE} | 초기 스키마 생성 |

---

## 5. 백업 및 복구

### 5.1 백업 정책

| 유형 | 주기 | 보존 기간 |
|-----|-----|----------|
| Full Backup | 일 1회 | 30일 |
| Incremental | 시간 1회 | 7일 |

### 5.2 복구 절차

1.
2.
3.

---

## 6. 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|-----|-----|----------|-------|
| 1.0 | {DATE} | 최초 작성 | |
