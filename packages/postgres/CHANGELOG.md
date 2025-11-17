# @voltagent/postgres

## 1.1.2

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

## 1.1.1

### Patch Changes

- [#787](https://github.com/VoltAgent/voltagent/pull/787) [`5e81d65`](https://github.com/VoltAgent/voltagent/commit/5e81d6568ba3bee26083ca2a8e5d31f158e36fc0) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add full conversation step persistence across the stack:
  - Core now exposes managed-memory step APIs, and the VoltAgent managed memory adapter persists/retrieves steps through VoltOps.
  - LibSQL, PostgreSQL, Supabase, and server handlers provision the new `_steps` table, wire up DTOs/routes, and surface the data in Observability/Steps UI (including managed-memory backends).

  fixes: #613

## 1.1.0

### Minor Changes

- [#773](https://github.com/VoltAgent/voltagent/pull/773) [`35290d9`](https://github.com/VoltAgent/voltagent/commit/35290d9331c846f8274325ad698da0c2cda54530) Thanks [@hyperion912](https://github.com/hyperion912)! - feat(postgres-memory-adapter): add schema configuration support

  Add support for defining a custom PostgreSQL schema during adapter initialization.
  Defaults to undefined (uses the database’s default schema if not provided).

  Includes tests for schema configuration.

  Resolves #763

## 1.0.11

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

## 1.0.10

### Patch Changes

- [#693](https://github.com/VoltAgent/voltagent/pull/693) [`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e) Thanks [@marinoska](https://github.com/marinoska)! - - Added support for provider-defined tools (e.g. `openai.tools.webSearch()`)
  - Update tool normalization to pass through provider tool metadata untouched.
  - Added support for provider-defined tools both as standalone tool and within a toolkit.
  - Upgraded dependency: `ai` → `^5.0.76`
- Updated dependencies [[`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e)]:
  - @voltagent/internal@0.0.12

## 1.0.9

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

## 1.0.8

### Patch Changes

- [#641](https://github.com/VoltAgent/voltagent/pull/641) [`4c42bf7`](https://github.com/VoltAgent/voltagent/commit/4c42bf72834d3cd45ff5246ef65d7b08470d6a8e) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add PostgresVectorAdapter for semantic search with vanilla PostgreSQL

  ## What Changed for You

  The `@voltagent/postgres` package now includes `PostgresVectorAdapter` for storing and querying vector embeddings using vanilla PostgreSQL (no extensions required). This enables semantic search capabilities for conversation history, allowing agents to retrieve contextually relevant messages based on meaning rather than just keywords.

  ## New: PostgresVectorAdapter

  ```typescript
  import { Agent, Memory, AiSdkEmbeddingAdapter } from "@voltagent/core";
  import { PostgresMemoryAdapter, PostgresVectorAdapter } from "@voltagent/postgres";
  import { openai } from "@ai-sdk/openai";

  const memory = new Memory({
    storage: new PostgresMemoryAdapter({
      connectionString: process.env.DATABASE_URL,
    }),
    embedding: new AiSdkEmbeddingAdapter(openai.embedding("text-embedding-3-small")),
    vector: new PostgresVectorAdapter({
      connectionString: process.env.DATABASE_URL,
    }),
  });

  const agent = new Agent({
    name: "Assistant",
    instructions: "You are a helpful assistant with semantic memory",
    model: openai("gpt-4o-mini"),
    memory,
  });

  // Semantic search automatically enabled with userId + conversationId
  const result = await agent.generateText("What did we discuss about the project?", {
    userId: "user-123",
    conversationId: "conv-456",
  });
  ```

  ## Key Features
  - **No Extensions Required**: Works with vanilla PostgreSQL (no pgvector needed)
  - **BYTEA Storage**: Vectors stored efficiently as binary data using PostgreSQL's native BYTEA type
  - **In-Memory Similarity**: Cosine similarity computed in-memory for accurate results
  - **Automatic Setup**: Creates `voltagent_vectors` table and indexes automatically
  - **Configurable**: Customize table name, vector dimensions, cache size, and retry logic
  - **Production Ready**: Connection pooling, exponential backoff, LRU caching

  ## Configuration Options

  ```typescript
  const vectorAdapter = new PostgresVectorAdapter({
    connectionString: process.env.DATABASE_URL,

    // Optional: customize table name (default: "voltagent_vector")
    tablePrefix: "custom_vector",

    // Optional: vector dimensions (default: 1536 for text-embedding-3-small)
    maxVectorDimensions: 1536,

    // Optional: LRU cache size (default: 100)
    cacheSize: 100,

    // Optional: connection pool size (default: 10)
    maxConnections: 10,
  });
  ```

  ## How It Works
  1. **Embedding Generation**: Messages are converted to vector embeddings using your chosen embedding model
  2. **Binary Storage**: Vectors are serialized to binary (BYTEA) and stored in PostgreSQL
  3. **In-Memory Similarity**: When searching, all vectors are loaded and cosine similarity is computed in-memory
  4. **Context Merging**: Relevant messages are merged into conversation context automatically

  ## Why This Matters
  - **Better Context Retrieval**: Find relevant past conversations even with different wording
  - **Unified Storage**: Keep vectors and messages in the same PostgreSQL database
  - **Zero Extensions**: Works with any PostgreSQL instance (12+), no extension installation needed
  - **Cost Effective**: No separate vector database needed (Pinecone, Weaviate, etc.)
  - **Familiar Tools**: Use standard PostgreSQL management and monitoring tools
  - **Framework Parity**: Same `VectorStorageAdapter` interface as other providers

  ## Performance Notes

  This adapter loads all vectors into memory for similarity computation, which works well for:
  - **Small to medium datasets** (< 10,000 vectors)
  - **Development and prototyping**
  - **Applications where extension installation is not possible**

  For large-scale production workloads with millions of vectors, consider specialized vector databases or PostgreSQL with pgvector extension for database-level similarity operations.

  ## Migration Notes

  Existing PostgreSQL memory adapters continue to work without changes. Vector storage is optional and only activates when you configure both `embedding` and `vector` in the Memory constructor.

## 1.0.7

### Patch Changes

- Updated dependencies [[`355836b`](https://github.com/VoltAgent/voltagent/commit/355836b39a6d1ba36c5cfac82008cab3281703e7), [`355836b`](https://github.com/VoltAgent/voltagent/commit/355836b39a6d1ba36c5cfac82008cab3281703e7)]:
  - @voltagent/internal@0.0.11

## 1.0.6

### Patch Changes

- [`90ea801`](https://github.com/VoltAgent/voltagent/commit/90ea80121e73e890bb5cea1f970d50d78cd50680) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: migration issue

## 1.0.5

### Patch Changes

- [`9cc4ea4`](https://github.com/VoltAgent/voltagent/commit/9cc4ea4a4985320139e33e8029f299c7ec8329a6) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: @voltagent/core peerDependency version

## 1.0.4

### Patch Changes

- [`e268f61`](https://github.com/VoltAgent/voltagent/commit/e268f61dff91691000675222093165e1349831dc) Thanks [@omeraplak](https://github.com/omeraplak)! - chore: add debug logs

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

- Updated dependencies [[`134bf9a`](https://github.com/VoltAgent/voltagent/commit/134bf9a2978f0b069f842910fb4fb3e969f70390)]:
  - @voltagent/internal@0.0.10

## 1.0.0

### Major Changes

- [`a2b492e`](https://github.com/VoltAgent/voltagent/commit/a2b492e8ed4dba96fa76862bbddf156f3a1a5c93) Thanks [@omeraplak](https://github.com/omeraplak)! - # PostgreSQL 1.x — Memory Adapter

  The old `PostgresStorage` API is replaced by a Memory V2 adapter.

  Full migration guide: [Migration Guide](https://voltagent.dev/docs/getting-started/migration-guide/)

  ## Migrate

  Before (0.1.x):

  ```ts
  import { PostgresStorage } from "@voltagent/postgres";

  const agent = new Agent({
    // ...
    memory: new PostgresStorage({ connection: process.env.DATABASE_URL! }),
  });
  ```

  After (1.x):

  ```ts
  import { Memory } from "@voltagent/core";
  import { PostgreSQLMemoryAdapter } from "@voltagent/postgres";

  const agent = new Agent({
    // ...
    memory: new Memory({
      storage: new PostgreSQLMemoryAdapter({
        connection: process.env.DATABASE_URL!,
      }),
    }),
  });
  ```

## 1.0.0-next.1

### Major Changes

- [`a2b492e`](https://github.com/VoltAgent/voltagent/commit/a2b492e8ed4dba96fa76862bbddf156f3a1a5c93) Thanks [@omeraplak](https://github.com/omeraplak)! - # PostgreSQL 1.x — Memory Adapter

  The old `PostgresStorage` API is replaced by a Memory V2 adapter.

  Full migration guide: [Migration Guide](https://voltagent.dev/docs/getting-started/migration-guide/)

  ## Migrate

  Before (0.1.x):

  ```ts
  import { PostgresStorage } from "@voltagent/postgres";

  const agent = new Agent({
    // ...
    memory: new PostgresStorage({ connection: process.env.DATABASE_URL! }),
  });
  ```

  After (1.x):

  ```ts
  import { Memory } from "@voltagent/core";
  import { PostgreSQLMemoryAdapter } from "@voltagent/postgres";

  const agent = new Agent({
    // ...
    memory: new Memory({
      storage: new PostgreSQLMemoryAdapter({
        connection: process.env.DATABASE_URL!,
      }),
    }),
  });
  ```

## 1.0.0-next.0

### Patch Changes

- Updated dependencies [[`64a50e6`](https://github.com/VoltAgent/voltagent/commit/64a50e6800dec844fad7b9f3a3b1c2c8d0486229), [`9e8b211`](https://github.com/VoltAgent/voltagent/commit/9e8b2119a783942f114459f0a9b93e645727445e)]:
  - @voltagent/core@1.0.0-next.0

## 0.1.12

### Patch Changes

- [#466](https://github.com/VoltAgent/voltagent/pull/466) [`730232e`](https://github.com/VoltAgent/voltagent/commit/730232e730cdbd1bb7de6acff8519e8af93f2abf) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: memory messages now return parsed objects instead of JSON strings

  ## What Changed for You

  Memory messages that contain structured content (like tool calls or multi-part messages) now return as **parsed objects** instead of **JSON strings**. This is a breaking change if you were manually parsing these messages.

  ## Before - You Had to Parse JSON Manually

  ```typescript
  // ❌ OLD BEHAVIOR: Content came as JSON string
  const messages = await memory.getMessages({ conversationId: "123" });

  // What you got from memory:
  console.log(messages[0]);
  // {
  //   role: "user",
  //   content: '[{"type":"text","text":"Hello"},{"type":"image","image":"data:..."}]',  // STRING!
  //   type: "text"
  // }

  // You had to manually parse the JSON string:
  const content = JSON.parse(messages[0].content); // Parse required!
  console.log(content);
  // [
  //   { type: "text", text: "Hello" },
  //   { type: "image", image: "data:..." }
  // ]

  // Tool calls were also JSON strings:
  console.log(messages[1].content);
  // '[{"type":"tool-call","toolCallId":"123","toolName":"weather"}]'  // STRING!
  ```

  ## After - You Get Parsed Objects Automatically

  ```typescript
  // ✅ NEW BEHAVIOR: Content comes as proper objects
  const messages = await memory.getMessages({ conversationId: "123" });

  // What you get from memory NOW:
  console.log(messages[0]);
  // {
  //   role: "user",
  //   content: [
  //     { type: "text", text: "Hello" },      // OBJECT!
  //     { type: "image", image: "data:..." }  // OBJECT!
  //   ],
  //   type: "text"
  // }

  // Direct access - no JSON.parse needed!
  const content = messages[0].content; // Already parsed!
  console.log(content[0].text); // "Hello"

  // Tool calls are proper objects:
  console.log(messages[1].content);
  // [
  //   { type: "tool-call", toolCallId: "123", toolName: "weather" }  // OBJECT!
  // ]
  ```

  ## Breaking Change Warning ⚠️

  If your code was doing this:

  ```typescript
  // This will now FAIL because content is already parsed
  const parsed = JSON.parse(msg.content); // ❌ Error: not a string!
  ```

  Change it to:

  ```typescript
  // Just use the content directly
  const content = msg.content; // ✅ Already an object/array
  ```

  ## What Gets Auto-Parsed
  - **String content** → Stays as string ✅
  - **Structured content** (arrays) → Auto-parsed to objects ✅
  - **Tool calls** → Auto-parsed to objects ✅
  - **Tool results** → Auto-parsed to objects ✅
  - **Metadata fields** → Auto-parsed to objects ✅

  ## Why This Matters
  - **No more JSON.parse errors** in your application
  - **Type-safe access** to structured content
  - **Cleaner code** without try/catch blocks
  - **Consistent behavior** with how agents handle messages

  ## Migration Guide
  1. **Remove JSON.parse calls** for message content
  2. **Remove try/catch** blocks around parsing
  3. **Use content directly** as objects/arrays

  Your memory messages now "just work" without manual parsing!

## 0.1.11

### Patch Changes

- [#457](https://github.com/VoltAgent/voltagent/pull/457) [`8d89469`](https://github.com/VoltAgent/voltagent/commit/8d8946919820c0298bffea13731ea08660b72c4b) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: optimize agent event system and add pagination to agent history API

  Significantly improved agent performance and UI scalability with two major enhancements:

  ## 1. Event System Optimization

  Refactored agent event system to emit events immediately before database writes, matching the workflow event system behavior. This provides real-time event visibility without waiting for persistence operations.

  **Before:**
  - Events were queued and only emitted after database write completion
  - Real-time monitoring was delayed by persistence operations

  **After:**
  - Events emit immediately for real-time updates
  - Database persistence happens asynchronously in the background
  - Consistent behavior with workflow event system

  ## 2. Agent History Pagination

  Added comprehensive pagination support to agent history API, preventing performance issues when loading large history datasets.

  **New API:**

  ```typescript
  // Agent class
  const history = await agent.getHistory({ page: 0, limit: 20 });
  // Returns: { entries: AgentHistoryEntry[], pagination: { page, limit, total, totalPages } }

  // REST API
  GET /agents/:id/history?page=0&limit=20
  // Returns paginated response format
  ```

  **Implementation Details:**
  - Added pagination to all storage backends (LibSQL, PostgreSQL, Supabase, InMemory)
  - Updated WebSocket initial load to use pagination
  - Maintained backward compatibility (when page/limit not provided, returns first 100 entries)
  - Updated all tests to work with new pagination format

  **Storage Changes:**
  - LibSQL: Added LIMIT/OFFSET support
  - PostgreSQL: Added pagination with proper SQL queries
  - Supabase: Used `.range()` method for efficient pagination
  - InMemory: Implemented array slicing with total count

  This improves performance for agents with extensive history and provides better UX for viewing agent execution history.

- [`90a1316`](https://github.com/VoltAgent/voltagent/commit/90a131622a876c0d91e1b9046a5e1fc143fef6b5) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: improve code quality with biome linting and package configuration enhancements

  This update focuses on improving code quality and package configuration across the entire VoltAgent monorepo:

  **Key improvements:**
  - **Biome Linting**: Fixed numerous linting issues identified by Biome across all packages, ensuring consistent code style and catching potential bugs
  - **Package Configuration**: Added `publint` script to all packages for strict validation of package.json files to ensure proper publishing configuration
  - **TypeScript Exports**: Fixed `typesVersions` structure in @voltagent/internal package and removed duplicate entries
  - **Test Utilities**: Refactored `createTrackedStorage` function in core package by simplifying its API - removed the `testName` parameter for cleaner test setup
  - **Type Checking**: Enabled `attw` (Are The Types Wrong) checking to ensure TypeScript types are correctly exported

  These changes improve the overall maintainability and reliability of the VoltAgent framework without affecting the public API.

## 0.1.10

### Patch Changes

- [#423](https://github.com/VoltAgent/voltagent/pull/423) [`089c039`](https://github.com/VoltAgent/voltagent/commit/089c03993e3b9e05655a1108355e7bee940d33a7) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add message type filtering support to memory storage implementations

  Added the ability to filter messages by type when retrieving conversation history. This enhancement allows the framework to distinguish between different message types (text, tool-call, tool-result) and retrieve only the desired types, improving context preparation for LLMs.

  ## Key Changes
  - **MessageFilterOptions**: Added optional `types` parameter to filter messages by type
  - **prepareConversationContext**: Now filters to only include text messages, excluding tool-call and tool-result messages for cleaner LLM context
  - **All storage implementations**: Added database-level filtering for better performance

  ## Usage

  ```typescript
  // Get only text messages
  const textMessages = await memory.getMessages({
    userId: "user-123",
    conversationId: "conv-456",
    types: ["text"],
  });

  // Get tool-related messages
  const toolMessages = await memory.getMessages({
    userId: "user-123",
    conversationId: "conv-456",
    types: ["tool-call", "tool-result"],
  });

  // Get all messages (default behavior - backward compatible)
  const allMessages = await memory.getMessages({
    userId: "user-123",
    conversationId: "conv-456",
  });
  ```

  ## Implementation Details
  - **InMemoryStorage**: Filters messages in memory after retrieval
  - **LibSQLStorage**: Adds SQL WHERE clause with IN operator for type filtering
  - **PostgreSQL**: Uses parameterized IN clause with proper parameter counting
  - **Supabase**: Utilizes query builder's `.in()` method for type filtering

  This change ensures that `prepareConversationContext` provides cleaner, more focused context to LLMs by excluding intermediate tool execution details, while maintaining full backward compatibility for existing code.

- Updated dependencies [[`089c039`](https://github.com/VoltAgent/voltagent/commit/089c03993e3b9e05655a1108355e7bee940d33a7)]:
  - @voltagent/core@0.1.68

## 0.1.9

### Patch Changes

- [#418](https://github.com/VoltAgent/voltagent/pull/418) [`aa024c1`](https://github.com/VoltAgent/voltagent/commit/aa024c1a7c643b2aff7a5fd0d150c87f8a9a1858) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: memory storage implementations now correctly return the most recent messages when using context limit

  Fixed an issue where memory storage implementations (LibSQL, PostgreSQL, Supabase) were returning the oldest messages instead of the most recent ones when a context limit was specified. This was causing AI agents to lose important recent context in favor of old conversation history.

  **Before:**
  - `contextLimit: 10` returned the first 10 messages (oldest)
  - Agents were working with outdated context

  **After:**
  - `contextLimit: 10` returns the last 10 messages (most recent) in chronological order
  - Agents now have access to the most relevant recent context
  - InMemoryStorage was already working correctly and remains unchanged

  Changes:
  - LibSQLStorage: Modified query to use `ORDER BY DESC` with `LIMIT`, then reverse results
  - PostgreSQL: Modified query to use `ORDER BY DESC` with `LIMIT`, then reverse results
  - Supabase: Modified query to use `ascending: false` with `limit`, then reverse results

  This ensures consistent behavior across all storage implementations where context limits provide the most recent messages, improving AI agent response quality and relevance.

- Updated dependencies [[`67450c3`](https://github.com/VoltAgent/voltagent/commit/67450c3bc4306ab6021ca8feed2afeef6dcc320e), [`aa024c1`](https://github.com/VoltAgent/voltagent/commit/aa024c1a7c643b2aff7a5fd0d150c87f8a9a1858), [`aa024c1`](https://github.com/VoltAgent/voltagent/commit/aa024c1a7c643b2aff7a5fd0d150c87f8a9a1858)]:
  - @voltagent/core@0.1.67

## 0.1.8

### Patch Changes

- [#371](https://github.com/VoltAgent/voltagent/pull/371) [`6ddedc2`](https://github.com/VoltAgent/voltagent/commit/6ddedc2b9be9c3dc4978dc53198a43c2cba74945) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add workflow history support to postgres

  This update introduces persistence for workflow history when using a PostgreSQL database. This includes storing workflow execution details, individual steps, and timeline events. Database tables are migrated automatically, so no manual action is required.

- Updated dependencies [[`6ddedc2`](https://github.com/VoltAgent/voltagent/commit/6ddedc2b9be9c3dc4978dc53198a43c2cba74945)]:
  - @voltagent/core@0.1.60

## 0.1.7

### Patch Changes

- [#317](https://github.com/VoltAgent/voltagent/pull/317) [`16bb8d0`](https://github.com/VoltAgent/voltagent/commit/16bb8d003c17799688e8b70eb9236b46a5c339be) Thanks [@thujee](https://github.com/thujee)! - fix: errors related to missing columns "timestamp" and "utc" in Postgres schema - #316

## 0.1.6

### Patch Changes

- [#301](https://github.com/VoltAgent/voltagent/pull/301) [`619e951`](https://github.com/VoltAgent/voltagent/commit/619e9510c05b7e46f8c243db226f220b5fdad824) Thanks [@woutrbe](https://github.com/woutrbe)! - fix(postgres): Fix default value being interpreted as column name

- Updated dependencies [[`33afe6e`](https://github.com/VoltAgent/voltagent/commit/33afe6ef40ef56c501f7fa69be42da730f87d29d), [`b8529b5`](https://github.com/VoltAgent/voltagent/commit/b8529b53313fa97e941ecacb8c1555205de49c19)]:
  - @voltagent/core@0.1.45

## 0.1.5

### Patch Changes

- [#252](https://github.com/VoltAgent/voltagent/pull/252) [`88f2d06`](https://github.com/VoltAgent/voltagent/commit/88f2d0682413d27a7ac2d1d8cd502fd9c665e547) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add userId and conversationId support to agent history tables

  This release adds comprehensive support for `userId` and `conversationId` fields in agent history tables across all memory storage implementations, enabling better conversation tracking and user-specific history management.

  ### New Features
  - **Agent History Enhancement**: Added `userId` and `conversationId` columns to agent history tables
  - **Cross-Implementation Support**: Consistent implementation across PostgreSQL, Supabase, LibSQL, and In-Memory storage
  - **Automatic Migration**: Safe schema migrations for existing installations
  - **Backward Compatibility**: Existing history entries remain functional

  ### Migration Notes

  **PostgreSQL & Supabase**: Automatic schema migration with user-friendly SQL scripts
  **LibSQL**: Seamless column addition with proper indexing
  **In-Memory**: No migration required, immediate support

  ### Technical Details
  - **Database Schema**: Added `userid TEXT` and `conversationid TEXT` columns (PostgreSQL uses lowercase)
  - **Indexing**: Performance-optimized indexes for new columns
  - **Migration Safety**: Non-destructive migrations with proper error handling
  - **API Consistency**: Unified interface across all storage implementations

- Updated dependencies [[`88f2d06`](https://github.com/VoltAgent/voltagent/commit/88f2d0682413d27a7ac2d1d8cd502fd9c665e547), [`b63fe67`](https://github.com/VoltAgent/voltagent/commit/b63fe675dfca9121862a9dd67a0fae5d39b9db90)]:
  - @voltagent/core@0.1.37

## 0.1.4

### Patch Changes

- [#236](https://github.com/VoltAgent/voltagent/pull/236) [`5d39cdc`](https://github.com/VoltAgent/voltagent/commit/5d39cdc68c4ec36ec2f0bf86a29dbf1225644416) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: PostgreSQL string literal syntax error in timeline events table

  Fixed PostgreSQL syntax error where `level TEXT DEFAULT "INFO"` was using double quotes instead of single quotes for string literals. This resolves table creation failures during fresh installations and migrations.

  ### Changes
  - **Fixed**: `level TEXT DEFAULT "INFO"` → `level TEXT DEFAULT 'INFO'`
  - **Affects**: Timeline events table creation in both fresh installations and migrations
  - **Impact**: PostgreSQL database setup now works without syntax errors

  ### Technical Details

  PostgreSQL requires single quotes for string literals and double quotes for identifiers. The timeline events table creation was failing due to incorrect quote usage for the default value.

  **Migration Notes:**
  - Existing installations with timeline events table will not be affected
  - Fresh installations will now complete successfully
  - No manual intervention required

- Updated dependencies [[`5d39cdc`](https://github.com/VoltAgent/voltagent/commit/5d39cdc68c4ec36ec2f0bf86a29dbf1225644416), [`16c2a86`](https://github.com/VoltAgent/voltagent/commit/16c2a863d3ecdc09f09219bd40f2dbf1d789194d), [`0d85f0e`](https://github.com/VoltAgent/voltagent/commit/0d85f0e960dbc6e8df6a79a16c775ca7a34043bb)]:
  - @voltagent/core@0.1.33

## 0.1.3

### Patch Changes

- [#215](https://github.com/VoltAgent/voltagent/pull/215) [`f2f4539`](https://github.com/VoltAgent/voltagent/commit/f2f4539af7722f25a5aad9f01c2b7b5e50ba51b8) Thanks [@Ajay-Satish-01](https://github.com/Ajay-Satish-01)! - This release introduces powerful new methods for managing conversations with user-specific access control and improved developer experience.

  ### Simple Usage Example

  ```typescript
  // Get all conversations for a user
  const conversations = await storage.getUserConversations("user-123").limit(10).execute();

  console.log(conversations);

  // Get first conversation and its messages
  const conversation = conversations[0];
  if (conversation) {
    const messages = await storage.getConversationMessages(conversation.id);
    console.log(messages);
  }
  ```

  ### Pagination Support

  ```typescript
  // Get paginated conversations
  const result = await storage.getPaginatedUserConversations("user-123", 1, 20);
  console.log(result.conversations); // Array of conversations
  console.log(result.hasMore); // Boolean indicating if more pages exist
  ```

- Updated dependencies [[`f2f4539`](https://github.com/VoltAgent/voltagent/commit/f2f4539af7722f25a5aad9f01c2b7b5e50ba51b8), [`0eba8a2`](https://github.com/VoltAgent/voltagent/commit/0eba8a265c35241da74324613e15801402f7b778)]:
  - @voltagent/core@0.1.32

## 0.1.2

### Patch Changes

- [#213](https://github.com/VoltAgent/voltagent/pull/213) [`ed68922`](https://github.com/VoltAgent/voltagent/commit/ed68922e4c71560c2f68117064b84e874a72009f) Thanks [@baseballyama](https://github.com/baseballyama)! - chore!: drop Node.js v18

- Updated dependencies [[`ed68922`](https://github.com/VoltAgent/voltagent/commit/ed68922e4c71560c2f68117064b84e874a72009f), [`80fd3c0`](https://github.com/VoltAgent/voltagent/commit/80fd3c069de4c23116540a55082b891c4b376ce6)]:
  - @voltagent/core@0.1.31

## 0.1.1

### Patch Changes

- [#176](https://github.com/VoltAgent/voltagent/pull/176) [`790d070`](https://github.com/VoltAgent/voltagent/commit/790d070e26a41a6467927471933399020ceec275) Thanks [@omeraplak](https://github.com/omeraplak)! - The `error` column has been deprecated and replaced with `statusMessage` column for better consistency and clearer messaging. The old `error` column is still supported for backward compatibility but will be removed in a future major version.

  Changes:
  - Deprecated `error` column (still functional)
  - Improved error handling and status reporting

- Updated dependencies [[`790d070`](https://github.com/VoltAgent/voltagent/commit/790d070e26a41a6467927471933399020ceec275), [`790d070`](https://github.com/VoltAgent/voltagent/commit/790d070e26a41a6467927471933399020ceec275)]:
  - @voltagent/core@0.1.24
