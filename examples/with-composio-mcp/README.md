<div align="center">
<a href="https://voltagent.dev/">
<img width="1800" alt="435380213-b6253409-8741-462b-a346-834cd18565a9" src="https://github.com/user-attachments/assets/452a03e7-eeda-4394-9ee7-0ffbcf37245c" />
</a>

<br/>
<br/>

<div align="center">
    <a href="https://voltagent.dev">Home Page</a> |
    <a href="https://voltagent.dev/docs/">Documentation</a> |
    <a href="https://github.com/voltagent/voltagent/tree/main/examples">Examples</a> |
    <a href="https://s.voltagent.dev/discord">Discord</a> |
    <a href="https://voltagent.dev/blog/">Blog</a>
</div>
</div>

<br/>

<div align="center">
    <strong>VoltAgent is an open source TypeScript framework for building and orchestrating AI agents.</strong><br>
Escape the limitations of no-code builders and the complexity of starting from scratch.
    <br />
    <br />
</div>

<div align="center">
    
[![npm version](https://img.shields.io/npm/v/@voltagent/core.svg)](https://www.npmjs.com/package/@voltagent/core)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.0-4baaaa.svg)](CODE_OF_CONDUCT.md)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)
[![Twitter Follow](https://img.shields.io/twitter/follow/voltagent_dev?style=social)](https://twitter.com/voltagent_dev)
    
</div>

<br/>

<div align="center">
<a href="https://voltagent.dev/">
<img width="896" alt="VoltAgent Schema" src="https://github.com/user-attachments/assets/f0627868-6153-4f63-ba7f-bdfcc5dd603d" />
</a>

</div>

## VoltAgent: Build AI Agents Fast and Flexibly

VoltAgent is an open-source TypeScript framework for creating and managing AI agents. It provides modular components to build, customize, and scale agents with ease. From connecting to APIs and memory management to supporting multiple LLMs, VoltAgent simplifies the process of creating sophisticated AI systems. It enables fast development, maintains clean code, and offers flexibility to switch between models and tools without vendor lock-in.

## Try Example

```bash
npm create voltagent-app@latest -- --example with-composio-mcp
```

This example demonstrates how to integrate VoltAgent with Composio's Model Context Protocol (MCP) server, allowing your agent to access and interact with various third-party services through a unified interface.

## Features

- **Composio MCP Integration:** Shows how to configure `MCPConfiguration` for an HTTP-based MCP server.
- **Third-Party Service Access:** Connect to services like Gmail, Google Calendar, Google Drive, and 100+ other services.
- **Built-in Authentication:** Leverage Composio's managed authentication for seamless integration.
- **Customizable Permissions:** Specify exactly which actions and data your agent can access.

## Prerequisites

- Node.js (v18 or later recommended)
- pnpm (or npm/yarn)
- An OpenAI API key (or setup for another supported LLM provider)
- A Composio MCP account (sign up at [https://mcp.composio.dev/](https://mcp.composio.dev/))

## Setup

1. **Create Environment File:**
   Create a `.env` file in the `examples/with-composio-mcp` directory:

   ```env
   # .env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

   Replace `your_openai_api_key_here` with your actual OpenAI API key. Adjust the variable if using a different LLM provider.

2. **Create a Composio MCP Account:**

   - Visit [https://mcp.composio.dev/](https://mcp.composio.dev/)
   - You can sign up using your Google account
   - Once logged in, you'll see the MCP dashboard

3. **Create an MCP Server:**
   - From the dashboard, create a new MCP server for each application you want to integrate (Gmail, Google Drive, etc.)
   - Alternatively, create a custom MCP with a combination of services
   - After creating your MCP server, you'll need to copy the MCP server URL from the dashboard
   - This URL will look like: `https://mcp.composio.dev/composio/server/YOUR-SERVER-ID`
   - You'll need this URL to configure your agent in the `src/index.ts` file

## Configuring Your MCP Server

When setting up your MCP server, you'll need to:

1. **Choose a Service:** Select from 100+ fully managed MCP servers with built-in authentication support
2. **Configure Authentication:** For example, when connecting Google Calendar:
   - Select authentication method:
     - **OAuth 2.0 (Managed)**: Authenticate via OAuth login flow (managed by Composio)
     - **Bearer Token**: Provide a bearer token for authentication
   - For simplified authentication, choose the Composio-managed option where you won't need to provide any credentials
3. **Select Actions:** Choose which specific actions your agent can perform with the service
4. **Set Permissions:** Specify the exact permissions for each MCP server

Clicking "Connect" will create an integration named "mcp-server" and immediately start the account connection process.

## Running the Agent

Start the agent in development mode:

```bash
pnpm dev
# or npm run dev / yarn dev
```

You should see logs indicating the MCP connection and tool fetching, followed by the standard VoltAgent startup message.

## Interacting with the Agent

1. Open the VoltAgent Developer Console: [`https://console.voltagent.dev`](https://console.voltagent.dev)
2. Find the agent named `Composio MCP Agent`
3. Click on the agent name, then click the chat icon
4. Try sending messages that require interaction with the connected services

The agent will use the Composio MCP tools to perform these actions.

## Customizing the Integration

In the `src/index.ts` file, you can modify the MCP configuration to use your own Composio MCP server URL:

```typescript
const mcpConfig = new MCPConfiguration({
  servers: {
    composio: {
      type: "http",
      url: "https://mcp.composio.dev/composio/server/YOUR-SERVER-ID",
    },
  },
});
```

Replace `YOUR-SERVER-ID` with the ID of your Composio MCP server. You can find this URL in your Composio MCP dashboard after creating a server:

1. Go to your Composio MCP dashboard at [https://mcp.composio.dev/](https://mcp.composio.dev/)
2. Select the MCP server you created
3. Look for the "MCP Server URL" or copy the URL from the server details
4. Replace the URL in your `src/index.ts` file with the one from your dashboard

This ensures your agent connects to your specific MCP server with the permissions and services you've configured.
