---
"@voltagent/core": minor
"@voltagent/scorers": minor
---

feat: add tool-aware live-eval payloads and a deterministic tool-call accuracy scorer

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
