# @voltagent/mcp-server

## 3.0.0-next.0

### Major Changes

- Release the first VoltAgent 3 prerelease on the `next` channel.

  VoltAgent 3 aligns the framework with AI SDK v7, moves the published packages to an ESM-only runtime boundary, and requires Node.js 22 or later. This release keeps the core agent, memory, tool, workflow, guardrail, observability, server, MCP, A2A, AG-UI, and storage features available, while tightening the public API around AI SDK-compatible names and call shapes.

  ### Install from the next channel

  ```bash
  pnpm add @voltagent/core@next @voltagent/server-hono@next @voltagent/logger@next
  pnpm add ai@^7 @ai-sdk/openai@^4
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

  ### Agent usage

  The object-style call shape is the preferred API. AI SDK generation options stay at the top level, while VoltAgent runtime concerns live under `voltagent`.

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

  VoltAgent now accepts AI SDK-style tool sets directly, so projects can use `tool()` without wrapping every tool in `createTool`.

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
      name: "refundCustomer",
      purpose: "Issue customer refunds after approval",
      needsApproval: true,
    },
  });
  ```

  `createTool` remains available for existing tools and for codebases that prefer the VoltAgent-native helper.

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

  Tools configured with VoltAgent `needsApproval` continue to participate in VoltAgent approval-aware flows. Native visible tools can use AI SDK approval responses, while hidden routed tools still enforce VoltAgent routing policy before execution.

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
  5. Replace `stepCountIs` with `isStepCount`.
  6. Prefer `result.stream` over `result.fullStream`.
  7. Prefer `output` over `experimental_output`.
  8. Prefer object-style agent calls for new code, with VoltAgent runtime options under `voltagent`.

### Patch Changes

- Updated dependencies []:
  - @voltagent/core@3.0.0-next.0
  - @voltagent/internal@2.0.0-next.0

## 2.0.2

### Patch Changes

- [`f6ffb8a`](https://github.com/VoltAgent/voltagent/commit/f6ffb8ae0fd95fbe920058e707d492d8c21b2505) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: VoltAgent 2.x (AI SDK v6)

  VoltAgent 2.x aligns the framework with AI SDK v6 and adds new features. VoltAgent APIs are compatible, but if you call AI SDK directly, follow the upstream v6 migration guide.

  Migration summary (1.x -> 2.x):
  1. Update VoltAgent packages
  - `npm run volt update`
  - If the CLI is missing: `npx @voltagent/cli init` then `npm run volt update`
  2. Align AI SDK packages
  - `pnpm add ai@^6 @ai-sdk/provider@^3 @ai-sdk/provider-utils@^4 @ai-sdk/openai@^3`
  - If you use UI hooks, upgrade `@ai-sdk/react` to `^3`
  3. Structured output
  - `generateObject` and `streamObject` are deprecated in VoltAgent 2.x
  - Use `generateText` / `streamText` with `Output.object(...)`

  Full migration guide: https://voltagent.dev/docs/getting-started/migration-guide/

- Updated dependencies [[`f6ffb8a`](https://github.com/VoltAgent/voltagent/commit/f6ffb8ae0fd95fbe920058e707d492d8c21b2505)]:
  - @voltagent/internal@1.0.2

## 2.0.1

### Patch Changes

- [`c3943aa`](https://github.com/VoltAgent/voltagent/commit/c3943aa89a7bee113d99404ecd5a81a62bc159c2) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: VoltAgent 2.x (AI SDK v6)

  VoltAgent 2.x aligns the framework with AI SDK v6 and adds new features. VoltAgent APIs are compatible, but if you call AI SDK directly, follow the upstream v6 migration guide.

  Migration summary (1.x -> 2.x):
  1. Update VoltAgent packages
  - `npm run volt update`
  - If the CLI is missing: `npx @voltagent/cli init` then `npm run volt update`
  2. Align AI SDK packages
  - `pnpm add ai@^6 @ai-sdk/provider@^3 @ai-sdk/provider-utils@^4 @ai-sdk/openai@^3`
  - If you use UI hooks, upgrade `@ai-sdk/react` to `^3`
  3. Structured output
  - `generateObject` and `streamObject` are deprecated in VoltAgent 2.x
  - Use `generateText` / `streamText` with `Output.object(...)`

  Full migration guide: https://voltagent.dev/docs/getting-started/migration-guide/

- Updated dependencies [[`c3943aa`](https://github.com/VoltAgent/voltagent/commit/c3943aa89a7bee113d99404ecd5a81a62bc159c2)]:
  - @voltagent/internal@1.0.1

## 2.0.0

### Major Changes

- [#894](https://github.com/VoltAgent/voltagent/pull/894) [`ee05549`](https://github.com/VoltAgent/voltagent/commit/ee055498096b1b99015a8362903712663969677f) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: VoltAgent 2.x (AI SDK v6)

  VoltAgent 2.x aligns the framework with AI SDK v6 and adds new features. VoltAgent APIs are compatible, but if you call AI SDK directly, follow the upstream v6 migration guide.

  Migration summary (1.x -> 2.x):
  1. Update VoltAgent packages
  - `npm run volt update`
  - If the CLI is missing: `npx @voltagent/cli init` then `npm run volt update`
  2. Align AI SDK packages
  - `pnpm add ai@^6 @ai-sdk/provider@^3 @ai-sdk/provider-utils@^4 @ai-sdk/openai@^3`
  - If you use UI hooks, upgrade `@ai-sdk/react` to `^3`
  3. Structured output
  - `generateObject` and `streamObject` are deprecated in VoltAgent 2.x
  - Use `generateText` / `streamText` with `Output.object(...)`

  Full migration guide: https://voltagent.dev/docs/getting-started/migration-guide/

### Patch Changes

- Updated dependencies [[`ee05549`](https://github.com/VoltAgent/voltagent/commit/ee055498096b1b99015a8362903712663969677f)]:
  - @voltagent/core@2.0.0
  - @voltagent/internal@1.0.0

## 1.0.3

### Patch Changes

- [#693](https://github.com/VoltAgent/voltagent/pull/693) [`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e) Thanks [@marinoska](https://github.com/marinoska)! - - Added support for provider-defined tools (e.g. `openai.tools.webSearch()`)
  - Update tool normalization to pass through provider tool metadata untouched.
  - Added support for provider-defined tools both as standalone tool and within a toolkit.
  - Upgraded dependency: `ai` → `^5.0.76`
- Updated dependencies [[`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e)]:
  - @voltagent/internal@0.0.12

## 1.0.2

### Patch Changes

- [#659](https://github.com/VoltAgent/voltagent/pull/659) [`c4d13f2`](https://github.com/VoltAgent/voltagent/commit/c4d13f2be129013eed6392990863ae85cdbd8855) Thanks [@marinoska](https://github.com/marinoska)! - Add first-class support for client-side tool calls and Vercel AI hooks integration.

  This enables tools to run in the browser (no execute function) while the model remains on the server. Tool calls are surfaced to the client via Vercel AI hooks (useChat/useAssistant), executed with access to browser APIs, and their results are sent back to the model using addToolResult with the original toolCallId.

  Highlights:
  - Define a client-side tool by omitting the execute function.
  - Automatic interception of tool calls on the client via onToolCall in useChat/useAssistant.
  - Report outputs and errors back to the model via addToolResult(toolCallId, payload), preserving conversation state.
  - Example added/updated: examples/with-client-side-tools (Next.js + Vercel AI).

  Docs:
  - README: Clarifies client-side tool support and where it fits in the stack.
  - website/docs/agents/tools.md: New/updated “Client-Side Tools” section, end-to-end flow with useChat/useAssistant, addToolResult usage, and error handling.

## 1.0.1

### Patch Changes

- [#596](https://github.com/VoltAgent/voltagent/pull/596) [`355836b`](https://github.com/VoltAgent/voltagent/commit/355836b39a6d1ba36c5cfac82008cab3281703e7) Thanks [@omeraplak](https://github.com/omeraplak)! - ## ✨ New: first-class Model Context Protocol support

  We shipped a complete MCP integration stack:
  - `@voltagent/mcp-server` exposes VoltAgent registries (agents, workflows, tools) over stdio/HTTP/SSE transports.
  - `@voltagent/server-core` and `@voltagent/server-hono` gained ready-made route handlers so HTTP servers can proxy MCP traffic with a few lines of glue code.
  - `@voltagent/core` exports the shared types that the MCP layers rely on.

  ### Quick start

  ```ts title="src/mcp/server.ts"
  import { MCPServer } from "@voltagent/mcp-server";
  import { Agent, createTool } from "@voltagent/core";
  import { openai } from "@ai-sdk/openai";
  import { z } from "zod";

  const status = createTool({
    name: "status",
    description: "Return the current time",
    parameters: z.object({}),
    async execute() {
      return { status: "ok", time: new Date().toISOString() };
    },
  });

  const assistant = new Agent({
    name: "Support Agent",
    instructions: "Route customer tickets to the correct queue.",
    model: openai("gpt-4o-mini"),
    tools: [status],
  });

  export const mcpServer = new MCPServer({
    name: "voltagent-example",
    version: "0.1.0",
    description: "Expose VoltAgent over MCP",
    agents: { support: assistant },
    tools: { status },
    filterTools: ({ items }) => items.filter((tool) => tool.name !== "debug"),
  });
  ```

  With the server registered on your VoltAgent instance (and the Hono MCP routes enabled), the same agents, workflows, and tools become discoverable from VoltOps Console or any MCP-compatible IDE.

- [#596](https://github.com/VoltAgent/voltagent/pull/596) [`355836b`](https://github.com/VoltAgent/voltagent/commit/355836b39a6d1ba36c5cfac82008cab3281703e7) Thanks [@omeraplak](https://github.com/omeraplak)! - - Ship `@voltagent/mcp-server`, a transport-agnostic MCP provider that surfaces VoltAgent agents, workflows, tools, prompts, and resources over stdio, SSE, and HTTP.
  - Wire MCP registration through `@voltagent/core`, `@voltagent/server-core`, and `@voltagent/server-hono` so a single `VoltAgent` constructor opt-in (optionally with `honoServer`) exposes stdio mode immediately and HTTP/SSE endpoints when desired.
  - Filter child sub-agents automatically and lift an agent's `purpose` (fallback to `instructions`) into the MCP tool description for cleaner IDE listings out of the box.
  - Document the workflow in `website/docs/agents/mcp/mcp-server.md` and refresh `examples/with-mcp-server` with stdio-only and HTTP/SSE configurations.
  - When MCP is enabled we now publish REST endpoints in Swagger/OpenAPI and echo them in the startup banner so you can discover `/mcp/*` routes without digging through code.

  **Getting started**

  ```ts
  import { Agent, VoltAgent } from "@voltagent/core";
  import { MCPServer } from "@voltagent/mcp-server";
  import { honoServer } from "@voltagent/server-hono";

  const assistant = new Agent({
    name: "AssistantAgent",
    purpose: "Respond to support questions and invoke helper tools when needed.",
    model: myModel,
  });

  const mcpServer = new MCPServer({
    name: "support-mcp",
    version: "1.0.0",
    agents: { assistant },
    protocols: { stdio: true, http: false, sse: false },
  });

  export const voltAgent = new VoltAgent({
    agents: { assistant },
    mcpServers: { primary: mcpServer },
    server: honoServer({ port: 3141 }), // flip http/sse to true when you need remote clients
  });
  ```

- Updated dependencies [[`355836b`](https://github.com/VoltAgent/voltagent/commit/355836b39a6d1ba36c5cfac82008cab3281703e7), [`355836b`](https://github.com/VoltAgent/voltagent/commit/355836b39a6d1ba36c5cfac82008cab3281703e7)]:
  - @voltagent/internal@0.0.11
