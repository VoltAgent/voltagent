---
title: MCP Client
slug: /agents/mcp
---

# Model Context Protocol (MCP)

The [Model Context Protocol](https://modelcontextprotocol.io/introduction) (MCP) is a standardized protocol for AI agents to interact with external tools and services. VoltAgent implements MCP client capabilities, enabling agents to access functionalities like filesystem operations, browser automation, database interactions, and external AI models.

## Transport Types

VoltAgent supports four transport types for MCP connections:

- **`http`**: Attempts streamable HTTP first, automatically falls back to SSE if not supported
- **`streamable-http`**: Direct streamable HTTP transport (no fallback)
- **`sse`**: Server-Sent Events transport
- **`stdio`**: Standard input/output for local processes

## Getting Started with MCPConfiguration

`MCPConfiguration` manages connections to MCP servers and provides their tools to your agents.

```ts
import { MCPConfiguration } from "@voltagent/core";
import path from "node:path";

const mcpConfig = new MCPConfiguration({
  servers: {
    // HTTP with automatic fallback
    github: {
      type: "http",
      url: "https://api.githubcopilot.com/mcp",
      timeout: 15000, // Optional, default: 30000ms
    },

    // Streamable HTTP (no fallback)
    reddit: {
      type: "streamable-http",
      url: "https://mcp.composio.dev/reddit/your-api-key-here",
      requestInit: {
        headers: { Authorization: "Bearer token" },
      },
      sessionId: "optional-session-id", // Optional
      timeout: 20000,
    },

    // SSE transport
    linear: {
      type: "sse",
      url: "https://mcp.linear.app/sse",
      requestInit: {
        headers: { Authorization: "Bearer token" },
      },
      eventSourceInit: { withCredentials: true },
      timeout: 25000,
    },

    // stdio for local processes
    filesystem: {
      type: "stdio",
      command: "npx",
      args: [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        path.join(process.env.HOME || "", "Desktop"),
      ],
      cwd: process.env.HOME,
      env: { NODE_ENV: "production" },
      timeout: 10000,
    },
  },
});
```

## Working with MCP Tools

Retrieve tools from configured MCP servers as standard `Tool` objects compatible with VoltAgent agents.

### Get All Tools as Flat Array

`getTools()` returns all tools from all servers in a single array:

```ts
const allTools = await mcpConfig.getTools();

// allTools is Tool<any>[]
const response = await agent.generateText("What are the top posts on r/programming?", {
  userId: "user123",
  tools: allTools,
});

await mcpConfig.disconnect();
```

### Get Tools Organized by Server

`getToolsets()` returns tools grouped by server name:

```ts
const toolsets = await mcpConfig.getToolsets();

// toolsets.filesystem is a ToolsetWithTools object
const filesystemTools = toolsets.filesystem.getTools();

const response = await agent.generateText("List all files in my Desktop folder", {
  userId: "user123",
  tools: filesystemTools,
});

await mcpConfig.disconnect();
```

## Event Handling

Access individual clients to listen for events:

```ts
const clients = await mcpConfig.getClients();

if (clients.reddit) {
  clients.reddit.on("connect", () => {
    console.log("Connected to Reddit MCP server");
  });

  clients.reddit.on("disconnect", () => {
    console.log("Disconnected from Reddit MCP server");
  });

  clients.reddit.on("error", (error) => {
    console.error("Reddit MCP error:", error.message);
  });

  clients.reddit.on("toolCall", (name, args, result) => {
    console.log(`Tool ${name} called with:`, args);
  });
}
```

Available events: `connect`, `disconnect`, `error`, `toolCall`

## Cleanup

Disconnect clients when done to terminate processes and free resources:

```ts
await mcpConfig.disconnect();
```

This is especially important for `stdio` servers, which spawn child processes.

## Adding MCP Tools to an Agent

Add MCP tools at initialization or per request:

### At Agent Initialization

```ts
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const allTools = await mcpConfig.getTools();

const agent = new Agent({
  name: "MCP Agent",
  instructions: "You can use MCP tools to access external systems",
  model: openai("gpt-4o"),
  tools: allTools,
});

await agent.generateText("List files in Desktop", { userId: "user123" });
await mcpConfig.disconnect();
```

### At Request Time

```ts
import { Agent } from "@voltagent/core";

const agent = new Agent({
  name: "Agent",
  instructions: "You are a helpful assistant",
  model: openai("gpt-4o"),
});

const allTools = await mcpConfig.getTools();

const response = await agent.generateText("What are the top posts on r/programming?", {
  userId: "user123",
  tools: allTools,
});

await mcpConfig.disconnect();
```

## Error Handling

Handle failures during connection and tool execution:

```ts
// Connection errors
try {
  const tools = await mcpConfig.getTools();
} catch (error) {
  console.error("Failed to fetch MCP tools:", error);
}

// Client-specific errors via events
const clients = await mcpConfig.getClients();
clients.filesystem?.on("error", (error) => {
  console.error("Filesystem MCP error:", error);
});

// Tool execution errors
try {
  const response = await agent.generateText("List files", {
    userId: "user123",
    tools: await mcpConfig.getTools(),
  });
} catch (error) {
  console.error("Agent execution error:", error);
}
```

### HTTP Fallback Behavior

When using `type: "http"`, the client attempts streamable HTTP first. If it fails, it automatically creates a new SSE transport and retries the connection.

## Lifecycle

1. Create `MCPConfiguration` with server definitions
2. Fetch tools with `getTools()` or `getToolsets()`
3. Pass tools to agent (initialization or per request)
4. Use agent methods (`generateText`, `streamText`, etc.)
5. Monitor with `getClients()` and event listeners (optional)
6. Disconnect with `disconnect()`
