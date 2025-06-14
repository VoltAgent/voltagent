---
"@voltagent/postgres": patch
"@voltagent/supabase": patch
"@voltagent/core": patch
---

feat: add userId and conversationId support to agent history tables

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
