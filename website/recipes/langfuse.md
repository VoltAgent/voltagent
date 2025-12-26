---
id: langfuse
title: Langfuse
slug: langfuse
description: Export traces to Langfuse for observability.
---

# Langfuse

Export agent traces to Langfuse for monitoring, debugging, and analytics.

## Installation

```bash
npm install @voltagent/langfuse-exporter
```

## Quick Setup

```typescript
import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, VoltAgentObservability } from "@voltagent/core";
import { createLangfuseSpanProcessor } from "@voltagent/langfuse-exporter";
import { honoServer } from "@voltagent/server-hono";

const agent = new Agent({
  name: "Traced Agent",
  instructions: "A helpful assistant",
  model: openai("gpt-4o-mini"),
});

// Configure Langfuse observability
const observability = new VoltAgentObservability({
  spanProcessors: [
    createLangfuseSpanProcessor({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL, // Optional for self-hosted
      debug: true,
    }),
  ],
});

new VoltAgent({
  agents: { agent },
  server: honoServer({ port: 3141 }),
  observability,
});
```

## Environment Variables

```env
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com  # Or your self-hosted URL
```

## What Gets Traced

- Agent invocations
- Tool calls and results
- LLM requests and responses
- Token usage
- Latency metrics
- Errors and exceptions

## Multiple Exporters

```typescript
import { createLangfuseSpanProcessor } from "@voltagent/langfuse-exporter";
import { LibSQLObservabilityAdapter } from "@voltagent/libsql";

const observability = new VoltAgentObservability({
  // Local storage for traces
  storage: new LibSQLObservabilityAdapter(),

  // Also export to Langfuse
  spanProcessors: [
    createLangfuseSpanProcessor({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
    }),
  ],
});
```

## Full Example

See the complete example: [with-langfuse on GitHub](https://github.com/VoltAgent/voltagent/tree/main/examples/with-langfuse)
