---
title: Setup
---

import StepSection from '@site/src/components/docs-widgets/StepSection';

# Setup

This guide helps you connect a VoltAgent app to VoltOps, verify telemetry quickly, and resolve common setup issues.
<br/>

<StepSection stepNumber={1} title="Configure Project Keys">

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/docs/voltop-docs/observability-settings.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

Get your project keys from [console.voltagent.dev/settings/projects](https://console.voltagent.dev/settings/projects).

You need two keys:

- **Public Key**: `pk_xxxx`
- **Secret Key**: `sk_live_xxxx`

### Add Environment Variables

VoltAgent auto-detects these variables and connects to VoltOps:

```bash
VOLTAGENT_PUBLIC_KEY=pk_xxxx
VOLTAGENT_SECRET_KEY=sk_live_xxxx
```

No extra observability code is required for the basic path.

</StepSection>

<StepSection stepNumber={2} title="Configuration">

For more control, configure observability explicitly with `VoltOpsClient`:

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

Run one request through your agent, then open [console.voltagent.dev](https://console.voltagent.dev).

If a trace does not appear, first confirm keys belong to the same project, restart after env changes, and check runtime logs for auth/export errors.

</StepSection>

## Advanced Options

### Add Metadata to Traces

Attach IDs so filtering and debugging is easier:

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

### Advanced Observability Configuration

Use `createVoltAgentObservability` for service naming and sampling control:

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

Recommended starting point:

- `strategy: "always"` for local development
- `strategy: "ratio"` in high-traffic production workloads

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

### Serverless Runtime

VoltAgent automatically detects serverless environments (Cloudflare Workers, Vercel Edge, Deno Deploy). For serverless apps, use `serverlessHono`:

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

## Next Step

Continue with [**Mental Model**](mental-model) to understand how trace and span data maps to VoltOps views.
