---
"@voltagent/mcp-server": patch
---

Skip disconnected MCP servers when broadcasting prompt and resource notifications so unconnected or closed sessions do not reject updates for active clients.
