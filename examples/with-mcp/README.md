# VoltAgent Example: With MCP (Filesystem)

This example demonstrates how to integrate VoltAgent with an MCP (Model Context Protocol) server, specifically the `@modelcontextprotocol/server-filesystem` server, to allow an agent to interact with the local filesystem within a restricted directory.

## Features

- **MCP Integration:** Shows how to configure `MCPConfiguration` for a `stdio`-based server.
- **Filesystem Tools:** The agent gains tools like `listFiles`, `readFile`, and `writeFile` provided by the MCP server.
- **Restricted Access:** The MCP server is configured to only access files within the `./data` directory of this example project for security.
- **Graceful Shutdown:** Includes proper handling to disconnect the MCP client when the agent process stops.

## Prerequisites

- Node.js (v18 or later recommended)
- pnpm (or npm/yarn)
- An OpenAI API key (or setup for another supported LLM provider)

## Setup

1.  **Clone the repository (if you haven't already):**

    ```bash
    git clone https://github.com/voltagent/voltagent.git
    cd voltagent/examples/with-mcp
    ```

2.  **Install dependencies:**

    ```bash
    pnpm install
    # or npm install / yarn install
    ```

3.  **Create Environment File:**
    Create a `.env` file in the `examples/with-mcp` directory:

    ```env
    # .env
    OPENAI_API_KEY=your_openai_api_key_here
    ```

    Replace `your_openai_api_key_here` with your actual OpenAI API key. Adjust the variable if using a different LLM provider.

4.  **Create Data Directory:**
    The agent needs a directory to work with. Create it and add a sample file:
    ```bash
    mkdir data
    echo "Hello from test file!" > data/test.txt
    ```
    _Note: The `.gitignore` file is configured to ignore this `data` directory._

## Running the Agent

Start the agent in development mode:

```bash
pnpm run dev
# or npm run dev / yarn dev
```

You should see logs indicating the MCP connection and tool fetching, followed by the standard VoltAgent startup message:

```
[MCP Example] Connecting to MCP server and fetching tools...
[MCP Example] Fetched 3 MCP tool(s) from filesystem server.
══════════════════════════════════════════════════
  VOLTAGENT SERVER STARTED SUCCESSFULLY
══════════════════════════════════════════════════
  ✓ HTTP Server: http://localhost:3141
  Developer Console:    https://console.voltagent.dev
══════════════════════════════════════════════════
[VoltAgent] All packages are up to date
```

## Interacting with the Agent

1.  Open the VoltAgent Developer Console: [`https://console.voltagent.dev`](https://console.voltagent.dev)
2.  Find the agent named `filesystem-agent` (registered under the key `fs`).
3.  Click on the agent name, then click the chat icon.
4.  Try sending messages that require filesystem interaction within the `data` directory:
    - `List files.`
    - `What is in test.txt?`
    - `Create a file named log.txt with the content "Agent was here".`
    - `Read the file log.txt.`

The agent should use the MCP tools to perform these actions.

## Stopping the Agent

Press `Ctrl+C` in the terminal where the agent is running. You should see logs indicating the MCP client is disconnecting gracefully.
