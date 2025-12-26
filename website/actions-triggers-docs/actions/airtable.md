# Airtable Actions

Airtable is one of the most common destinations for agent output—customer records, research notes,
summaries, etc. VoltOps ships managed Airtable actions so you can create, update, delete, list, and
fetch records without touching the Airtable REST API directly.

## Prerequisites

1. An Airtable base + table you want to write to.
2. A Volt project (free or paid) with API keys (`pk_…`, `sk_…`).
3. An Airtable credential inside Volt:
   - Go to **Settings → Integrations → Add Credential → Airtable**.
   - Paste your Airtable access token and save. Volt generates a `cred_xxx` identifier.
4. (Recommended) Base and table IDs stored as environment variables:

```bash
AIRTABLE_CREDENTIAL_ID=cred_xxx
AIRTABLE_BASE_ID=appxxxxxxxxxxxxxx
AIRTABLE_TABLE_ID=tblxxxxxxxxxxxxxx
```

## Running Airtable actions from code

```ts
import { VoltOpsClient } from "@voltagent/core";

const voltops = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY!,
  secretKey: process.env.VOLTAGENT_SECRET_KEY!,
});

await voltops.actions.airtable.createRecord({
  credential: { credentialId: process.env.AIRTABLE_CREDENTIAL_ID! },
  baseId: process.env.AIRTABLE_BASE_ID!,
  tableId: process.env.AIRTABLE_TABLE_ID!,
  fields: {
    Name: "Ada Lovelace",
    Role: "Researcher",
    Status: "Ready",
  },
});

// No stored credential? Pass your access token inline instead
await voltops.actions.airtable.createRecord({
  credential: { apiKey: process.env.AIRTABLE_API_KEY! },
  baseId: process.env.AIRTABLE_BASE_ID!,
  tableId: process.env.AIRTABLE_TABLE_ID!,
  fields: {
    Name: "Grace Hopper",
  },
});
```

Every call appears in Volt → **Actions** with request/response payloads, so you can monitor failures
or re-run a specific payload without redeploying code.

## Treat Airtable actions as tools

The [`with-voltagent-actions`](https://github.com/voltagent/voltagent/tree/main/examples/with-voltagent-actions)
example demonstrates how to expose each Airtable action as a VoltAgent tool. Below is a simplified
version of the **Create Record** tool; the example repo includes create/update/delete/get/list
variants plus a UI drawer inside the Volt console to test payloads.

```ts
import { createTool } from "@voltagent/core";
import { VoltOpsClient } from "@voltagent/core";
import { z } from "zod";

const voltops = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY!,
  secretKey: process.env.VOLTAGENT_SECRET_KEY!,
});

export const createAirtableRecordTool = createTool({
  name: "createAirtableRecord",
  description: "Create a CRM row inside Airtable",
  parameters: z.object({
    fields: z.record(z.unknown()),
    baseId: z.string().optional(),
    tableId: z.string().optional(),
  }),
  execute: async ({ fields, baseId, tableId }) => {
    const result = await voltops.actions.airtable.createRecord({
      credential: { credentialId: process.env.AIRTABLE_CREDENTIAL_ID! },
      baseId: baseId ?? process.env.AIRTABLE_BASE_ID!,
      tableId: tableId ?? process.env.AIRTABLE_TABLE_ID!,
      fields,
      typecast: true,
    });

    return {
      actionId: result.actionId,
      metadata: result.metadata,
      record: result.responsePayload,
    };
  },
});
```

Add the tool to an agent:

```ts
const airtableAgent = new Agent({
  name: "Airtable Assistant",
  model: openai("gpt-4o-mini"),
  instructions: "Use the Airtable tools to manage the operations database.",
  tools: [createAirtableRecordTool, listAirtableRecordsTool, updateAirtableRecordTool],
});
```

Now the agent can plan/tool-call requests like:

```
User: "Add Ada Lovelace to the workspace table and show me the latest 5 entries."
```

The planner will call `createAirtableRecord` followed by `listAirtableRecords`, and VoltOps will log
both action runs.

## Testing payloads in the console

While building, open **Volt Console → Actions → Add Action** and select Airtable. The drawer mirrors
the trigger UX with a credential step, configuration step (base/table dropdowns), and a **Payload &
Test** editor. Enter any JSON payload and click **Run Test**; successful responses include a
copy-pasteable SDK snippet, while errors display the raw provider message (e.g.,
`INVALID_VALUE_FOR_COLUMN`).

This makes it easy to iterate on Airtable data types before committing changes to an agent.

## Troubleshooting

- **Proxy/credential mismatch** – make sure the Volt credential uses the same service (case
  sensitive). E.g., a credential named “airtable” must be attached to an Airtable action.
- **Column IDs vs names** – use `returnFieldsByFieldId: true` if you prefer Airtable field IDs; the
  default returns user-friendly names.
- **Pagination** – `listRecords` accepts `pageSize`, `offset`, `view`, `filterByFormula`, and `sort`
  parameters identical to Airtable’s REST API. VoltOps just forwards them.
- **Observability** – check **Volt → Actions → Runs** to inspect payloads, metadata, retries, and
  provider errors (`INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND`, etc.).

With VoltOps Actions you can keep agent logic focused on reasoning while Volt handles the last-mile
integration to Airtable.
