---
title: VoltAgent Instance
sidebar_label: VoltAgent Instance
---

# VoltAgent Instance

`VoltAgent` is the application entrypoint. It wires agents and workflows together, applies global defaults, and optionally starts an HTTP or serverless provider.

## Basic Setup

```ts
import { Agent, VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";

const assistant = new Agent({
  name: "Assistant",
  instructions: "Help users get answers fast.",
  model: "openai/gpt-4o-mini",
});

new VoltAgent({
  agents: { assistant },
  server: honoServer({ port: 3141 }),
});
```

## What VoltAgent Manages

- Registers agents and workflows for API access and observability.
- Applies global defaults (logger, observability, memory).
- Boots HTTP or serverless providers.
- Registers triggers, MCP servers, and A2A servers.
- Coordinates graceful shutdown for servers and telemetry.

## Registering Agents and Workflows

You can register instances on startup or later at runtime.

```ts
import { VoltAgent } from "@voltagent/core";

const app = new VoltAgent({
  agents: { assistant },
  workflows: { onboardingWorkflow },
});

app.registerAgent(anotherAgent);
app.registerWorkflow(anotherWorkflow);
```

To register triggers at runtime:

```ts
app.registerTriggers(triggers);
```

## Memory Defaults

Set default memory once at the VoltAgent entrypoint. Defaults apply only when an agent or workflow does not specify `memory`. An explicit `memory: false` on an agent disables memory entirely.

```ts
import { Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";

const agentMemory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/agent.db" }),
});

const workflowMemory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/workflows.db" }),
});

new VoltAgent({
  agentMemory,
  workflowMemory,
  // memory: sharedFallbackMemory,
});
```

**Precedence**

- Agents: agent `memory` > `agentMemory` > `memory` > built-in in-memory
- Workflows: workflow `memory` > `workflowMemory` > `memory` > built-in in-memory

See [Memory Overview](/docs/agents/memory/overview) for adapter options.

## Observability and Logging

VoltAgent creates an OpenTelemetry-based observability instance by default. You can provide your own instance or logger if you want full control.

```ts
import { VoltAgent, VoltAgentObservability } from "@voltagent/core";

const observability = new VoltAgentObservability({
  serviceName: "my-voltagent-app",
});

new VoltAgent({
  agents: { assistant },
  observability,
});
```

See [Observability Overview](/docs/observability/overview) and [Logging](/docs/observability/logging) for details.

If you already have a `VoltOpsClient` or a custom logger, pass them once and VoltAgent shares them across agents and workflows.

```ts
new VoltAgent({
  agents: { assistant },
  voltOpsClient,
  logger,
});
```

## Server and Serverless Providers

Use `server` to expose HTTP endpoints, or `serverless` for fetch-based runtimes.

```ts
import { honoServer } from "@voltagent/server-hono";

const app = new VoltAgent({
  agents: { assistant },
  server: honoServer({ port: 3141, enableSwaggerUI: true }),
});
```

See [API Overview](/docs/api/overview) for the full endpoint list.

For HTTP servers, use `startServer()` and `stopServer()` if you need manual control:

```ts
await app.startServer();
await app.stopServer();
```

You can read the server instance directly:

```ts
const serverInstance = app.getServerInstance();
```

If you are using a serverless provider, you can access it with `serverless()`:

```ts
import { serverlessHono } from "@voltagent/serverless-hono";

const serverlessApp = new VoltAgent({
  agents: { assistant },
  serverless: serverlessHono(),
});

const serverlessProvider = serverlessApp.serverless();
```

## Triggers and Protocol Servers

VoltAgent can register triggers and protocol servers alongside your agents.

```ts
new VoltAgent({
  agents: { assistant },
  triggers,
  mcpServers,
  a2aServers,
});
```

See [Triggers](/docs/triggers) and [MCP](/docs/agents/mcp) for setup details.
For A2A servers, see [A2A Server](/docs/agents/a2a/a2a-server).

## Runtime Accessors and Shutdown

VoltAgent exposes accessors for registered components and a graceful shutdown helper.

```ts
const agents = app.getAgents();
const workflows = app.getWorkflows();
const observability = app.getObservability();

await app.shutdown();
```

## Dependency Update Checks

`checkDependencies` controls a background dependency update check intended for Node runtimes. It is skipped in serverless or edge environments, and the current core implementation is a no-op placeholder.

```ts
new VoltAgent({
  agents: { assistant },
  checkDependencies: false,
});
```
