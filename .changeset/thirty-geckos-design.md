---
"@voltagent/postgres": patch
"@voltagent/supabase": patch
"@voltagent/libsql": patch
"@voltagent/core": patch
---

fix: persist workflow execution timeline events to prevent data loss after completion - #647

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

New deployments get the columns automatically. For existing tables, run:

```sql
ALTER TABLE voltagent_workflow_states
ADD COLUMN IF NOT EXISTS events JSONB,
ADD COLUMN IF NOT EXISTS output JSONB,
ADD COLUMN IF NOT EXISTS cancellation JSONB;
```

### In-Memory Users

No action required - automatically supported.

## Impact

- ✅ Workflow execution timeline is now persistent and survives completion
- ✅ Full execution history visible for completed, suspended, and failed workflows
- ✅ Events, output, and cancellation metadata preserved in database
- ✅ Console UI timeline works consistently across all workflow states
- ✅ All storage backends (LibSQL, Supabase, Postgres, In-Memory) behave consistently
- ✅ No data loss on workflow completion or page refresh
