# @voltagent/supabase

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
