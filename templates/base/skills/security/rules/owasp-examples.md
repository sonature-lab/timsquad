---
title: OWASP Top 10 Security Patterns
impact: CRITICAL
tags: security, owasp, vulnerability
---

# OWASP Top 10 — 코드 예시

## 1. Injection
```typescript
// Bad
const query = `SELECT * FROM users WHERE email = '${email}'`;

// Good: Parameterized Query
const query = 'SELECT * FROM users WHERE email = $1';
await db.query(query, [email]);
// Good: ORM 사용
await userRepository.findOne({ where: { email } });
```

## 2. Broken Authentication
```typescript
// Bad
if (password.length >= 4) { ... }

// Good
const passwordPolicy = {
  minLength: 12, requireUppercase: true, requireLowercase: true,
  requireNumber: true, requireSpecialChar: true,
};
const hash = await bcrypt.hash(password, 12);
```

## 3. Sensitive Data Exposure
```typescript
// Bad
logger.info('User login', { email, password });
return { ...user }; // passwordHash 포함

// Good
logger.info('User login', { email, password: '***' });
return userToDto(user); // passwordHash 제외
```

## 5. Broken Access Control
```typescript
// Bad
app.get('/api/users/:id', async (req, res) => {
  const user = await userService.getUser(req.params.id);
  return res.json(user);
});

// Good
app.get('/api/users/:id', authenticate, authorize('user:read'), async (req, res) => {
  if (req.user.id !== req.params.id && !req.user.isAdmin) throw new ForbiddenError();
  const user = await userService.getUser(req.params.id);
  return res.json(user);
});
```

## 6. Security Misconfiguration
```typescript
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"] },
}));
app.use(cors({ origin: ['https://allowed-domain.com'], credentials: true }));
```

## 7. XSS
```typescript
// Bad
element.innerHTML = userInput;
// Good
element.textContent = userInput;
```

## 8. Insecure Deserialization
```typescript
// Bad
const data = JSON.parse(userInput);
// Good
const schema = z.object({ name: z.string().max(100), age: z.number().min(0) });
const data = schema.parse(JSON.parse(userInput));
```

## 9. Known Vulnerabilities
```bash
npm audit && npm audit fix
npm outdated && npm update
```

## 10. Insufficient Logging
```typescript
logger.warn('Login failed', { email, ip: req.ip, timestamp: new Date().toISOString() });
if (failedAttempts >= 5) {
  logger.error('Possible brute force attack', { email, ip: req.ip });
  await lockAccount(email);
}
```

## Additional Checks

### Rate Limiting
```typescript
import rateLimit from 'express-rate-limit';
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
```

### CSRF 방지
```typescript
import csrf from 'csurf';
app.use(csrf({ cookie: true }));
```

### 시크릿 관리
- **금지**: `const apiKey = 'sk-1234567890';`
- **필수**: `const apiKey = process.env.API_KEY;`
- **권장**: `await secretManager.getSecret('api-key');`
