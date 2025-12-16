---
id: airtable-agent
title: Airtable Agent
description: Listen to Airtable record events, enrich rows, and write back via VoltOps.
hide_table_of_contents: true
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import ApiKeyButton from '@site/src/components/docs-widgets/ApiKeyButton';
import StepSection from '@site/src/components/docs-widgets/StepSection';
import SectionDivider from '@site/src/components/docs-widgets/SectionDivider';
import ExpandableCode from '@site/src/components/docs-widgets/ExpandableCode';

# Airtable Agent

This guide shows how to build event-driven AI agents with VoltAgent and Airtable using [Triggers](/actions-triggers-docs/triggers/usage) and [Actions](/actions-triggers-docs/actions/overview).

You'll create an agent that uses Triggers to receive new record events, summarizes them, and uses Actions to write status/next steps back into the same row.

:::info
Follow the steps with your own base, table, and credential. You can get the agent source code [here](https://github.com/voltagent/voltagent/tree/main/examples/with-airtable).
:::

<br/>

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/voltagent-recipes-guides/airtable-5.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

<StepSection stepNumber={1} title="Create the Project">

Run the CLI to scaffold a new project:

```bash
npm create voltagent-app@latest
```

</StepSection>

<StepSection stepNumber={2} title="Configure and Start">

If you skipped API key entry during setup, create or edit the `.env` file in your project root:

<Tabs>
  <TabItem value="openai" label="OpenAI" default>

```bash
OPENAI_API_KEY=your-api-key-here
```

<ApiKeyButton provider="OpenAI" href="https://platform.openai.com/api-keys" />

  </TabItem>
  <TabItem value="anthropic" label="Anthropic">

```bash
ANTHROPIC_API_KEY=your-api-key-here
```

<ApiKeyButton provider="Anthropic" href="https://console.anthropic.com/settings/keys" />

  </TabItem>
  <TabItem value="google" label="Google Gemini">

```bash
GOOGLE_GENERATIVE_AI_API_KEY=your-api-key-here
```

<ApiKeyButton provider="Google" href="https://aistudio.google.com/app/apikey" />

  </TabItem>
  <TabItem value="groq" label="Groq">

```bash
GROQ_API_KEY=your-api-key-here
```

<ApiKeyButton provider="Groq" href="https://console.groq.com/keys" />

  </TabItem>
  <TabItem value="mistral" label="Mistral">

```bash
MISTRAL_API_KEY=your-api-key-here
```

<ApiKeyButton provider="Mistral" href="https://console.mistral.ai/api-keys" />

  </TabItem>
</Tabs>

Start the development server:

<Tabs>
  <TabItem value="npm" label="npm" default>

```bash
npm run dev
```

  </TabItem>
  <TabItem value="yarn" label="yarn">

```bash
yarn dev
```

  </TabItem>
  <TabItem value="pnpm" label="pnpm">

```bash
pnpm dev
```

  </TabItem>
</Tabs>

You should see the VoltAgent server startup message:

```bash
═══════════════════════════════════════════════════
  VOLTAGENT SERVER STARTED SUCCESSFULLY
═══════════════════════════════════════════════════
  ✓ HTTP Server:  http://localhost:3141
  ↪ Share it:    pnpm volt tunnel 3141 (secure HTTPS tunnel for teammates)
     Docs: https://voltagent.dev/deployment-docs/local-tunnel/
  ✓ Swagger UI:   http://localhost:3141/ui

  Test your agents with VoltOps Console: https://console.voltagent.dev
═══════════════════════════════════════════════════
```

</StepSection>

<StepSection stepNumber={3} title="Set Up the Airtable Trigger in Console">

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/voltagent-recipes-guides/airtable-1.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

Open [VoltAgent Console](https://console.voltagent.dev/triggers) and go to **Triggers** → **Create Trigger**.

1. Select **Airtable → Record created**
2. Select your base and table
3. Save the trigger

</StepSection>

<StepSection stepNumber={4} title="Expose Your Local Agent with Volt Tunnel">

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/voltagent-recipes-guides/airtable-2.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

[Volt Tunnel](/deployment-docs/local-tunnel/) exposes your local server to the internet so triggers can reach it.

Run the tunnel command:

```bash
pnpm volt tunnel 3141
```

Copy the tunnel URL (e.g., `https://your-tunnel.tunnel.voltagent.dev`) and set it as the **Endpoint URL** in the trigger configuration.

</StepSection>

<SectionDivider>
  The project is set up and the Airtable trigger is configured. The following steps cover wiring the trigger to your agent and adding the update action.
</SectionDivider>

<StepSection stepNumber={5} title="Wire the Airtable Trigger to Your Agent">

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/voltagent-recipes-guides/airtable-3.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

This code sets up a trigger handler that receives new Airtable rows and generates field suggestions. The write-back tool is added in the next step.

<ExpandableCode title="src/index.ts" previewLines={15}>

```ts
import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, createTriggers } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { safeStringify } from "@voltagent/internal";

type AirtableRecordCreatedPayload = {
  record?: {
    id?: string;
    fields?: Record<string, unknown>;
  };
  baseId?: string;
  tableId?: string;
};

const logger = createPinoLogger({ name: "with-airtable", level: "info" });

const airtableAgent = new Agent({
  name: "airtable-agent",
  instructions: `You process newly created Airtable rows.
Draft a summary, a priority (High/Medium/Low), a status (New/In Progress/Blocked/Done), and next steps as bullet text.
You will get a tool to write back in the next step; for now just return the proposed values clearly.`,
  model: openai("gpt-4o-mini"),
});

new VoltAgent({
  agents: { airtableAgent },
  server: honoServer(),
  logger,
  triggers: createTriggers((on) => {
    on.airtable.recordCreated(async ({ payload, agents }) => {
      const { record, baseId, tableId } =
        (payload as AirtableRecordCreatedPayload | undefined) ?? {};
      if (!record?.id) {
        logger.warn("Missing recordId in Airtable payload");
        return;
      }

      await agents.airtableAgent.generateText(`Airtable record created.
Base: ${baseId ?? "unknown-base"}
Table: ${tableId ?? "unknown-table"}
Record ID: ${record.id}

Existing fields (JSON): ${safeStringify(record.fields ?? {})}

Propose updates (no tool calls yet):
- Summary (1-2 sentences)
- Priority (High | Medium | Low)
- Status (New | In Progress | Blocked | Done)
- Next steps (short bullet list as a single string)`);
    });
  }),
});
```

</ExpandableCode>

:::info
Your Airtable table must include columns named `Summary`, `Priority`, `Status`, and `Next steps`. Adjust the prompt if your schema differs.
:::

</StepSection>

<StepSection stepNumber={6} title="Add the Airtable Action and Update Tool">

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/voltagent-recipes-guides/airtable-4.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

Open [VoltAgent Console](https://console.voltagent.dev/actions) and go to **Actions** → **Create Action**.

1. Select **Airtable** and the same credential
2. Select **Update record**, base, and table
3. Save the action

Add the VoltOps client and `updateAirtableRecord` tool to your code:

<ExpandableCode title="src/index.ts" previewLines={15}>

```ts
import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, createTool, createTriggers } from "@voltagent/core";
import { VoltOpsClient } from "@voltagent/sdk";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { safeStringify } from "@voltagent/internal";
import { z } from "zod";

type AirtableRecordCreatedPayload = {
  record?: {
    id?: string;
    fields?: Record<string, unknown>;
  };
  baseId?: string;
  tableId?: string;
};

const logger = createPinoLogger({ name: "with-airtable", level: "info" });

const voltOps = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY ?? "",
  secretKey: process.env.VOLTAGENT_SECRET_KEY ?? "",
});

const updateAirtableRecord = createTool({
  name: "updateAirtableRecord",
  description: "Update an Airtable record with summary/priority/status/next steps.",
  parameters: z.object({
    recordId: z.string(),
    fields: z.record(z.unknown()),
    baseId: z.string().optional(),
    tableId: z.string().optional(),
  }),
  execute: async ({ recordId, fields, baseId, tableId }) => {
    const credentialId = process.env.AIRTABLE_CREDENTIAL_ID;
    if (!credentialId) {
      throw new Error("AIRTABLE_CREDENTIAL_ID is not set");
    }

    return voltOps.actions.airtable.updateRecord({
      credential: { credentialId },
      baseId: baseId,
      tableId: tableId,
      recordId,
      fields,
    });
  },
});

const airtableAgent = new Agent({
  name: "airtable-agent",
  instructions: `You process newly created Airtable rows.
Create a short summary, assign a priority (High/Medium/Low), pick a status (New/In Progress/Blocked/Done), and list next steps.
Always write updates via updateAirtableRecord using the exact Airtable field names.`,
  tools: [updateAirtableRecord],
  model: openai("gpt-4o-mini"),
});

new VoltAgent({
  agents: { airtableAgent },
  server: honoServer(),
  logger,
  triggers: createTriggers((on) => {
    on.airtable.recordCreated(async ({ payload, agents }) => {
      const { record, baseId, tableId } =
        (payload as AirtableRecordCreatedPayload | undefined) ?? {};
      if (!record?.id) {
        logger.warn("Missing recordId in Airtable payload");
        return;
      }

      await agents.airtableAgent.generateText(`Airtable record created.
Base: ${baseId ?? "unknown-base"}
Table: ${tableId ?? "unknown-table"}
Record ID: ${record.id}

Existing fields (JSON): ${safeStringify(record.fields ?? {})}

Update the same record with:
- Summary (1-2 sentences) -> field name: Summary
- Priority (High | Medium | Low) -> field name: Priority
- Status (New | In Progress | Blocked | Done) -> field name: Status
- Next steps (short bullet list as a single string) -> field name: Next steps

Call updateAirtableRecord with recordId and the new fields using those exact names.`);
    });
  }),
});
```

</ExpandableCode>

</StepSection>

<StepSection stepNumber={7} title="Test End-to-End">

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/voltagent-recipes-guides/airtable-5.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

Now test the complete flow from Airtable to your agent and back.

Add these environment variables to your `.env` file:

```bash
VOLTAGENT_PUBLIC_KEY=pk_...
VOLTAGENT_SECRET_KEY=sk_...
AIRTABLE_CREDENTIAL_ID=cred_...
```

With the tunnel and server running:

1. Insert a new row in your Airtable table (fill in `Title`, `Description`, etc.)
2. The trigger sends the event to your agent
3. The agent generates summary/priority/status/next steps
4. VoltOps writes the fields back to the record

View request/response logs in **Actions → Runs** in Console.

</StepSection>

## Related Documentation

- [Triggers Usage](/actions-triggers-docs/triggers/usage) - Trigger configuration reference
- [Airtable Actions](/actions-triggers-docs/actions/airtable) - Airtable action types
- [Tools](/docs/agents/tools) - Creating agent tools
