---
"@voltagent/mcp-server": patch
---

Skip disconnected MCP servers when broadcasting prompt and resource notifications so unconnected or closed sessions do not reject updates for active clients.

Release notification registrations when sessions close or stateless responses finish, keeping streaming responses active until their end and allowing the base transport to reconnect.

Preserve an existing connection when another connection attempt is rejected, and limit failed-startup cleanup to the attempt's own transport.
