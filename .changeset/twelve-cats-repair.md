---
"@voltagent/core": patch
---

feat(core): Enhanced server configuration with unified `server` object and Swagger UI control

Server configuration options have been enhanced with a new unified `server` object for better organization and flexibility while maintaining full backward compatibility.

**What's New:**

- **Unified Server Configuration:** All server-related options (`autoStart`, `port`, `enableSwaggerUI`, `customEndpoints`) are now grouped under a single `server` object.
- **Swagger UI Control:** Fine-grained control over Swagger UI availability with environment-specific defaults.
- **Backward Compatibility:** Legacy individual options are still supported but deprecated.
- **Override Logic:** New `server` object takes precedence over deprecated individual options.

**Migration Guide:**

**New Recommended Usage:**

```typescript
import { Agent, VoltAgent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "My Assistant",
  instructions: "A helpful assistant",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

new VoltAgent({
  agents: { agent },
  server: {
    autoStart: true,
    port: 3000,
    enableSwaggerUI: true,
    customEndpoints: [
      {
        path: "/health",
        method: "get",
        handler: async (c) => c.json({ status: "ok" }),
      },
    ],
  },
});
```

**Legacy Usage (Deprecated but Still Works):**

```typescript
new VoltAgent({
  agents: { agent },
  autoStart: true, // @deprecated - use server.autoStart
  port: 3000, // @deprecated - use server.port
  customEndpoints: [], // @deprecated - use server.customEndpoints
});
```

**Mixed Usage (Server Object Overrides):**

```typescript
new VoltAgent({
  agents: { agent },
  autoStart: false, // This will be overridden
  server: {
    autoStart: true, // This takes precedence
  },
});
```

**Swagger UI Defaults:**

- Development (`NODE_ENV !== 'production'`): Swagger UI enabled
- Production (`NODE_ENV === 'production'`): Swagger UI disabled
- Override with `server.enableSwaggerUI: true/false`

Resolves [#241](https://github.com/VoltAgent/voltagent/issues/241)
