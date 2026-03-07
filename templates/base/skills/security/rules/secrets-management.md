---
title: Secrets Management
impact: HIGH
tags: security, secrets, env, gitignore, rotation
---

# Secrets Management

## Never Hardcode Secrets
```typescript
// Bad: hardcoded secret
const API_KEY = 'sk-1234567890abcdef';
const DB_URL = 'postgres://admin:password@db:5432/prod';

// Good: environment variables
const API_KEY = process.env.API_KEY;
const DB_URL = process.env.DATABASE_URL;

// Better: secret manager for production
const API_KEY = await secretManager.getSecret('api-key');
```

## Environment Variables
- Use `.env` files for local development only
- Load with `dotenv` at application entry point, not in library code
- Validate required env vars at startup
```typescript
const required = ['DATABASE_URL', 'JWT_SECRET', 'API_KEY'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing env var: ${key}`);
}
```

## .gitignore Rules
```gitignore
# Must be in .gitignore — never commit secrets
.env
.env.local
.env.*.local
*.pem
*.key
```

- Use `.env.example` with placeholder values for documentation
- Run `git log --all -p -- .env` to verify secrets were never committed
- If a secret was committed, rotate it immediately — git history persists

## Secret Rotation
- Rotate secrets on a regular schedule (90 days recommended)
- Support dual-read during rotation (accept old + new key simultaneously)
- Automate rotation via secret manager (AWS Secrets Manager, Vault, etc.)
- Revoke old secrets after confirming the new ones work

## Production Practices
- Use a dedicated secret manager (AWS Secrets Manager, HashiCorp Vault, GCP Secret Manager)
- Grant least-privilege access to secrets per service
- Audit secret access logs regularly
- Never log secret values; mask them in error output

## Checklist
- No secrets in source code, config files, or container images
- `.env` and key files listed in `.gitignore`
- Required env vars validated at startup with clear error messages
- Secrets rotated on schedule; old secrets revoked
- Production uses a secret manager, not plain env vars
