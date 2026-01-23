# @voltagent/voltagent-memory

## 1.0.3

### Patch Changes

- [`b0fae14`](https://github.com/VoltAgent/voltagent/commit/b0fae149569a65439ce5f6e7f8039be6b97086e1) Thanks [@omeraplak](https://github.com/omeraplak)! - chore: bump version

## 1.0.2

### Patch Changes

- [`f6ffb8a`](https://github.com/VoltAgent/voltagent/commit/f6ffb8ae0fd95fbe920058e707d492d8c21b2505) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: VoltAgent 2.x (AI SDK v6)

  VoltAgent 2.x aligns the framework with AI SDK v6 and adds new features. VoltAgent APIs are compatible, but if you call AI SDK directly, follow the upstream v6 migration guide.

  Migration summary (1.x -> 2.x):
  1. Update VoltAgent packages
  - `npm run volt update`
  - If the CLI is missing: `npx @voltagent/cli init` then `npm run volt update`
  2. Align AI SDK packages
  - `pnpm add ai@^6 @ai-sdk/provider@^3 @ai-sdk/provider-utils@^4 @ai-sdk/openai@^3`
  - If you use UI hooks, upgrade `@ai-sdk/react` to `^3`
  3. Structured output
  - `generateObject` and `streamObject` are deprecated in VoltAgent 2.x
  - Use `generateText` / `streamText` with `Output.object(...)`

  Full migration guide: https://voltagent.dev/docs/getting-started/migration-guide/

- Updated dependencies [[`f6ffb8a`](https://github.com/VoltAgent/voltagent/commit/f6ffb8ae0fd95fbe920058e707d492d8c21b2505)]:
  - @voltagent/internal@1.0.2

## 1.0.1

### Patch Changes

- [`c3943aa`](https://github.com/VoltAgent/voltagent/commit/c3943aa89a7bee113d99404ecd5a81a62bc159c2) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: VoltAgent 2.x (AI SDK v6)

  VoltAgent 2.x aligns the framework with AI SDK v6 and adds new features. VoltAgent APIs are compatible, but if you call AI SDK directly, follow the upstream v6 migration guide.

  Migration summary (1.x -> 2.x):
  1. Update VoltAgent packages
  - `npm run volt update`
  - If the CLI is missing: `npx @voltagent/cli init` then `npm run volt update`
  2. Align AI SDK packages
  - `pnpm add ai@^6 @ai-sdk/provider@^3 @ai-sdk/provider-utils@^4 @ai-sdk/openai@^3`
  - If you use UI hooks, upgrade `@ai-sdk/react` to `^3`
  3. Structured output
  - `generateObject` and `streamObject` are deprecated in VoltAgent 2.x
  - Use `generateText` / `streamText` with `Output.object(...)`

  Full migration guide: https://voltagent.dev/docs/getting-started/migration-guide/

- Updated dependencies [[`c3943aa`](https://github.com/VoltAgent/voltagent/commit/c3943aa89a7bee113d99404ecd5a81a62bc159c2)]:
  - @voltagent/internal@1.0.1

## 1.0.0

### Major Changes

- [#894](https://github.com/VoltAgent/voltagent/pull/894) [`ee05549`](https://github.com/VoltAgent/voltagent/commit/ee055498096b1b99015a8362903712663969677f) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: VoltAgent 2.x (AI SDK v6)

  VoltAgent 2.x aligns the framework with AI SDK v6 and adds new features. VoltAgent APIs are compatible, but if you call AI SDK directly, follow the upstream v6 migration guide.

  Migration summary (1.x -> 2.x):
  1. Update VoltAgent packages
  - `npm run volt update`
  - If the CLI is missing: `npx @voltagent/cli init` then `npm run volt update`
  2. Align AI SDK packages
  - `pnpm add ai@^6 @ai-sdk/provider@^3 @ai-sdk/provider-utils@^4 @ai-sdk/openai@^3`
  - If you use UI hooks, upgrade `@ai-sdk/react` to `^3`
  3. Structured output
  - `generateObject` and `streamObject` are deprecated in VoltAgent 2.x
  - Use `generateText` / `streamText` with `Output.object(...)`

  Full migration guide: https://voltagent.dev/docs/getting-started/migration-guide/

### Patch Changes

- Updated dependencies [[`ee05549`](https://github.com/VoltAgent/voltagent/commit/ee055498096b1b99015a8362903712663969677f)]:
  - @voltagent/core@2.0.0
  - @voltagent/internal@1.0.0

## 0.1.5

### Patch Changes

- [#845](https://github.com/VoltAgent/voltagent/pull/845) [`5432f13`](https://github.com/VoltAgent/voltagent/commit/5432f13bddebd869522ebffbedd9843b4476f08b) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: workflow execution listing - #844

  Added a unified way to list workflow runs so teams can audit executions across every storage backend and surface them via the API and console.

  ## What changed
  - `queryWorkflowRuns` now exists on all memory adapters (in-memory, libsql, Postgres, Supabase, voltagent-memory) with filters for `workflowId`, `status`, `from`, `to`, `limit`, and `offset`.
  - Server routes are consolidated under `/workflows/executions` (no path param needed); `GET /workflows/:id` also returns the workflow result schema for typed clients. Handler naming is standardized to `listWorkflowRuns`.
  - VoltOps Console observability panel lists the new endpoint; REST docs updated with query params and sample responses. New unit tests cover handlers and every storage adapter.

  ## Quick fetch

  ```ts
  await fetch(
    "http://localhost:3141/workflows/executions?workflowId=expense-approval&status=completed&from=2024-01-01&to=2024-01-31&limit=20&offset=0"
  );
  ```

## 0.1.4

### Patch Changes

- [#801](https://github.com/VoltAgent/voltagent/pull/801) [`a26ddd8`](https://github.com/VoltAgent/voltagent/commit/a26ddd826692485278033c22ac9828cb51cdd749) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add triggers DSL improvements and event payload simplification
  - Introduce the new `createTriggers` DSL and expose trigger events via sensible provider names (e.g. `on.airtable.recordCreated`) rather than raw catalog IDs.
  - Add trigger span metadata propagation so VoltAgent agents receive trigger context automatically without manual mapping.
  - Simplify action dispatch payloads: `payload` now contains only the event’s raw data while trigger context lives in the `event`/`metadata` blocks, reducing boilerplate in handlers.

  ```ts
  import { VoltAgent, createTriggers } from "@voltagent/core";

  new VoltAgent({
    // ...
    triggers: createTriggers((on) => {
      on.airtable.recordCreated(({ payload, event }) => {
        console.log("New Airtable row", payload, event.metadata);
      });

      on.gmail.newEmail(({ payload }) => {
        console.log("New Gmail message", payload);
      });
    }),
  });
  ```

## 0.1.3

### Patch Changes

- [#787](https://github.com/VoltAgent/voltagent/pull/787) [`5e81d65`](https://github.com/VoltAgent/voltagent/commit/5e81d6568ba3bee26083ca2a8e5d31f158e36fc0) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add full conversation step persistence across the stack:
  - Core now exposes managed-memory step APIs, and the VoltAgent managed memory adapter persists/retrieves steps through VoltOps.
  - LibSQL, PostgreSQL, Supabase, and server handlers provision the new `_steps` table, wire up DTOs/routes, and surface the data in Observability/Steps UI (including managed-memory backends).

  fixes: #613

## 0.1.2

### Patch Changes

- [#693](https://github.com/VoltAgent/voltagent/pull/693) [`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e) Thanks [@marinoska](https://github.com/marinoska)! - - Added support for provider-defined tools (e.g. `openai.tools.webSearch()`)
  - Update tool normalization to pass through provider tool metadata untouched.
  - Added support for provider-defined tools both as standalone tool and within a toolkit.
  - Upgraded dependency: `ai` → `^5.0.76`
- Updated dependencies [[`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e)]:
  - @voltagent/internal@0.0.12

## 0.1.1

### Patch Changes

- [#641](https://github.com/VoltAgent/voltagent/pull/641) [`4c42bf7`](https://github.com/VoltAgent/voltagent/commit/4c42bf72834d3cd45ff5246ef65d7b08470d6a8e) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: introduce managed memory - ready-made cloud storage for VoltAgent

  ## What Changed for You

  VoltAgent now offers a managed memory solution that eliminates the need to run your own database infrastructure. The new `@voltagent/voltagent-memory` package provides a `ManagedMemoryAdapter` that connects to VoltOps Managed Memory service, perfect for pilots, demos, and production workloads.

  ## New Package: @voltagent/voltagent-memory

  ### Automatic Setup (Recommended)

  Get your credentials from [console.voltagent.dev/memory/managed-memory](https://console.voltagent.dev/memory/managed-memory) and set environment variables:

  ```bash
  # .env
  VOLTAGENT_PUBLIC_KEY=pk_...
  VOLTAGENT_SECRET_KEY=sk_...
  ```

  ```typescript
  import { Agent, Memory } from "@voltagent/core";
  import { ManagedMemoryAdapter } from "@voltagent/voltagent-memory";
  import { openai } from "@ai-sdk/openai";

  // Adapter automatically uses VoltOps credentials from environment
  const agent = new Agent({
    name: "Assistant",
    instructions: "You are a helpful assistant",
    model: openai("gpt-4o-mini"),
    memory: new Memory({
      storage: new ManagedMemoryAdapter({
        databaseName: "production-memory",
      }),
    }),
  });

  // Use like any other agent - memory is automatically persisted
  const result = await agent.generateText("Hello!", {
    userId: "user-123",
    conversationId: "conv-456",
  });
  ```

  ### Manual Setup

  Pass a `VoltOpsClient` instance explicitly:

  ```typescript
  import { Agent, Memory, VoltOpsClient } from "@voltagent/core";
  import { ManagedMemoryAdapter } from "@voltagent/voltagent-memory";
  import { openai } from "@ai-sdk/openai";

  const voltOpsClient = new VoltOpsClient({
    publicKey: process.env.VOLTAGENT_PUBLIC_KEY!,
    secretKey: process.env.VOLTAGENT_SECRET_KEY!,
  });

  const agent = new Agent({
    name: "Assistant",
    instructions: "You are a helpful assistant",
    model: openai("gpt-4o-mini"),
    memory: new Memory({
      storage: new ManagedMemoryAdapter({
        databaseName: "production-memory",
        voltOpsClient, // explicit client
      }),
    }),
  });
  ```

  ### Vector Storage (Optional)

  Enable semantic search with `ManagedMemoryVectorAdapter`:

  ```typescript
  import { ManagedMemoryAdapter, ManagedMemoryVectorAdapter } from "@voltagent/voltagent-memory";
  import { Memory } from "@voltagent/core";

  const memory = new Memory({
    storage: new ManagedMemoryAdapter({
      databaseName: "production-memory",
    }),
    embedding: "openai/text-embedding-3-small",
    vector: new ManagedMemoryVectorAdapter({
      databaseName: "production-memory",
    }),
  });
  ```

  ## Key Features
  - **Zero Infrastructure**: No need to provision or manage databases
  - **Quick Setup**: Create a managed memory database in under 3 minutes from VoltOps Console
  - **Framework Parity**: Works identically to local Postgres, LibSQL, or Supabase adapters
  - **Production Ready**: Managed infrastructure with reliability guardrails
  - **Multi-Region**: Available in US (Virginia) and EU (Germany)

  ## Getting Started
  1. **Install the package**:

  ```bash
  npm install @voltagent/voltagent-memory
  # or
  pnpm add @voltagent/voltagent-memory
  ```

  2. **Create a managed database**:
     - Navigate to [console.voltagent.dev/memory/managed-memory](https://console.voltagent.dev/memory/managed-memory)
     - Click **Create Database**
     - Enter a name and select region (US or EU)
     - Copy your VoltOps API keys from Settings
  3. **Configure environment variables**:

  ```bash
  VOLTAGENT_PUBLIC_KEY=pk_...
  VOLTAGENT_SECRET_KEY=sk_...
  ```

  4. **Use the adapter**:

  ```typescript
  import { ManagedMemoryAdapter } from "@voltagent/voltagent-memory";
  import { Memory } from "@voltagent/core";

  const memory = new Memory({
    storage: new ManagedMemoryAdapter({
      databaseName: "your-database-name",
    }),
  });
  ```

  ## Why This Matters
  - **Faster Prototyping**: Launch pilots without database setup
  - **Reduced Complexity**: No infrastructure management overhead
  - **Consistent Experience**: Same StorageAdapter interface across all memory providers
  - **Scalable Path**: Start with managed memory, migrate to self-hosted when needed
  - **Multi-Region Support**: Deploy close to your users in US or EU

  ## Migration Notes

  Existing agents using local storage adapters (InMemory, LibSQL, Postgres, Supabase) continue to work unchanged. Managed memory is an optional addition that provides a cloud-hosted alternative for teams who prefer not to manage their own database infrastructure.
