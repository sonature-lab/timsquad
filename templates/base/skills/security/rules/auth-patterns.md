---
title: Authentication Patterns
impact: CRITICAL
tags: security, authentication, jwt, session, password, mfa
---

# Authentication Patterns

## Password Hashing
```typescript
// Bad: plain text or weak hashing
const hash = md5(password);

// Good: bcrypt with sufficient rounds
import bcrypt from 'bcrypt';
const SALT_ROUNDS = 12;
const hash = await bcrypt.hash(password, SALT_ROUNDS);
const isValid = await bcrypt.compare(password, hash);
```

## JWT Best Practices
```typescript
// Sign with short expiry and explicit algorithm
const token = jwt.sign({ sub: user.id, role: user.role }, SECRET, {
  algorithm: 'HS256',
  expiresIn: '15m',
});

// Verify with algorithm restriction
const payload = jwt.verify(token, SECRET, { algorithms: ['HS256'] });
```

- Use short-lived access tokens (15m) + long-lived refresh tokens (7d)
- Store refresh tokens server-side; revoke on logout
- Never store sensitive data (password, PII) in JWT payload
- Rotate signing keys periodically

## Session Management
- Regenerate session ID after login to prevent fixation
- Set secure cookie flags: `httpOnly`, `secure`, `sameSite: 'strict'`
- Enforce idle and absolute timeout
```typescript
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 3600000 },
}));
```

## Multi-Factor Authentication (MFA)
- Offer TOTP (e.g., Google Authenticator) as a second factor
- Provide recovery codes at enrollment; hash them before storage
- Rate-limit MFA verification attempts to prevent brute force

## Checklist
- Hash passwords with bcrypt (rounds >= 12) or argon2
- Enforce minimum password length of 12 characters
- Lock accounts or add delays after repeated failed attempts
- Use short-lived JWTs with explicit algorithm; never use `alg: none`
- Regenerate session IDs on privilege changes
- Implement MFA for admin and sensitive operations
