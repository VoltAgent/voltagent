---
"@voltagent/sandbox-blaxel": minor
---

Add `@voltagent/sandbox-blaxel` — a new workspace sandbox provider that runs your agents' shell commands inside [Blaxel](https://blaxel.ai)-managed sandboxes.

```ts
import { Workspace } from "@voltagent/core";
import { BlaxelSandbox } from "@voltagent/sandbox-blaxel";

const workspace = new Workspace({
  sandbox: new BlaxelSandbox({
    apiKey: process.env.BL_API_KEY,
    workspace: process.env.BL_WORKSPACE,
    config: { name: "voltagent-prod", region: "us-pdx-1" },
  }),
});
```

Supports streaming stdout/stderr, per-call timeouts and `AbortSignal`, output truncation, and lazy provisioning. Reach the underlying Blaxel SDK directly via `sandbox.getSandbox()` when you need provider-specific APIs (filesystem, previews, sessions, etc.).
