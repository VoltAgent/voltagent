---
"@voltagent/sandbox-tenki": minor
---

Add `@voltagent/sandbox-tenki` — a new workspace sandbox provider that runs your agents' shell commands inside disposable [Tenki](https://tenki.cloud) Linux microVMs.

```ts
import { Workspace } from "@voltagent/core";
import { TenkiSandbox } from "@voltagent/sandbox-tenki";

const workspace = new Workspace({
  sandbox: new TenkiSandbox({
    apiKey: process.env.TENKI_API_KEY,
  }),
});
```

Supports streaming stdout/stderr, per-call timeouts and `AbortSignal`, `cwd`/`env`/`stdin` forwarding, output truncation via `maxOutputBytes`, and lazy provisioning with explicit `start()`/`stop()`/`destroy()` control. `createTenkiToolkit(sandbox)` adds optional `expose_preview_url` and `authorize_ssh_key` tools, and `sandbox.getSandbox()` hands you the underlying Tenki session for provider-specific APIs (filesystem, port exposure, SSH). Tenki sessions are billed resources, so call `workspace.destroy()` when you are done.
