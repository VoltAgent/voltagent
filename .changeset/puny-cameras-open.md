---
"@voltagent/serverless-hono": patch
"@voltagent/server-core": patch
"@voltagent/core": patch
---

feat: expose Cloudflare Workers `env` bindings in serverless contexts

When using `@voltagent/serverless-hono` on Cloudflare Workers, the runtime `env` is now injected into the
context map for agent requests, workflow runs, and tool executions. `@voltagent/core` exports
`SERVERLESS_ENV_CONTEXT_KEY` so you can access bindings like D1 from `options.context` (tools) or
`state.context` (workflow steps). Tool execution also accepts `context` as a `Map`, preserving
`userId`/`conversationId` when provided that way.

`@voltagent/core` is also marked as side-effect free so edge bundlers can tree-shake the PlanAgent
filesystem backend, avoiding Node-only dependency loading when it is not used.

Usage:

```ts
import { createTool, SERVERLESS_ENV_CONTEXT_KEY } from "@voltagent/core";
import type { D1Database } from "@cloudflare/workers-types";
import { z } from "zod";

type Env = { DB: D1Database };

export const listUsers = createTool({
  name: "list-users",
  description: "Fetch users from D1",
  parameters: z.object({}),
  execute: async (_args, options) => {
    const env = options?.context?.get(SERVERLESS_ENV_CONTEXT_KEY) as Env | undefined;
    const db = env?.DB;
    if (!db) {
      throw new Error("D1 binding is missing (env.DB)");
    }

    const { results } = await db.prepare("SELECT id, name FROM users").all();
    return results;
  },
});
```
