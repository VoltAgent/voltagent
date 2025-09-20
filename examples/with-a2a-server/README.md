<div align="center">
<a href="https://voltagent.dev/">
<img width="1800" alt="VoltAgent banner" src="https://github.com/user-attachments/assets/452a03e7-eeda-4394-9ee7-0ffbcf37245c" />
</a>

<br />
<br />

<div align="center">
  <a href="https://voltagent.dev">Home Page</a> |
  <a href="https://voltagent.dev/docs/">Documentation</a> |
  <a href="https://github.com/voltagent/voltagent/tree/main/examples">Examples</a> |
  <a href="https://s.voltagent.dev/discord">Discord</a> |
  <a href="https://voltagent.dev/blog/">Blog</a>
</div>
</div>

<br />

<div align="center">
  <strong>VoltAgent is an open source TypeScript framework for building and orchestrating AI agents.</strong><br />
  Escape the limitations of no-code builders and the complexity of starting from scratch.
  <br />
  <br />
</div>

<div align="center">

[![npm version](https://img.shields.io/npm/v/@voltagent/core.svg)](https://www.npmjs.com/package/@voltagent/core)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.0-4baaaa.svg)](../../CODE_OF_CONDUCT.md)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)
[![Twitter Follow](https://img.shields.io/twitter/follow/voltagent_dev?style=social)](https://twitter.com/voltagent_dev)

</div>

<br />

# VoltAgent A2A Server Example

This example shows how to expose a VoltAgent agent over the **Agent-to-Agent (A2A)** protocol using `@voltagent/a2a-server` and the Hono server integration. Other agents or tools that speak A2A can discover the agent via `.well-known` and send JSON-RPC requests to `/a2a/:serverId`.

## Try the example

```bash
npm create voltagent-app@latest -- --example with-a2a-server
```

## What you get

- A minimal VoltAgent project with a `Support` agent and a `status` tool.
- An `A2AServer` exposing the agent’s card and message/taks endpoints.
- Hono routes (from `@voltagent/server-hono`) that proxy JSON-RPC requests to the server.

## Structure

```
examples/with-a2a-server
├── src/
│   ├── agents/assistant.ts    # Example agent definition
│   └── index.ts               # VoltAgent bootstrap + A2A server registration
├── package.json
├── tsconfig.json
└── README.md                  # You are here
```

## Prerequisites

- Node.js 20+
- `pnpm`
- `OPENAI_API_KEY` in your environment (used by the example agent)

## Run locally

```bash
pnpm install
pnpm --filter voltagent-example-with-a2a-server dev
```

The Hono server listens on `http://localhost:3141`. Check the discovery document:

```bash
curl http://localhost:3141/.well-known/support/agent-card.json | jq
```

Send a JSON-RPC request to the agent:

```bash
curl -X POST http://localhost:3141/a2a/support \
  -H "Content-Type: application/json" \
  -d '{
        "jsonrpc": "2.0",
        "id": "1",
        "method": "message/send",
        "params": {
          "message": {
            "kind": "message",
            "role": "user",
            "messageId": "msg-1",
            "parts": [{ "kind": "text", "text": "What time is it?" }]
          }
        }
      }'
```

## Smoke test script

There is a helper that exercises the example end-to-end. Start the dev server in one terminal and run:

```bash
pnpm --filter voltagent-example-with-a2a-server test:smoke
```

The script fetches the agent card, sends a message via `/a2a`, and asserts that the resulting task transitions to `completed`.

## Next steps

- Wire multiple agents by returning additional entries from the `a2aServers` map.
- Implement streaming support (A2A `message/stream`) when your agents produce incremental updates.
- Persist tasks by providing a custom `TaskStore` implementation instead of the in-memory store.

Happy hacking! 🚀
