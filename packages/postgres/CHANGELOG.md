# @voltagent/postgres

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
