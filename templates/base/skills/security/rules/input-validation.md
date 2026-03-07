---
title: Input Validation
impact: CRITICAL
tags: security, validation, sanitization, injection
---

# Input Validation

## Principle
Never trust user input. Validate, sanitize, and constrain all external data before processing.

## Allowlist Over Denylist
```typescript
// Bad: denylist — easy to bypass
const forbidden = ['<script>', 'onclick', 'onerror'];
if (forbidden.some(f => input.includes(f))) throw new Error('Invalid');

// Good: allowlist — only permit known-safe values
const ALLOWED_ROLES = ['admin', 'editor', 'viewer'] as const;
if (!ALLOWED_ROLES.includes(role)) throw new Error('Invalid role');
```

## Schema Validation
```typescript
import { z } from 'zod';

const UserInput = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email().max(254),
  age: z.number().int().min(0).max(150),
});

// Validate at boundary (controller/handler)
const data = UserInput.parse(req.body);
```

## Parameterized Queries
```typescript
// Bad: string interpolation — SQL injection risk
const q = `SELECT * FROM users WHERE id = '${id}'`;

// Good: parameterized query
const q = 'SELECT * FROM users WHERE id = $1';
await db.query(q, [id]);

// Good: ORM with type-safe parameters
await userRepo.findOneBy({ id: parseInt(id, 10) });
```

## Sanitize HTML Output
```typescript
// Bad
element.innerHTML = userInput;

// Good: escape or use textContent
element.textContent = userInput;

// Good: DOMPurify for rich content
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userInput);
```

## Checklist
- Validate type, length, format, and range at the application boundary
- Use allowlists for enumerated values (roles, statuses, types)
- Use parameterized queries or ORM — never interpolate user input into SQL
- Sanitize output based on context (HTML, URL, SQL, shell)
- Reject unexpected fields; do not pass raw request bodies to business logic
