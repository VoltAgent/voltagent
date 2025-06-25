# @voltagent/vercel-ui

## 0.1.2

### Patch Changes

- [#302](https://github.com/VoltAgent/voltagent/pull/302) [`1e1f563`](https://github.com/VoltAgent/voltagent/commit/1e1f563aeb9ac25880ca56a33285abca0b24b389) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - Fix to match the output of `mergeIntoDataStream` and `convertToUIMessages` as the `mergeIntoDataStream` filters out the `SubAgent` prefix of a `toolName` (i.e. `BlogReader: read-blog-post`). `convertToUIMessages` was not filtering out the `SubAgent` prefix by default and it was causing the `toolName` to be different on the server in the `onEnd` hook from whats being sent to the client (and expected by the developer).

- Updated dependencies [[`33afe6e`](https://github.com/VoltAgent/voltagent/commit/33afe6ef40ef56c501f7fa69be42da730f87d29d), [`b8529b5`](https://github.com/VoltAgent/voltagent/commit/b8529b53313fa97e941ecacb8c1555205de49c19)]:
  - @voltagent/core@0.1.45

## 0.1.1

### Patch Changes

- Updated dependencies [[`94de46a`](https://github.com/VoltAgent/voltagent/commit/94de46ab2b7ccead47a539e93c72b357f17168f6)]:
  - @voltagent/internal@0.0.2
  - @voltagent/core@0.1.44

## 0.1.0

### Minor Changes

- [#273](https://github.com/VoltAgent/voltagent/pull/273) [`12b8c90`](https://github.com/VoltAgent/voltagent/commit/12b8c9025488e1d6f4b5a99d74b639bf202ba7d2) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - Added a set of new utility functions for working with data streams in the vercel `ai` package.

  ## New Functions

  ### `toDataStream`

  You can use this function to convert a VoltAgent `ReadableStream` to a `DataStream`.

  ```typescript
  const result = await agent.streamText("Hello, world!");
  const dataStream = toDataStream(result.fullStream);
  ```

  ### `mergeIntoDataStream`

  You can use this function to merge a VoltAgent `ReadableStream` into a `DataStream` using the vercel `createDataStream` function.

  ```typescript
  const result = await agent.streamText("Hello, world!");

  const dataStream = createDataStream({
    execute: async (writer) => {
      const result = await agent.streamText("Hello, world!");
      mergeIntoDataStream(writer, result.fullStream);
    },
  });

  reply.send(dataStream);
  ```

  ### `formatDataStreamPart`

  You can use this function to format a data stream part for the vercel `ai` package to be used in the `DataStream` interface, this appends certain metadata for VoltAgent.

  ```typescript
  const result = await agent.streamText("Hello, world!");

  const dataStream = toDataStream(result.fullStream);

  // This will append subAgentId and subAgentName to the data stream part
  ```

  ### `isSubAgentStreamPart`

  You can use this function to check if a data stream part is a sub-agent stream part.

  ```typescript
  import { isSubAgentStreamPart } from "@voltagent/vercel-ui";

  const messages = useChat(...);

  for (const message of messages) {
    if (isSubAgentStreamPart(message)) {
      // This is a sub-agent stream part
      // NOTE: This will ONLY work for Tool calls and results and not other stream parts
      console.log(message.subAgentId, message.subAgentName);
    }
  }
  ```

  ## New Types

  Additional types have been exposed to make it easier to improve types with the vercel `ai` package.

  - `UIMessage` - A VoltAgent ready `UIMessage` type, this is a wrapper around the vercel `UIMessage` type.
  - `DataStream` - A VoltAgent ready `DataStream` type, this is a wrapper around the vercel `DataStream` type.

### Patch Changes

- Updated dependencies [[`73632ea`](https://github.com/VoltAgent/voltagent/commit/73632ea229917ab4042bb58b61d5e6dbd9b72804)]:
  - @voltagent/core@0.1.42

## 0.0.2

### Patch Changes

- [#226](https://github.com/VoltAgent/voltagent/pull/226) [`d879e6d`](https://github.com/VoltAgent/voltagent/commit/d879e6d41757081420162cf983223683b72b66a5) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - feat: add Vercel UI SDK integration package for converting the `OperationContext` to a list of messages that can be used with the Vercel AI SDK

  Added `convertToUIMessages` function to the `@voltagent/vercel-ui` package that converts the `OperationContext` to a list of messages that can be used with the Vercel AI SDK.

  ```ts
  import { convertToUIMessages } from "@voltagent/vercel-ui";
  import { Agent } from "@voltagent/core";

  const uiMessages = convertToUIMessages(context);

  // Semi-realistic example
  new Agent({
    hooks: {
      onEnd: async ({ agent, output, error, conversationId, context }) => {
        const uiMessages = convertToUIMessages(context);
        await chatStore.save({
          conversationId,
          messages: uiMessages,
        });
      },
    },
  });
  ```
