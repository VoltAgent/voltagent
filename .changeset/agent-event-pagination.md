---
"@voltagent/core": patch
"@voltagent/with-postgres": patch
"@voltagent/with-supabase": patch
---

feat: optimize agent event system and add pagination to agent history API

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
