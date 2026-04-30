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

# VoltAgent with Valkey Store Example

This example demonstrates how to use **Valkey** as a distributed backing store for both A2A task persistence and resumable streaming in VoltAgent. It uses the `@valkey/valkey-glide` client library for high-performance access to Valkey (standalone or cluster).

## What you get

- **ValkeyTaskStore** — Persists A2A task records to Valkey with configurable key prefixes and TTL-based expiration.
- **ValkeyResumableStreamStore** — Manages resumable streaming sessions via Valkey pub/sub and key-value operations.
- A minimal VoltAgent project with a `SupportAgent` exposed over the A2A protocol, backed entirely by Valkey.

## Structure

```
examples/with-valkey-store
├── src/
│   ├── agents/assistant.ts    # Example agent definition
│   └── index.ts               # VoltAgent bootstrap with Valkey stores
├── .env.example               # Environment variable template
├── package.json
├── tsconfig.json
└── README.md
```

## Prerequisites

- Node.js 20+
- `pnpm`
- A running Valkey instance (or Redis-compatible server)
- `OPENAI_API_KEY` in your environment

### Start Valkey locally with Docker

```bash
docker run -d --name valkey -p 6379:6379 valkey/valkey:8
```

## Run locally

1. Copy the environment template and fill in your keys:

```bash
cp .env.example .env
```

2. Install dependencies and start the dev server:

```bash
pnpm install
pnpm --filter voltagent-example-with-valkey-store dev
```

The server listens on `http://localhost:3141`.

## Configuration

Environment variables:

| Variable         | Default     | Description                          |
| ---------------- | ----------- | ------------------------------------ |
| `OPENAI_API_KEY` | —           | OpenAI API key for the example agent |
| `VALKEY_HOST`    | `localhost` | Valkey server hostname               |
| `VALKEY_PORT`    | `6379`      | Valkey server port                   |

### Key prefixes and TTL

Both stores accept `keyPrefix` and `ttlSeconds` options:

```typescript
// Task store — keys like "my-tasks:agentId::taskId"
const taskStore = await createValkeyTaskStore({
  client: valkeyClient,
  keyPrefix: "my-tasks",
  ttlSeconds: 3600,
});

// Stream store — keys like "my-streams:active:userId-conversationId"
const streamStore = await createResumableStreamValkeyStore({
  client: valkeyClient,
  clientConfig: { addresses: [{ host: "localhost", port: 6379 }] },
  keyPrefix: "my-streams",
  ttlSeconds: 600,
});
```

### Cluster mode

Both stores accept `GlideClient` or `GlideClusterClient`:

```typescript
import { GlideClusterClient } from "@valkey/valkey-glide";

const clusterClient = await GlideClusterClient.createClient({
  addresses: [
    { host: "node1.example.com", port: 6379 },
    { host: "node2.example.com", port: 6379 },
  ],
  useTLS: true,
});

const taskStore = new ValkeyTaskStore({ client: clusterClient });
```

## Try it

```bash
# Fetch the agent card
curl http://localhost:3141/.well-known/supportagent/agent-card.json | jq

# Send a message
curl -X POST http://localhost:3141/a2a/supportagent \
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

## Next steps

- Adjust `ttlSeconds` to match your retention requirements (or omit it for no expiration).
- Use `GlideClusterClient` for production Valkey cluster deployments (e.g., AWS ElastiCache Valkey).
- Add TLS by setting `useTLS: true` in the client configuration.

Happy hacking! 🚀
