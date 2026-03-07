---
title: Naming Conventions
impact: HIGH
tags: naming, conventions, shared
---

# Naming Conventions

프로젝트 전반에 적용되는 네이밍 규칙. 여러 스킬에서 공유.

## Files & Directories

| Type | Convention | Example |
|------|-----------|---------|
| Component | PascalCase | `UserProfile.tsx` |
| Utility | camelCase | `formatDate.ts` |
| Config | kebab-case | `tsconfig.json` |
| Test | `*.test.ts` / `*.spec.ts` | `user.test.ts` |
| Style | kebab-case | `user-profile.css` |
| Constant file | UPPER_SNAKE | `API_ENDPOINTS.ts` |

## Variables & Functions

| Type | Convention | Example |
|------|-----------|---------|
| Variable | camelCase | `userName` |
| Constant | UPPER_SNAKE_CASE | `MAX_RETRIES` |
| Function | camelCase (verb prefix) | `getUserById()` |
| Boolean | is/has/can/should prefix | `isActive`, `hasPermission` |
| Event handler | handle/on prefix | `handleClick`, `onSubmit` |
| Private | underscore prefix (convention) | `_internalCache` |

## Types & Interfaces

| Type | Convention | Example |
|------|-----------|---------|
| Interface | PascalCase (no I prefix) | `UserProfile` |
| Type alias | PascalCase | `ApiResponse` |
| Enum | PascalCase + UPPER members | `enum Status { ACTIVE, INACTIVE }` |
| Generic | Single uppercase letter | `T`, `K`, `V` |

## Database

| Type | Convention | Example |
|------|-----------|---------|
| Table | snake_case (plural) | `user_profiles` |
| Column | snake_case | `created_at` |
| Index | `idx_{table}_{columns}` | `idx_users_email` |
| Foreign Key | `fk_{table}_{ref}` | `fk_orders_user_id` |
