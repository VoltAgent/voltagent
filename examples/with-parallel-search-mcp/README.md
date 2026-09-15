# Parallel Search MCP

Build a VoltAgent research assistant with public web search and page extraction through the [Parallel Search MCP](https://docs.parallel.ai/integrations/mcp/search-mcp). Parallel's anonymous endpoint is free and needs no account or API key. You still need access to a tool-capable model to run the agent.

## Run locally

Use Node.js 20.6.0 or later for the scripts' `--env-file` support. From this directory:

```bash
npm install
cp .env.example .env
```

Set `MODEL` to a supported `provider/model-id` and add the credentials for that model provider to `.env`. See [VoltAgent's model configuration](https://voltagent.dev/docs/getting-started/providers-models/) for the available providers. The sample includes an empty `OPENAI_API_KEY` field; use the environment variables required by your chosen provider.

```bash
npm run dev
```

The agent server runs at `http://localhost:3141`. Connect it to the [VoltAgent console](https://console.voltagent.dev) and try:

> Find the official VoltAgent MCP documentation and explain how remote HTTP tools work. Cite the sources you use.

For a compiled run, use `npm run build` followed by `npm start`. Conversations use the same local LibSQL memory pattern as other examples, stored in `.voltagent/memory.db`.

## Tools and data flow

The example connects VoltAgent's native `MCPConfiguration` to `https://search.parallel.ai/mcp` using Streamable HTTP. It discovers `parallel_web_search` and `parallel_web_fetch`, preserving their server-provided input schemas. Initialization fails if either tool is unavailable.

Once you run this agent, it can invoke these tools during a conversation. Supplied search queries, requested URLs, objectives, context and optional metadata are sent to Parallel. Fetch reads public page text; it does not use your browser cookies or signed-in sessions. Requests send `User-Agent: VoltAgent` so Parallel can measure aggregate free MCP usage by project. This identifier contains no user or installation ID.

Free access is rate limited and uses Fast search mode. This example omits authentication headers. For heavier use, see the separate authenticated options in the [MCP documentation](https://docs.parallel.ai/integrations/mcp/search-mcp). Use is subject to [Parallel's customer terms](https://parallel.ai/customer-terms) and [privacy policy](https://parallel.ai/privacy-policy).

Search and fetch return one structured payload to the agent, with source URLs, excerpts, warnings and per-URL fetch errors intact. MCP tool errors and malformed payloads throw instead of appearing as empty results. Valid empty results remain successful empty results. The native client sets a 60-second timeout for each tool call and rejects redirects. Prefer excerpt fetches; complete page content can be much larger.

The optional `session_id` and `model_name` fields remain caller-controlled. Reuse a conversation's identifier across related search and fetch calls and supply an exact model identifier only when available. The example does not invent one shared session for all users.

This is a separate starter example. To stop sending requests through it, stop its process or remove its tools when adapting it into your app.

## Verify

```bash
npm run build
npm test
npm run smoke
```

The tests use a local MCP fixture and need no credentials or network access. They check result conversion, discovery failures, request attribution, input forwarding and service failures. `smoke` makes a small real Search and Fetch call through this example's native client without model credentials or a Parallel key.
