---
"@voltagent/server-core": patch
"@voltagent/server-hono": patch
"@voltagent/a2a-server": patch
"@voltagent/internal": patch
"@voltagent/core": patch
---

- add `@voltagent/a2a-server`, a JSON-RPC Agent-to-Agent (A2A) server that lets external agents call your VoltAgent instance over HTTP/SSE
- teach `@voltagent/core`, `@voltagent/server-core`, and `@voltagent/server-hono` to auto-register configured A2A servers so adding `{ a2aServers: { ... } }` on `VoltAgent` and opting into `honoServer` instantly exposes discovery and RPC endpoints
- forward request context (`userId`, `sessionId`, metadata) into agent invocations and provide task management hooks, plus allow filtering/augmenting exposed agents by default
- document the setup in `website/docs/agents/a2a/a2a-server.md` and refresh `examples/with-a2a-server` with basic usage and task-store customization
- A2A endpoints are now described in Swagger/OpenAPI and listed in the startup banner whenever an A2A server is registered, making discovery of `/.well-known/...` and `/a2a/:serverId` routes trivial.

**Getting started**

```ts
import { Agent, VoltAgent } from "@voltagent/core";
import { A2AServer } from "@voltagent/a2a-server";
import { honoServer } from "@voltagent/server-hono";

const assistant = new Agent({
  name: "SupportAgent",
  purpose: "Handle support questions from partner agents.",
  model: myModel,
});

const a2aServer = new A2AServer({
  name: "support-agent",
  version: "0.1.0",
});

export const voltAgent = new VoltAgent({
  agents: { assistant },
  a2aServers: { a2aServer },
  server: honoServer({ port: 3141 }),
});
```
