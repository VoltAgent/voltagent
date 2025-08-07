---
"@voltagent/core": patch
---

fix: separate system-managed context from user context in operationContext

Separated system-managed values from userContext by introducing a new `systemContext` field in OperationContext. This provides cleaner separation of concerns between user-provided context and internal system tracking.

### What Changed

- Added `systemContext` field to `OperationContext` type for internal system values
- Moved system-managed values from `userContext` to `systemContext`:
  - `agent_start_time`: Agent execution start timestamp
  - `agent_start_event_id`: Agent start event identifier
  - `tool_${toolId}`: Tool execution tracking (eventId and startTime)

### Why This Matters

Previously, system values were mixed with user context, which could:

- Pollute the user's context namespace
- Make it unclear which values were user-provided vs system-generated
- Potentially cause conflicts if users used similar key names

Now there's a clear separation:

- `userContext`: Contains only user-provided values
- `systemContext`: Contains only system-managed internal tracking values

### Migration

This is an internal change that doesn't affect the public API. User code remains unchanged.

```typescript
// User API remains the same
const response = await agent.generateText("Hello", {
  userContext: new Map([["userId", "123"]]),
});

// userContext now only contains user values
console.log(response.userContext.get("userId")); // "123"
// System values are kept separate internally
```
