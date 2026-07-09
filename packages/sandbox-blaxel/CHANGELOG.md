# @voltagent/sandbox-blaxel

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

## 2.1.1

### Patch Changes

- [#1354](https://github.com/VoltAgent/voltagent/pull/1354) [`af4f6f2`](https://github.com/VoltAgent/voltagent/commit/af4f6f23726edf4afda698bcf35828779ce96a60) Thanks [@nuthalapativarun](https://github.com/nuthalapativarun)! - Add README documentation

## 2.1.0

### Minor Changes

- [#1275](https://github.com/VoltAgent/voltagent/pull/1275) [`74eb6f0`](https://github.com/VoltAgent/voltagent/commit/74eb6f016da09fc8982b73e7934d76d535aa2910) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - Add `@voltagent/sandbox-blaxel` — a new workspace sandbox provider that runs your agents' shell commands inside [Blaxel](https://blaxel.ai)-managed sandboxes.

  ```ts
  import { Workspace } from "@voltagent/core";
  import { BlaxelSandbox } from "@voltagent/sandbox-blaxel";

  const workspace = new Workspace({
    sandbox: new BlaxelSandbox({
      apiKey: process.env.BL_API_KEY,
      workspace: process.env.BL_WORKSPACE,
      config: { name: "voltagent-prod", region: "us-pdx-1" },
    }),
  });
  ```

  Supports streaming stdout/stderr, per-call timeouts and `AbortSignal`, output truncation, and lazy provisioning. Reach the underlying Blaxel SDK directly via `sandbox.getSandbox()` when you need provider-specific APIs (filesystem, previews, sessions, etc.).
