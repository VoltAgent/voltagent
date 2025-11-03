---
"@voltagent/core": minor
---

feat: simplify tool execution API by merging OperationContext into ToolExecuteOptions

**Migration:**

```typescript
// Before (still works!)
execute: async ({ location }, context) => {
  const userId = context?.userId;
  const logger = context?.logger;
};

// After (recommended - cleaner!)
execute: async ({ location }, options) => {
  const userId = options?.userId;
  const logger = options?.logger;
  const userContext = options?.context; // User-defined context Map
};
```

**Benefits:**

- ✅ Cleaner API - single options parameter with everything
- ✅ Better IntelliSense - all fields visible in one type
- ✅ More flexible - easier to add new options in future
- ✅ Aligned with AI SDK patterns
