# @voltagent/libsql

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
