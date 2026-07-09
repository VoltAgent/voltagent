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

VoltAgent composes the fields it must own for framework behavior: `model`, `prompt`/`messages`, `tools`, `abortSignal`, `maxRetries`, `onStepEnd`, `onEnd`/`onFinish`, and `onError`. User callbacks are still accepted at the top level and are invoked after VoltAgent memory, guardrails, hooks, tracing, and recovery handling.

Top-level AI SDK `runtimeContext`, `toolsContext`, `telemetry`, and `experimental_telemetry` are intentionally not exposed. Use `voltagent.context` for per-call application context, VoltAgent tool context/hooks for tool execution context, and VoltAgent observability/OpenTelemetry configuration for telemetry.

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

VoltAgent now accepts AI SDK-style tool sets directly. The recommended custom tool API is `tool()` from `@voltagent/core`, extended with VoltAgent-specific metadata under the `voltagent` namespace.

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

VoltAgent-specific tool metadata is available through the `voltagent` namespace, so existing framework features can be used with AI SDK-style tools:

```ts
const refundCustomer = tool({
  description: "Refund a customer order",
  inputSchema: z.object({
    orderId: z.string(),
    reason: z.string(),
  }),
  execute: async ({ orderId, reason }) => {
    return issueRefund(orderId, reason);
  },
  voltagent: {
    name: "Refund Customer",
    purpose: "Issue customer refunds",
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

The ToolSet key remains the canonical `tool.name` used for tool calls, approval, routing, and telemetry correlation. `voltagent.name` is display metadata and is emitted as `tool.display_name` for Console and observability consumers.

VoltAgent `tool()` intentionally does not expose AI SDK `contextSchema`, `runtimeContext`, `toolsContext`, `telemetry`, or `experimental_telemetry`. Use `voltagent.context` on the agent call for per-request application context, `voltagent` tool hooks for VoltAgent lifecycle context, and VoltAgent observability/OpenTelemetry configuration for telemetry.

`createTool` is now a legacy compatibility helper for existing class-style tools. New code should use `tool()`.

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
import { Output } from "ai";
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
