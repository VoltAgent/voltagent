# @voltagent/mcp-server

> Model Context Protocol server package for VoltAgent.

This package provides shared utilities for exposing VoltAgent agents, workflows, and tools through the Model Context Protocol (MCP). It offers a transport-agnostic server core with adapters for stdio, SSE, and HTTP integrations.

## Status

> **Warning**
> This package is currently under active development and the API should be considered unstable until the first public release.

## Development

```bash
pnpm install
pnpm build --filter @voltagent/mcp-server
```

## Agent metadata

When an agent is exposed through MCP, its `purpose` field is used as the MCP tool description. Provide a concise, user-facing explanation in `purpose` so MCP clients display helpful copy. If `purpose` is empty, the adapter falls back to the agent instructions.

## Streamable HTTP

`startHTTP` supports stateless Streamable HTTP requests while keeping stateful sessions as the default. For horizontally scaled or serverless deployments, enable `serverless` so each request uses a fresh MCP server and transport instance without issuing an `mcp-session-id`:

```ts
await server.startHTTP({
  url: new URL(req.url ?? "/", "http://localhost:3141"),
  httpPath: "/mcp",
  req,
  res,
  options: { serverless: true },
});
```

Setting `sessionIdGenerator: undefined` also enables stateless mode. Stateless requests return JSON by default; use `serverlessStreaming: true` for request-scoped SSE progress notifications. Session-bound elicitation, subscriptions, resumability, and out-of-request notifications still require stateful mode.

To make the built-in VoltAgent HTTP route stateless without wrapping the request handler, set the default on the server:

```ts
const server = new MCPServer({
  name: "my-server",
  version: "1.0.0",
  httpTransportOptions: { serverless: true },
});
```

## License

MIT
