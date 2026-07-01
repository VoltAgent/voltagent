# @voltagent/sandbox-blaxel

## 2.1.1

### Patch Changes

- [#1354](https://github.com/VoltAgent/voltagent/pull/1354) [`af4f6f2`](https://github.com/VoltAgent/voltagent/commit/af4f6f23726edf4afda698bcf35828779ce96a60) Thanks [@nuthalapativarun](https://github.com/nuthalapativarun)! - Add README documentation

## 2.1.0

### Minor Changes

- [#1275](https://github.com/VoltAgent/voltagent/pull/1275) [`74eb6f0`](https://github.com/VoltAgent/voltagent/commit/74eb6f016da09fc8982b73e7934d76d535aa2910) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - Add `@voltagent/sandbox-blaxel` — a new workspace sandbox provider that runs your agents' shell commands inside [Blaxel](https://blaxel.ai)-managed sandboxes.

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
