# VoltAgent Example – Managed Memory via VoltOps

This example shows how to run VoltAgent with the hosted _VoltAgent Managed Memory_ service. The agent persists conversations in VoltOps without needing direct PostgreSQL credentials.

## Prerequisites

1. **VoltOps Project Keys** – create or reuse a VoltOps project and copy the **public** and **secret** API keys.
2. **Managed Memory Database** – create a managed database from VoltOps Console or the VoltOps API and note its name (e.g. `production-memory`).
3. **Node.js 20+** and **pnpm** (or your preferred package manager).

## Setup

```bash
cd examples/with-voltagent-managed-memory
cp .env.example .env
# fill in VOLTAGENT_PUBLIC_KEY, VOLTAGENT_SECRET_KEY and MANAGED_MEMORY_DB_NAME
pnpm install
pnpm dev
```

The agent boots on [`http://localhost:3141`](http://localhost:3141) and stores memory remotely. Logs include the connection metadata returned by VoltOps.

## Environment variables

| Variable                 | Description                                                        |
| ------------------------ | ------------------------------------------------------------------ |
| `VOLTAGENT_PUBLIC_KEY`   | VoltOps project public key (starts with `pk_`).                    |
| `VOLTAGENT_SECRET_KEY`   | VoltOps project secret key (starts with `sk_`).                    |
| `VOLTOPS_API_URL`        | VoltOps API base URL. Leave blank for `https://api.voltagent.dev`. |
| `MANAGED_MEMORY_DB_NAME` | The managed memory database name (e.g. `production-memory`).       |
| `PORT`                   | Optional local port (defaults to `3141`).                          |
| `LOG_LEVEL`              | Optional logger level (`info`, `debug`, etc.).                     |

## How it works

```ts
const voltOpsClient = new VoltOpsClient({ publicKey, secretKey, baseUrl });
const managedMemory = new ManagedMemoryAdapter({
  databaseName: process.env.MANAGED_MEMORY_DB_NAME,
  voltOpsClient,
});

const agent = new Agent({
  model: "openai/gpt-4o-mini",
  memory: new Memory({ storage: managedMemory }),
});
```

The adapter calls VoltOps REST endpoints for every memory operation (`getMessages`, `createConversation`, etc.), so your application only needs VoltOps credentials.

---

Need a ready-made database or rotation policies? Head to [VoltOps Console](https://console.voltagent.dev/) and open the **Managed Memory** tab.
