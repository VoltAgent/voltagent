# @voltagent/resumable-streams

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

## 2.0.2

### Patch Changes

- [`99680b1`](https://github.com/VoltAgent/voltagent/commit/99680b1a9e22e9e94019ef014734da898c493e6c) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add runtime memory envelope (`options.memory`) and deprecate legacy top-level memory fields

  ### What's New
  - Added a preferred per-call memory envelope:
    - `options.memory.conversationId` for conversation-scoped memory
    - `options.memory.userId` for user-scoped memory
    - `options.memory.options` for memory behavior overrides (`contextLimit`, `semanticMemory`, `conversationPersistence`)
  - Kept legacy top-level fields for backward compatibility:
    - `options.conversationId`, `options.userId`, `options.contextLimit`, `options.semanticMemory`, `options.conversationPersistence`
  - Legacy fields are now marked deprecated in type/docs, and envelope values are preferred when both are provided.

  ### Usage Examples

  Legacy (still supported, deprecated):

  ```ts
  await agent.generateText("Hello", {
    userId: "user-123",
    conversationId: "conv-123",
    contextLimit: 20,
    semanticMemory: {
      enabled: true,
      semanticLimit: 5,
    },
    conversationPersistence: {
      mode: "step",
      debounceMs: 150,
    },
  });
  ```

  Preferred (new `memory` envelope):

  ```ts
  await agent.generateText("Hello", {
    memory: {
      userId: "user-123",
      conversationId: "conv-123",
      options: {
        contextLimit: 20,
        semanticMemory: {
          enabled: true,
          semanticLimit: 5,
        },
        conversationPersistence: {
          mode: "step",
          debounceMs: 150,
        },
      },
    },
  });
  ```

  ### Server and Resumable Stream Alignment
  - `@voltagent/server-core` now accepts/documents the `options.memory` envelope in request schemas.
  - Resumable stream identity resolution now reads `conversationId`/`userId` from `options.memory` first and falls back to legacy fields.
  - Added tests for:
    - parsing `options.memory` in server schemas
    - resolving resumable stream keys from `options.memory`

- Updated dependencies [[`99680b1`](https://github.com/VoltAgent/voltagent/commit/99680b1a9e22e9e94019ef014734da898c493e6c)]:
  - @voltagent/core@2.6.6

## 2.0.1

### Patch Changes

- [#921](https://github.com/VoltAgent/voltagent/pull/921) [`c4591fa`](https://github.com/VoltAgent/voltagent/commit/c4591fa92de6df75a22a758b0232669053bd2b62) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add resumable streaming support via @voltagent/resumable-streams, with server adapters that let clients reconnect to in-flight streams.

  ```ts
  import { openai } from "@ai-sdk/openai";
  import { Agent, VoltAgent } from "@voltagent/core";
  import {
    createResumableStreamAdapter,
    createResumableStreamRedisStore,
  } from "@voltagent/resumable-streams";
  import { honoServer } from "@voltagent/server-hono";

  const streamStore = await createResumableStreamRedisStore();
  const resumableStream = await createResumableStreamAdapter({ streamStore });

  const agent = new Agent({
    id: "assistant",
    name: "Resumable Stream Agent",
    instructions: "You are a helpful assistant.",
    model: openai("gpt-4o-mini"),
  });

  new VoltAgent({
    agents: { assistant: agent },
    server: honoServer({
      resumableStream: { adapter: resumableStream },
    }),
  });

  await fetch("http://localhost:3141/agents/assistant/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: `{"input":"Hello!","options":{"conversationId":"conv-1","userId":"user-1","resumableStream":true}}`,
  });

  // Resume the same stream after reconnect/refresh
  const resumeResponse = await fetch(
    "http://localhost:3141/agents/assistant/chat/conv-1/stream?userId=user-1"
  );

  const reader = resumeResponse.body?.getReader();
  const decoder = new TextDecoder();
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    console.log(chunk);
  }
  ```

  AI SDK client (resume on refresh):

  ```tsx
  import { useChat } from "@ai-sdk/react";
  import { DefaultChatTransport } from "ai";

  const { messages, sendMessage } = useChat({
    id: chatId,
    messages: initialMessages,
    resume: true,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ id, messages }) => ({
        body: {
          message: messages[messages.length - 1],
          options: { conversationId: id, userId },
        },
      }),
      prepareReconnectToStreamRequest: ({ id }) => ({
        api: `/api/chat/${id}/stream?userId=${encodeURIComponent(userId)}`,
      }),
    }),
  });
  ```

- Updated dependencies [[`c4591fa`](https://github.com/VoltAgent/voltagent/commit/c4591fa92de6df75a22a758b0232669053bd2b62)]:
  - @voltagent/core@2.0.7
