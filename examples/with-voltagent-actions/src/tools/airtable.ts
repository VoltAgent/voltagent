import { createTool } from "@voltagent/core";
import { z } from "zod";
import { actionsClient, actionsConfig } from "../config";

const stringIdentifier = z.string().min(1);
const optionalBoolean = z.boolean().optional();
const optionalString = stringIdentifier.optional();
const recordIdSchema = stringIdentifier.describe("The Airtable record ID.");

const recordFieldsSchema = z
  .record(z.unknown())
  .describe(
    "Key-value pairs that will compose the Airtable record. Keys should match column names.",
  );

const sortSchema = z
  .array(
    z.object({
      field: z.string().min(1),
      direction: z.enum(["asc", "desc"]).optional(),
    }),
  )
  .optional()
  .describe("Optional sort rules (same shape as Airtable REST API sort parameter).");

function resolveBaseId(override?: string | null): string {
  const trimmed = override?.trim();
  if (trimmed && trimmed.length > 0) {
    return trimmed;
  }
  return actionsConfig.airtable.baseId;
}

function resolveTableId(override?: string | null): string {
  const trimmed = override?.trim();
  if (trimmed && trimmed.length > 0) {
    return trimmed;
  }
  return actionsConfig.airtable.tableId;
}

function wrapActionResult(
  result: Awaited<ReturnType<typeof actionsClient.actions.airtable.createRecord>>,
) {
  return {
    actionId: result.actionId,
    provider: result.provider,
    request: result.requestPayload,
    response: result.responsePayload,
    metadata: result.metadata ?? null,
  };
}

export const createAirtableRecordTool = createTool({
  name: "createAirtableRecord",
  description:
    "Create a new Airtable record by sending the payload through VoltOps Actions. Fields should map to Airtable column names.",
  parameters: z.object({
    fields: recordFieldsSchema,
    typecast: optionalBoolean,
    returnFieldsByFieldId: optionalBoolean,
    baseId: stringIdentifier
      .describe("Override the default Airtable base ID for this call.")
      .optional(),
    tableId: stringIdentifier
      .describe("Override the default Airtable table ID for this call.")
      .optional(),
  }),
  outputSchema: z.object({
    actionId: z.string(),
    provider: z.string(),
    request: z.record(z.unknown()),
    response: z.unknown(),
    metadata: z.record(z.unknown()).nullable(),
  }),
  execute: async (input) => {
    const { fields, typecast, returnFieldsByFieldId, baseId, tableId } = input;
    const effectiveBaseId = resolveBaseId(baseId);
    const effectiveTableId = resolveTableId(tableId);

    const result = await actionsClient.actions.airtable.createRecord({
      credential: actionsConfig.airtable.credential,
      baseId: effectiveBaseId,
      tableId: effectiveTableId,
      fields,
      typecast,
      returnFieldsByFieldId,
    });

    return wrapActionResult(result);
  },
});

export const listAirtableRecordsTool = createTool({
  name: "listAirtableRecords",
  description:
    "Retrieve Airtable records through VoltOps Actions. Supports standard Airtable filter, view, field, and sorting options.",
  parameters: z.object({
    view: optionalString.describe("Limit results to a specific Airtable view."),
    filterByFormula: optionalString.describe("Airtable formula to filter results."),
    maxRecords: z.number().int().positive().optional(),
    pageSize: z.number().int().positive().optional(),
    offset: optionalString.describe("Pagination offset from a previous call."),
    fields: z.array(z.string()).optional().describe("Return only the specified fields."),
    sort: sortSchema,
    returnFieldsByFieldId: optionalBoolean,
    baseId: stringIdentifier
      .describe("Override the default Airtable base ID for this call.")
      .optional(),
    tableId: stringIdentifier
      .describe("Override the default Airtable table ID for this call.")
      .optional(),
  }),
  outputSchema: z.object({
    actionId: z.string(),
    provider: z.string(),
    request: z.record(z.unknown()),
    response: z.unknown(),
    metadata: z.record(z.unknown()).nullable(),
  }),
  execute: async (input) => {
    const {
      view,
      filterByFormula,
      maxRecords,
      pageSize,
      offset,
      fields,
      sort,
      returnFieldsByFieldId,
      baseId,
      tableId,
    } = input;
    const effectiveBaseId = resolveBaseId(baseId);
    const effectiveTableId = resolveTableId(tableId);

    const result = await actionsClient.actions.airtable.listRecords({
      credential: actionsConfig.airtable.credential,
      baseId: effectiveBaseId,
      tableId: effectiveTableId,
      view,
      filterByFormula,
      maxRecords,
      pageSize,
      offset,
      fields,
      sort,
      returnFieldsByFieldId,
    });

    return wrapActionResult(result);
  },
});

export const updateAirtableRecordTool = createTool({
  name: "updateAirtableRecord",
  description:
    "Update an existing Airtable record via VoltOps Actions. Provide the record ID and any fields that should change.",
  parameters: z.object({
    recordId: recordIdSchema,
    fields: recordFieldsSchema.optional(),
    typecast: optionalBoolean,
    returnFieldsByFieldId: optionalBoolean,
    baseId: stringIdentifier
      .describe("Override the default Airtable base ID for this call.")
      .optional(),
    tableId: stringIdentifier
      .describe("Override the default Airtable table ID for this call.")
      .optional(),
  }),
  outputSchema: z.object({
    actionId: z.string(),
    provider: z.string(),
    request: z.record(z.unknown()),
    response: z.unknown(),
    metadata: z.record(z.unknown()).nullable(),
  }),
  execute: async (input) => {
    const { recordId, fields, typecast, returnFieldsByFieldId, baseId, tableId } = input;
    const effectiveBaseId = resolveBaseId(baseId);
    const effectiveTableId = resolveTableId(tableId);

    const result = await actionsClient.actions.airtable.updateRecord({
      credential: actionsConfig.airtable.credential,
      baseId: effectiveBaseId,
      tableId: effectiveTableId,
      recordId,
      fields,
      typecast,
      returnFieldsByFieldId,
    });

    return wrapActionResult(result);
  },
});

export const deleteAirtableRecordTool = createTool({
  name: "deleteAirtableRecord",
  description:
    "Delete an Airtable record by ID using VoltOps Actions. Be careful—this permanently removes the row.",
  parameters: z.object({
    recordId: recordIdSchema,
    baseId: stringIdentifier
      .describe("Override the default Airtable base ID for this call.")
      .optional(),
    tableId: stringIdentifier
      .describe("Override the default Airtable table ID for this call.")
      .optional(),
  }),
  outputSchema: z.object({
    actionId: z.string(),
    provider: z.string(),
    request: z.record(z.unknown()),
    response: z.unknown(),
    metadata: z.record(z.unknown()).nullable(),
  }),
  execute: async (input) => {
    const { recordId, baseId, tableId } = input;
    const effectiveBaseId = resolveBaseId(baseId);
    const effectiveTableId = resolveTableId(tableId);

    const result = await actionsClient.actions.airtable.deleteRecord({
      credential: actionsConfig.airtable.credential,
      baseId: effectiveBaseId,
      tableId: effectiveTableId,
      recordId,
    });

    return wrapActionResult(result);
  },
});

export const getAirtableRecordTool = createTool({
  name: "getAirtableRecord",
  description:
    "Fetch a single Airtable record by ID via VoltOps Actions. Supports returning fields keyed by ID.",
  parameters: z.object({
    recordId: recordIdSchema,
    returnFieldsByFieldId: optionalBoolean,
    baseId: stringIdentifier
      .describe("Override the default Airtable base ID for this call.")
      .optional(),
    tableId: stringIdentifier
      .describe("Override the default Airtable table ID for this call.")
      .optional(),
  }),
  outputSchema: z.object({
    actionId: z.string(),
    provider: z.string(),
    request: z.record(z.unknown()),
    response: z.unknown(),
    metadata: z.record(z.unknown()).nullable(),
  }),
  execute: async (input) => {
    const { recordId, returnFieldsByFieldId, baseId, tableId } = input;
    const effectiveBaseId = resolveBaseId(baseId);
    const effectiveTableId = resolveTableId(tableId);

    const result = await actionsClient.actions.airtable.getRecord({
      credential: actionsConfig.airtable.credential,
      baseId: effectiveBaseId,
      tableId: effectiveTableId,
      recordId,
      returnFieldsByFieldId,
    });

    return wrapActionResult(result);
  },
});
