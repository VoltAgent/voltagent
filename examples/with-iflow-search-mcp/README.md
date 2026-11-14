# VoltAgent with iFlow Search MCP

This example wires the [iFlow Search](https://platform.iflow.cn) MCP stdio server into a VoltAgent agent. It exposes three tools — web search, image search, and page-content fetch — through VoltAgent's `MCPConfiguration` without adding a runtime dependency to VoltAgent itself: the MCP server is launched on-demand via `npx -y @iflow-ai/search-mcp`.

## Features

- Web search with titles, URLs, and snippets
- Image search with thumbnails and source pages
- Single-URL readable-content fetch
- Stdio MCP integration via the existing `@iflow-ai/search-mcp` package — no custom adapter package required
- Tagged outbound attribution via `IFLOW_MCP_CLIENT=voltagent`

## Prerequisites

1. **iFlow API key**: create one at the [iFlow platform](https://platform.iflow.cn).
2. **OpenAI API key**: used by the example agent's `openai/gpt-4o-mini` model.
3. **Node.js >= 20** (matches the rest of the VoltAgent examples).

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Configure environment variables:

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` with real values:

   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   IFLOW_API_KEY=your_iflow_api_key_here
   ```

   Do **not** commit the populated `.env` file. The example's `.gitignore` already excludes it.

3. Run the example:

   ```bash
   pnpm dev
   ```

   The agent starts on the default VoltAgent server port and exposes one agent named `iflow-search-agent`.

## Tools Available

The three tools below come straight from `@iflow-ai/search-mcp`; the agent receives them via `await mcpConfig.getTools()`.

> VoltAgent's `MCPConfiguration` prefixes each tool name with the server key (the
> object key under `servers:` in the config). Because this example uses
> `"iflow-search"`, the tools are exposed to the agent as
> `iflow-search_iflow_web_search`, `iflow-search_iflow_image_search`, and
> `iflow-search_iflow_web_fetch`. Change the key if you want a different prefix.

### 1. `iflow-search_iflow_web_search`

- **Purpose**: search the web with iFlow.
- **Input**: `query: string`, optional `count: integer`.
- **Output**: `results.items[]` with `{ title, url, snippet, position, date? }`.

### 2. `iflow-search_iflow_image_search`

- **Purpose**: search images.
- **Input**: `query: string`, optional `count: integer`.
- **Output**: `images.items[]` with `{ imageUrl, title, sourceUrl, width, height, position }`.

### 3. `iflow-search_iflow_web_fetch`

- **Purpose**: fetch the readable content of a single page.
- **Input**: `url: string` (absolute `http(s)`).
- **Output**: `data` with `{ url, title, content, fromCache, tookMs }`.

## Example Queries

- "Search for recent posts about MCP stdio transports and summarize the findings."
- "Find images of the VoltAgent logo and list source pages."
- "Fetch https://modelcontextprotocol.io/introduction and summarize the protocol's design goals."

## How the Wiring Works

```ts
const iflowApiKey = process.env.IFLOW_API_KEY;
if (!iflowApiKey) {
  throw new Error(
    "IFLOW_API_KEY is required. Copy .env.example to .env and set your iFlow API key."
  );
}

const mcpConfig = new MCPConfiguration({
  servers: {
    "iflow-search": {
      type: "stdio",
      command: "npx",
      args: ["-y", "@iflow-ai/search-mcp"],
      env: {
        IFLOW_API_KEY: iflowApiKey,
        IFLOW_MCP_CLIENT: "voltagent",
      },
    },
  },
});

const tools = await mcpConfig.getTools();
```

`@iflow-ai/search-mcp` reads `IFLOW_API_KEY` and `IFLOW_MCP_CLIENT` from the spawned child's `process.env`. VoltAgent forwards `PATH` and other system variables automatically (via `getDefaultEnvironment()`), so the only things you need to declare here are the iFlow-specific ones.

Setting `IFLOW_MCP_CLIENT=voltagent` lets iFlow's analytics distinguish traffic that came through this example from other MCP hosts (Claude Code, Cline, Hermes, etc.).

## Security

- **Do not commit your `.env`.** The populated file contains a live `IFLOW_API_KEY` (and `OPENAI_API_KEY`). The `.gitignore` shipped with this example already excludes it; keep it that way.
- The MCP server process receives `IFLOW_API_KEY` only through environment variables that this example forwards. Because the example starts the server via `npx`, npm itself may load its normal configuration (user `~/.npmrc`, project `.npmrc`, environment overrides) before executing the package — so do not store iFlow API keys in npm config or committed dotfiles. The iFlow MCP server's own code only reads `IFLOW_API_KEY` / `IFLOW_MCP_CLIENT` from its `process.env`.
- Tool results contain untrusted web content. The agent instructions tell the model to treat them as data only and never to follow embedded instructions — preserve that wording when you adapt this example.
- Recommended starting point: leave the agent's auto-approve / auto-execute settings off until you have verified the wiring end-to-end with a known-safe query. iFlow Search makes outbound HTTPS calls on every tool invocation.

## Troubleshooting

- **`IFLOW_API_KEY is required`** at startup: set `IFLOW_API_KEY` in your `.env`.
- **`401 Unauthorized` from the MCP server**: the iFlow key is invalid or revoked — issue a fresh one at `https://platform.iflow.cn`.
- **`npx` cannot find Node**: VoltAgent inherits `PATH` from the shell that launched it. Run `pnpm dev` from a terminal that has Node 20+ on `PATH`.
- **The agent ignores the search tools**: check the model has access to the tools — `await mcpConfig.getTools()` returns three entries; if you see fewer, look at the MCP server's stderr in the VoltAgent logs.

## Links

- iFlow platform: [https://platform.iflow.cn](https://platform.iflow.cn)
- npm package: [`@iflow-ai/search-mcp`](https://www.npmjs.com/package/@iflow-ai/search-mcp)
- Source / monorepo: [github.com/zhengyanglsun/iflow-search-js](https://github.com/zhengyanglsun/iflow-search-js)
- Official MCP Registry entry: `io.github.zhengyanglsun/iflow-search` ([registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io/))
