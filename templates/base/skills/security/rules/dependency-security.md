---
title: Dependency Security
impact: HIGH
tags: security, dependencies, npm-audit, supply-chain, license
---

# Dependency Security

## npm audit
```bash
# Check for known vulnerabilities
npm audit

# Fix automatically where possible
npm audit fix

# Fail CI on critical/high vulnerabilities
npm audit --audit-level=high
```

- Run `npm audit` in CI pipelines; block merges on high/critical findings
- Review advisories before applying `npm audit fix --force` (may include breaking changes)
- Use tools like `socket.dev` or `snyk` for deeper analysis

## Lockfile Integrity
- Always commit `package-lock.json` to version control
- Use `npm ci` in CI/CD (respects lockfile exactly, fails on mismatch)
- Review lockfile diffs in PRs for unexpected changes
```bash
# CI install — strict, reproducible
npm ci

# Never use `npm install` in CI — it can modify the lockfile
```

## Supply Chain Attack Prevention
- Pin exact versions for critical dependencies
- Verify package provenance when available (`npm audit signatures`)
- Be cautious with post-install scripts; audit new dependencies before adding
```bash
# Check what scripts a package runs
npm explain <package>
npm pack <package> --dry-run  # inspect contents before install

# Disable scripts for untrusted packages
npm install --ignore-scripts <package>
```

- Prefer well-maintained packages with large user bases
- Monitor for typosquatting (e.g., `lodash` vs `l0dash`)
- Use `npm-shrinkwrap.json` for published packages requiring locked deps

## License Compliance
```bash
# Check licenses of all dependencies
npx license-checker --summary
npx license-checker --failOn 'GPL-3.0;AGPL-3.0'
```

- Define an allowlist of acceptable licenses for the project
- Block copyleft licenses (GPL, AGPL) in proprietary codebases
- Document license policy and automate checks in CI

## Checklist
- `npm audit` runs in CI; high/critical findings block deployment
- `package-lock.json` committed; CI uses `npm ci`
- New dependencies reviewed for maintenance status, size, and scripts
- License compliance checked automatically; policy documented
- Lockfile diffs reviewed in pull requests
