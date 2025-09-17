# @voltagent/libsql

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
