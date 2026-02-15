---
title: Deployment
impact: LOW
tags: deployment, graceful-shutdown
---

## Graceful Shutdown

```typescript
// src/index.ts
import { serve } from '@hono/node-server';
import app from './app';
import { config } from './config';
import { prisma } from './infrastructure/database/prisma';

const server = serve({
  fetch: app.fetch,
  port: config.PORT,
  hostname: config.HOST,
}, (info) => {
  console.log(`Server running at http://${info.address}:${info.port}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received. Shutting down...`);
  server.close(() => console.log('HTTP server closed'));
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```
