---
id: langfuse
title: Langfuse Integration
sidebar_label: Langfuse
---

VoltAgent ships with an OpenTelemetry-based observability layer. You can export spans directly to Langfuse using the `@voltagent/langfuse-exporter` package and a small helper that plugs into VoltAgent’s observability pipeline.

## Prerequisites

- You have a [Langfuse](https://langfuse.com/) account and project. Get your API keys (Public Key and Secret Key) and Base URL from your Langfuse project settings.
- You have a basic VoltAgent application setup.

## Installation

Install the integration package:

```bash npm2yarn
npm install @voltagent/langfuse-exporter
```

## Setup

In your application (e.g., `src/index.ts`) import the observability class and the Langfuse helper:

```typescript
import { Agent, VoltAgent, VoltAgentObservability } from "@voltagent/core";
import { createLangfuseSpanProcessor } from "@voltagent/langfuse-exporter";
```

Create a `VoltAgentObservability` instance and attach the Langfuse processor:

```typescript
const observability = new VoltAgentObservability({
  spanProcessors: [
    createLangfuseSpanProcessor({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL, // optional
      debug: true, // optional
    }),
  ],
});

const agent = new Agent({
  name: "my-voltagent-app",
  instructions: "A helpful assistant",
  model: "openai/gpt-4o-mini",
});

new VoltAgent({
  agents: { agent },
  observability,
});
```

Ensure you have set `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` in your environment.

## How it Works

- VoltAgent initializes a global OpenTelemetry tracer provider.
- You can attach custom span processors. The Langfuse helper returns a `BatchSpanProcessor` that forwards spans to Langfuse.
- All agent/workflow spans flow through the observability pipeline. The exporter performs careful field mappings (prompts, responses, tools, usage, user/session) to create traces, generations, and spans in Langfuse.
