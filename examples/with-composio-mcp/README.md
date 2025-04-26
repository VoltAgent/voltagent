# VoltAgent Example: With Composio MCP

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

1. **Clone the repository (if you haven't already):**

   ```bash
   git clone https://github.com/voltagent/voltagent.git
   cd voltagent/examples/with-composio-mcp
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   # or npm install / yarn install
   ```

3. **Create Environment File:**
   Create a `.env` file in the `examples/with-composio-mcp` directory:

   ```env
   # .env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

   Replace `your_openai_api_key_here` with your actual OpenAI API key. Adjust the variable if using a different LLM provider.

4. **Create a Composio MCP Account:**
   - Visit [https://mcp.composio.dev/](https://mcp.composio.dev/)
   - You can sign up using your Google account
   - Once logged in, you'll see the MCP dashboard

5. **Create an MCP Server:**
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
pnpm run dev
# or npm run dev / yarn dev
```

You should see logs indicating the MCP connection and tool fetching, followed by the standard VoltAgent startup message.

## Interacting with the Agent

1. Open the VoltAgent Developer Console: [`https://console.voltagent.dev`](https://console.voltagent.dev)
2. Find the agent named `Composio MCP Agent`
3. Click on the agent name, then click the chat icon
4. Try sending messages that require interaction with the connected services

The agent will use the Composio MCP tools to perform these actions.

## Stopping the Agent

Press `Ctrl+C` in the terminal where the agent is running to stop the agent.

## Customizing the Integration

In the `src/index.ts` file, you can modify the MCP configuration to use your own Composio MCP server URL:

```typescript
const mcpConfig = new MCPConfiguration({
  servers: {
    composio: {
      type: "http",
      url: "https://mcp.composio.dev/composio/server/YOUR-SERVER-ID",
    }
  },
});
```

Replace `YOUR-SERVER-ID` with the ID of your Composio MCP server. You can find this URL in your Composio MCP dashboard after creating a server:

1. Go to your Composio MCP dashboard at [https://mcp.composio.dev/](https://mcp.composio.dev/)
2. Select the MCP server you created
3. Look for the "MCP Server URL" or copy the URL from the server details
4. Replace the URL in your `src/index.ts` file with the one from your dashboard

This ensures your agent connects to your specific MCP server with the permissions and services you've configured.
