---
title: Overview
slug: /observability/overview
---

Observability is crucial for understanding, debugging, and improving the behavior of AI agents. It involves monitoring, logging, and visualizing the internal state and execution flow of your agents.

Within the VoltAgent framework, observability helps you:

- **Debug complex interactions:** Trace the flow of execution, inspect messages, and understand why an agent made specific decisions or used certain tools.
- **Monitor performance:** Identify bottlenecks or inefficiencies in your agent's logic.
- **Improve reliability:** Catch errors and unexpected behavior during development and testing.
- **Gain insights:** Understand how your agent interacts with tools, memory, and external systems.

The primary tool for observability in VoltAgent is the **Developer Console**. It provides a web-based interface to visualize and inspect your agent's activity in real-time.

![VoltAgent Console](https://cdn.voltagent.dev/readme/demo.gif)

Learn more about how to use it on the [Developer Console](./developer-console.md) page.

### Production Tracing with VoltAgentExporter

While the Developer Console is excellent for local development and real-time debugging, VoltAgent also provides a way to capture and persist observability data for your agents running in production environments. This is achieved using the `VoltAgentExporter`.

The `VoltAgentExporter` allows you to send telemetry data (traces, logs, metrics related to your agent's execution) to the VoltAgent cloud platform. This enables you to:

- Monitor deployed agents.
- Analyze behavior over time.
- Debug issues that occur in production.
- Store a history of agent interactions.

To use the `VoltAgentExporter`, you'll need to:

1.  **Create a project:** Sign up or log in at [https://console.voltagent.dev/tracing-setup](https://console.voltagent.dev/tracing-setup) to create a new project. This will provide you with a Public Key and a Secret Key.
2.  **Configure your VoltAgent application:** Add the `VoltAgentExporter` to your `VoltAgent` configuration with your keys.

Here's an example of how to set up the `VoltAgentExporter` in your TypeScript application:

```typescript
import { Agent, VoltAgent, VoltAgentExporter } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "My Production Agent",
  instructions: "You are a helpful assistant designed for production.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

const voltagentPublicKey = process.env.VOLTAGENT_PUBLIC_KEY;
const voltagentSecretKey = process.env.VOLTAGENT_SECRET_KEY;

new VoltAgent({
  agents: {
    mainAgent: agent,
  },
  // highlight-start
  telemetryExporter: new VoltAgentExporter({
    publicKey: voltagentPublicKey,
    secretKey: voltagentSecretKey,
    baseUrl: "https://server.voltagent.dev", // Default URL for the VoltAgent cloud service
  }),
  // highlight-end
});

// Your agent is now configured to send traces to the VoltAgent cloud.
// You can view them in your project dashboard on console.voltagent.dev.
```

This setup ensures that your agent's activities are securely transmitted and stored, providing valuable insights for production monitoring and analysis.
