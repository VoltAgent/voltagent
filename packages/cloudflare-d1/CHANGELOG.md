# @voltagent/cloudflare-d1

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
      purpose: "Issue customer refunds",
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
  5. Replace `stepCountIs` with `isStepCount`.
  6. Prefer `result.stream` over `result.fullStream`.
  7. Prefer `output` over `experimental_output`.
  8. Prefer object-style agent calls for new code, with VoltAgent runtime options under `voltagent`.

### Patch Changes

- Updated dependencies []:
  - @voltagent/core@3.0.0-next.0
  - @voltagent/internal@2.0.0-next.0
  - @voltagent/logger@3.0.0-next.0

## 2.1.2

### Patch Changes

- [#1085](https://github.com/VoltAgent/voltagent/pull/1085) [`f275daf`](https://github.com/VoltAgent/voltagent/commit/f275dafffa16e80deba391ce015fba6f6d6cd876) Thanks [@omeraplak](https://github.com/omeraplak)! - Fix workflow execution filtering by persisted metadata across adapters.
  - Persist `options.metadata` on workflow execution state so `/workflows/executions` filters can match tenant/user metadata.
  - Preserve existing execution metadata when updating cancelled/error workflow states.
  - Accept `options.metadata` in server workflow execution request schema.
  - Fix LibSQL and Cloudflare D1 JSON metadata query comparisons for `metadata` and `metadata.<key>` filters.

- [#1082](https://github.com/VoltAgent/voltagent/pull/1082) [`73cf1d3`](https://github.com/VoltAgent/voltagent/commit/73cf1d32c5ffdfd3197cc9b0661350449aca2b3a) Thanks [@omeraplak](https://github.com/omeraplak)! - Fix workflow state persistence parity across SQL adapters.

  This update persists and returns `input`, `context`, and top-level `workflowState` in workflow state operations. It also ensures suspended workflow state queries include `events`, `output`, and `cancellation`, and adds adapter migrations/column additions where needed.

## 2.1.1

### Patch Changes

- [#1040](https://github.com/VoltAgent/voltagent/pull/1040) [`5e54d3b`](https://github.com/VoltAgent/voltagent/commit/5e54d3b54e2823479788617ce0a1bb5211260f9b) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add multi-tenant filters to workflow execution listing (`/workflows/executions`)

  You can now filter workflow execution history by `userId` and metadata fields in addition to
  existing filters (`workflowId`, `status`, `from`, `to`, `limit`, `offset`).

  ### What's New
  - Added `userId` filter support for workflow run queries.
  - Added metadata filtering support:
    - `metadata` as URL-encoded JSON object
    - `metadata.<key>` query params (for example: `metadata.tenantId=acme`)
  - Added status aliases for compatibility:
    - `success` -> `completed`
    - `pending` -> `running`
  - Implemented consistently across storage adapters:
    - In-memory
    - PostgreSQL
    - LibSQL
    - Supabase
    - Cloudflare D1
    - Managed Memory (`@voltagent/voltagent-memory`)
  - Updated server docs and route descriptions to include new filters.

  ### TypeScript Example

  ```ts
  const params = new URLSearchParams({
    workflowId: "order-approval",
    status: "completed",
    userId: "user-123",
    "metadata.tenantId": "acme",
    "metadata.region": "eu",
    limit: "20",
    offset: "0",
  });

  const response = await fetch(`http://localhost:3141/workflows/executions?${params.toString()}`);
  const data = await response.json();
  ```

  ### cURL Examples

  ```bash
  # Filter by workflow + user + metadata key
  curl "http://localhost:3141/workflows/executions?workflowId=order-approval&userId=user-123&metadata.tenantId=acme&status=completed&limit=20&offset=0"
  ```

  ```bash
  # Filter by metadata JSON object (URL-encoded)
  curl "http://localhost:3141/workflows/executions?metadata=%7B%22tenantId%22%3A%22acme%22%2C%22region%22%3A%22eu%22%7D"
  ```

## 2.1.0

### Minor Changes

- [#1013](https://github.com/VoltAgent/voltagent/pull/1013) [`a35626a`](https://github.com/VoltAgent/voltagent/commit/a35626a29a9cfdc2375ac4276d58f87e0ef79f68) Thanks [@fengyun99](https://github.com/fengyun99)! - The SQL statement has been modified. Previously, the query returned the earliest messages instead of the most recent ones.

## 2.0.4

### Patch Changes

- [#915](https://github.com/VoltAgent/voltagent/pull/915) [`37cc8d3`](https://github.com/VoltAgent/voltagent/commit/37cc8d3d6e49973dff30791f4237878b20c62c24) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add Cloudflare D1 memory adapter for Workers

  You can now persist Memory V2 in Cloudflare D1 using `@voltagent/cloudflare-d1`. The adapter accepts a
  D1 binding directly, so you can keep Worker bindings inside your `fetch` handler and wire them into
  VoltAgent via a small factory.

  Serverless routes still inject Worker `env` into request contexts for ad-hoc access in tools or
  workflow steps. The D1 memory adapter does not require this and works with the binding directly.

  Usage:

  ```ts
  import { Memory } from "@voltagent/core";
  import { D1MemoryAdapter } from "@voltagent/cloudflare-d1";

  const memory = new Memory({
    storage: new D1MemoryAdapter({
      binding: env.DB,
    }),
  });
  ```
