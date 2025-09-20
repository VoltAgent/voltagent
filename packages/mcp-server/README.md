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

## License

MIT
