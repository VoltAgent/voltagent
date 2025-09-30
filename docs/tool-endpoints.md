# Tool Endpoints: Simple Toggle Pattern

VoltAgent tools can be easily exposed as HTTP endpoints by adding an optional `endpoint` configuration to any tool. This provides a simple, secure way to make your agent's tools accessible via REST API.

## Key Principles

1. **OFF by Default**: Endpoints are disabled unless explicitly enabled
2. **Simple Toggle**: Just add `endpoint: { enabled: true }` to any tool
3. **One Function**: Use the same `createTool()` for everything
4. **Flexible Control**: Environment variables, feature flags, conditional logic
5. **Backward Compatible**: Existing tools work unchanged

## Quick Start

### Basic Example

```typescript
import { createTool, generateEndpointsFromTools, VoltAgent } from "@voltagent/core";
import { z } from "zod";

// Regular tool (no endpoint)
const internalTool = createTool({
  name: "internalCalculation",
  description: "Internal calculation tool",
  parameters: z.object({
    value: z.number(),
  }),
  execute: async ({ value }) => {
    return { result: value * 2 };
  },
  // No endpoint config = no HTTP endpoint
});

// Tool with endpoint enabled
const publicTool = createTool({
  name: "calculator",
  description: "Perform mathematical calculations",
  parameters: z.object({
    operation: z.enum(["add", "subtract", "multiply", "divide"]),
    a: z.number(),
    b: z.number(),
  }),
  execute: async ({ operation, a, b }) => {
    const operations = {
      add: a + b,
      subtract: a - b,
      multiply: a * b,
      divide: a / b,
    };
    return { result: operations[operation] };
  },
  endpoint: {
    enabled: true, // Just toggle it on!
  },
});

// Create agent with both tools
const agent = new Agent({
  name: "MathAgent",
  tools: [internalTool, publicTool],
  // ... other config
});

// Generate endpoints only for tools with enabled: true
const endpoints = generateEndpointsFromTools([internalTool, publicTool], {
  basePath: "/tools",
  includeBatch: true,
  includeListing: true,
});

// Start VoltAgent with custom endpoints
new VoltAgent({
  agents: { agent },
  customEndpoints: endpoints,
});
```

### Result

- `internalTool` - Works in agent, NO HTTP endpoint
- `publicTool` - Works in agent AND has HTTP endpoint at `POST /tools/calculator`

## Endpoint Configuration

### Basic Configuration

```typescript
endpoint: {
  enabled: true,  // Must be true to generate endpoint
}
```

### Advanced Configuration

```typescript
endpoint: {
  enabled: true,
  method: "post",                    // HTTP method (default: "post")
  path: "/custom/my-tool",           // Custom path (optional)
  supportsGet: true,                 // Allow GET requests with query params

  // Transform the response
  responseTransformer: (result, context) => ({
    success: true,
    data: result,
    timestamp: new Date().toISOString(),
  }),

  // Custom error handling
  errorHandler: async (error, context) => {
    return context.json({
      error: true,
      message: error.message,
    }, 500);
  },

  // Authentication
  auth: {
    required: true,
    roles: ["user", "admin"],
  },

  // Rate limiting
  rateLimit: {
    requests: 10,
    window: 60, // 10 requests per minute
  },

  // Custom metadata
  metadata: {
    version: "1.0",
    category: "math",
  },
}
```

## Control Mechanisms

### 1. Environment Variables

```typescript
const tool = createTool({
  name: "myTool",
  // ...
  endpoint: {
    enabled: process.env.ENABLE_TOOL_ENDPOINTS === "true",
  },
});
```

### 2. Feature Flags

```typescript
const tool = createTool({
  name: "myTool",
  // ...
  endpoint: {
    enabled: featureFlags.toolEndpoints,
  },
});
```

### 3. Conditional Logic

```typescript
const tool = createTool({
  name: "myTool",
  // ...
  endpoint: {
    enabled: process.env.NODE_ENV === "production",
  },
});
```

### 4. Programmatic Control

```typescript
class ToolManager {
  private endpointsEnabled = false;

  enableEndpoints() {
    this.endpointsEnabled = true;
  }

  createTool(name: string, config: any) {
    return createTool({
      name,
      ...config,
      endpoint: {
        enabled: this.endpointsEnabled,
      },
    });
  }
}
```

## Generated Endpoints

### Individual Tool Endpoints

When you enable endpoints for tools, the following are automatically generated:

- `POST /tools/{toolName}` - Execute the tool with JSON body
- `GET /tools/{toolName}` - Execute via query params (if `supportsGet: true`)

### Utility Endpoints

- `GET /tools` - List all available tools and their schemas
- `POST /tools/batch` - Execute multiple tools in a single request

### Example Requests

**POST Request:**

```bash
curl -X POST http://localhost:3141/tools/calculator \
  -H "Content-Type: application/json" \
  -d '{"operation": "add", "a": 5, "b": 3}'
```

**GET Request (if supportsGet: true):**

```bash
curl 'http://localhost:3141/tools/calculator?operation=add&a=5&b=3'
```

**List Tools:**

```bash
curl http://localhost:3141/tools
```

**Batch Execution:**

```bash
curl -X POST http://localhost:3141/tools/batch \
  -H "Content-Type: application/json" \
  -d '{
    "tools": [
      {
        "name": "calculator",
        "arguments": {"operation": "add", "a": 5, "b": 3}
      },
      {
        "name": "textProcessor",
        "arguments": {"text": "hello", "operation": "uppercase"}
      }
    ]
  }'
```

## Security Best Practices

### 1. Default to OFF

Always keep endpoints disabled by default and only enable them when needed:

```typescript
// Good: Explicit opt-in
endpoint: {
  enabled: true;
}

// Bad: Always on
endpoint: {
  enabled: true;
} // for all tools
```

### 2. Use Authentication

For sensitive tools, require authentication:

```typescript
endpoint: {
  enabled: true,
  auth: {
    required: true,
    roles: ["admin"],
  },
}
```

### 3. Apply Rate Limiting

Prevent abuse with rate limiting:

```typescript
endpoint: {
  enabled: true,
  rateLimit: {
    requests: 10,
    window: 60,
  },
}
```

### 4. Validate Input

Always use Zod schemas for parameter validation:

```typescript
parameters: z.object({
  email: z.string().email(),
  age: z.number().min(0).max(120),
});
```

## Complete Example

See [`examples/simple-tool-endpoints/`](../examples/simple-tool-endpoints/) for a complete working example demonstrating:

- Regular tools (no endpoints)
- Simple endpoint toggle
- Advanced endpoint configuration
- Environment-based control
- Production-only endpoints
- GET method support
- Custom response transformers

## Migration from Regular Tools

Existing tools continue to work unchanged. To add endpoints:

```typescript
// Before: Regular tool
const tool = createTool({
  name: "myTool",
  description: "My tool",
  parameters: z.object({ input: z.string() }),
  execute: async ({ input }) => ({ output: input }),
});

// After: Same tool with endpoint
const tool = createTool({
  name: "myTool",
  description: "My tool",
  parameters: z.object({ input: z.string() }),
  execute: async ({ input }) => ({ output: input }),
  endpoint: { enabled: true }, // Just add this!
});
```

No breaking changes. No refactoring. Just add the endpoint configuration when you need it.
