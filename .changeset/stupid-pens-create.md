---
"@voltagent/core": patch
---

fix: expose step-level retries typing in workflow chains

Type definitions now include `retries` and `retryCount` for `andThen` and `andTap`, matching the runtime behavior.

```ts
import { createWorkflowChain } from "@voltagent/core";

createWorkflowChain({ id: "retry-demo" })
  .andThen({
    id: "fetch-user",
    retries: 2,
    execute: async ({ data, retryCount }) => {
      if (retryCount && retryCount < 2) {
        throw new Error("transient");
      }
      return { ...data, ok: true };
    },
  })
  .andTap({
    id: "audit",
    execute: async ({ data, retryCount }) => {
      console.log("tap", retryCount, data);
    },
  });
```
