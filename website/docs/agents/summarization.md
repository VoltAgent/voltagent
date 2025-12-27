---
title: Summarization
slug: /agents/summarization
---

# Summarization

Summarization keeps the most recent messages in full and replaces older turns with a short summary message. This keeps context size bounded while preserving decisions, constraints, and tool results.

## How It Works

When summarization runs:

- The agent keeps the last `keepMessages` non-system messages.
- Earlier messages are condensed into a single system message.
- The summary is included before the recent messages in the next model call.

## Configuration

```ts
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "ResearchAssistant",
  instructions: "Answer with sources when possible.",
  model: openai("gpt-4o"),
  summarization: {
    triggerTokens: 120_000,
    keepMessages: 6,
    maxOutputTokens: 600,
  },
});
```

### Options

| Option            | Type                            | Default  | Notes                                                                                                                                       |
| ----------------- | ------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`         | `boolean`                       | `true`   | Disable by setting `false`.                                                                                                                 |
| `triggerTokens`   | `number`                        | `170000` | Summary runs when estimated tokens meet or exceed this value. Use `0` to allow summarization on every call once `keepMessages` is exceeded. |
| `keepMessages`    | `number`                        | `6`      | Number of most recent non-system messages to keep.                                                                                          |
| `maxOutputTokens` | `number`                        | `800`    | Token limit for the summary generation call.                                                                                                |
| `systemPrompt`    | `string \| null`                | default  | Custom prompt for the summarizer. Use `""` or `null` to remove it.                                                                          |
| `model`           | `LanguageModel \| DynamicValue` | agent    | Override the model used for summary generation.                                                                                             |

## Using Conversation History

Summarization uses the messages available to the agent for the current call. For multi-turn conversations, pass `userId` and `conversationId` so the agent can retrieve prior messages from memory.

```ts
await agent.generateText("Summarize the open questions so far.", {
  userId: "user-123",
  conversationId: "thread-456",
});
```

If you do not provide these identifiers, summarization only sees the messages passed in the current call.

## PlanAgent Usage

PlanAgent uses the same summarization configuration as `Agent`.

```ts
import { PlanAgent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const agent = new PlanAgent({
  name: "Planner",
  systemPrompt: "Plan before using tools.",
  model: openai("gpt-4o"),
  summarization: {
    triggerTokens: 120_000,
    keepMessages: 6,
  },
});
```

## Disable Summarization

```ts
const agent = new Agent({
  name: "NoSummary",
  instructions: "Keep full context.",
  model: openai("gpt-4o"),
  summarization: false,
});
```
