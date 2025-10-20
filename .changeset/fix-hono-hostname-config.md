---
"@voltagent/server-hono": patch
---

Add hostname configuration option to honoServer() to support IPv6 and dual-stack networking.

The honoServer() function now accepts a `hostname` option that allows configuring which network interface the server binds to. This fixes deployment issues on platforms like Railway that require IPv6 binding for private networking.

**Example usage:**

```typescript
import { honoServer } from "@voltagent/server-hono";

new VoltAgent({
  agents,
  server: honoServer({
    port: 8080,
    hostname: "::", // Binds to IPv6/dual-stack
  }),
});
```

**Options:**

- `"0.0.0.0"` - Binds to all IPv4 interfaces (default, maintains backward compatibility)
- `"::"` - Binds to all IPv6 interfaces (dual-stack on most systems)
- `"localhost"` or `"127.0.0.1"` - Only localhost access

Fixes #694
