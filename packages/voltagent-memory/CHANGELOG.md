# @voltagent/voltagent-memory

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
  import { AiSdkEmbeddingAdapter, Memory } from "@voltagent/core";
  import { openai } from "@ai-sdk/openai";

  const memory = new Memory({
    storage: new ManagedMemoryAdapter({
      databaseName: "production-memory",
    }),
    embedding: new AiSdkEmbeddingAdapter(openai.embedding("text-embedding-3-small")),
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
