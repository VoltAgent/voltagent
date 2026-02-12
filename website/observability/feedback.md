---
title: Feedback
---

# Feedback

Feedback lets you capture user ratings and comments tied to a trace. VoltAgent can create signed feedback tokens for each trace and attach them to assistant message metadata so you can submit feedback later from the UI.

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/docs/feedbacks-demo.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

## How it works

- Feedback is always linked to a trace_id.
- When feedback is enabled, VoltAgent requests a short-lived token from the VoltOps API and returns metadata.
- The metadata is added to the last assistant message so you can show a UI control and submit later.

Feedback metadata shape:

```json
{
  "traceId": "...",
  "key": "satisfaction",
  "url": "https://api.voltagent.dev/api/public/feedback/ingest/...",
  "tokenId": "...",
  "expiresAt": "2026-01-06T18:25:26.005Z",
  "provided": true,
  "providedAt": "2026-01-06T18:30:00.000Z",
  "feedbackId": "feedback-id",
  "feedbackConfig": {
    "type": "categorical",
    "categories": [
      { "value": 1, "label": "Satisfied" },
      { "value": 0, "label": "Unsatisfied" }
    ]
  }
}
```

## Best-practice state model

For production apps, use a hybrid approach:

- Keep feedback records in VoltOps as the source of truth.
- Use message metadata (`provided`, `providedAt`, `feedbackId`) as fast UI state for hiding feedback controls.
- After a successful feedback submit, persist the metadata state on the stored assistant message with `agent.markFeedbackProvided(...)`.

This keeps UX responsive and prevents feedback controls from reappearing after conversation reloads.

## Feedback keys (registry)

Feedback keys let you register a reusable schema for a signal (numeric, boolean, or categorical). The system stores keys per project and uses them to resolve `feedbackConfig` when you only pass `key`.

- If a key exists with `feedback_config`, it is reused when `feedbackConfig` is omitted.
- If a key does not exist and you pass `feedbackConfig`, the key is created automatically.
- If a key exists, the stored config wins. Update the key if you need to change the schema.

Manage feedback keys in the Console UI under Settings.

## Enable feedback in the SDK

You can enable feedback at the agent level or per request. A VoltOps client must be configured (environment or explicit) so tokens can be created.

### Agent-level default

```ts
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "support-agent",
  instructions: "Help users solve issues",
  model: openai("gpt-4o-mini"),
  feedback: true,
});
```

### Per-call feedback options

```ts
const result = await agent.generateText("Help me reset my password", {
  feedback: {
    key: "satisfaction",
    feedbackConfig: {
      type: "categorical",
      categories: [
        { value: 1, label: "Satisfied" },
        { value: 0, label: "Unsatisfied" },
      ],
    },
    expiresIn: { hours: 6 },
  },
});

const feedback = result.feedback;
```

If you want to persist feedback-submitted state in memory after ingestion, use the helper on the returned feedback object:

```ts
if (result.feedback && !result.feedback.isProvided()) {
  await result.feedback.markFeedbackProvided({
    feedbackId, // optional
  });
}
```

Use this helper only for memory-backed conversations (requests that include `userId` and `conversationId`). If those IDs are missing, messages are not persisted, so there is nothing to mark as provided.

### Use a registered key

If the key is already registered, you can omit `feedbackConfig` and the stored config is used.

```ts
const result = await agent.generateText("How was the answer?", {
  feedback: { key: "satisfaction" },
});
```

### Streaming feedback metadata

For streaming, VoltAgent attaches feedback metadata to the stream wrapper returned by `agent.streamText`. The `onFinish` callback receives the underlying AI SDK `StreamTextResult`, which does not include VoltAgent feedback metadata. Read feedback from the returned stream wrapper after the stream completes.

```ts
const stream = await agent.streamText("Explain this trace", {
  feedback: true,
  onFinish: async (result) => {
    // result is the AI SDK StreamTextResult (no VoltAgent feedback here)
    console.log(await result.text);
  },
});

for await (const _chunk of stream.textStream) {
  // consume stream output
}

console.log(stream.feedback);
```

## Automated feedback with eval scorers

You can run LLM or heuristic scorers and persist the result as feedback without manual `fetch` calls. The `onResult` callback receives a `feedback` helper with `feedback.save(...)`. The `key` is required and the trace id is taken from the scorer result.

```ts
import { Agent, buildScorer } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const judgeAgent = new Agent({
  name: "satisfaction-judge",
  model: openai("gpt-4o-mini"),
  instructions: "Return JSON with score (0-1), label, and optional reason.",
});

const judgeSchema = z.object({
  score: z.number().min(0).max(1),
  label: z.string(),
  reason: z.string().optional(),
});

const satisfactionScorer = buildScorer({
  id: "satisfaction-judge",
  label: "Satisfaction Judge",
})
  .score(async ({ payload }) => {
    const prompt = `Score user satisfaction (0-1) and label it.
User: ${payload.input}
Assistant: ${payload.output}`;
    const response = await judgeAgent.generateObject(prompt, judgeSchema);
    return {
      score: response.object.score,
      metadata: {
        label: response.object.label,
        reason: response.object.reason ?? null,
      },
    };
  })
  .build();

const agent = new Agent({
  name: "support-agent",
  model: openai("gpt-4o-mini"),
  eval: {
    scorers: {
      satisfaction: {
        scorer: satisfactionScorer,
        onResult: async ({ result, feedback }) => {
          await feedback.save({
            key: "satisfaction",
            value: result.metadata?.label ?? null,
            score: result.score ?? null,
            comment: result.metadata?.reason ?? null,
            feedbackSourceType: "model",
          });
        },
      },
    },
  },
});
```

Notes:

- Requires a configured VoltOps client (keys) so feedback can be persisted.
- `feedback.save` uses the scorer trace id by default; you can override via `traceId`.

## useChat integration

When you use the `/agents/:id/chat` endpoint (AI SDK useChat compatible), the assistant message includes feedback metadata under `message.metadata.feedback`. You can render a thumbs up/down UI and submit feedback to `feedback.url`.

```ts
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

const transport = new DefaultChatTransport({
  api: `${apiUrl}/agents/${agentId}/chat`,
  prepareSendMessagesRequest({ messages }) {
    const lastMessage = messages[messages.length - 1];
    return {
      body: {
        input: [lastMessage],
        options: {
          feedback: {
            key: "satisfaction",
            feedbackConfig: {
              type: "categorical",
              categories: [
                { value: 1, label: "Satisfied" },
                { value: 0, label: "Unsatisfied" },
              ],
            },
          },
        },
      },
    };
  },
});

const { messages } = useChat({ transport });

const isFeedbackProvided = (feedback: any): boolean =>
  Boolean(feedback?.provided || feedback?.providedAt || feedback?.feedbackId);

const isFeedbackExpired = (feedback: any): boolean =>
  typeof feedback?.expiresAt === "string" && new Date(feedback.expiresAt).getTime() <= Date.now();

const shouldShowFeedback = (message: any): boolean => {
  const feedback = message?.metadata?.feedback;
  if (!feedback?.url) return false;
  if (isFeedbackExpired(feedback)) return false;
  if (isFeedbackProvided(feedback)) return false;
  return true;
};

// Example usage while rendering messages:
// {messages.filter(shouldShowFeedback).map(renderFeedbackButtons)}

async function submitFeedback(message: any, score: number) {
  const feedback = message?.metadata?.feedback;
  if (!feedback?.url || isFeedbackProvided(feedback)) return;

  const response = await fetch(feedback.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      score,
      comment: "Helpful response",
      feedback_source_type: "app",
    }),
  });

  if (!response.ok) return;

  // Persist "already submitted" state for reloads
  await markFeedbackProvided({
    agentId,
    userId,
    conversationId,
    messageId: message.id,
  });
}

async function markFeedbackProvided(input: {
  agentId: string;
  userId: string;
  conversationId: string;
  messageId: string;
}) {
  // This is a custom app endpoint you implement.
  await fetch(`/api/agents/${input.agentId}/feedback/provided`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
```

### Persist provided-state on the server

Call `agent.markFeedbackProvided(...)` after feedback submit succeeds. This is not a built-in HTTP route; expose it from your own backend endpoint.

```ts
const updated = await agent.markFeedbackProvided({
  userId,
  conversationId,
  messageId,
  feedbackId, // optional
});
```

This updates the stored assistant message metadata so reloaded conversations still show feedback as completed.

## API usage

Use the API directly when you are not calling the SDK or when you want a custom feedback flow.

### Create a feedback token

```bash
curl -X POST "https://api.voltagent.dev/api/public/feedback/tokens" \
  -H "X-Public-Key: $VOLTAGENT_PUBLIC_KEY" \
  -H "X-Secret-Key: $VOLTAGENT_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "trace_id": "trace-id",
    "feedback_key": "satisfaction",
    "expires_in": { "hours": 6 },
    "feedback_config": {
      "type": "categorical",
      "categories": [
        { "value": 1, "label": "Satisfied" },
        { "value": 0, "label": "Unsatisfied" }
      ]
    }
  }'
```

Response:

```json
{
  "id": "token-id",
  "url": "https://api.voltagent.dev/api/public/feedback/ingest/token-id",
  "expires_at": "2026-01-06T18:25:26.005Z"
}
```

If the key is already registered, you can omit `feedback_config` and the stored config is used.

### Submit feedback with the token

```bash
curl -X POST "https://api.voltagent.dev/api/public/feedback/ingest/token-id" \
  -H "Content-Type: application/json" \
  -d '{
    "score": 1,
    "comment": "Resolved my issue",
    "feedback_source_type": "app"
  }'
```

### Direct feedback create

If you want to submit feedback directly (without a token), call the feedback endpoint with project keys:

```bash
curl -X POST "https://api.voltagent.dev/api/public/feedback" \
  -H "X-Public-Key: $VOLTAGENT_PUBLIC_KEY" \
  -H "X-Secret-Key: $VOLTAGENT_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "trace_id": "trace-id",
    "key": "satisfaction",
    "score": 0,
    "comment": "Did not help"
  }'
```

## Custom feedback

Use different keys and configs to collect multiple signals.

```ts
const result = await agent.generateText("Review this answer", {
  feedback: {
    key: "accuracy",
    feedbackConfig: {
      type: "continuous",
      min: 0,
      max: 5,
    },
  },
});

const accuracyFeedback = result.feedback;
```

You can also use `type: "freeform"` when you want only text feedback (no score).

## Notes

- If VoltOps keys are not configured, `feedback` will be null.
- Tokens expire. Use `expiresAt` or `expiresIn` to control TTL.
- Store feedback metadata with your message history so users can rate later.
