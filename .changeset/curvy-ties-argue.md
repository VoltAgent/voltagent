---
"@voltagent/voltagent-memory": patch
"@voltagent/serverless-hono": patch
"@voltagent/server-core": patch
"@voltagent/server-hono": patch
"@voltagent/postgres": patch
"@voltagent/supabase": patch
"@voltagent/libsql": patch
"@voltagent/core": patch
"@voltagent/sdk": patch
---

feat: add triggers DSL improvements and event payload simplification

- Introduce the new `createTriggers` DSL and expose trigger events via sensible provider names (e.g. `on.airtable.recordCreated`) rather than raw catalog IDs.
- Add trigger span metadata propagation so VoltAgent agents receive trigger context automatically without manual mapping.
- Simplify action dispatch payloads: `payload` now contains only the event’s raw data while trigger context lives in the `event`/`metadata` blocks, reducing boilerplate in handlers.

```ts
import { VoltAgent, createTriggers } from "@voltagent/core";

new VoltAgent({
  // ...
  triggers: createTriggers((on) => {
    on.airtable.recordCreated(({ payload, event }) => {
      console.log("New Airtable row", payload, event.metadata);
    });

    on.gmail.newEmail(({ payload }) => {
      console.log("New Gmail message", payload);
    });
  }),
});
```
