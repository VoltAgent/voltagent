---
"@voltagent/core": minor
"@voltagent/internal": patch
---

feat(core): Add TypeScript support for `userContext`, and add helper functions for creating and working with the `userContext`.

### Usage

To add types for the `userContext` field you need to leverage module augmentation, to augment the `UserContextData` type.

```typescript
declare module "@voltagent/core" {
  interface UserContextData {
    language: "english" | "spanish" | "french" | "arabic" | "mandarin" | "japanese";
  }
}
```

This will allow TypeScript to infer the type of the `userContext` based on the `UserContextData` interface.

```typescript
const userContext = createUserContext();

const language = userContext.get("language"); // Will be inferred to be 'english' | 'spanish' | 'french' | 'arabic' | 'mandarin' | 'japanese' or null if not set
```

### New: Utils & Helpers

- `createUserContext` - Create a new user context, MUST be used to create a new user context or it will not work and be ignored.
- `resolveUserContext` - Resolve the user context from the operation context, if it doesn't exist a new one is created.
- `hasUserContext` - Check if the operation context has a user context.
- `isUserContext` - Check if the value is a user context.
