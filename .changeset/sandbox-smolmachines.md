---
"@voltagent/sandbox-smolmachines": minor
---

Add `@voltagent/sandbox-smolmachines`, a workspace sandbox provider that runs your agents' shell commands inside a [smol machines](https://smolmachines.com) microVM on your own machine. It needs no account and no Docker, on macOS on Apple Silicon, or Linux x64 or arm64 with glibc and KVM.

```ts
import { Workspace } from "@voltagent/core";
import { SmolMachinesSandbox } from "@voltagent/sandbox-smolmachines";

const workspace = new Workspace({
  sandbox: new SmolMachinesSandbox({
    config: { image: "python:3.12", network: true },
  }),
});
```

Supports streaming stdout/stderr, per-call timeouts and `AbortSignal` that kill the command inside the machine, output truncation, lazy creation and `destroy()`. Reach the underlying `Machine` via `sandbox.getSandbox()` for file and image APIs.
