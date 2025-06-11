---
"@voltagent/postgres": patch
---

fix: PostgreSQL string literal syntax error in timeline events table

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
