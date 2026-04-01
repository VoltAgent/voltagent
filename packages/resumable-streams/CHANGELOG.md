# @voltagent/resumable-streams

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
