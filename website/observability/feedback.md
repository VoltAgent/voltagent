---
title: Feedback
---

# Feedback

Feedback lets you capture user ratings and comments tied to a trace. VoltAgent can create signed feedback tokens for each trace and attach them to assistant message metadata so you can submit feedback later from the UI.

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
  "feedbackConfig": {
    "type": "categorical",
    "categories": [
      { "value": 1, "label": "Satisfied" },
      { "value": 0, "label": "Unsatisfied" }
    ]
  }
}
```

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

async function submitFeedback(message: any, score: number) {
  const feedback = message?.metadata?.feedback;
  if (!feedback?.url) return;

  await fetch(feedback.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      score,
      comment: "Helpful response",
      feedback_source_type: "app",
    }),
  });
}
```

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
