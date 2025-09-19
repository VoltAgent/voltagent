---
title: Next.js
description: This guide walks you through setting up VoltAgent in a Next.js application. We'll build a simple AI calculator example using Server Actions and the Vercel AI SDK.
---

# Integrating VoltAgent with Next.js

This guide walks you through setting up VoltAgent in a Next.js application. We'll build a simple AI calculator example using Server Actions and the Vercel AI SDK.

## Quick Start with Example

If you prefer to start directly with the completed example project, you can create it using the following command:

```bash
npm create voltagent-app@latest -- --example with-nextjs
```

This command will scaffold an entire Next.js example for you. You can also peek at the full source code right here: [examples/with-nextjs](https://github.com/VoltAgent/voltagent/tree/main/examples/with-nextjs).

## Create a New Next.js Project

Start by creating a new Next.js project using the latest version:

```bash
npx create-next-app@latest my-voltagent-app
cd my-voltagent-app
```

Follow the prompts, selecting TypeScript and App Router.

## Install VoltAgent Dependencies

Install the necessary VoltAgent packages and dependencies:

```bash
npm install @voltagent/core @ai-sdk/openai @ai-sdk/react ai zod@^3.25.76
```

- `@voltagent/core`: The core VoltAgent library.
- `@ai-sdk/openai`: The ai-sdk provider for OpenAI (or your preferred provider).
- `@ai-sdk/react`: React hooks for AI SDK integration.
- `ai`: Core AI SDK library for streaming and chat functionality.
- `zod`: Used when working with structured outputs.

## Configure `next.config.ts`

Next.js might try to bundle server-side packages by default. To prevent issues with certain packages, you need to mark them as external in your `next.config.ts` file:

```typescript title="next.config.ts"
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    // Externalize only what's needed at runtime.
    // LibSQL client is safe to externalize; native platform packages are optional.
    "@libsql/client",
  ],
};

export default nextConfig;
```

**Note:** The property used to be `experimental.serverComponentsExternalPackages` in older Next.js versions, but is now `serverExternalPackages`. Ensure you use the correct one for your Next.js version.

## Environment Variables

Set up your environment variables (e.g., `OPENAI_API_KEY`) in a `.env.local` file:

```env title=".env.local"
OPENAI_API_KEY="your-openai-api-key-here"
# Add other environment variables if needed
```

## Create API Route

Create the main chat API route with the agent and singleton defined inline in `app/api/chat/route.ts`:

```typescript title="app/api/chat/route.ts"
import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, createTool } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

// Simple calculator tool
const calculatorTool = createTool({
  name: "calculate",
  description: "Perform basic mathematical calculations",
  parameters: z.object({
    expression: z
      .string()
      .describe("Mathematical expression to evaluate (e.g., '2 + 2', '10 * 5')"),
  }),
  execute: async (args) => {
    try {
      // Simple evaluation - in production, use a proper math parser
      const result = eval(args.expression);
      return { result, expression: args.expression };
    } catch {
      return { error: "Invalid mathematical expression", expression: args.expression };
    }
  },
});

// Main agent
export const agent = new Agent({
  name: "CalculatorAgent",
  instructions:
    "You are a helpful calculator assistant. When users ask you to calculate something, use the calculate tool to perform the math and then explain the result clearly.",
  model: openai("gpt-4o-mini"),
  tools: [calculatorTool],
});

// VoltAgent singleton (augments global scope during dev to avoid re-instantiation)
declare global {
  var voltAgentInstance: VoltAgent | undefined;
}

function getVoltAgentInstance() {
  if (!globalThis.voltAgentInstance) {
    globalThis.voltAgentInstance = new VoltAgent({
      agents: {
        agent,
      },
      server: honoServer(),
    });
  }
  return globalThis.voltAgentInstance;
}

export const voltAgent = getVoltAgentInstance();

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1];

    const result = await agent.streamText([lastMessage]);
    return result.toUIMessageStreamResponse();
  } catch (error) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

## Build the Chat UI Component (Client Component)

Create a client component in `app/components/chat.tsx`:

```typescript title="app/components/chat.tsx"
"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef } from "react";

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div>
      <div>
        <h2>VoltAgent Calculator</h2>
        <p>Ask me to calculate anything!</p>
      </div>

      {/* Messages */}
      <div>
        {messages.map((message) => (
          <div key={message.id}>
            <strong>{message.role === "user" ? "You" : "Agent"}:</strong>
            <div>{message.content}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div>
        <form onSubmit={handleSubmit}>
          <input
            value={input}
            onChange={handleInputChange}
            disabled={isLoading}
            placeholder="Ask me to calculate something..."
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Thinking..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

## Optional: Server Action Example

Create a server action in `app/actions.ts`:

```typescript title="app/actions.ts"
"use server";

import { agent } from "@/voltagent";

export async function calculate(formData: FormData) {
  const expression = String(formData.get("expression") || "");
  const result = await agent.generateText(
    `Calculate ${expression}. Only return the numeric result.`
  );
  return result.text;
}
```

Use it from a simple server component form in `app/server-action-example.tsx`:

```typescript title="app/server-action-example.tsx"
import { calculate } from "@/app/actions";

export default function ServerActionExample() {
  return (
    <form action={calculate}>
      <input name="expression" placeholder="e.g. (5 + 3) * 2" />
      <button type="submit">Calculate</button>
    </form>
  );
}
```

_(Styling omitted for brevity. Refer to the example project for full styling)_

## Create the Main Page

Update your main page to use the chat component in `app/page.tsx`:

```typescript title="app/page.tsx"
import { Chat } from "./components/chat";

export default function Home() {
  return (
    <div>
      <div>
        <h1>VoltAgent Next.js Example</h1>
        <p>A simple calculator agent with tools</p>
      </div>

      // highlight-next-line
      <Chat />

      <div>
        <p>This example demonstrates VoltAgent with a custom tool for calculations.</p>
      </div>
    </div>
  );
}
```

## Run the Application

Now you can run your Next.js development server:

```bash
npm run dev
```

This creates a simple but powerful VoltAgent application with:

- **Single agent** with a custom calculator tool
- **Streaming chat interface** with real-time updates
- **Tool integration** showing how agents use tools

The agent will use the calculator tool when users ask for mathematical calculations, demonstrating how VoltAgent integrates tools seamlessly into conversations.
