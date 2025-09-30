# Simple Tool Endpoints - Just a Toggle!

This example demonstrates the **simplified approach** where tool endpoints are just a toggle in the existing `createTool()` function.

## The Key Idea

Instead of having separate functions like `createEnhancedTool()` or decorators like `withEndpoint()`, you just add an optional `endpoint` parameter to the regular `createTool()` function:

```typescript
// Regular tool (no endpoint)
const tool1 = createTool({
  name: "myTool",
  description: "My tool",
  parameters: z.object({ input: z.string() }),
  execute: async ({ input }) => ({ output: input }),
  // No endpoint config = no endpoint
});

// Same tool with endpoint enabled (just toggle it on!)
const tool2 = createTool({
  name: "myTool",
  description: "My tool",
  parameters: z.object({ input: z.string() }),
  execute: async ({ input }) => ({ output: input }),
  endpoint: {
    enabled: true, // Just add this!
  },
});
```

## Why This is Better

### Before (Complex)

- `createTool()` - for regular tools
- `createEnhancedTool()` - for tools with endpoints
- `withEndpoint()` - to convert regular tools
- Three different ways to do things

### After (Simple)

- `createTool()` - for everything
- Add `endpoint: { enabled: true }` when you want an endpoint
- One way to do things

## Examples in This Demo

### 1. Regular Tool (No Endpoint)

```typescript
const regularTool = createTool({
  name: "regularTool",
  // ...
  // No endpoint config
});
```

### 2. Simple Endpoint (Just Toggle On)

```typescript
const simpleTool = createTool({
  name: "calculator",
  // ...
  endpoint: {
    enabled: true, // That's it!
  },
});
```

### 3. Advanced Endpoint (With Configuration)

```typescript
const advancedTool = createTool({
  name: "textProcessor",
  // ...
  endpoint: {
    enabled: true,
    method: "post",
    supportsGet: true,
    responseTransformer: (result, context) => ({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    }),
  },
});
```

### 4. Environment-Controlled Toggle

```typescript
const envTool = createTool({
  name: "envTool",
  // ...
  endpoint: {
    enabled: process.env.ENABLE_ENV_TOOL === "true",
  },
});
```

### 5. Production-Only Toggle

```typescript
const prodTool = createTool({
  name: "prodTool",
  // ...
  endpoint: {
    enabled: process.env.NODE_ENV === "production",
  },
});
```

## Running the Example

### Default (Some Endpoints ON)

```bash
npm run dev
```

### All Endpoints ON

```bash
npm run dev:all-on
```

### Custom Environment

```bash
ENABLE_ENV_TOOL=true NODE_ENV=production npm run dev
```

## Generated Endpoints

The example automatically generates endpoints for tools with `enabled: true`:

- `POST /tools/calculator` - Calculator tool
- `POST /tools/textProcessor` - Text processor
- `GET /tools/textProcessor` - Text processor (via query params)
- `POST /tools/batch` - Batch execution
- `GET /tools` - List all tools

## Testing

```bash
# Calculator
curl -X POST http://localhost:3141/tools/calculator \
  -H "Content-Type: application/json" \
  -d '{"operation": "add", "a": 5, "b": 3}'

# Text processor (POST)
curl -X POST http://localhost:3141/tools/textProcessor \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello", "operation": "uppercase"}'

# Text processor (GET)
curl 'http://localhost:3141/tools/textProcessor?text=Hello&operation=uppercase'

# List all tools
curl http://localhost:3141/tools

# Batch execution
curl -X POST http://localhost:3141/tools/batch \
  -H "Content-Type: application/json" \
  -d '{
    "tools": [
      {"name": "calculator", "parameters": {"operation": "add", "a": 10, "b": 5}},
      {"name": "textProcessor", "parameters": {"text": "world", "operation": "uppercase"}}
    ]
  }'
```

## Key Benefits

1. **Simpler**: One function for everything
2. **Clearer**: Endpoint is just an optional parameter
3. **Consistent**: Same API for all tools
4. **Flexible**: Toggle on/off as needed
5. **Backward Compatible**: Existing tools without `endpoint` config work unchanged

## Migration from Old Approach

If you were using the old approach with `createEnhancedTool()`:

### Before

```typescript
import { createEnhancedTool } from "@voltagent/core";

const tool = createEnhancedTool({
  name: "myTool",
  // ...
  endpoint: {
    enabled: true,
  },
});
```

### After

```typescript
import { createTool } from "@voltagent/core";

const tool = createTool({
  name: "myTool",
  // ...
  endpoint: {
    enabled: true,
  },
});
```

Just change `createEnhancedTool` to `createTool` - that's it!

## Summary

**Tool endpoints are now just a toggle in the regular `createTool()` function.**

- No separate functions
- No decorators
- No complexity
- Just add `endpoint: { enabled: true }` when you need it
- OFF by default for security
- ON when you explicitly enable it

Simple, clean, and powerful!
