---
"@voltagent/core": patch
---

feat: encapsulate tool-specific metadata in toolContext + prevent AI SDK context collision

## Changes

### 1. Tool Context Encapsulation

Tool-specific metadata now organized under optional `toolContext` field for better separation and future-proofing.

**Migration:**

```typescript
// Before
execute: async ({ location }, options) => {
  // Fields were flat (planned, not released)
};

// After
execute: async ({ location }, options) => {
  const { name, callId, messages, abortSignal } = options?.toolContext || {};

  // Session context remains flat
  const userId = options?.userId;
  const logger = options?.logger;
  const context = options?.context;
};
```

### 2. AI SDK Context Field Protection

Explicitly exclude `context` from being spread into AI SDK calls to prevent future naming collisions if AI SDK renames `experimental_context` → `context`.

## Benefits

- ✅ Better organization - tool metadata in one place
- ✅ Clearer separation - session context vs tool context
- ✅ Future-proof - easy to add new tool metadata fields
- ✅ Namespace safety - no collision with OperationContext or AI SDK fields
- ✅ Backward compatible - `toolContext` is optional for external callers (MCP servers)
- ✅ Protected from AI SDK breaking changes
