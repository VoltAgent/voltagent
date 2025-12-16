---
title: API Overview
sidebar_label: Overview
---

# VoltAgent Server API

VoltAgent provides a flexible HTTP API for interacting with agents and workflows. The server architecture is **framework-agnostic**, allowing you to use different server implementations or create your own.

## Architecture

VoltAgent 1.x introduces a pluggable server architecture:

- **`@voltagent/server-core`** - Framework-agnostic core with route definitions, handlers, and base provider
- **`@voltagent/server-hono`** - Official server implementation using [Hono](https://hono.dev/) (recommended)

## Quick Start

```typescript
import { Agent, VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "Assistant",
  instructions: "You are a helpful assistant",
  model: openai("gpt-4o-mini"),
});

new VoltAgent({
  agents: { agent },
  server: honoServer({
    port: 3141,
    enableSwaggerUI: true,
  }),
});
```

The server starts automatically and displays:

```
══════════════════════════════════════════════════
  VOLTAGENT SERVER STARTED SUCCESSFULLY
══════════════════════════════════════════════════
  ✓ HTTP Server:  http://localhost:3141
  ↪ Share it:    pnpm volt tunnel 3141 (secure HTTPS tunnel for teammates)
     Docs: https://voltagent.dev/deployment-docs/local-tunnel/
  ✓ Swagger UI:   http://localhost:3141/ui

  Test your agents with VoltOps Console: https://console.voltagent.dev
══════════════════════════════════════════════════
```

## API Documentation

### Interactive Documentation

Access Swagger UI at [`http://localhost:3141/ui`](http://localhost:3141/ui) to explore and test all endpoints directly in your browser.

![Swagger UI Demo](https://cdn.voltagent.dev/docs/swagger-ui-demo.gif)

### OpenAPI Specification

Get the raw OpenAPI 3.1 spec at [`http://localhost:3141/doc`](http://localhost:3141/doc) for code generation and tooling.

## Core Endpoints

### Agent Endpoints

- `GET /agents` - List all agents
- `POST /agents/:id/text` - Generate text response
- `POST /agents/:id/stream` - Stream text response (SSE)
- `POST /agents/:id/object` - Generate structured object
- `POST /agents/:id/stream-object` - Stream structured object (SSE)
- `GET /agents/:id/history` - Get agent execution history

### Workflow Endpoints

- `GET /workflows` - List all workflows
- `GET /workflows/executions` - List workflow executions (filters via query params; `workflowId` optional)
- `POST /workflows/:id/execute` - Execute workflow
- `POST /workflows/:id/stream` - Stream workflow execution (SSE)
- `POST /workflows/:id/executions/:executionId/suspend` - Suspend execution
- `POST /workflows/:id/executions/:executionId/resume` - Resume execution
- `GET /workflows/:id/executions/:executionId/state` - Get execution state

### Tool Endpoints

- `GET /tools` - List all registered tools (across agents)
- `POST /tools/:name/execute` - Execute a tool directly over HTTP

### Observability & Logs

- `POST /setup-observability` - Configure `.env` with VoltAgent keys
- `GET /observability/status` - Observability status
- `GET /observability/traces` - List traces
- `GET /observability/traces/:traceId` - Get trace by ID
- `GET /observability/spans/:spanId` - Get span details
- `GET /observability/traces/:traceId/logs` - Logs for a trace
- `GET /observability/spans/:spanId/logs` - Logs for a span
- `GET /observability/logs` - Query logs (filters)
- `GET /api/logs` - System logs (filters)

### System

- `GET /updates` - Check available updates
- `POST /updates` - Install updates (all or a specific package)

## Documentation Sections

- **[Server Architecture](./server-architecture.md)** - Understanding the pluggable server design
- **[Agent Endpoints](./endpoints/agents.md)** - Complete agent API reference with examples
- **[Workflow Endpoints](./endpoints/workflows.md)** - Workflow execution and management
- **[Authentication](./authentication.md)** - Securing your API endpoints
- **[Streaming](./streaming.md)** - Real-time features with SSE and WebSocket
- **[Custom Endpoints](./custom-endpoints.md)** - Adding your own REST endpoints
- **[API Reference](./api-reference.md)** - Complete endpoint reference

## Next Steps

1. Explore the [Server Architecture](./server-architecture.md) to understand how VoltAgent servers work
2. Check [Agent Endpoints](./endpoints/agents.md) for detailed API usage
3. Visit `/ui` on your running server for interactive API exploration
