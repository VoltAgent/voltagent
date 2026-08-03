---
"@voltagent/a2a-server": major
"@voltagent/ag-ui": major
"@voltagent/cli": major
"@voltagent/cloudflare-d1": major
"@voltagent/core": major
"@voltagent/docs-mcp": major
"@voltagent/evals": major
"@voltagent/internal": major
"@voltagent/langfuse-exporter": major
"@voltagent/libsql": major
"@voltagent/logger": major
"@voltagent/mcp-server": major
"@voltagent/postgres": major
"@voltagent/rag": major
"@voltagent/resumable-streams": major
"@voltagent/sandbox-blaxel": major
"@voltagent/sandbox-daytona": major
"@voltagent/sandbox-e2b": major
"@voltagent/scorers": major
"@voltagent/sdk": major
"@voltagent/server-core": major
"@voltagent/server-elysia": major
"@voltagent/server-hono": major
"@voltagent/serverless-hono": major
"@voltagent/supabase": major
"@voltagent/vercel-ai-exporter": major
"@voltagent/voice": major
"@voltagent/voltagent-memory": major
"create-voltagent-app": major
---

Release the first VoltAgent 3 prerelease on the `next` channel.

VoltAgent 3 aligns the framework with AI SDK v7, moves the published packages to an ESM-only runtime boundary, and requires Node.js 22 or later. This release keeps the core agent, memory, tool, workflow, guardrail, observability, server, MCP, A2A, AG-UI, and storage features available, while tightening the public API around AI SDK-compatible names and call shapes.

### Install from the next channel

```bash
pnpm add @voltagent/core@next @voltagent/server-hono@next @voltagent/logger@next
pnpm add ai@^7 @ai-sdk/openai@^4 zod@^4
```

If your app uses additional VoltAgent packages, keep all `@voltagent/*` packages on the same major/prerelease line:

```bash
pnpm add @voltagent/postgres@next @voltagent/supabase@next @voltagent/voice@next
```

### Runtime requirements

VoltAgent 3 requires Node.js 22+ and ESM imports.

```json
{
  "type": "module",
  "engines": {
    "node": ">=22"
  }
}
```

Before:

```js
const { Agent } = require("@voltagent/core");
const { openai } = require("@ai-sdk/openai");
```

After:

```ts
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
```

### AI SDK v7 alignment

Upgrade `ai` and provider packages to AI SDK v7-compatible versions:

```bash
pnpm add ai@^7 @ai-sdk/provider-utils@^5
pnpm add @ai-sdk/openai@^4
```

Common provider package upgrades:

| Package                     | Version for AI SDK v7 |
| --------------------------- | --------------------- |
| `@ai-sdk/openai`            | `^4`                  |
| `@ai-sdk/anthropic`         | `^4`                  |
| `@ai-sdk/google`            | `^4`                  |
| `@ai-sdk/azure`             | `^4`                  |
| `@ai-sdk/groq`              | `^4`                  |
| `@ai-sdk/mistral`           | `^4`                  |
| `@ai-sdk/openai-compatible` | `^3`                  |
| `@ai-sdk/amazon-bedrock`    | `^5`                  |
| `@ai-sdk/google-vertex`     | `^5`                  |

### Zod 4-only

VoltAgent 3 requires Zod 4. The framework packages now use `zod@^4` peer ranges, examples and templates install Zod 4, and the old Zod 3 JSON Schema/OpenAPI compatibility fallback has been removed.

```bash
pnpm add zod@^4
```

### Agent usage

The object-style call shape is the preferred API. VoltAgent 3 derives agent generation options from AI SDK v7 `generateText` and `streamText`, so AI SDK settings stay at the top level while VoltAgent runtime concerns live under `voltagent`.

```ts
const result = await agent.generateText({
  prompt: "Summarize this support ticket",
  temperature: 0.2,
  maxOutputTokens: 500,
  voltagent: {
    memory: {
      userId: "user-123",
      conversationId: "ticket-456",
    },
    context: {
      requestId: "req-789",
    },
  },
});
```

AI SDK v7 options such as `timeout`, `headers`, `include`, `activeTools`, `toolOrder`, `experimental_download`, `onChunk`, and stream lifecycle callbacks can be used directly on VoltAgent calls:

```ts
const result = await agent.streamText({
  prompt: "Write a release note for this changelog",
  timeout: {
    totalMs: 30_000,
    chunkMs: 5_000,
  },
  include: {
    rawChunks: true,
  },
  onChunk: async ({ chunk }) => {
    console.log(chunk.type);
  },
  voltagent: {
    context: {
      requestId: "req-789",
    },
  },
});
```

VoltAgent composes only the fields it must own for framework behavior: `model`, `prompt`/`messages`, `tools`, `abortSignal`, and `maxRetries`. AI SDK lifecycle callbacks remain top-level AI SDK callbacks: `onStepEnd`, `onEnd`/`onFinish`, and `onError` receive raw AI SDK events. Use VoltAgent `hooks.*` when you need VoltAgent's processed output, memory, guardrail, middleware, tracing, or error context.

Top-level AI SDK `runtimeContext`, `toolsContext`, `telemetry`, and `experimental_telemetry` pass through on VoltAgent calls. Use `toolsContext` for native AI SDK tools that declare `contextSchema`; VoltAgent also preserves that context through routed tool calls and native `toolApproval`. Use `voltagent.context` for VoltAgent runtime state that should be visible to memory, hooks, guardrails, middleware, and VoltAgent-managed tools.

The same shape works for streaming:

```ts
const result = await agent.streamText({
  prompt: "Write a short release note",
  stopWhen: isStepCount(5),
  voltagent: {
    memory: {
      userId: "user-123",
      conversationId: "release-456",
    },
  },
});

for await (const part of result.stream) {
  if (part.type === "text-delta") {
    process.stdout.write(part.text);
  }
}
```

`fullStream` remains as a deprecated compatibility alias during the transition, but new code should use `stream`.

### Tool usage

VoltAgent now accepts AI SDK-style tool sets directly. For new VoltAgent tools, import `tool()` from `@voltagent/core`; it is AI SDK-compatible and adds only an optional `voltagent` metadata namespace. Raw AI SDK tools from `ai` remain first-class. Use `enhanceTool()` when you receive an existing AI SDK tool from another package and want to add VoltAgent hooks, tags, API metadata, or display metadata without rebuilding the tool.

`@voltagent/core` also re-exports common AI SDK primitives such as `generateText`, `streamText`, `generateObject`, `streamObject`, `embed`, `embedMany`, `Output`, `ToolSet`, and `LanguageModel`. Importing these from VoltAgent keeps one public surface for application code, while the direct function exports preserve native AI SDK behavior. Use `agent.generateText()` and `agent.streamText()` when you want VoltAgent orchestration, memory, guardrails, tracing, and tool routing.

```ts
import { Agent, tool } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const agent = new Agent({
  name: "Weather Agent",
  model: openai("gpt-4o-mini"),
  tools: {
    getWeather: tool({
      description: "Get the weather for a city",
      inputSchema: z.object({
        city: z.string(),
      }),
      execute: async ({ city }) => {
        return { city, forecast: "Sunny", temperature: 72 };
      },
    }),
  },
});
```

Native AI SDK tool options such as `contextSchema` work unchanged with call-level `toolsContext`:

```ts
const weather = tool({
  description: "Get weather for a city",
  inputSchema: z.object({ city: z.string() }),
  contextSchema: z.object({
    apiKey: z.string(),
    defaultUnit: z.enum(["celsius", "fahrenheit"]),
  }),
  execute: async ({ city }, { context }) => {
    return fetchWeather(city, {
      apiKey: context.apiKey,
      unit: context.defaultUnit,
    });
  },
});

await agent.generateText({
  prompt: "What is the weather in San Francisco?",
  tools: { weather },
  toolsContext: {
    weather: {
      apiKey: process.env.WEATHER_API_KEY!,
      defaultUnit: "fahrenheit",
    },
  },
});
```

VoltAgent-specific tool metadata is optional and stored out-of-band so it is not sent to the model provider:

```ts
import { tool } from "@voltagent/core";

const refundCustomer = tool({
  description: "Refund a customer order",
  inputSchema: z.object({
    orderId: z.string(),
    reason: z.string(),
  }),
  contextSchema: z.object({
    actorId: z.string(),
    permissions: z.array(z.string()),
  }),
  execute: async ({ orderId, reason }, { context }) => {
    if (!context.permissions.includes("refund:write")) {
      throw new Error("Not allowed to refund orders");
    }

    return issueRefund({
      orderId,
      reason,
      actorId: context.actorId,
    });
  },
  voltagent: {
    name: "Refund Customer",
    purpose: "Issue customer refunds",
    tags: ["billing", "dangerous", "customer-support"],
    metadata: {
      owner: "payments-team",
      riskLevel: "high",
    },
  },
});
```

Decorate existing AI SDK tools without reconstructing them:

```ts
import { enhanceTool } from "@voltagent/core";

const externalWeatherTool = getWeatherToolFromSomePackage();

const weather = enhanceTool(externalWeatherTool, {
  name: "Weather lookup",
  tags: ["weather", "external"],
  metadata: {
    owner: "platform-team",
  },
});
```

Register the tool under the canonical name the model should call:

```ts
const agent = new Agent({
  name: "Support Agent",
  model,
  tools: {
    refundCustomer,
  },
});
```

The ToolSet key remains the canonical `tool.name` used for tool calls, approval, routing, and telemetry correlation. VoltAgent metadata `name` is display metadata and is emitted as `tool.display_name` for Console and observability consumers.

`createTool` is now a legacy compatibility helper for existing class-style tools.

### Tool approval

AI SDK native `toolApproval` is forwarded through VoltAgent agent calls.

```ts
const result = await agent.streamText({
  prompt: "Refund order order_123 if it is eligible",
  toolApproval: {
    refundCustomer: "user-approval",
  },
});
```

Use call-level `toolApproval` for new per-request approval flows. Use `voltagent.needsApproval` only when approval should be static tool metadata or part of an existing VoltAgent approval/tool-policy flow. If both are provided, call-level `toolApproval` takes precedence.

### Structured output

Prefer AI SDK v7-style `output` over `experimental_output`.

```ts
import { Output } from "@voltagent/core";
import { z } from "zod";

const result = await agent.generateText({
  prompt: "Extract the customer profile",
  output: Output.object({
    schema: z.object({
      name: z.string(),
      plan: z.enum(["free", "pro", "enterprise"]),
    }),
  }),
});

console.log(result.output);
```

`generateObject` and `streamObject` remain as deprecated compatibility wrappers. For new code, use `generateText` or `streamText` with `output`.

### Migration checklist

1. Upgrade local development, CI, and production to Node.js 22 or later.
2. Set `"type": "module"` and replace CommonJS `require()` calls with ESM imports.
3. Upgrade all `@voltagent/*` packages together from the `next` channel.
4. Upgrade `ai` to `^7` and AI SDK provider packages to their v7-compatible majors.
5. Upgrade `zod` to `^4`.
6. Replace `stepCountIs` with `isStepCount`.
7. Prefer `result.stream` over `result.fullStream`.
8. Prefer `output` over `experimental_output`.
9. Prefer object-style agent calls for new code, with VoltAgent runtime options under `voltagent`.
