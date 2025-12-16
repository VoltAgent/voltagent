# Postgres Actions

VoltOps ships a managed **Execute Postgres Query** action so agents can run parameterized SQL against your databases with observability, retries, and credential management handled for you.

## Prerequisites

1. A reachable Postgres database (host, port, database, user, password) with network access from Volt.
2. A Volt project with API keys (`pk_…`, `sk_…`).
3. A Postgres credential inside Volt:
   - Go to **Settings → Integrations → Add Credential → Postgres (Actions)**.
   - Enter host, port, user, password, database, and optionally toggle SSL / reject self-signed certs.
   - Save to generate a `cred_xxx` identifier.
4. (Recommended) Save the credential ID as an environment variable:

```bash
POSTGRES_CREDENTIAL_ID=cred_xxx
```

## Run Postgres actions from code

```ts
import { VoltOpsClient } from "@voltagent/core";

const voltops = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY!,
  secretKey: process.env.VOLTAGENT_SECRET_KEY!,
});

// Parameterized query (recommended)
const result = await voltops.actions.postgres.executeQuery({
  credential: { credentialId: process.env.POSTGRES_CREDENTIAL_ID! },
  query:
    "SELECT id, email, status FROM public.users WHERE status = $1 ORDER BY created_at DESC LIMIT 10;",
  parameters: ["active"],
  applicationName: "VoltAgent",
  statementTimeoutMs: 30_000,
  connectionTimeoutMs: 30_000,
  ssl: { rejectUnauthorized: false },
});

console.log(result.responsePayload.rows);
```

No stored credential? You can pass inline connection details instead:

```ts
await voltops.actions.postgres.executeQuery({
  credential: {
    host: "db.example.com",
    port: 5432,
    user: "app_user",
    password: process.env.POSTGRES_PASSWORD!,
    database: "app_db",
    ssl: true,
  },
  query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';",
});
```

## Expose Postgres as an agent tool

```ts
import { createTool, VoltOpsClient } from "@voltagent/core";
import { z } from "zod";

const voltops = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY!,
  secretKey: process.env.VOLTAGENT_SECRET_KEY!,
});

export const runPostgresQueryTool = createTool({
  name: "runPostgresQuery",
  description: "Run a parameterized SQL query against Postgres",
  parameters: z.object({
    query: z.string(),
    parameters: z.array(z.any()).default([]),
  }),
  execute: async ({ query, parameters }) => {
    const exec = await voltops.actions.postgres.executeQuery({
      credential: { credentialId: process.env.POSTGRES_CREDENTIAL_ID! },
      query,
      parameters,
      statementTimeoutMs: 20_000,
    });

    return {
      actionId: exec.actionId,
      rows: exec.responsePayload.rows,
      metadata: exec.metadata,
    };
  },
});
```

Attach `runPostgresQuery` to any agent; the planner will call it when SQL is needed. VoltOps records the request/response so you can replay or debug failures in **Volt → Actions → Runs**.

## Testing payloads in the console

Open **Volt Console → Actions → Add Action → Postgres**. Pick your credential and use the **Payload & Test** editor. A sample payload is prefilled to list public tables:

```json
{
  "query": "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name LIMIT 20;",
  "parameters": []
}
```

Click **Run Test** to execute against your database; successful runs return rows plus a copy-ready SDK snippet.

## Troubleshooting

- **“unsupported startup parameter: statement_timeout”** – Volt sets `statement_timeout` after connecting (not as a startup param). If your server blocks `SET statement_timeout`, remove that field or lower the value.
- **SSL / self-signed certs** – set `ssl: true` and `ssl.rejectUnauthorized: false` if your instance uses self-signed certificates.
- **Long-running queries** – use `statementTimeoutMs` to avoid hanging agents; `connectionTimeoutMs` controls how long we wait to establish the socket.
- **Always parameterize** – pass values via `parameters: []` (`$1`, `$2`, …) instead of string concatenation to avoid SQL injection and to match the Postgres action schema.
