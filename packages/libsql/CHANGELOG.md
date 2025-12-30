# @voltagent/libsql

## 2.0.1

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

## 2.0.0

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
  - @voltagent/logger@2.0.0

## 1.1.0

### Minor Changes

- [#887](https://github.com/VoltAgent/voltagent/pull/887) [`25f3859`](https://github.com/VoltAgent/voltagent/commit/25f38592293e77852f0e9e814c6c8548fcbad1a5) Thanks [@nt9142](https://github.com/nt9142)! - Add Edge/Cloudflare Workers support for @voltagent/libsql
  - New `@voltagent/libsql/edge` export for edge runtimes
  - Refactored adapters into core classes with dependency injection
  - Edge adapters use `@libsql/client/web` for fetch-based transport
  - Core uses DataView/ArrayBuffer for cross-platform compatibility
  - Node.js adapters override with Buffer for better performance

  Usage:

  ```typescript
  import { LibSQLMemoryAdapter } from "@voltagent/libsql/edge";

  const adapter = new LibSQLMemoryAdapter({
    url: "libsql://your-db.turso.io",
    authToken: "your-token",
  });
  ```

## 1.0.14

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

## 1.0.13

### Patch Changes

- [#820](https://github.com/VoltAgent/voltagent/pull/820) [`c5e0c89`](https://github.com/VoltAgent/voltagent/commit/c5e0c89554d85c895e3d6cbfc83ad47bd53a1b9f) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: expose createdAt in memory.getMessages

  ## What Changed

  The `createdAt` timestamp is now exposed in the `metadata` object of messages retrieved via `memory.getMessages()`. This ensures that the creation time of messages is accessible across all storage adapters (`InMemory`, `Supabase`, `LibSQL`, `PostgreSQL`).

  ## Usage

  You can now access the `createdAt` timestamp from the message metadata:

  ```typescript
  const messages = await memory.getMessages(userId, conversationId);

  messages.forEach((message) => {
    console.log(`Message ID: ${message.id}`);
    console.log(`Created At: ${message.metadata?.createdAt}`);
  });
  ```

  This change aligns the behavior of all storage adapters and ensures consistent access to message timestamps.

## 1.0.12

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

## 1.0.11

### Patch Changes

- [#787](https://github.com/VoltAgent/voltagent/pull/787) [`5e81d65`](https://github.com/VoltAgent/voltagent/commit/5e81d6568ba3bee26083ca2a8e5d31f158e36fc0) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add full conversation step persistence across the stack:
  - Core now exposes managed-memory step APIs, and the VoltAgent managed memory adapter persists/retrieves steps through VoltOps.
  - LibSQL, PostgreSQL, Supabase, and server handlers provision the new `_steps` table, wire up DTOs/routes, and surface the data in Observability/Steps UI (including managed-memory backends).

  fixes: #613

## 1.0.10

### Patch Changes

- [#738](https://github.com/VoltAgent/voltagent/pull/738) [`d3ed347`](https://github.com/VoltAgent/voltagent/commit/d3ed347e064cb36e04ed1ea98d9305b63fd968ec) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: persist workflow execution timeline events to prevent data loss after completion - #647

  ## The Problem

  When workflows executed, their timeline events (step-start, step-complete, workflow-complete, etc.) were only visible during streaming. Once the workflow completed, the WebSocket state update would replace the execution object without the events field, causing the timeline UI to reset and lose all execution history. Users couldn't see what happened in completed or suspended workflows.

  **Symptoms:**
  - Timeline showed events during execution
  - Timeline cleared/reset when workflow completed
  - No execution history for completed workflows
  - Events were lost after browser refresh

  ## The Solution

  **Backend (Framework)**:
  - Added `events`, `output`, and `cancellation` fields to `WorkflowStateEntry` interface
  - Modified workflow execution to collect all stream events in memory during execution
  - Persist collected events to workflow state when workflow completes, suspends, fails, or is cancelled
  - Updated all storage adapters to support the new fields:
    - **LibSQL**: Added schema columns + automatic migration method (`addWorkflowStateColumns`)
    - **Supabase**: Added schema columns + migration detection + ALTER TABLE migration SQL
    - **Postgres**: Added schema columns + INSERT/UPDATE queries
    - **In-Memory**: Automatically supported via TypeScript interface

  **Frontend (Console)**:
  - Updated `WorkflowPlaygroundProvider` to include events when converting `WorkflowStateEntry` → `WorkflowHistoryEntry`
  - Implemented smart merge strategy for WebSocket updates: Use backend persisted events when workflow finishes, keep streaming events during execution
  - Events are now preserved across page refreshes and always visible in timeline UI

  ## What Gets Persisted

  ```typescript
  // In WorkflowStateEntry (stored in Memory V2):
  {
    "events": [
      {
        "id": "evt_123",
        "type": "workflow-start",
        "name": "Workflow Started",
        "startTime": "2025-01-24T10:00:00Z",
        "status": "running",
        "input": { "userId": "123" }
      },
      {
        "id": "evt_124",
        "type": "step-complete",
        "name": "Step: fetch-user",
        "startTime": "2025-01-24T10:00:01Z",
        "endTime": "2025-01-24T10:00:02Z",
        "status": "success",
        "output": { "user": { "name": "John" } }
      }
    ],
    "output": { "result": "success" },
    "cancellation": {
      "cancelledAt": "2025-01-24T10:00:05Z",
      "reason": "User requested cancellation"
    }
  }
  ```

  ## Migration Guide

  ### LibSQL Users

  No action required - migrations run automatically on next initialization.

  ### Supabase Users

  When you upgrade and initialize the adapter, you'll see migration SQL in the console. Run it in your Supabase SQL Editor:

  ```sql
  -- Add workflow event persistence columns
  ALTER TABLE voltagent_workflow_states
  ADD COLUMN IF NOT EXISTS events JSONB;

  ALTER TABLE voltagent_workflow_states
  ADD COLUMN IF NOT EXISTS output JSONB;

  ALTER TABLE voltagent_workflow_states
  ADD COLUMN IF NOT EXISTS cancellation JSONB;
  ```

  ### Postgres Users

  No action required - migrations run automatically on next initialization.

  ### In-Memory Users

  No action required - automatically supported.

  ### VoltAgent Managed Memory Users

  No action required - migrations run automatically on first request per managed memory database after API deployment. The API has been updated to:
  - Include new columns in ManagedMemoryProvisioner CREATE TABLE statements (new databases)
  - Run automatic column addition migration for existing databases (lazy migration on first request)
  - Update PostgreSQL memory adapter to persist and retrieve events, output, and cancellation fields

  **Zero-downtime deployment:** Existing managed memory databases will be migrated lazily when first accessed after the API update.

  ## Impact
  - ✅ Workflow execution timeline is now persistent and survives completion
  - ✅ Full execution history visible for completed, suspended, and failed workflows
  - ✅ Events, output, and cancellation metadata preserved in database
  - ✅ Console UI timeline works consistently across all workflow states
  - ✅ All storage backends (LibSQL, Supabase, Postgres, In-Memory) behave consistently
  - ✅ No data loss on workflow completion or page refresh

## 1.0.9

### Patch Changes

- [#693](https://github.com/VoltAgent/voltagent/pull/693) [`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e) Thanks [@marinoska](https://github.com/marinoska)! - - Added support for provider-defined tools (e.g. `openai.tools.webSearch()`)
  - Update tool normalization to pass through provider tool metadata untouched.
  - Added support for provider-defined tools both as standalone tool and within a toolkit.
  - Upgraded dependency: `ai` → `^5.0.76`
- Updated dependencies [[`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e)]:
  - @voltagent/internal@0.0.12

## 1.0.8

### Patch Changes

- [#674](https://github.com/VoltAgent/voltagent/pull/674) [`5aa84b5`](https://github.com/VoltAgent/voltagent/commit/5aa84b5bcf57d19bbe33cc791f0892c96bb3944b) Thanks [@omeraplak](https://github.com/omeraplak)! - ## What Changed

  Removed automatic message pruning functionality from all storage adapters (PostgreSQL, Supabase, LibSQL, and InMemory). Previously, messages were automatically deleted when the count exceeded `storageLimit` (default: 100 messages per conversation).

  ## Why This Change

  Users reported unexpected data loss when their conversation history exceeded the storage limit. Many users expect their conversation history to be preserved indefinitely rather than automatically deleted. This change gives users full control over their data retention policies.

  ## Migration Guide

  ### Before

  ```ts
  const memory = new Memory({
    storage: new PostgreSQLMemoryAdapter({
      connection: process.env.DATABASE_URL,
      storageLimit: 200, // Messages auto-deleted after 200
    }),
  });
  ```

  ### After

  ```ts
  const memory = new Memory({
    storage: new PostgreSQLMemoryAdapter({
      connection: process.env.DATABASE_URL,
      // No storageLimit - all messages preserved
    }),
  });
  ```

  ### If You Need Message Cleanup

  Implement your own cleanup logic using the `clearMessages()` method:

  ```ts
  // Clear all messages for a conversation
  await memory.clearMessages(userId, conversationId);

  // Clear all messages for a user
  await memory.clearMessages(userId);
  ```

  ## Affected Packages
  - `@voltagent/core` - Removed `storageLimit` from types
  - `@voltagent/postgres` - Removed from PostgreSQL adapter
  - `@voltagent/supabase` - Removed from Supabase adapter
  - `@voltagent/libsql` - Removed from LibSQL adapter

  ## Impact
  - ✅ No more unexpected data loss
  - ✅ Users have full control over message retention
  - ⚠️ Databases may grow larger over time (consider implementing manual cleanup)
  - ⚠️ Breaking change: `storageLimit` parameter no longer accepted

## 1.0.7

### Patch Changes

- [#629](https://github.com/VoltAgent/voltagent/pull/629) [`3e64b9c`](https://github.com/VoltAgent/voltagent/commit/3e64b9ce58d0e91bc272f491be2c1932a005ef48) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add memory observability

## 1.0.6

### Patch Changes

- Updated dependencies [[`355836b`](https://github.com/VoltAgent/voltagent/commit/355836b39a6d1ba36c5cfac82008cab3281703e7), [`355836b`](https://github.com/VoltAgent/voltagent/commit/355836b39a6d1ba36c5cfac82008cab3281703e7)]:
  - @voltagent/internal@0.0.11

## 1.0.5

### Patch Changes

- [`9cc4ea4`](https://github.com/VoltAgent/voltagent/commit/9cc4ea4a4985320139e33e8029f299c7ec8329a6) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: @voltagent/core peerDependency version

## 1.0.4

### Patch Changes

- [#573](https://github.com/VoltAgent/voltagent/pull/573) [`51cc774`](https://github.com/VoltAgent/voltagent/commit/51cc774445e5c4e676563b5576868ad45d8ecb9c) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: improve subagent tracing hierarchy and entity filtering

  ## What Changed

  Fixed OpenTelemetry span hierarchy issues where subagent spans were overriding parent delegate_task spans instead of being properly nested as children. Also resolved entity ID filtering returning incorrect traces for subagent queries.

  ## The Problem

  When a supervisor agent delegated tasks to subagents:
  1. **Span Hierarchy**: Subagent spans appeared to replace delegate_task spans instead of being children
  2. **Entity Filtering**: Querying by subagent entity ID (e.g., `entityId=Formatter`) incorrectly returned traces that should only be associated with the root agent (e.g., `entityId=Supervisor`)

  ## The Solution

  Implemented namespace-based attribute management in trace-context:
  - **Root agents** use `entity.id`, `entity.type`, `entity.name` attributes
  - **Subagents** use `subagent.id`, `subagent.name`, `subagent.type` namespace
  - **Subagents inherit** parent's `entity.id` for correct trace association
  - **Span naming** clearly identifies subagents with `subagent:AgentName` prefix

  ## Example

  ```typescript
  // Before: Incorrect hierarchy and filtering
  // delegate_task span seemed to disappear
  // entityId=Formatter returned Supervisor's traces

  // After: Proper hierarchy and filtering
  const supervisor = new Agent({
    name: "Supervisor",
    subAgents: [formatter, writer],
  });

  // Trace structure now shows:
  // - Supervisor (root span)
  //   - delegate_task: Formatter (tool span)
  //     - subagent:Formatter (subagent span with proper parent)
  //       - (formatter's tools and operations)

  // Filtering works correctly:
  // entityId=Supervisor ✓ Returns supervisor traces
  // entityId=Formatter ✗ Returns no traces (correct - Formatter is a subagent)
  ```

  ## Impact
  - Proper parent-child relationships in span hierarchy
  - Correct trace filtering by entity ID
  - Clear distinction between root agents and subagents in observability data
  - Better debugging experience with properly nested spans

## 1.0.3

## 1.0.3-next.0

### Patch Changes

- Updated dependencies [[`77a3f64`](https://github.com/VoltAgent/voltagent/commit/77a3f64dea6e8a06fbbd72878711efa9ceb90bc3)]:
  - @voltagent/core@1.1.7-next.0

## 1.0.2

### Patch Changes

- [#562](https://github.com/VoltAgent/voltagent/pull/562) [`2886b7a`](https://github.com/VoltAgent/voltagent/commit/2886b7aab5bda296cebc0b8b2bd56d684324d799) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: using `safeStringify` instead of `JSON.stringify`

## 1.0.1

### Patch Changes

- [`a0d9e84`](https://github.com/VoltAgent/voltagent/commit/a0d9e8404fe3e2cebfc146cd4622b607bd16b462) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: @voltagent/logger dependency version

- Updated dependencies [[`134bf9a`](https://github.com/VoltAgent/voltagent/commit/134bf9a2978f0b069f842910fb4fb3e969f70390)]:
  - @voltagent/internal@0.0.10

## 1.0.0

### Major Changes

- [`a2b492e`](https://github.com/VoltAgent/voltagent/commit/a2b492e8ed4dba96fa76862bbddf156f3a1a5c93) Thanks [@omeraplak](https://github.com/omeraplak)! - # LibSQL 1.x — Memory Adapter

  Replaces `LibSQLStorage` with Memory V2 adapter and adds vector/observability adapters.

  Full migration guide: [Migration Guide](https://voltagent.dev/docs/getting-started/migration-guide/)

  ## Migrate storage

  Before (0.1.x):

  ```ts
  import { LibSQLStorage } from "@voltagent/libsql";

  const agent = new Agent({
    // ...
    memory: new LibSQLStorage({ url: "file:./.voltagent/memory.db" }),
  });
  ```

  After (1.x):

  ```ts
  import { Memory } from "@voltagent/core";
  import { LibSQLMemoryAdapter } from "@voltagent/libsql";

  const agent = new Agent({
    // ...
    memory: new Memory({
      storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
    }),
  });
  ```

  ## Optional (new)

  ```ts
  import { LibSQLVectorAdapter } from "@voltagent/libsql";
  // Add vector search: new Memory({ vector: new LibSQLVectorAdapter({ ... }) })
  ```

### Patch Changes

- [`c2a6ae1`](https://github.com/VoltAgent/voltagent/commit/c2a6ae125abf9c0b6642927ee78721c6a83dc0f8) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: @voltagent/logger dependency

## 1.0.0-next.2

### Patch Changes

- [`c2a6ae1`](https://github.com/VoltAgent/voltagent/commit/c2a6ae125abf9c0b6642927ee78721c6a83dc0f8) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: @voltagent/logger dependency

## 1.0.0-next.1

### Major Changes

- [`a2b492e`](https://github.com/VoltAgent/voltagent/commit/a2b492e8ed4dba96fa76862bbddf156f3a1a5c93) Thanks [@omeraplak](https://github.com/omeraplak)! - # LibSQL 1.x — Memory Adapter

  Replaces `LibSQLStorage` with Memory V2 adapter and adds vector/observability adapters.

  Full migration guide: [Migration Guide](https://voltagent.dev/docs/getting-started/migration-guide/)

  ## Migrate storage

  Before (0.1.x):

  ```ts
  import { LibSQLStorage } from "@voltagent/libsql";

  const agent = new Agent({
    // ...
    memory: new LibSQLStorage({ url: "file:./.voltagent/memory.db" }),
  });
  ```

  After (1.x):

  ```ts
  import { Memory } from "@voltagent/core";
  import { LibSQLMemoryAdapter } from "@voltagent/libsql";

  const agent = new Agent({
    // ...
    memory: new Memory({
      storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
    }),
  });
  ```

  ## Optional (new)

  ```ts
  import { LibSQLVectorAdapter } from "@voltagent/libsql";
  // Add vector search: new Memory({ vector: new LibSQLVectorAdapter({ ... }) })
  ```

### Patch Changes

- Updated dependencies [[`a2b492e`](https://github.com/VoltAgent/voltagent/commit/a2b492e8ed4dba96fa76862bbddf156f3a1a5c93)]:
  - @voltagent/logger@1.0.0-next.0

## 1.0.0-next.0

### Minor Changes

- [#485](https://github.com/VoltAgent/voltagent/pull/485) [`64a50e6`](https://github.com/VoltAgent/voltagent/commit/64a50e6800dec844fad7b9f3a3b1c2c8d0486229) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: initial release of @voltagent/libsql package

  ## What's New

  Introducing `@voltagent/libsql` - a dedicated package for LibSQL/Turso database integration with VoltAgent. This package was extracted from `@voltagent/core` to improve modularity and reduce core dependencies.

  ## Key Features
  - **Full LibSQL/Turso Support**: Complete implementation of VoltAgent's memory storage interface for LibSQL databases
  - **Automatic Migrations**: Built-in schema migrations for conversations, messages, and agent history tables
  - **Thread-based Storage**: Support for conversation threads and message history
  - **Agent History Tracking**: Store and retrieve agent execution history and timeline events
  - **Configurable Logging**: Optional logger injection for debugging and monitoring

  ## Installation

  ```bash
  npm install @voltagent/libsql @libsql/client
  # or
  pnpm add @voltagent/libsql @libsql/client
  # or
  yarn add @voltagent/libsql @libsql/client
  ```

  ## Usage

  ```typescript
  import { LibSQLStorage } from "@voltagent/libsql";
  import { createClient } from "@libsql/client";

  // Create LibSQL client
  const client = createClient({
    url: "file:./memory.db", // or your Turso database URL
    authToken: "your-token", // for Turso cloud
  });

  // Initialize storage
  const storage = new LibSQLStorage({
    client,
    tablePrefix: "company_", // optional, defaults to "conversations"
    debug: true, // optional, enables debug logging
  });

  // Use with VoltAgent
  import { VoltAgent, Agent } from "@voltagent/core";

  const agent = new Agent({
    name: "Assistant",
    instructions: "You are a helpful assistant",
    memory: {
      storage: storage, // Use LibSQL storage instead of default InMemoryStorage
    },
    // ... other config
  });
  ```

  ## Migration from Core

  If you were previously using LibSQL as the default storage in `@voltagent/core`, you'll need to explicitly install this package and configure it. See the migration guide in the `@voltagent/core` changelog for detailed instructions.

  ## Why This Package?
  - **Lambda Compatibility**: Removes native binary dependencies from core, making it Lambda-friendly
  - **Modular Architecture**: Use only the storage backends you need
  - **Smaller Core Bundle**: Reduces the size of `@voltagent/core` for users who don't need LibSQL
  - **Better Maintenance**: Dedicated package allows for independent versioning and updates

### Patch Changes

- Updated dependencies [[`64a50e6`](https://github.com/VoltAgent/voltagent/commit/64a50e6800dec844fad7b9f3a3b1c2c8d0486229), [`9e8b211`](https://github.com/VoltAgent/voltagent/commit/9e8b2119a783942f114459f0a9b93e645727445e)]:
  - @voltagent/core@1.0.0-next.0
