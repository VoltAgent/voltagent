---
title: VoltOps Platform
slug: /observability/developer-console
---

The VoltAgent VoltOps Platform is a web-based tool designed to help you observe and debug your AI agents during development.

![VoltOps LLM Observability Platform](https://cdn.voltagent.dev/readme/demo.gif)

### Accessing the Console

You can access the hosted VoltOps Platform at:
[https://console.voltagent.dev/](https://console.voltagent.dev/)

### How it Works

When you run a VoltAgent application locally with observability enabled, it exposes a local server (typically on port `3141`). The VoltOps Platform connects directly to this local server via your browser.

**Key Features (Local Debugging):**

- **Local Connection:** The console communicates directly with your local agent process. No data is sent to or stored on any external servers for this local debugging mode. Your agent's execution data remains entirely on your machine.
- **Real-time Visualization:** See the agent's execution flow, including function calls, tool usage, and message history, as it happens.
- **Debugging Tools:** Inspect the details of each step, view logs, and analyze the agent's state at different points in time.

**Important Note on Data:** The VoltOps Platform at [https://console.voltagent.dev/](https://console.voltagent.dev/) when connected to your `localhost` is for **local debugging only**. It does not store your data remotely.

### Getting Started

1.  Ensure your VoltAgent application has observability enabled and is running locally.
    You should see output similar to this in your terminal, confirming the server is ready:

    ```bash
    ══════════════════════════════════════════════════
      VOLTAGENT SERVER STARTED SUCCESSFULLY
    ══════════════════════════════════════════════════
      ✓ HTTP Server: http://localhost:3141

      VoltOps Platform:    https://console.voltagent.dev
    ══════════════════════════════════════════════════
    [VoltAgent] All packages are up to date
    ```

2.  Open [https://console.voltagent.dev/](https://console.voltagent.dev/) in your browser.
3.  The console should automatically attempt to connect to `http://localhost:3141`. If your agent is running on a different port, you can configure the connection URL in the console's settings.

<!-- Placeholder for a GIF demonstrating connecting the console to a local agent -->
<!-- This GIF should show the VoltOps Platform interface successfully connecting to the localhost:3141 endpoint after the VoltAgent application starts. -->
<!-- ![Connecting to Local Agent](placeholder-connect.gif) -->

### Production Tracing with VoltOpsClient

While the VoltOps Platform is excellent for local development and real-time debugging, VoltAgent also provides a way to capture and persist observability data for your agents running in production environments. This is achieved using the `VoltOpsClient`.

The `VoltOpsClient` is a unified client that provides both observability export and prompt management functionality. It allows you to:

- Monitor deployed agents in production
- Analyze behavior over time with detailed tracing
- Debug issues that occur in production environments
- Store a history of agent interactions
- Use dynamic prompts managed from the VoltOps dashboard

To use the `VoltOpsClient`, you'll need to:

1.  **Create a project:** Sign up or log in at [https://console.voltagent.dev/tracing-setup](https://console.voltagent.dev/tracing-setup) to create a new project. This will provide you with a Public Key and a Secret Key.
2.  **Configure your VoltAgent application:** Add the `VoltOpsClient` to your `VoltAgent` configuration with your keys.

![VoltAgent Client Configuration](https://cdn.voltagent.dev/docs/voltagent-console-team.gif)

Here's an example of how to set up the `VoltOpsClient` in your TypeScript application:

```typescript
import { Agent, VoltAgent, VoltOpsClient } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "My Production Agent",
  instructions: "You are a helpful assistant designed for production.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

const voltOpsPublicKey = process.env.VOLTAGENT_PUBLIC_KEY;
const voltOpsSecretKey = process.env.VOLTAGENT_SECRET_KEY;

new VoltAgent({
  agents: {
    mainAgent: agent,
  },
  // highlight-start
  voltOpsClient: new VoltOpsClient({
    publicKey: voltOpsPublicKey,
    secretKey: voltOpsSecretKey,
    baseUrl: "https://api.voltagent.dev", // Default URL for the VoltAgent cloud service
    observability: true, // Enable observability export (default: true)
    prompts: true, // Enable prompt management (default: true)
  }),
  // highlight-end
});

// Your agent is now configured for full observability in the VoltAgent cloud
// and can use dynamic prompts from the VoltOps dashboard.
```

#### Advanced VoltOpsClient Configuration

The `VoltOpsClient` offers several configuration options:

```typescript
const voltOpsClient = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY!,
  secretKey: process.env.VOLTAGENT_SECRET_KEY!,
  baseUrl: "https://api.voltagent.dev", // Optional: Custom API endpoint
  observability: true, // Enable/disable observability export
  prompts: true, // Enable/disable prompt management
  promptCache: {
    enabled: true, // Enable prompt caching
    ttl: 300, // Cache TTL in seconds (5 minutes)
    maxSize: 100, // Maximum cache entries
  },
  fetch: customFetch, // Optional: Custom fetch implementation
});
```

You can also configure `VoltOpsClient` per agent for more granular control:

```typescript
const specificAgent = new Agent({
  name: "Specialized Agent",
  instructions: "You are a specialized assistant.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  // highlight-start
  voltOpsClient: new VoltOpsClient({
    publicKey: process.env.SPECIALIZED_PUBLIC_KEY!,
    secretKey: process.env.SPECIALIZED_SECRET_KEY!,
    // This agent has its own VoltOps configuration
  }),
  // highlight-end
});
```

This setup ensures that your agent's activities are securely transmitted and stored with full observability, providing valuable insights for production monitoring and analysis, plus the ability to use dynamic prompts managed from the VoltOps dashboard.

### Exploring the Console Features

Once connected, the VoltOps Platform provides several views to help you understand your agent's behavior:

#### Agent List View

The main view often displays a list of active or recent agent sessions. This allows you to get a quick overview of agents that have run or are currently running.

#### Agent Detail View

Clicking on an agent session in the list will take you to the detail view. This is where you can dive deep into a single agent's execution.

#### Execution Trace/Timeline

Within the detail view, you'll typically find a visual representation of the agent's execution flow. This might be a timeline or a graph showing:

- The sequence of steps the agent took.
- Which functions or tools were called at each step.
- The inputs and outputs of each step.

<!-- Placeholder for a GIF demonstrating the execution trace/timeline view -->
<!-- This GIF should showcase navigating the detailed view of a specific agent run, highlighting the sequence of steps, function calls, and tool usage in the timeline or graph. -->
<!-- ![Inspecting Agent Run Timeline](placeholder-inspect-timeline.gif) -->

#### Message & Log Inspection

You can usually select individual steps in the execution trace to inspect the details, such as:

- The exact messages exchanged (e.g., prompts sent to an LLM, responses received).
- Internal logs or state information recorded by the agent during that step.
- Tool inputs and outputs.

<!-- Placeholder for a GIF demonstrating inspecting messages and logs for a specific step -->
<!-- This GIF should show a user clicking on a specific step in the timeline/trace and inspecting the associated detailed information like prompts, responses, and logs in a side panel or modal. -->
<!-- ![Inspecting Step Details](placeholder-inspect-step.gif) -->

#### Connection Management

The console provides feedback on its connection status to your local VoltAgent server (e.g., `http://localhost:3141`). Look for indicators (like the `ConnectionAlert` component) showing whether the connection is active or if there are issues. You might also find settings to change the target URL if your agent isn't running on the default `http://localhost:3141`.

Remember, this connection is for local debugging. For sending data to the VoltAgent cloud for persistent storage and production monitoring, you should configure the `VoltOpsClient` in your application code.

### Migration Guide: From telemetryExporter to VoltOpsClient

If you're currently using the deprecated `telemetryExporter` configuration, here's how to migrate to the new `VoltOpsClient`:

#### Before (Deprecated ❌)

```typescript
import { Agent, VoltAgent, VoltAgentExporter } from "@voltagent/core";

new VoltAgent({
  agents: { mainAgent: agent },
  // ❌ This approach is deprecated
  telemetryExporter: new VoltAgentExporter({
    publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
    secretKey: process.env.VOLTAGENT_SECRET_KEY,
    baseUrl: "https://api.voltagent.dev",
  }),
});
```

#### After (Current ✅)

```typescript
import { Agent, VoltAgent, VoltOpsClient } from "@voltagent/core";

new VoltAgent({
  agents: { mainAgent: agent },
  // ✅ Use VoltOpsClient instead
  voltOpsClient: new VoltOpsClient({
    publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
    secretKey: process.env.VOLTAGENT_SECRET_KEY,
    baseUrl: "https://api.voltagent.dev", // Optional, this is the default
    observability: true, // Enable observability (default: true)
    prompts: false, // Disable prompts if you don't need them
  }),
});
```

#### Migration Steps

1. **Replace the import:** Change `VoltAgentExporter` to `VoltOpsClient`
2. **Update the configuration key:** Change `telemetryExporter` to `voltOpsClient`
3. **Update the constructor:** Use `new VoltOpsClient()` instead of `new VoltAgentExporter()`
4. **Optional configuration:** Add `observability: true` to explicitly enable observability if needed

#### Why Migrate?

- **Unified client:** VoltOpsClient handles both observability and prompt management
- **Better performance:** Improved caching and connection management
- **New features:** Access to dynamic prompts and enhanced observability
- **Future-proof:** The `VoltAgentExporter` will be removed in future versions

#### Environment Variables

The environment variable names remain the same:

```bash
# .env file
VOLTAGENT_PUBLIC_KEY=your_public_key_here
VOLTAGENT_SECRET_KEY=your_secret_key_here
```

#### Troubleshooting

**Common migration issues:**

- **Import error:** Make sure you're importing `VoltOpsClient` instead of `VoltAgentExporter`
- **Configuration error:** Ensure you're using `voltOpsClient` property instead of `telemetryExporter`
- **Missing features:** If you only need observability, set `prompts: false` to disable prompt management
