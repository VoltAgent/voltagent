---
id: langfuse
title: Langfuse Integration
sidebar_label: Langfuse
---

VoltAgent offers built-in OpenTelemetry support, making it easy to send traces and logs to observability platforms like Langfuse. This guide shows you how to integrate VoltAgent with Langfuse using the dedicated `@voltagent/langfuse-exporter` package.

## Prerequisites

- You have a [Langfuse](https://langfuse.com/) account and project. Get your API keys (Public Key and Secret Key) and Base URL from your Langfuse project settings.
- You have a basic VoltAgent application setup.

## Installation

First, install the necessary packages:

```bash npm2yarn
npm install @voltagent/langfuse-exporter
```

## Setup

1.  **Import `VoltAgent` and `LangfuseExporter`:**
    In your main application file (e.g., `index.ts`), import the required classes.

    ```typescript
    import { Agent, VoltAgent } from "@voltagent/core";
    import { LangfuseExporter } from "@voltagent/langfuse-exporter";
    // ... other imports like your LLM provider and tools
    ```

2.  **Configure the Exporter:**
    Create an instance of `LangfuseExporter`. It's best practice to use environment variables for your Langfuse credentials.

    ```typescript
    const langfuseExporter = new LangfuseExporter({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY, // Your Langfuse Public Key
      secretKey: process.env.LANGFUSE_SECRET_KEY, // Your Langfuse Secret Key
      baseUrl: process.env.LANGFUSE_BASE_URL, // Optional: Defaults to Langfuse Cloud URL
      // debug: true, // Optional: Enable detailed logging from the exporter
    });
    ```

    Ensure you have set the `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` environment variables.

3.  **Pass Exporter to `VoltAgent`:**
    When creating your main `VoltAgent` instance, pass the configured `langfuseExporter` to the `telemetryExporter` option.

    ```typescript
    // Define your agent(s)
    const myAgent = new Agent({
      name: "My Assistant",
      // ... other agent options (llm, model, tools, etc.)
    });

    // Initialize VoltAgent with the exporter
    new VoltAgent({
      agents: {
        myAgent, // Register your agent(s)
      },
      telemetryExporter: langfuseExporter, // Pass the exporter instance
    });
    ```

## Example

Here's a minimal complete example:

```typescript title="index.ts"
import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent } from "@voltagent/core";
import { LangfuseExporter } from "@voltagent/langfuse-exporter";
import { VercelAIProvider } from "@voltagent/vercel-ai";
// Assuming you have some tools defined in ./tools
import { weatherTool, searchTool } from "./tools";

// 1. Define your agent
const agent = new Agent({
  name: "Helpful Assistant",
  description: "Answers questions and uses tools.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [weatherTool, searchTool],
});

// 2. Configure Langfuse Exporter (using environment variables)
const langfuseExporter = new LangfuseExporter({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL,
});

// 3. Initialize VoltAgent with the exporter
new VoltAgent({
  agents: {
    agent,
  },
  telemetryExporter: langfuseExporter,
});

// Now, when you interact with 'agent', traces will be sent to Langfuse.
// Example interaction (if running VoltAgent server):
// curl -X POST http://localhost:3000/api/agents/Helpful%20Assistant/generate \
//      -H "Content-Type: application/json" \
//      -d '{"input": "What is the weather in London?"}'
```

## How it Works

By providing the `telemetryExporter` to `VoltAgent`, you activate VoltAgent's automatic OpenTelemetry integration:

- A global OpenTelemetry `NodeTracerProvider` is configured.
- The provided exporter(s) are attached using `BatchSpanProcessor`s (recommended for production).
- All operations within any `Agent` instance managed by this `VoltAgent` (including sub-agents called via delegation) will automatically create and export OpenTelemetry spans.
- The `@voltagent/langfuse-exporter` specifically transforms these OpenTelemetry spans into Langfuse traces, generations, and spans, mapping relevant attributes like prompts, responses, tool calls, usage data, user IDs, and session IDs.

## Using Multiple Exporters

The `telemetryExporter` option accepts either a single exporter instance or an array of exporters. This allows you to send telemetry data to multiple systems simultaneously.

```typescript
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base"; // Example: OTEL Console Exporter

new VoltAgent({
  agents: { agent },
  telemetryExporter: [
    new LangfuseExporter({
      /* ... config ... */
    }),
    new ConsoleSpanExporter(), // Also log spans to the console
    // new OtherExporter({ /* ... config ... */ }),
  ],
});
```

Now your VoltAgent setup will automatically send detailed traces to Langfuse! Check your Langfuse project to see the incoming data.
