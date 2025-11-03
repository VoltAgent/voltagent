---
"@voltagent/core": major
---

feat: encapsulate tool-specific metadata in toolContext

**Migration:**

```typescript
execute: async ({ location }, options) => {
  const { name, callId, messages, abortSignal } = options?.toolContext || {};

  // Session context remains flat
  const userId = options?.userId;
  const logger = options?.logger;
  const context = options?.context;
};
```

**Benefits:**

- ✅ Better organization - tool metadata in one place
- ✅ Clearer separation - session context vs tool context
- ✅ Future-proof - easy to add new tool metadata fields
- ✅ Namespace safety - no collision with OperationContext fields
- ✅ Aligned with AI SDK patterns
