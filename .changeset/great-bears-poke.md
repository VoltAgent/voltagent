---
"@voltagent/core": minor
---

The `UserContext` was properly propagated through tools and hooks, but was not being returned in the final response from `.generateText()` and `.generateObject()` methods. This prevented post-processing logic from accessing the UserContext data.

**Before**:

```typescript
const standardizedOutput: StandardizedTextResult = {
  text: response.text,
  usage: response.usage,
  finishReason: response.finishReason,
  providerResponse: response,
  userContext: new Map(operationContext.userContext),
};

return response; // ❌ Missing userContext
```

**After**:

```typescript
const standardizedOutput: StandardizedTextResult = {
  text: response.text,
  usage: response.usage,
  finishReason: response.finishReason,
  providerResponse: response,
  userContext: new Map(operationContext.userContext),
};

return standardizedOutput as any; // ✅ Includes userContext
```

Fixes: #[283](https://github.com/VoltAgent/voltagent/issues/283)
