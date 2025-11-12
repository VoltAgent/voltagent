# VoltOps Actions Overview

VoltOps Actions provide managed integrations (Airtable, Gmail, Slack, …) that you can trigger from
agents, workflows, or the VoltOps API. Instead of wiring every SaaS API yourself you define the
destination once in the Volt console, connect credentials, and then call the action from the SDK or
VoltAgent tools with full observability.

## When to use actions

- **Deliver data to external systems** – sync agent output to Airtable, send emails, notify chat apps,
  or call internal HTTP endpoints.
- **Re-use credentials** – end users authenticate once inside Volt; your code invokes the action
  without ever handling another API token.
- **Gain observability** – each action run is logged in VoltOps with payload, metadata, and retry
  history so you can debug failures quickly.

## How actions work

1. **Create a credential** in the Volt console (Settings → Integrations). Volt stores the provider
   token securely.
2. **Select the action** (e.g. Airtable Create Record) and configure defaults such as base/table IDs.
3. **Call the action** using the VoltOps SDK (`VoltOpsClient`) or expose it as a VoltAgent tool.
4. **Inspect runs** in the console. Every invocation shows request + response payloads, retries, and
   error messages.

## Quick start with the SDK

```ts
import { VoltOpsClient } from "@voltagent/core";

const voltops = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY!,
  secretKey: process.env.VOLTAGENT_SECRET_KEY!,
});

const record = await voltops.actions.airtable.createRecord({
  credentialId: "cred_123",
  baseId: "appAbCdEf123",
  tableId: "tblXyZ987",
  fields: {
    Name: "Ada Lovelace",
    Email: "ada@example.com",
    Status: "Ready",
  },
});

console.log(record.responsePayload);
```

You can also [test actions directly from the console](https://console.voltagent.dev/actions) by
editing the JSON payload and hitting **Run Test**. The console uses the same `/actions/test` API
behind the scenes, so once your payload works there you can copy/paste the generated SDK snippet.

## Agent and workflow usage

The VoltAgent runtime treats each action as a tool. Add it to an agent like so:

```ts
import { createTool } from "@voltagent/core";
import { VoltOpsClient } from "@voltagent/core";

const voltops = new VoltOpsClient({ publicKey: "pk_xxx", secretKey: "sk_xxx" });

export const createCustomerRecord = createTool({
  name: "createCustomerRecord",
  description: "Create a CRM row in Airtable",
  parameters: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
  execute: async ({ name, email }) => {
    return await voltops.actions.airtable.createRecord({
      credentialId: process.env.AIRTABLE_CREDENTIAL_ID!,
      baseId: process.env.AIRTABLE_BASE_ID!,
      tableId: process.env.AIRTABLE_TABLE_ID!,
      fields: { Name: name, Email: email },
    });
  },
});
```

Agents can now call `createCustomerRecord` during planning and VoltOps keeps an immutable log of each
invocation (request/response/metadata).

## Next steps

- Follow the [Actions + Airtable guide](./airtable.md) for a concrete provider walkthrough.
- Publish your own actions by wiring other integrations through VoltOps and sharing the tool with
  agents or workflows.
- Monitor action runs in Volt → **Actions** to debug payloads, rerun failures, and correlate with
  agent traces.
