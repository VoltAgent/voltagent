# @voltagent/vercel-ui

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
