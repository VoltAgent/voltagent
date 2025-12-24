---
"@voltagent/libsql": minor
---

Add Edge/Cloudflare Workers support for @voltagent/libsql

- New `@voltagent/libsql/edge` export for edge runtimes
- Refactored adapters into core classes with dependency injection
- Edge adapters use `@libsql/client/web` for fetch-based transport
- Core uses DataView/ArrayBuffer for cross-platform compatibility
- Node.js adapters override with Buffer for better performance

Usage:

```typescript
import { LibSQLMemoryAdapter } from "@voltagent/libsql/edge";

const adapter = new LibSQLMemoryAdapter({
  url: "libsql://your-db.turso.io",
  authToken: "your-token",
});
```
