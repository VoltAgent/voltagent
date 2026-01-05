---
"@voltagent/cloudflare-d1": patch
---

feat: add Cloudflare D1 memory adapter for Workers

You can now persist Memory V2 in Cloudflare D1 using `@voltagent/cloudflare-d1`. The adapter accepts a
D1 binding directly, so you can keep Worker bindings inside your `fetch` handler and wire them into
VoltAgent via a small factory.

Serverless routes still inject Worker `env` into request contexts for ad-hoc access in tools or
workflow steps. The D1 memory adapter does not require this and works with the binding directly.

Usage:

```ts
import { Memory } from "@voltagent/core";
import { D1MemoryAdapter } from "@voltagent/cloudflare-d1";

const memory = new Memory({
  storage: new D1MemoryAdapter({
    binding: env.DB,
  }),
});
```
