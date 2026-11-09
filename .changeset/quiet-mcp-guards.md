---
"@voltagent/server-core": patch
---

fix(server-core): require authentication for MCP execution routes under legacy `auth`

The legacy auth policy protected agent, tool, and workflow execution but left the MCP execution routes open, so an MCP client could call exposed tools, agents, and workflows without a token. `PROTECTED_ROUTES` now includes the MCP Streamable HTTP route (`/mcp/:serverId/mcp`), the SSE connection and message routes (`GET /mcp/:serverId/sse`, `POST /mcp/:serverId/messages`), MCP tool invocation, reading a single MCP prompt or resource, and the logging level route. MCP discovery (`GET /mcp/servers`, `GET /mcp/servers/:serverId`, and the tool, prompt, resource and resource template lists) stays public. Apps that relied on unauthenticated MCP access can opt back in with `publicRoutes`.

Fixes #1493
