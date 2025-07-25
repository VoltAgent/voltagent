---
"@voltagent/core": patch
"@voltagent/postgres": patch
"@voltagent/supabase": patch
---

fix: memory storage implementations now correctly return the most recent messages when using context limit

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
