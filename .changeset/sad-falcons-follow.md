---
"@voltagent/core": patch
---

feat: improve workflow execute API with context-based pattern

Breaking change: The workflow execute functions now use a context-based API for better developer experience and extensibility.

**Before:**

```typescript
.andThen({
  execute: async (data, state) => {
    // old API with separate parameters
    return { ...data, processed: true };
  }
})
```

**After:**

```typescript
.andThen({
  execute: async ({ data, state, getStepData }) => {
    // new API with context object
    const previousStep = getStepData("step-id");
    return { ...data, processed: true };
  }
})
```

This change applies to:

- `andThen` execute functions
- `andAgent` prompt functions
- `andWhen` condition functions
- `andTap` execute functions

The new API provides:

- Better TypeScript inference
- Access to previous step data via `getStepData`
- Cleaner, more extensible design
