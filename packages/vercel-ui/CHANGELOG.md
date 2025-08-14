# @voltagent/vercel-ui

## 1.0.0-next.0

### Patch Changes

- Updated dependencies [[`64a50e6`](https://github.com/VoltAgent/voltagent/commit/64a50e6800dec844fad7b9f3a3b1c2c8d0486229), [`9e8b211`](https://github.com/VoltAgent/voltagent/commit/9e8b2119a783942f114459f0a9b93e645727445e)]:
  - @voltagent/core@1.0.0-next.0

## 0.1.10

### Patch Changes

- Updated dependencies [[`5968cef`](https://github.com/VoltAgent/voltagent/commit/5968cef5fe417cd118867ac78217dddfbd60493d)]:
  - @voltagent/internal@0.0.9

## 0.1.9

### Patch Changes

- Updated dependencies [[`8de5785`](https://github.com/VoltAgent/voltagent/commit/8de5785e385bec632f846bcae44ee5cb22a9022e)]:
  - @voltagent/internal@0.0.8

## 0.1.8

### Patch Changes

- [`90a1316`](https://github.com/VoltAgent/voltagent/commit/90a131622a876c0d91e1b9046a5e1fc143fef6b5) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: improve code quality with biome linting and package configuration enhancements

  This update focuses on improving code quality and package configuration across the entire VoltAgent monorepo:

  **Key improvements:**
  - **Biome Linting**: Fixed numerous linting issues identified by Biome across all packages, ensuring consistent code style and catching potential bugs
  - **Package Configuration**: Added `publint` script to all packages for strict validation of package.json files to ensure proper publishing configuration
  - **TypeScript Exports**: Fixed `typesVersions` structure in @voltagent/internal package and removed duplicate entries
  - **Test Utilities**: Refactored `createTrackedStorage` function in core package by simplifying its API - removed the `testName` parameter for cleaner test setup
  - **Type Checking**: Enabled `attw` (Are The Types Wrong) checking to ensure TypeScript types are correctly exported

  These changes improve the overall maintainability and reliability of the VoltAgent framework without affecting the public API.

- Updated dependencies [[`90a1316`](https://github.com/VoltAgent/voltagent/commit/90a131622a876c0d91e1b9046a5e1fc143fef6b5)]:
  - @voltagent/internal@0.0.7

## 0.1.7

### Patch Changes

- [#404](https://github.com/VoltAgent/voltagent/pull/404) [`809bd13`](https://github.com/VoltAgent/voltagent/commit/809bd13c5fce7b2afdb0f0d934cc5a21d3e77726) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: remove devLogger dependency and use native console methods

  Removed the dependency on `@voltagent/internal/dev` logger and replaced devLogger calls with standard console methods (console.error, console.warn) for a cleaner dependency tree and better compatibility.

- Updated dependencies [[`809bd13`](https://github.com/VoltAgent/voltagent/commit/809bd13c5fce7b2afdb0f0d934cc5a21d3e77726), [`809bd13`](https://github.com/VoltAgent/voltagent/commit/809bd13c5fce7b2afdb0f0d934cc5a21d3e77726)]:
  - @voltagent/internal@0.0.6
  - @voltagent/core@0.1.65

## 0.1.6

### Patch Changes

- Updated dependencies [[`6fadbb0`](https://github.com/VoltAgent/voltagent/commit/6fadbb098fe40d8b658aa3386e6126fea155f117)]:
  - @voltagent/internal@0.0.5
  - @voltagent/core@0.1.62

## 0.1.5

### Patch Changes

- [#354](https://github.com/VoltAgent/voltagent/pull/354) [`5bfb1e2`](https://github.com/VoltAgent/voltagent/commit/5bfb1e22162cb69aed0d333072237c68b705f6c0) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - fix: Fixed passing along an ID of empty string

## 0.1.4

### Patch Changes

- Updated dependencies [[`8da1ecc`](https://github.com/VoltAgent/voltagent/commit/8da1eccd0332d1f9037085e16cb0b7d5afaac479), [`8da1ecc`](https://github.com/VoltAgent/voltagent/commit/8da1eccd0332d1f9037085e16cb0b7d5afaac479), [`8da1ecc`](https://github.com/VoltAgent/voltagent/commit/8da1eccd0332d1f9037085e16cb0b7d5afaac479)]:
  - @voltagent/core@0.1.49
  - @voltagent/internal@0.0.4

## 0.1.3

### Patch Changes

- [#311](https://github.com/VoltAgent/voltagent/pull/311) [`1f7fa14`](https://github.com/VoltAgent/voltagent/commit/1f7fa140fcc4062fe85220e61f276e439392b0b4) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - fix(core, vercel-ui): Currently the `convertToUIMessages` function does not handle tool calls in steps correctly as it does not properly default filter non-tool related steps for sub-agents, same as the `data-stream` functions and in addition in the core the `operationContext` does not have the `subAgent` fields set correctly.

  ### Changes
  - deprecated `isSubAgentStreamPart` in favor of `isSubAgent` for universal use
  - by default `convertToUIMessages` now filters out non-tool related steps for sub-agents
  - now able to exclude specific parts or steps (from OperationContext) in `convertToUIMessages`

  ***

  ### Internals

  New utils were added to the internal package:
  - `isObject`
  - `isFunction`
  - `isPlainObject`
  - `isEmptyObject`
  - `isNil`
  - `hasKey`

- Updated dependencies [[`1f7fa14`](https://github.com/VoltAgent/voltagent/commit/1f7fa140fcc4062fe85220e61f276e439392b0b4)]:
  - @voltagent/internal@0.0.3
  - @voltagent/core@0.1.47

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
