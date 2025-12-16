---
title: Setup
---

# Setup

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/docs/voltop-docs/observability-settings.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

This guide explains how to connect your VoltAgent application to VoltOps for observability.

## Prerequisites

Get your API keys from [console.voltagent.dev/settings/projects](https://console.voltagent.dev/settings/projects).

You need two keys:

- **Public Key**: `pk_xxxx`
- **Secret Key**: `sk_live_xxxx`

## Quick Setup with Environment Variables

The simplest way to enable observability is through environment variables. VoltAgent automatically detects these and configures the VoltOps connection:

```bash
VOLTAGENT_PUBLIC_KEY=pk_xxxx
VOLTAGENT_SECRET_KEY=sk_live_xxxx
```

With these environment variables set, all traces are sent to VoltOps without any code changes.

## Explicit Configuration with VoltOpsClient

For more control, configure the VoltOpsClient directly:

```typescript
import { VoltAgent, VoltOpsClient } from "@voltagent/core";
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const supportAgent = new Agent({
  name: "Support Agent",
  model: openai("gpt-4"),
  instructions: "Help users with their questions",
});

new VoltAgent({
  agents: {
    supportAgent,
  },
  voltOpsClient: new VoltOpsClient({
    publicKey: process.env.VOLTAGENT_PUBLIC_KEY!,
    secretKey: process.env.VOLTAGENT_SECRET_KEY!,
  }),
});
```

## Advanced Configuration

For fine-grained control over observability behavior, use `createVoltAgentObservability`:

```typescript
import { VoltAgent, createVoltAgentObservability } from "@voltagent/core";

new VoltAgent({
  agents: {
    // your agents
  },
  observability: createVoltAgentObservability({
    serviceName: "my-app",
    serviceVersion: "1.0.0",
    voltOpsSync: {
      sampling: {
        strategy: "ratio",
        ratio: 0.5, // Sample 50% of traces
      },
      maxQueueSize: 2048,
      maxExportBatchSize: 512,
      scheduledDelayMillis: 5000,
      exportTimeoutMillis: 30000,
    },
  }),
});
```

### Configuration Options

| Option                             | Type                                               | Default       | Description                                  |
| ---------------------------------- | -------------------------------------------------- | ------------- | -------------------------------------------- |
| `serviceName`                      | string                                             | `"voltagent"` | Name shown in VoltOps dashboard              |
| `serviceVersion`                   | string                                             | -             | Version tag for filtering traces             |
| `voltOpsSync.sampling.strategy`    | `"always"` \| `"never"` \| `"ratio"` \| `"parent"` | `"always"`    | Sampling strategy                            |
| `voltOpsSync.sampling.ratio`       | number                                             | -             | Sample rate (0-1) when strategy is `"ratio"` |
| `voltOpsSync.maxQueueSize`         | number                                             | 2048          | Maximum spans queued before export           |
| `voltOpsSync.maxExportBatchSize`   | number                                             | 512           | Maximum spans per export batch               |
| `voltOpsSync.scheduledDelayMillis` | number                                             | 5000          | Delay between exports (ms)                   |
| `voltOpsSync.exportTimeoutMillis`  | number                                             | 30000         | Export timeout (ms)                          |

## Adding Context to Traces

When running agents, you can add context that appears in VoltOps:

```typescript
const agent = new Agent({
  name: "Support Agent",
  model: openai("gpt-4"),
  instructions: "Help users with their questions",
});

await agent.run("Hello", {
  userId: "user-123",
  conversationId: "conv-456",
});
```

### Context Fields

| Field            | Description                            |
| ---------------- | -------------------------------------- |
| `userId`         | Associates traces with a specific user |
| `conversationId` | Groups traces by conversation          |

## Serverless Environments

VoltAgent automatically detects serverless environments (Cloudflare Workers, Vercel Edge, Deno Deploy) and uses an optimized export strategy:

```typescript
import { VoltAgent, serverlessHono } from "@voltagent/core";
import { honoServer } from "@voltagent/server";

new VoltAgent({
  agents: { supportAgent },
  serverless: serverlessHono(),
  voltOpsClient: new VoltOpsClient({
    publicKey: process.env.VOLTAGENT_PUBLIC_KEY!,
    secretKey: process.env.VOLTAGENT_SECRET_KEY!,
  }),
});
```

In serverless mode, traces are buffered and exported before the request completes.

## Verifying the Connection

After setup, run your agent and check the [VoltOps console](https://console.voltagent.dev) to see traces appearing in real-time.
