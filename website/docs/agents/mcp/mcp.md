---
title: MCP Client
slug: /agents/mcp
---

# Model Context Protocol (MCP)

The [Model Context Protocol](https://modelcontextprotocol.io/introduction) (MCP) provides a **standardized way** for large language models (LLMs) and AI agents to interact with external tools and services. VoltAgent implements MCP client capabilities, enabling your agents to seamlessly access diverse functionalities like filesystem operations, browser automation, database interactions, specific AI models hosted externally, and more, provided they adhere to the MCP specification.

## Transport Types

VoltAgent supports multiple transport types for MCP connections:

- **`streamable-http`**: Modern streamable HTTP transport for efficient bidirectional communication
- **`http`**: Smart transport that attempts streamable HTTP first and automatically falls back to SSE for compatibility
- **`sse`**: Server-Sent Events transport for servers that explicitly use SSE
- **`stdio`**: Standard input/output for local processes and CLI tools

## Getting Started with MCPConfiguration

The `MCPConfiguration` class is the central point for managing connections to one or more MCP servers. It handles the connection process and makes the tools offered by these servers available to your agents.

```ts
import { MCPConfiguration } from "@voltagent/core";
import path from "node:path"; // Used for filesystem path example

// Create MCP Configuration with multiple types of servers
const mcpConfig = new MCPConfiguration({
  servers: {
    // Example 1: Streamable HTTP transport (modern, efficient)
    github: {
      type: "streamable-http",
      url: "https://api.githubcopilot.com/mcp",
      // Optional: Request timeout in milliseconds (default: 30000)
      timeout: 15000,
    },

    // Example 2: HTTP with automatic fallback (recommended for compatibility)
    reddit: {
      type: "http", // Tries streamable HTTP first, falls back to SSE if needed
      url: "https://mcp.composio.dev/reddit/your-api-key-here", // URL of the MCP endpoint
      // Optional: Custom headers or options for the initial fetch request
      requestInit: {
        headers: { "Custom-Header": "value" },
      },
      // Optional: Custom options for the EventSource connection used for streaming
      eventSourceInit: { withCredentials: true },
      // Optional: Request timeout in milliseconds (default: 30000)
      timeout: 20000,
    },

    // Example 3: SSE transport (explicit Server-Sent Events)
    linear: {
      type: "sse",
      url: "https://mcp.linear.app/sse",
      // Optional: Request timeout in milliseconds (default: 30000)
      timeout: 25000,
    },

    // Example 4: stdio-based server (e.g., a local script or application)
    filesystem: {
      type: "stdio", // Connects via standard input/output
      command: "npx", // The command to execute
      args: [
        // Arguments for the command
        "-y",
        "@modelcontextprotocol/server-filesystem", // Example: A filesystem server package
        // Optional arguments for the server itself, like specifying allowed paths:
        path.join(process.env.HOME || "", "Desktop"),
      ],
      // Optional: Specify the working directory for the command
      cwd: process.env.HOME,
      // Optional: Provide environment variables to the spawned process
      env: { NODE_ENV: "production" },
      // Optional: Request timeout in milliseconds (default: 30000)
      timeout: 10000,
    },
  },
});
```

## Working with MCP Tools

Once configured, you can retrieve the tools offered by the MCP servers. These fetched tools are standard `AgentTool` objects, fully compatible with the VoltAgent `Agent`.

### Get All Tools as Flat Array (`getTools()`)

Use `getTools()` when you want a single list containing all tools from all configured MCP servers. This is useful if you want to provide one agent with the combined capabilities of all connected services.

```ts
// Fetch all tools from all configured MCP servers into a flat array
const allTools = await mcpConfig.getTools();

// Use these tools when interacting with an agent
// const response = await agent.generateText("What are the top posts on r/programming?", {
//   userId: "user123",
//   tools: allTools, // Pass the combined list of tools
// });

// Remember to disconnect later
// await mcpConfig.disconnect();
```

### Get Tools Organized by Server (`getToolsets()`)

Use `getToolsets()` when you need to access tools grouped by the server they originate from. This returns an object where keys are your server names (e.g., `"reddit"`, `"filesystem"`) and values are toolset objects, each containing a `getTools()` method for that specific server's tools. This is useful for creating specialized agents that only use tools from a particular source.

```ts
// Fetch tools organized by server name
const toolsets = await mcpConfig.getToolsets();

// Access tools specifically from the filesystem server
const filesystemTools = toolsets.filesystem.getTools();

// Use only filesystem tools with an agent
// const filesystemResponse = await agent.generateText(
//   "List all files in my Desktop folder and create a summary.txt file",
//   {
//     userId: "user123",
//     tools: filesystemTools, // Pass only the filesystem tools
//   }
// );

// Remember to disconnect later
// await mcpConfig.disconnect();
```

## Event Handling

Monitoring the status and activity of MCP connections can be important for robust applications. You can access the underlying client instances to listen for connection events, errors, or specific MCP messages.

```ts
// Get the client instances (ensure connection is established first, e.g., after getTools)
const clients = await mcpConfig.getClients();

// Example: Listen for connection event on the 'reddit' client
if (clients.reddit) {
  clients.reddit.on("connect", () => {
    console.log("Connected to Reddit MCP server");
  });

  // Example: Handle errors centrally for the 'reddit' client
  clients.reddit.on("error", (error) => {
    console.error("Reddit MCP server connection error:", error.message);
  });
}
```

## Cleanup (`disconnect()`)

It is **crucial** to disconnect MCP clients when they are no longer needed, especially for `stdio` based servers, as this terminates the underlying child processes. Failure to disconnect can leave processes running in the background.

```ts
// Disconnect all clients managed by this configuration
await mcpConfig.disconnect();
console.log("MCP clients disconnected.");
```

## Adding MCP Tools to an Agent

Fetched MCP tools (which are `AgentTool` compatible) can be provided to a VoltAgent `Agent` in two primary ways:

### 1. At Agent Initialization

Provide the tools via the `tools` array in the `Agent` constructor. These tools will be available to the agent by default for all interactions, unless overridden at request time.

```ts
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { openai } from "@ai-sdk/openai";
// Assume mcpConfig is configured and allTools fetched as shown above

const allTools = await mcpConfig.getTools();

const agent = new Agent({
  name: "MCP Aware Agent",
  instructions: "An assistant that can use MCP tools configured at startup",
  model: openai("gpt-4o"),
  tools: allTools, // Add MCP tools during initialization
});

// Now the agent can use MCP tools in its interactions
// await agent.generateText(...);

// Remember to disconnect mcpConfig eventually
// await mcpConfig.disconnect();
```

### 2. At Request Time

Provide tools via the `tools` option in the specific agent method call (`generateText`, `streamText`, etc.). This allows you to dynamically provide tools for a single interaction, potentially overriding the tools defined during agent initialization for that specific request.

```ts
import { Agent } from "@voltagent/core";
// Assume agent is initialized without MCP tools, and mcpConfig is configured

const agent = new Agent({
  /* ... basic config ... */
});
const allTools = await mcpConfig.getTools();

// Provide MCP tools only for this specific request
// const response = await agent.generateText("What are the top posts on r/programming?", {
//   userId: "user123",
//   tools: allTools, // Add MCP tools at request time
// });

// Remember to disconnect mcpConfig eventually
// await mcpConfig.disconnect();
```

## Error Handling

Interacting with MCP servers involves external processes or network requests, which can fail. Consider these error handling strategies:

- **Connection/Tool Fetching:** Wrap calls to `mcpConfig.getTools()` or `mcpConfig.getToolsets()` in `try...catch` blocks to handle errors during initial connection or tool discovery.
- **Client Events:** Use the `client.on('error', ...)` event listener (shown in Event Handling section) to react to connection errors or protocol issues reported by a specific client.
- **Agent Interaction:** When an agent uses an MCP tool, the execution happens within the agent's standard tool-handling flow. Errors during the tool's execution should be handled within the agent's interaction (e.g., using `try...catch` around `agent.generateText` or the agent's `onError` hook/callback if applicable, although MCP tool errors might manifest differently depending on the server implementation).

## Typical Lifecycle Summary

1.  **Configure:** Create an `MCPConfiguration` instance defining your servers.
2.  **Fetch Tools:** Use `await mcpConfig.getTools()` or `await mcpConfig.getToolsets()` to establish connections and retrieve available tools.
3.  **Use with Agent:** Pass the fetched tools to an `Agent` either during initialization or at request time.
4.  **Interact:** Call agent methods like `generateText` or `streamText`. The agent may decide to use the MCP tools.
5.  **(Optional) Monitor:** Use `mcpConfig.getClients()` to attach event listeners for monitoring.
6.  **Disconnect:** Call `await mcpConfig.disconnect()` when done to clean up resources.
