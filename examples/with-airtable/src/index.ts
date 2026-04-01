import { Agent, VoltAgent, createTool, createTriggers } from "@voltagent/core";
import { safeStringify } from "@voltagent/internal";
import { createPinoLogger } from "@voltagent/logger";
import { VoltOpsClient } from "@voltagent/sdk";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

type AirtableRecordCreatedPayload = {
  record: {
    id?: string;
    fields?: Record<string, unknown>;
  };
  tableId: string;
  baseId: string;
};

const logger = createPinoLogger({
  name: "with-airtable",
  level: "info",
});

const voltOps = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY ?? "",
  secretKey: process.env.VOLTAGENT_SECRET_KEY ?? "",
});

const updateAirtableRecord = createTool({
  name: "updateAirtableRecord",
  description: "Update an Airtable record with summary, priority, status, and next steps.",
  parameters: z.object({
    recordId: z.string().describe("Airtable record ID to update"),
    fields: z.record(z.unknown()).describe("Fields to update on the record"),
    baseId: z.string().optional().describe("Override Airtable base ID"),
    tableId: z.string().optional().describe("Override Airtable table ID"),
  }),
  execute: async ({ recordId, fields, baseId, tableId }) => {
    const credentialId = process.env.AIRTABLE_CREDENTIAL_ID;
    const resolvedBaseId = baseId ?? process.env.AIRTABLE_BASE_ID;
    const resolvedTableId = tableId ?? process.env.AIRTABLE_TABLE_ID;

    if (!credentialId) {
      throw new Error("AIRTABLE_CREDENTIAL_ID is not set");
    }
    if (!resolvedBaseId) {
      throw new Error("AIRTABLE_BASE_ID is not set");
    }
    if (!resolvedTableId) {
      throw new Error("AIRTABLE_TABLE_ID is not set");
    }

    console.log();

    return voltOps.actions.airtable.updateRecord({
      credential: { credentialId },
      baseId: resolvedBaseId,
      tableId: resolvedTableId,
      recordId,
      fields,
    });
  },
});

const airtableAgent = new Agent({
  name: "airtable-agent",
  instructions: `You process newly created Airtable records.
Create a concise summary, assign a priority (High/Medium/Low), set a status (New/In Progress/Blocked/Done), and list next steps.`,
  tools: [updateAirtableRecord],
  model: "openai/gpt-4o-mini",
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
Base: ${baseId}
Table: ${tableId}
Record ID: ${record.id}

Existing fields (JSON): ${safeStringify(record.fields ?? {})}

Update the same record with:
- Summary (1-2 sentences) -> field name: Summary
- Priority (High | Medium | Low) -> field name: Priority
- Status (New | In Progress | Blocked | Done) -> field name: Status
- Next steps (short bullet list as a single string) -> field name: Next steps`);
    });
  }),
});
