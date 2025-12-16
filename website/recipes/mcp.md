---
id: mcp
title: MCP
slug: mcp
description: Integrate Model Context Protocol (MCP) servers with your agents.
---

# MCP

MCP (Model Context Protocol) lets agents access external tools and data sources through a standardized protocol.

## Quick Setup

```typescript
import { openai } from "@ai-sdk/openai";
import { Agent, MCPConfiguration, VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";

// Configure MCP server
const mcpConfig = new MCPConfiguration({
  servers: {
    exa: {
      type: "stdio",
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.exa.ai/mcp?exaApiKey=YOUR_API_KEY"],
    },
  },
});

// Get tools from MCP server
const mcpTools = await mcpConfig.getTools();

const agent = new Agent({
  name: "MCP Agent",
  instructions: "You can search the web using Exa",
  model: openai("gpt-4o-mini"),
  tools: mcpTools,
});

new VoltAgent({
  agents: { agent },
  server: honoServer({ port: 3141 }),
});
```

## MCP Server Types

### STDIO (Local Process)

```typescript
{
  type: "stdio",
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/files"],
}
```

### HTTP (Remote Server)

```typescript
{
  type: "http",
  url: "https://your-mcp-server.com/sse",
}
```

## Multiple MCP Servers

```typescript
const mcpConfig = new MCPConfiguration({
  servers: {
    filesystem: {
      type: "stdio",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "/data"],
    },
    search: {
      type: "http",
      url: "https://search-mcp.example.com/sse",
    },
  },
});
```

## Exposing Agent as MCP Server

```typescript
import { MCPServer } from "@voltagent/core";

const mcpServer = new MCPServer({
  name: "my-agent-mcp",
  version: "1.0.0",
  protocols: { stdio: true, http: true, sse: true },
});

new VoltAgent({
  agents: { agent },
  mcpServers: { mcpServer },
  server: honoServer({ port: 3141 }),
});
```

## Full Examples

See the complete examples:

- [with-mcp on GitHub](https://github.com/VoltAgent/voltagent/tree/main/examples/with-mcp)
- [with-mcp-server on GitHub](https://github.com/VoltAgent/voltagent/tree/main/examples/with-mcp-server)
