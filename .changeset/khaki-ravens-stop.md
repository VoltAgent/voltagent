---
"@voltagent/core": patch
---

feat: add addTools method and deprecate addItems for better developer experience - #487

## What Changed

- Added new `addTools()` method to Agent class for dynamically adding tools and toolkits
- Deprecated `addItems()` method in favor of more intuitive `addTools()` naming
- Fixed type signature to accept `Tool<any, any>` instead of `Tool<any>` to support tools with output schemas

## Before

```typescript
// ❌ Method didn't exist - would throw error
agent.addTools([weatherTool]);

// ❌ Type error with tools that have outputSchema
agent.addItems([weatherTool]); // Type error if weatherTool has outputSchema
```

## After

```typescript
// ✅ Works with new addTools method
agent.addTools([weatherTool]);

// ✅ Also supports toolkits
agent.addTools([myToolkit]);

// ✅ No type errors with outputSchema tools
const weatherTool = createTool({
  name: "getWeather",
  outputSchema: weatherOutputSchema, // Works without type errors
  // ...
});
agent.addTools([weatherTool]);
```

## Migration

The `addItems()` method is deprecated but still works. Update your code to use `addTools()`:

```typescript
// Old (deprecated)
agent.addItems([tool1, tool2]);

// New (recommended)
agent.addTools([tool1, tool2]);
```

This change improves developer experience by using more intuitive method naming and fixing TypeScript compatibility issues with tools that have output schemas.
