---
title: CopilotKit UI Integration
sidebar_label: CopilotKit
---

# CopilotKit UI Integration

VoltAgent ships an AG-UI adapter so you can plug CopilotKit’s React components into your agents without extra glue code. This guide shows the minimal server + client setup using `@voltagent/ag-ui`.

<div style={{ maxWidth: "960px", margin: "16px auto" }}>
  <video
    controls
    src="https://cdn.voltagent.dev/docs/copilotkit.mp4"
    style={{ width: "100%", borderRadius: 12 }}
  />
</div>

## Prerequisites

```bash
# Server
pnpm add @copilotkit/runtime @voltagent/ag-ui

# Client
pnpm add @copilotkit/react-core @copilotkit/react-ui
```

## Server: expose `/copilotkit`

Use the built-in helper to wrap your VoltAgent agents and register the CopilotKit endpoint.

```typescript title="examples/with-copilotkit/server/src/index.ts"
import { registerCopilotKitRoutes } from "@voltagent/ag-ui";
import { Agent, VoltAgent, createTool } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

// Optional tool (used by the math agent)
const weatherTool = createTool({
  name: "getWeather",
  description: "Get the current weather for a specific location",
  parameters: z.object({ location: z.string() }),
  outputSchema: z.object({
    weather: z.object({
      location: z.string(),
      temperature: z.number(),
      condition: z.string(),
      humidity: z.number(),
      windSpeed: z.number(),
    }),
    message: z.string(),
  }),
  execute: async ({ location }) => ({
    weather: {
      location,
      temperature: 24,
      condition: "Sunny",
      humidity: 40,
      windSpeed: 5,
    },
    message: `Current weather in ${location}: 24°C and sunny.`,
  }),
});

const mathAgent = new Agent({
  name: "MathAgent",
  instructions:
    "You are a concise math tutor. Show steps briefly and give the final answer. You can also fetch weather if the user asks.",
  model: "openai/gpt-4o-mini",
  tools: [weatherTool],
});

const storyAgent = new Agent({
  name: "StoryAgent",
  instructions: "You are a friendly storyteller. Write short, vivid stories in Turkish.",
  model: "openai/gpt-4o-mini",
});

new VoltAgent({
  agents: { MathAgent: mathAgent, StoryAgent: storyAgent },
  server: honoServer({
    configureApp: async (app) =>
      registerCopilotKitRoutes({
        app,
        // Expose specific agent IDs; omit to expose all registered agents.
        resourceIds: ["MathAgent", "StoryAgent"],
        // Optional: pass an agents map directly instead of resourceIds.
        // agents: { MathAgent: mathAgent, StoryAgent: storyAgent },
      }),
  }),
});
```

Notes:

- `registerCopilotKitRoutes` mounts `POST /copilotkit` (and `/copilotkit/*`) for CopilotKit runtimes.
- If you don’t pass `agents`, it reads from the global `AgentRegistry` using `resourceIds` (or all agents if omitted).

## Client: basic chat

```tsx title="examples/with-copilotkit/client/src/App.tsx"
import { useMemo } from "react";
import {
  CopilotKit,
  useCopilotAction,
  useFrontendTool,
  useHumanInTheLoop,
} from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

function WeatherAction() {
  useCopilotAction({
    name: "getWeather",
    available: "disabled", // UI render only
    render: ({ status, args, result }) => (
      <div className="text-gray-500 mt-2">
        {status !== "complete" && "Calling weather API..."}
        {status === "complete" && (
          <>
            <p>Called weather API for {args?.location}</p>
            {result?.message && <p>{result.message}</p>}
          </>
        )}
      </div>
    ),
  });
  return null;
}

function FrontendTools() {
  useFrontendTool({
    name: "sayHello",
    description: "Say hello to the user",
    parameters: [{ name: "name", type: "string", required: true }],
    handler: ({ name }) => ({ currentURLPath: window.location.href, userName: name }),
    render: ({ args }) => (
      <div style={{ marginTop: 8 }}>
        <h3>Hello, {args.name}!</h3>
        <p>You're currently on {window.location.href}</p>
      </div>
    ),
  });

  useHumanInTheLoop({
    name: "offerOptions",
    description: "Let the user pick between two options.",
    parameters: [
      { name: "option_1", type: "string", required: true },
      { name: "option_2", type: "string", required: true },
    ],
    render: ({ args, respond }) => (
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={() => respond?.(`${args.option_1} was selected`)}>{args.option_1}</button>
        <button onClick={() => respond?.(`${args.option_2} was selected`)}>{args.option_2}</button>
      </div>
    ),
  });

  return null;
}

export default function App() {
  const runtimeUrl = useMemo(
    () => import.meta.env.VITE_RUNTIME_URL || "http://localhost:3141/copilotkit",
    []
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", padding: "2rem" }}>
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
      >
        <h1 style={{ marginBottom: 12 }}>VoltAgent + CopilotKit</h1>
        <p style={{ marginTop: 0, color: "#475569" }}>
          Connects to the VoltAgent CopilotKit endpoint at {runtimeUrl}.
        </p>
        {/* Agent selection can be managed via CopilotKit DevTools; omit agent to allow switching. */}
        <CopilotKit runtimeUrl={runtimeUrl}>
          <WeatherAction />
          <FrontendTools />
          <CopilotChat
            className="copilot-kit-chat"
            labels={{ initial: "Hi! How can I assist you today?", title: "Your Assistant" }}
          />
        </CopilotKit>
      </div>
    </div>
  );
}
```

## CopilotKit feedback -> VoltOps feedback (recommended)

If you want CopilotKit thumbs up/down to persist as VoltOps trace feedback, wire them explicitly.

### 1. Enable feedback on the agent

```ts title="examples/with-copilotkit/server/src/index.ts"
const mathAgent = new Agent({
  name: "MathAgent",
  instructions: "You are a concise math tutor.",
  model: "openai/gpt-4o-mini",
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
});
```

### 2. Capture message metadata + submit thumbs feedback

`@voltagent/ag-ui` emits message metadata as AG-UI `CUSTOM` events with name `voltagent.message_metadata`.
Use that payload to map each assistant `messageId` to its VoltOps feedback URL, then call the URL in `onThumbsUp` / `onThumbsDown`.

```tsx title="examples/with-copilotkit/client/src/App.tsx"
import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { CopilotKit, useCopilotChatInternal } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import type { Message } from "@copilotkit/shared";
import { safeStringify } from "@voltagent/internal";
import "@copilotkit/react-ui/styles.css";

type VoltFeedbackMetadata = {
  url?: string;
  provided?: boolean;
  providedAt?: string;
  feedbackId?: string;
};

const VOLTAGENT_MESSAGE_METADATA_EVENT_NAME = "voltagent.message_metadata";

function useVoltFeedbackMap() {
  const { agent } = useCopilotChatInternal();
  const [feedbackByMessageId, setFeedbackByMessageId] = useState<
    Record<string, VoltFeedbackMetadata>
  >({});

  useEffect(() => {
    if (!agent) return;

    const subscription = agent.subscribe({
      onCustomEvent: ({ event }) => {
        if (event.name !== VOLTAGENT_MESSAGE_METADATA_EVENT_NAME) return;

        const payload = event.value as
          | {
              messageId?: string;
              metadata?: {
                feedback?: VoltFeedbackMetadata;
              };
            }
          | undefined;

        const messageId = payload?.messageId;
        const feedback = payload?.metadata?.feedback;

        if (!messageId || !feedback?.url) return;
        setFeedbackByMessageId((prev) => ({ ...prev, [messageId]: feedback }));
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [agent]);

  return { feedbackByMessageId, setFeedbackByMessageId };
}

function isProvided(feedback?: VoltFeedbackMetadata): boolean {
  return Boolean(feedback?.provided || feedback?.providedAt || feedback?.feedbackId);
}

async function submitVoltFeedback(input: {
  message: Message;
  type: "thumbsUp" | "thumbsDown";
  feedbackByMessageId: Record<string, VoltFeedbackMetadata>;
  setFeedbackByMessageId: Dispatch<SetStateAction<Record<string, VoltFeedbackMetadata>>>;
}) {
  const feedback = input.feedbackByMessageId[input.message.id];
  if (!feedback?.url || isProvided(feedback)) return;

  const score = input.type === "thumbsUp" ? 1 : 0;

  const response = await fetch(feedback.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: safeStringify({
      score,
      feedback_source_type: "app",
    }),
  });

  if (!response.ok) return;

  const data = (await response.json()) as { id?: string };
  setFeedbackByMessageId((prev) => ({
    ...prev,
    [input.message.id]: {
      ...feedback,
      provided: true,
      feedbackId: data.id,
    },
  }));
}

function ChatWithFeedback() {
  const runtimeUrl = useMemo(
    () => import.meta.env.VITE_RUNTIME_URL || "http://localhost:3141/copilotkit",
    []
  );
  const { feedbackByMessageId, setFeedbackByMessageId } = useVoltFeedbackMap();

  return (
    <CopilotKit runtimeUrl={runtimeUrl}>
      <CopilotChat
        labels={{ initial: "Hi! How can I assist you today?", title: "Your Assistant" }}
        onThumbsUp={(message) =>
          void submitVoltFeedback({
            message,
            type: "thumbsUp",
            feedbackByMessageId,
            setFeedbackByMessageId,
          })
        }
        onThumbsDown={(message) =>
          void submitVoltFeedback({
            message,
            type: "thumbsDown",
            feedbackByMessageId,
            setFeedbackByMessageId,
          })
        }
      />
    </CopilotKit>
  );
}
```

For the complete lifecycle (including persisting `provided` state in memory with `agent.markFeedbackProvided(...)`), see [Feedback](/observability-docs/feedback).

## Tips

- CopilotKit DevTools lets you switch agents when multiple are exposed (e.g., `MathAgent` vs `StoryAgent`).
- Example reference: `examples/with-copilotkit` in the repo contains both server and Vite client. Run:
  ```bash
  npm create voltagent-app@latest -- --example with-copilotkit
  ```
