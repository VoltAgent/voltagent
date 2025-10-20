# @voltagent/supabase

## 1.0.6

### Patch Changes

- [#693](https://github.com/VoltAgent/voltagent/pull/693) [`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e) Thanks [@marinoska](https://github.com/marinoska)! - - Added support for provider-defined tools (e.g. `openai.tools.webSearch()`)
  - Update tool normalization to pass through provider tool metadata untouched.
  - Added support for provider-defined tools both as standalone tool and within a toolkit.
  - Upgraded dependency: `ai` → `^5.0.76`
- Updated dependencies [[`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e)]:
  - @voltagent/internal@0.0.12

## 1.0.5

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

## 1.0.4

### Patch Changes

- Updated dependencies [[`355836b`](https://github.com/VoltAgent/voltagent/commit/355836b39a6d1ba36c5cfac82008cab3281703e7), [`355836b`](https://github.com/VoltAgent/voltagent/commit/355836b39a6d1ba36c5cfac82008cab3281703e7)]:
  - @voltagent/internal@0.0.11

## 1.0.3

### Patch Changes

- [`9cc4ea4`](https://github.com/VoltAgent/voltagent/commit/9cc4ea4a4985320139e33e8029f299c7ec8329a6) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: @voltagent/core peerDependency version

## 1.0.2

## 1.0.2-next.0

### Patch Changes

- Updated dependencies [[`77a3f64`](https://github.com/VoltAgent/voltagent/commit/77a3f64dea6e8a06fbbd72878711efa9ceb90bc3)]:
  - @voltagent/core@1.1.7-next.0

## 1.0.1

### Patch Changes

- [`a0d9e84`](https://github.com/VoltAgent/voltagent/commit/a0d9e8404fe3e2cebfc146cd4622b607bd16b462) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: @voltagent/logger dependency version

- Updated dependencies [[`134bf9a`](https://github.com/VoltAgent/voltagent/commit/134bf9a2978f0b069f842910fb4fb3e969f70390)]:
  - @voltagent/internal@0.0.10

## 1.0.0

### Major Changes

- [`a2b492e`](https://github.com/VoltAgent/voltagent/commit/a2b492e8ed4dba96fa76862bbddf156f3a1a5c93) Thanks [@omeraplak](https://github.com/omeraplak)! - # Supabase 1.x — Memory Adapter

  Supabase storage now implements the Memory V2 adapter pattern.

  Full migration guide: [Migration Guide](https://voltagent.dev/docs/getting-started/migration-guide/)

  ## Migrate

  Before (0.1.x):

  ```ts
  import { SupabaseMemory } from "@voltagent/supabase";

  const agent = new Agent({
    // ...
    memory: new SupabaseMemory({ url: process.env.SUPABASE_URL!, key: process.env.SUPABASE_KEY! }),
  });
  ```

  After (1.x):

  ```ts
  import { Memory } from "@voltagent/core";
  import { SupabaseMemoryAdapter } from "@voltagent/supabase";

  const agent = new Agent({
    // ...
    memory: new Memory({
      storage: new SupabaseMemoryAdapter({
        url: process.env.SUPABASE_URL!,
        key: process.env.SUPABASE_KEY!,
      }),
    }),
  });
  ```

### Patch Changes

- [`c2a6ae1`](https://github.com/VoltAgent/voltagent/commit/c2a6ae125abf9c0b6642927ee78721c6a83dc0f8) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: @voltagent/logger dependency

## 1.0.0-next.2

### Patch Changes

- [`c2a6ae1`](https://github.com/VoltAgent/voltagent/commit/c2a6ae125abf9c0b6642927ee78721c6a83dc0f8) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: @voltagent/logger dependency

## 1.0.0-next.1

### Major Changes

- [`a2b492e`](https://github.com/VoltAgent/voltagent/commit/a2b492e8ed4dba96fa76862bbddf156f3a1a5c93) Thanks [@omeraplak](https://github.com/omeraplak)! - # Supabase 1.x — Memory Adapter

  Supabase storage now implements the Memory V2 adapter pattern.

  Full migration guide: [Migration Guide](https://voltagent.dev/docs/getting-started/migration-guide/)

  ## Migrate

  Before (0.1.x):

  ```ts
  import { SupabaseMemory } from "@voltagent/supabase";

  const agent = new Agent({
    // ...
    memory: new SupabaseMemory({ url: process.env.SUPABASE_URL!, key: process.env.SUPABASE_KEY! }),
  });
  ```

  After (1.x):

  ```ts
  import { Memory } from "@voltagent/core";
  import { SupabaseMemoryAdapter } from "@voltagent/supabase";

  const agent = new Agent({
    // ...
    memory: new Memory({
      storage: new SupabaseMemoryAdapter({
        url: process.env.SUPABASE_URL!,
        key: process.env.SUPABASE_KEY!,
      }),
    }),
  });
  ```

### Patch Changes

- Updated dependencies [[`a2b492e`](https://github.com/VoltAgent/voltagent/commit/a2b492e8ed4dba96fa76862bbddf156f3a1a5c93)]:
  - @voltagent/logger@1.0.0-next.0

## 1.0.0-next.0

### Patch Changes

- Updated dependencies [[`64a50e6`](https://github.com/VoltAgent/voltagent/commit/64a50e6800dec844fad7b9f3a3b1c2c8d0486229), [`9e8b211`](https://github.com/VoltAgent/voltagent/commit/9e8b2119a783942f114459f0a9b93e645727445e)]:
  - @voltagent/core@1.0.0-next.0

## 0.1.20

### Patch Changes

- [#496](https://github.com/VoltAgent/voltagent/pull/496) [`0dcc675`](https://github.com/VoltAgent/voltagent/commit/0dcc6759eb1a95d756a49139610b5352db2e91b0) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: resolve SupabaseClient ESM import error

  Fixed an issue where `SupabaseClient` was not available as a runtime export in the ESM build of @supabase/supabase-js v2.54.0. The type is exported in TypeScript definitions but not in the actual ESM runtime.

  ## What Changed
  - Changed `SupabaseClient` to a type-only import using `import { type SupabaseClient }`
  - Replaced `P.instanceOf(SupabaseClient)` pattern matching with `P.not(P.nullish)` since the class is not available at runtime
  - Added type assertion to maintain TypeScript type safety

  ## Before

  ```typescript
  import { SupabaseClient, createClient } from "@supabase/supabase-js";
  // ...
  .with({ client: P.instanceOf(SupabaseClient) }, (o) => o.client)
  ```

  ## After

  ```typescript
  import { createClient, type SupabaseClient } from "@supabase/supabase-js";
  // ...
  .with({ client: P.not(P.nullish) }, (o) => o.client as SupabaseClient)
  ```

  This ensures compatibility with both CommonJS and ESM module systems while maintaining full type safety.

- Updated dependencies [[`5968cef`](https://github.com/VoltAgent/voltagent/commit/5968cef5fe417cd118867ac78217dddfbd60493d)]:
  - @voltagent/internal@0.0.9
  - @voltagent/logger@0.1.4

## 0.1.19

### Patch Changes

- [#479](https://github.com/VoltAgent/voltagent/pull/479) [`8b55691`](https://github.com/VoltAgent/voltagent/commit/8b556910b0d1000bf0a956098e5ca49e733b9476) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - feat: Added `logger` to the SupabaseMemory provider and provided improved type safety for the constructor

  ### New Features

  #### `logger`

  You can now pass in a `logger` to the SupabaseMemory provider and it will be used to log messages.

  ```typescript
  import { createPinoLogger } from "@voltagent/logger";

  const memory = new SupabaseMemory({
    client: supabaseClient,
    logger: createPinoLogger({ name: "memory-supabase" }),
  });
  ```

  #### Improved type safety for the constructor

  The constructor now has improved type safety for the `client` and `logger` options.

  ```typescript
  const memory = new SupabaseMemory({
    client: supabaseClient,
    supabaseUrl: "https://test.supabase.co", // this will show a TypeScript error
    supabaseKey: "test-key",
  });
  ```

  The `client` option also checks that the `client` is an instance of `SupabaseClient`

  ```typescript
  const memory = new SupabaseMemory({
    client: aNonSupabaseClient, // this will show a TypeScript error AND throw an error at runtime
  });
  ```

  ### Internal Changes
  - Cleaned up and reorganized the SupabaseMemory class
  - Renamed files to be more descriptive and not in the `index.ts` file
  - Added improved mocking to the test implementation for the SupabaseClient
  - Removed all `console.*` statements and added a `biome` lint rule to prevent them from being added back

## 0.1.18

### Patch Changes

- [#475](https://github.com/VoltAgent/voltagent/pull/475) [`9b4ea38`](https://github.com/VoltAgent/voltagent/commit/9b4ea38b28df248c1e1ad5541d414bd47838df9a) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - fix: Remove other potentially problematic `JSON.stringify` usages

## 0.1.17

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

## 0.1.16

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

## 0.1.15

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

## 0.1.14

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

## 0.1.13

### Patch Changes

- [#371](https://github.com/VoltAgent/voltagent/pull/371) [`6ddedc2`](https://github.com/VoltAgent/voltagent/commit/6ddedc2b9be9c3dc4978dc53198a43c2cba74945) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add workflow history support

  This update introduces persistence for workflow history in Supabase, including execution details, steps, and timeline events.

  ### Manual Migration Required
  - **Database Migration Required**: This version introduces new tables (`voltagent_memory_workflow_history`, `voltagent_memory_workflow_steps`, and `voltagent_memory_workflow_timeline_events`) to your Supabase database. After updating, you must run the SQL migration script logged to the console in your Supabase SQL Editor to apply the changes.

- Updated dependencies [[`6ddedc2`](https://github.com/VoltAgent/voltagent/commit/6ddedc2b9be9c3dc4978dc53198a43c2cba74945)]:
  - @voltagent/core@0.1.60

## 0.1.12

### Patch Changes

- [#270](https://github.com/VoltAgent/voltagent/pull/270) [`a65069c`](https://github.com/VoltAgent/voltagent/commit/a65069c511713239cf70bdb4d2885df224d1aee2) Thanks [@Ajay-Satish-01](https://github.com/Ajay-Satish-01)! - feat(supabase): Implement storage limit
  - BEFORE:

    ```
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    const memory = new SupabaseMemory({
      client: supabaseClient,
      tableName: "voltagent_memory", // Optional
    });

    ```

  - AFTER:

    ```
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    const memory = new SupabaseMemory({
      client: supabaseClient,
      tableName: "voltagent_memory", // Optional
      storageLimit: 150, // Optional: Custom storage limit
      debug: false, // Optional: Debug logging
    });


    ```

  Fixes: [#256](https://github.com/VoltAgent/voltagent/issues/254)

- Updated dependencies [[`937ccf8`](https://github.com/VoltAgent/voltagent/commit/937ccf8bf84a4261ee9ed2c94aab9f8c49ab69bd)]:
  - @voltagent/core@0.1.39

## 0.1.11

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

## 0.1.10

### Patch Changes

- [#236](https://github.com/VoltAgent/voltagent/pull/236) [`5d39cdc`](https://github.com/VoltAgent/voltagent/commit/5d39cdc68c4ec36ec2f0bf86a29dbf1225644416) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: Enhanced fresh installation detection and migration reliability

  This release significantly improves the fresh installation experience and migration system reliability for SupabaseMemory. These changes ensure cleaner setups, prevent unnecessary migration attempts, and resolve PostgreSQL compatibility issues.

  ### Fresh Installation Experience

  The system now properly detects fresh installations and skips migrations when no data exists to migrate. This eliminates confusing migration warnings during initial setup and improves startup performance.

  ```typescript
  // Fresh installation now automatically:
  // ✅ Detects empty database
  // ✅ Skips unnecessary migrations
  // ✅ Sets migration flags to prevent future runs
  // ✅ Shows clean SQL setup instructions

  const storage = new SupabaseMemory({
    supabaseUrl: "your-url",
    supabaseKey: "your-key",
  });
  // No more migration warnings on fresh installs!
  ```

  ### Migration System Improvements
  - **Fixed PostgreSQL syntax error**: Resolved `level TEXT DEFAULT "INFO"` syntax issue by using single quotes for string literals
  - **Enhanced migration flag detection**: Improved handling of multiple migration flags without causing "multiple rows returned" errors
  - **Better error differentiation**: System now correctly distinguishes between "table missing" and "multiple records" scenarios
  - **Automatic flag management**: Fresh installations automatically set migration flags to prevent duplicate runs

  ### Database Setup

  The fresh installation SQL now includes migration flags table creation, ensuring future application restarts won't trigger unnecessary migrations:

  ```sql
  -- Migration flags are now automatically created
  CREATE TABLE IF NOT EXISTS voltagent_memory_conversations_migration_flags (
      id SERIAL PRIMARY KEY,
      migration_type TEXT NOT NULL UNIQUE,
      completed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
      migrated_count INTEGER DEFAULT 0,
      metadata JSONB DEFAULT '{}'::jsonb
  );
  ```

  **Migration Notes:**
  - Existing installations will benefit from improved migration flag detection
  - Fresh installations will have a cleaner, faster setup experience
  - PostgreSQL syntax errors in timeline events table creation are resolved
  - No action required - improvements are automatic

- Updated dependencies [[`5d39cdc`](https://github.com/VoltAgent/voltagent/commit/5d39cdc68c4ec36ec2f0bf86a29dbf1225644416), [`16c2a86`](https://github.com/VoltAgent/voltagent/commit/16c2a863d3ecdc09f09219bd40f2dbf1d789194d), [`0d85f0e`](https://github.com/VoltAgent/voltagent/commit/0d85f0e960dbc6e8df6a79a16c775ca7a34043bb)]:
  - @voltagent/core@0.1.33

## 0.1.9

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

## 0.1.8

### Patch Changes

- [#213](https://github.com/VoltAgent/voltagent/pull/213) [`ed68922`](https://github.com/VoltAgent/voltagent/commit/ed68922e4c71560c2f68117064b84e874a72009f) Thanks [@baseballyama](https://github.com/baseballyama)! - chore!: drop Node.js v18

- Updated dependencies [[`ed68922`](https://github.com/VoltAgent/voltagent/commit/ed68922e4c71560c2f68117064b84e874a72009f), [`80fd3c0`](https://github.com/VoltAgent/voltagent/commit/80fd3c069de4c23116540a55082b891c4b376ce6)]:
  - @voltagent/core@0.1.31

## 0.1.7

### Patch Changes

- [#176](https://github.com/VoltAgent/voltagent/pull/176) [`790d070`](https://github.com/VoltAgent/voltagent/commit/790d070e26a41a6467927471933399020ceec275) Thanks [@omeraplak](https://github.com/omeraplak)! - The `error` column has been deprecated and replaced with `statusMessage` column for better consistency and clearer messaging. The old `error` column is still supported for backward compatibility but will be removed in a future major version.

  Changes:
  - Deprecated `error` column (still functional)
  - Improved error handling and status reporting

- Updated dependencies [[`790d070`](https://github.com/VoltAgent/voltagent/commit/790d070e26a41a6467927471933399020ceec275), [`790d070`](https://github.com/VoltAgent/voltagent/commit/790d070e26a41a6467927471933399020ceec275)]:
  - @voltagent/core@0.1.24

## 0.1.6

### Patch Changes

- [#160](https://github.com/VoltAgent/voltagent/pull/160) [`03ed437`](https://github.com/VoltAgent/voltagent/commit/03ed43723cd56f29ac67088f0624a88632a14a1b) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: enhanced Supabase memory provider with better performance

  We've significantly improved the Supabase memory provider with better schema design and enhanced performance capabilities. The update includes database schema changes that require migration.

  Migration commands will appear in your terminal - follow those instructions to apply the database changes. If you experience any issues with the migration or memory operations, please reach out on [Discord](https://s.voltagent.dev/discord) for assistance.

  **What's Improved:**
  - Better performance for memory operations and large datasets
  - Enhanced database schema with optimized indexing
  - Improved error handling and data validation
  - Better support for timeline events and metadata storage

  **Migration Notes:**
  - Migration commands will be displayed in your terminal
  - Follow the terminal instructions to update your database schema
  - Existing memory data will be preserved during the migration

- Updated dependencies [[`03ed437`](https://github.com/VoltAgent/voltagent/commit/03ed43723cd56f29ac67088f0624a88632a14a1b)]:
  - @voltagent/core@0.1.21

## 0.1.5

### Patch Changes

- [#155](https://github.com/VoltAgent/voltagent/pull/155) [`35b11f5`](https://github.com/VoltAgent/voltagent/commit/35b11f5258073dd39f3032db6d9b29146f4b940c) Thanks [@baseballyama](https://github.com/baseballyama)! - chore: update `tsconfig.json`'s `target` to `ES2022`

- Updated dependencies [[`35b11f5`](https://github.com/VoltAgent/voltagent/commit/35b11f5258073dd39f3032db6d9b29146f4b940c), [`b164bd0`](https://github.com/VoltAgent/voltagent/commit/b164bd014670452cb162b388f03565db992767af), [`9412cf0`](https://github.com/VoltAgent/voltagent/commit/9412cf0633f20d6b77c87625fc05e9e216936758)]:
  - @voltagent/core@0.1.20

## 0.1.4

### Patch Changes

- [#102](https://github.com/VoltAgent/voltagent/pull/102) [`cdfec65`](https://github.com/VoltAgent/voltagent/commit/cdfec657f731fdc1b6d0c307376e3299813f55d3) Thanks [@omeraplak](https://github.com/omeraplak)! - refactor: use 'instructions' field for Agent definitions in examples - #88

  Updated documentation examples (READMEs, docs, blogs) and relevant package code examples to use the `instructions` field instead of `description` when defining `Agent` instances.

  This change aligns the examples with the preferred API usage for the `Agent` class, where `instructions` provides behavioral guidance to the agent/LLM. This prepares for the eventual deprecation of the `description` field specifically for `Agent` class definitions.

  **Example Change for Agent Definition:**

  ```diff
    const agent = new Agent({
      name: "My Assistant",
  -   description: "A helpful assistant.",
  +   instructions: "A helpful assistant.",
      llm: new VercelAIProvider(),
      model: openai("gpt-4o-mini"),
    });
  ```

- Updated dependencies [[`cdfec65`](https://github.com/VoltAgent/voltagent/commit/cdfec657f731fdc1b6d0c307376e3299813f55d3)]:
  - @voltagent/core@0.1.14

## 0.1.3

### Patch Changes

- [#71](https://github.com/VoltAgent/voltagent/pull/71) [`1f20509`](https://github.com/VoltAgent/voltagent/commit/1f20509528fc2cb2ba00f86d649848afae34af04) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: Standardize Agent Error and Finish Handling

  This change introduces a more robust and consistent way errors and successful finishes are handled across the `@voltagent/core` Agent and LLM provider implementations (like `@voltagent/vercel-ai`).

  **Key Improvements:**
  - **Standardized Errors (`VoltAgentError`):**
    - Introduced `VoltAgentError`, `ToolErrorInfo`, and `StreamOnErrorCallback` types in `@voltagent/core`.
    - LLM Providers (e.g., Vercel) now wrap underlying SDK/API errors into a structured `VoltAgentError` before passing them to `onError` callbacks or throwing them.
    - Agent methods (`generateText`, `streamText`, `generateObject`, `streamObject`) now consistently handle `VoltAgentError`, enabling richer context (stage, code, tool details) in history events and logs.

  - **Standardized Stream Finish Results:**
    - Introduced `StreamTextFinishResult`, `StreamTextOnFinishCallback`, `StreamObjectFinishResult`, and `StreamObjectOnFinishCallback` types in `@voltagent/core`.
    - LLM Providers (e.g., Vercel) now construct these standardized result objects upon successful stream completion.
    - Agent streaming methods (`streamText`, `streamObject`) now receive these standardized results in their `onFinish` handlers, ensuring consistent access to final output (`text` or `object`), `usage`, `finishReason`, etc., for history, events, and hooks.

  - **Updated Interfaces:** The `LLMProvider` interface and related options types (`StreamTextOptions`, `StreamObjectOptions`) have been updated to reflect these new standardized callback types and error-throwing expectations.

  These changes lead to more predictable behavior, improved debugging capabilities through structured errors, and a more consistent experience when working with different LLM providers.

- Updated dependencies [[`1f20509`](https://github.com/VoltAgent/voltagent/commit/1f20509528fc2cb2ba00f86d649848afae34af04), [`1f20509`](https://github.com/VoltAgent/voltagent/commit/1f20509528fc2cb2ba00f86d649848afae34af04), [`7a7a0f6`](https://github.com/VoltAgent/voltagent/commit/7a7a0f672adbe42635c3edc5f0a7f282575d0932)]:
  - @voltagent/core@0.1.9

## 0.1.2

### Patch Changes

- [#33](https://github.com/VoltAgent/voltagent/pull/33) [`3ef2eaa`](https://github.com/VoltAgent/voltagent/commit/3ef2eaa9661e8ecfebf17af56b09af41285d0ca9) Thanks [@kwaa](https://github.com/kwaa)! - Update package.json files:
  - Remove `src` directory from the `files` array.
  - Add explicit `exports` field for better module resolution.

- Updated dependencies [[`52d5fa9`](https://github.com/VoltAgent/voltagent/commit/52d5fa94045481dc43dc260a40b701606190585c), [`3ef2eaa`](https://github.com/VoltAgent/voltagent/commit/3ef2eaa9661e8ecfebf17af56b09af41285d0ca9), [`52d5fa9`](https://github.com/VoltAgent/voltagent/commit/52d5fa94045481dc43dc260a40b701606190585c)]:
  - @voltagent/core@0.1.6

## 0.1.1

### Patch Changes

- [#21](https://github.com/VoltAgent/voltagent/pull/21) [`8c3506e`](https://github.com/VoltAgent/voltagent/commit/8c3506e27486ac371192ef9ffb6a997e8e1692e9) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: Introduce Supabase Memory Provider (`@voltagent/supabase`)

  This new package provides a persistent memory solution for VoltAgent using Supabase.

  **Features:**
  - Stores conversation history, agent history entries, events, and steps in your Supabase database.
  - Requires specific table setup in your Supabase project (SQL provided in the package README).
  - Easy integration by initializing `SupabaseMemory` with your Supabase URL and key and passing it to your `Agent` configuration.

  See the `@voltagent/supabase` [README](https://github.com/voltagent/voltagent/blob/main/packages/supabase/README.md) and [Documentation](https://voltagent.dev/docs/agents/memory/supabase/) for detailed setup and usage instructions.

  closes #8
