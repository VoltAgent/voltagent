---
title: Summarization
slug: /agents/summarization
---

# Summarization

Summarization shortens long conversations by inserting a system summary and keeping the last N non-system messages. It is configured per agent.

## Configuration

```ts
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "Assistant",
  instructions: "Answer questions clearly.",
  model: openai("gpt-4o"),
  summarization: {
    enabled: true,
    triggerTokens: 120_000,
    keepMessages: 6,
    maxOutputTokens: 800,
    systemPrompt: "Summarize the conversation for the next step.",
    model: openai("gpt-4o-mini"),
  },
});
```

Options:

- `enabled`: Enable or disable summarization.
- `triggerTokens`: Token estimate threshold. The estimate uses a simple character-to-token heuristic.
- `keepMessages`: Number of most recent non-system messages kept after summarization.
- `maxOutputTokens`: Token budget for the summary generation call.
- `systemPrompt`: Prompt used for summary generation. If omitted, a default system prompt is used.
- `model`: Optional model for summarization; defaults to the agent model.

## How Summarization Runs

On each request, VoltAgent:

1. Removes any previous summary system message (identified by `<agent_summary>` markers).
2. Calculates a token estimate for non-system messages.
3. If `nonSystemMessages.length > keepMessages` and the token estimate meets `triggerTokens`, it generates a summary.
4. Stores the summary state and injects a system message that contains the summary.
5. Returns `[systemMessages, summaryMessage, tailMessages]` to the model.

If summary generation fails, the original sanitized messages are used.

The injected summary system message looks like:

```text
<agent_summary>
...summary text...
</agent_summary>
```

## Storage Behavior

Summary state is stored under the conversation metadata key `agent` when memory is enabled and `conversationId` is present. The state includes:

- `summary`
- `summaryMessageCount`
- `summaryUpdatedAt`

If memory is disabled or `conversationId` is missing, summary state is kept in process memory and resets on restart.

If you manage conversation metadata, reserve the `metadata.agent` key for VoltAgent summarization state.

## When To Use It

Use summarization when conversation history grows past model limits or when token usage needs to be capped. Avoid it when you require full message fidelity for audits or deterministic replay.

## Notes for Framework Integrations

- Pass `conversationId` consistently to keep summaries across requests.
- If you render messages in a UI, filter summary system messages by the `<agent_summary>` marker.
- If you hook into `onPrepareMessages`, that hook runs after summarization and receives the summary-injected message list.
