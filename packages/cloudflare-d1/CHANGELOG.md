# @voltagent/cloudflare-d1

## 2.1.2

### Patch Changes

- [#1085](https://github.com/VoltAgent/voltagent/pull/1085) [`f275daf`](https://github.com/VoltAgent/voltagent/commit/f275dafffa16e80deba391ce015fba6f6d6cd876) Thanks [@omeraplak](https://github.com/omeraplak)! - Fix workflow execution filtering by persisted metadata across adapters.
  - Persist `options.metadata` on workflow execution state so `/workflows/executions` filters can match tenant/user metadata.
  - Preserve existing execution metadata when updating cancelled/error workflow states.
  - Accept `options.metadata` in server workflow execution request schema.
  - Fix LibSQL and Cloudflare D1 JSON metadata query comparisons for `metadata` and `metadata.<key>` filters.

- [#1082](https://github.com/VoltAgent/voltagent/pull/1082) [`73cf1d3`](https://github.com/VoltAgent/voltagent/commit/73cf1d32c5ffdfd3197cc9b0661350449aca2b3a) Thanks [@omeraplak](https://github.com/omeraplak)! - Fix workflow state persistence parity across SQL adapters.

  This update persists and returns `input`, `context`, and top-level `workflowState` in workflow state operations. It also ensures suspended workflow state queries include `events`, `output`, and `cancellation`, and adds adapter migrations/column additions where needed.

## 2.1.1

### Patch Changes

- [#1040](https://github.com/VoltAgent/voltagent/pull/1040) [`5e54d3b`](https://github.com/VoltAgent/voltagent/commit/5e54d3b54e2823479788617ce0a1bb5211260f9b) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add multi-tenant filters to workflow execution listing (`/workflows/executions`)

  You can now filter workflow execution history by `userId` and metadata fields in addition to
  existing filters (`workflowId`, `status`, `from`, `to`, `limit`, `offset`).

  ### What's New
  - Added `userId` filter support for workflow run queries.
  - Added metadata filtering support:
    - `metadata` as URL-encoded JSON object
    - `metadata.<key>` query params (for example: `metadata.tenantId=acme`)
  - Added status aliases for compatibility:
    - `success` -> `completed`
    - `pending` -> `running`
  - Implemented consistently across storage adapters:
    - In-memory
    - PostgreSQL
    - LibSQL
    - Supabase
    - Cloudflare D1
    - Managed Memory (`@voltagent/voltagent-memory`)
  - Updated server docs and route descriptions to include new filters.

  ### TypeScript Example

  ```ts
  const params = new URLSearchParams({
    workflowId: "order-approval",
    status: "completed",
    userId: "user-123",
    "metadata.tenantId": "acme",
    "metadata.region": "eu",
    limit: "20",
    offset: "0",
  });

  const response = await fetch(`http://localhost:3141/workflows/executions?${params.toString()}`);
  const data = await response.json();
  ```

  ### cURL Examples

  ```bash
  # Filter by workflow + user + metadata key
  curl "http://localhost:3141/workflows/executions?workflowId=order-approval&userId=user-123&metadata.tenantId=acme&status=completed&limit=20&offset=0"
  ```

  ```bash
  # Filter by metadata JSON object (URL-encoded)
  curl "http://localhost:3141/workflows/executions?metadata=%7B%22tenantId%22%3A%22acme%22%2C%22region%22%3A%22eu%22%7D"
  ```

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
