---
"@voltagent/a2a-server": patch
"@voltagent/server-core": patch
"@voltagent/server-hono": patch
"@voltagent/server-elysia": patch
---

fix: point A2A agent cards at the JSON-RPC endpoint

A2A agent cards now advertise `/a2a/{serverId}` instead of the internal
`/.well-known/{serverId}/agent-card.json` discovery document. When the card is
served through the Hono or Elysia integrations, VoltAgent also resolves that
endpoint to an absolute URL based on the incoming request.
