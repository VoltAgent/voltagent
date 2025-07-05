---
"@voltagent/core": patch
---

fix: export PromptContent type to resolve "cannot be named" TypeScript error

Fixed a TypeScript compilation error where users would get "cannot be named" errors when exporting variables that use `InstructionsDynamicValue` type. This occurred because `InstructionsDynamicValue` references `PromptContent` type, but `PromptContent` was not being re-exported from the public API.

**Before:**

```typescript
export type { DynamicValueOptions, DynamicValue, PromptHelper };
```

**After:**

```typescript
export type { DynamicValueOptions, DynamicValue, PromptHelper, PromptContent };
```

This ensures that all types referenced by public API types are properly exported, preventing TypeScript compilation errors when users export agents or variables that use dynamic instructions.
