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

return standardizedOutput; // ✅ Includes userContext
```

**How users can see the changes**:

Now users can access the `userContext` in the response from all agent methods:

```typescript
// Set custom context before calling the agent
const customContext = new Map();
customContext.set("sessionId", "user-123");
customContext.set("requestId", "req-456");

// generateText now returns userContext
const result = await agent.generateText("Hello", {
  userContext: customContext,
});

// Access the userContext from the response
console.log(result.userContext.get("sessionId")); // 'user-123'
console.log(result.userContext.get("requestId")); // 'req-456'

// GenerateObject
const objectResult = await agent.generateObject("Create a summary", schema, {
  userContext: customContext,
});
console.log(objectResult.userContext.get("sessionId")); // 'user-123'

// Streaming methods
const streamResult = await agent.streamText("Hello", {
  userContext: customContext,
});
console.log(streamResult.userContext?.get("sessionId")); // 'user-123'
```

Fixes: [#283](https://github.com/VoltAgent/voltagent/issues/283)
