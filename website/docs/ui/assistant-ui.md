---
title: Assistant UI Integration
sidebar_label: Assistant UI
---

# Assistant UI Integration

We generated the base UI with `npx assistant-ui@latest create` and then swapped in VoltAgent for the backend. This guide shows the minimal pieces you need: a VoltAgent-powered API route and a small runtime tweak on the client.

<div style={{ maxWidth: "960px", margin: "16px auto" }}>
  <video
    controls
    src="https://cdn.voltagent.dev/docs/assistant-ui.mp4"
    style={{ width: "100%", borderRadius: 12 }}
  />
</div>

## Create the Assistant UI project

```bash
npx assistant-ui@latest create
```

> The example in this repo lives in [`examples/with-assistant-ui`](https://github.com/VoltAgent/voltagent/tree/main/examples/with-assistant-ui).
> Clone the example locally with:
>
> ```bash
> npm create voltagent-app@latest -- --example with-assistant-ui
> ```

## Prerequisites

```bash
# Server (VoltAgent)
pnpm add @voltagent/core @voltagent/libsql @voltagent/server-hono ai zod
pnpm add -D tsx

# Client (Assistant UI template already has these)
pnpm add @assistant-ui/react @assistant-ui/react-ai-sdk @assistant-ui/react-markdown
```

## Define your VoltAgent

Create `voltagent/agents.ts` and wire an agent with shared memory. You can keep it simple—no tools needed to get streaming working.

```ts title="examples/with-assistant-ui/voltagent/agents.ts"
import { Agent, createTool } from "@voltagent/core";
import { z } from "zod";
import { sharedMemory } from "./memory";

const weatherOutputSchema = z.object({
  weather: z.object({
    location: z.string(),
    temperature: z.number(),
    condition: z.string(),
    humidity: z.number(),
    windSpeed: z.number(),
  }),
  message: z.string(),
});

const weatherTool = createTool({
  name: "getWeather",
  description: "Get the current weather for a specific location",
  parameters: z.object({
    location: z.string().describe("The city or location to get weather for"),
  }),
  outputSchema: weatherOutputSchema,
  execute: async ({ location }) => {
    const mockWeatherData = {
      location,
      temperature: Math.floor(Math.random() * 30) + 5,
      condition: ["Sunny", "Cloudy", "Rainy", "Snowy", "Partly Cloudy"][
        Math.floor(Math.random() * 5)
      ],
      humidity: Math.floor(Math.random() * 60) + 30,
      windSpeed: Math.floor(Math.random() * 30),
    };

    return {
      weather: mockWeatherData,
      message: `Current weather in ${location}: ${mockWeatherData.temperature}°C and ${mockWeatherData.condition.toLowerCase()} with ${mockWeatherData.humidity}% humidity and wind speed of ${mockWeatherData.windSpeed} km/h.`,
    };
  },
});

export const assistantAgent = new Agent({
  name: "AssistantUIAgent",
  instructions:
    "You are a helpful AI that keeps responses concise, explains reasoning when useful, can describe attachments, and can call the getWeather tool for weather questions.",
  model: "openai/gpt-4o-mini",
  tools: [weatherTool],
  memory: sharedMemory,
});

export const agent = assistantAgent;
```

> The weather tool uses mocked data for demo purposes—swap in a real API call if needed.

Re-export the agent from `voltagent/index.ts`:

```ts title="examples/with-assistant-ui/voltagent/index.ts"
export { agent } from "./agents";
export { assistantAgent } from "./agents";
```

Back the memory with LibSQL (Turso/local SQLite) so threads persist:

```ts title="examples/with-assistant-ui/voltagent/memory.ts"
import { Memory } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";

export const sharedMemory = new Memory({
  storage: new LibSQLMemoryAdapter({}),
});
```

## Run the VoltAgent built-in server (separate process)

Create `voltagent/server.ts`:

```ts title="examples/with-assistant-ui/voltagent/server.ts"
import { VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { agent } from "./agents";

new VoltAgent({
  agents: { agent },
  server: honoServer(),
});
```

Add a script to `package.json`:

```json title="package.json"
{
  "scripts": {
    "voltagent:run": "tsx --env-file=.env ./voltagent/server.ts"
  }
}
```

## Expose a chat route that streams UI messages

Replace the default AI SDK route with VoltAgent. The important part is using `agent.streamText(...).toUIMessageStreamResponse()` so Assistant UI receives tool/reasoning-aware events.

```ts title="examples/with-assistant-ui/app/api/chat/route.ts"
import { agent } from "@/voltagent";
import { setWaitUntil } from "@voltagent/core";
import type { UIMessage } from "ai";
import { after } from "next/server";

type ChatRequestBody = {
  messages?: UIMessage[];
  id?: string;
  conversationId?: string;
  userId?: string;
};

export async function POST(req: Request) {
  try {
    const { messages, id, conversationId, userId }: ChatRequestBody = await req.json();

    if (!messages?.length) {
      return Response.json({ error: "No messages provided" }, { status: 400 });
    }

    const threadId = conversationId ?? id ?? "assistant-ui-thread";
    const lastMessage = messages[messages.length - 1];

    // Non-blocking OpenTelemetry export (important on serverless)
    setWaitUntil(after);

    const result = await agent.streamText([lastMessage], {
      userId: userId ?? "anonymous-user",
      conversationId: threadId,
    });

    return result.toUIMessageStreamResponse({ sendReasoning: true });
  } catch (error) {
    console.error("[api/chat] VoltAgent chat error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

## Point Assistant UI at the VoltAgent endpoint

Update the runtime to hit your `/api/chat` (or an external VoltAgent URL) via `AssistantChatTransport`.

```tsx title="examples/with-assistant-ui/app/assistant.tsx"
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/react-ai-sdk";

export const Assistant = () => {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: "/api/chat",
    }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {/* ...Assistant UI layout... */}
    </AssistantRuntimeProvider>
  );
};
```

## Run

```bash
pnpm dev
pnpm voltagent:run
```

Open http://localhost:3000 and chat—the UI will stream reasoning and messages from your VoltAgent agent. Attachments and thread persistence are handled automatically via the VoltAgent memory adapter.

For debugging, open `https://console.voltagent.dev` and connect it to `http://localhost:3141`.
