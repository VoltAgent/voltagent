# @voltagent/scorers

## 2.1.0

### Minor Changes

- [#1055](https://github.com/VoltAgent/voltagent/pull/1055) [`21891b4`](https://github.com/VoltAgent/voltagent/commit/21891b4574df7c771fb9b12f04402c2ffa1201bd) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add tool-aware live-eval payloads and a deterministic tool-call accuracy scorer

  ### What's New
  - `@voltagent/core`
    - Live eval payload now includes `messages`, `toolCalls`, and `toolResults`.
    - If `toolCalls`/`toolResults` are not explicitly provided, they are derived from the normalized message/step chain.
    - New exported eval types: `AgentEvalToolCall` and `AgentEvalToolResult`.
  - `@voltagent/scorers`
    - Added prebuilt `createToolCallAccuracyScorerCode` for deterministic tool evaluation.
    - Supports both single-tool checks (`expectedTool`) and ordered tool-chain checks (`expectedToolOrder`).
    - Supports strict and lenient matching modes.

  ### Code Examples

  Built-in tool-call scorer:

  ```ts
  import { createToolCallAccuracyScorerCode } from "@voltagent/scorers";

  const toolOrderScorer = createToolCallAccuracyScorerCode({
    expectedToolOrder: ["searchProducts", "checkInventory"],
    strictMode: false,
  });
  ```

  Custom scorer using `toolCalls` + `toolResults`:

  ```ts
  import { buildScorer } from "@voltagent/core";

  interface ToolEvalPayload extends Record<string, unknown> {
    toolCalls?: Array<{ toolName?: string }>;
    toolResults?: Array<{ isError?: boolean; error?: unknown }>;
  }

  const toolExecutionHealthScorer = buildScorer<ToolEvalPayload, Record<string, unknown>>({
    id: "tool-execution-health",
    label: "Tool Execution Health",
  })
    .score(({ payload }) => {
      const toolCalls = payload.toolCalls ?? [];
      const toolResults = payload.toolResults ?? [];

      const failedResults = toolResults.filter(
        (result) => result.isError === true || Boolean(result.error)
      );
      const completionRatio =
        toolCalls.length === 0 ? 1 : Math.min(toolResults.length / toolCalls.length, 1);

      return {
        score: Math.max(0, completionRatio - failedResults.length * 0.25),
        metadata: {
          toolCallCount: toolCalls.length,
          toolResultCount: toolResults.length,
          failedResultCount: failedResults.length,
        },
      };
    })
    .build();
  ```

### Patch Changes

- Updated dependencies [[`156c98e`](https://github.com/VoltAgent/voltagent/commit/156c98e738c0e86dc9fc2dc4d55ee48c8e1e2576), [`21891b4`](https://github.com/VoltAgent/voltagent/commit/21891b4574df7c771fb9b12f04402c2ffa1201bd), [`3556385`](https://github.com/VoltAgent/voltagent/commit/3556385f207de8c669b878ccea8257a421e15c0f), [`480981a`](https://github.com/VoltAgent/voltagent/commit/480981afe136b575d2ba6d943924dddc5e07da44)]:
  - @voltagent/core@2.4.0

## 2.0.4

### Patch Changes

- [#955](https://github.com/VoltAgent/voltagent/pull/955) [`1b00284`](https://github.com/VoltAgent/voltagent/commit/1b00284db76ae98204c9a989f6bea493c423fe2c) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add a model registry + router so you can use `provider/model` strings without importing provider packages

  Usage:

  ```ts
  import { Agent } from "@voltagent/core";

  const openaiAgent = new Agent({
    name: "openai-agent",
    instructions: "Summarize the report in 3 bullets.",
    model: "openai/gpt-4o-mini",
  });

  const anthropicAgent = new Agent({
    name: "anthropic-agent",
    instructions: "Turn notes into action items.",
    model: "anthropic/claude-3-5-sonnet",
  });

  const geminiAgent = new Agent({
    name: "gemini-agent",
    instructions: "Translate to Turkish.",
    model: "google/gemini-2.0-flash",
  });
  ```

- Updated dependencies [[`1b00284`](https://github.com/VoltAgent/voltagent/commit/1b00284db76ae98204c9a989f6bea493c423fe2c), [`c57f80c`](https://github.com/VoltAgent/voltagent/commit/c57f80c7026ac74c6971c95f33ccb6cf1cafd903)]:
  - @voltagent/core@2.1.1

## 2.0.3

### Patch Changes

- [`a803d31`](https://github.com/VoltAgent/voltagent/commit/a803d310069d614c90e47c7b958a0c84b62a5732) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: align LLM scorer response schemas with OpenAI strict response_format requirements, avoiding invalid schema errors in live evals

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
  - @voltagent/core@2.0.2
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
  - @voltagent/core@2.0.1
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

## 1.0.2

### Patch Changes

- [#805](https://github.com/VoltAgent/voltagent/pull/805) [`ad4893a`](https://github.com/VoltAgent/voltagent/commit/ad4893a523be60cef93706a5aa6d2e0096cc306b) Thanks [@lzj960515](https://github.com/lzj960515)! - feat: add exports field to package.json for module compatibility

- Updated dependencies [[`b56e5a0`](https://github.com/VoltAgent/voltagent/commit/b56e5a087378c7ba5ce4a2c1756a0fe3dfb738b5)]:
  - @voltagent/core@1.2.7

## 1.0.1

### Patch Changes

- [#693](https://github.com/VoltAgent/voltagent/pull/693) [`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e) Thanks [@marinoska](https://github.com/marinoska)! - - Added support for provider-defined tools (e.g. `openai.tools.webSearch()`)
  - Update tool normalization to pass through provider tool metadata untouched.
  - Added support for provider-defined tools both as standalone tool and within a toolkit.
  - Upgraded dependency: `ai` → `^5.0.76`
- Updated dependencies [[`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e)]:
  - @voltagent/internal@0.0.12
  - @voltagent/core@1.1.30

## 1.0.0

### Major Changes

- [#674](https://github.com/VoltAgent/voltagent/pull/674) [`5aa84b5`](https://github.com/VoltAgent/voltagent/commit/5aa84b5bcf57d19bbe33cc791f0892c96bb3944b) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: initial release

### Patch Changes

- Updated dependencies [[`5aa84b5`](https://github.com/VoltAgent/voltagent/commit/5aa84b5bcf57d19bbe33cc791f0892c96bb3944b), [`5aa84b5`](https://github.com/VoltAgent/voltagent/commit/5aa84b5bcf57d19bbe33cc791f0892c96bb3944b)]:
  - @voltagent/core@1.1.27
