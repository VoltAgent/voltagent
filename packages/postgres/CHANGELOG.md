# @voltagent/postgres

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
