# @voltagent/cloudflare-d1

## 2.1.0

### Minor Changes

- [#1013](https://github.com/VoltAgent/voltagent/pull/1013) [`a35626a`](https://github.com/VoltAgent/voltagent/commit/a35626a29a9cfdc2375ac4276d58f87e0ef79f68) Thanks [@fengyun99](https://github.com/fengyun99)! - The SQL statement has been modified. Previously, the query returned the earliest messages instead of the most recent ones.

## 2.0.4

### Patch Changes

- [#915](https://github.com/VoltAgent/voltagent/pull/915) [`37cc8d3`](https://github.com/VoltAgent/voltagent/commit/37cc8d3d6e49973dff30791f4237878b20c62c24) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add Cloudflare D1 memory adapter for Workers

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
