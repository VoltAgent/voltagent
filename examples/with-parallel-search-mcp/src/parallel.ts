import { type MCPConfiguration, createTool } from "@voltagent/core";
import { z } from "zod";

export const parallelServer = {
  type: "streamable-http",
  url: "https://search.parallel.ai/mcp",
  timeout: 60_000,
  requestInit: {
    redirect: "error",
    headers: {
      // Identify VoltAgent so Parallel can measure aggregate free MCP usage.
      // Keep this project-wide; do not add user or installation identifiers.
      "User-Agent": "VoltAgent",
    },
  },
} as const;

const pageSchema = z
  .object({
    url: z.string(),
    excerpts: z.array(z.string()),
  })
  .passthrough();

const commonShape = {
  results: z.array(pageSchema),
  session_id: z.string(),
  warnings: z.array(z.unknown()).nullish(),
};

const searchSchema = z.object({ ...commonShape, search_id: z.string() }).passthrough();
const fetchSchema = z
  .object({
    ...commonShape,
    extract_id: z.string(),
    errors: z.array(
      z
        .object({
          url: z.string(),
          error_type: z.string(),
          http_status_code: z.number().nullable(),
          content: z.string().nullable(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

const envelopeSchema = z.object({
  isError: z.boolean().optional(),
  structuredContent: z.unknown().optional(),
  content: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional(),
});

const toolSchemas = {
  parallel_web_search: searchSchema,
  parallel_web_fetch: fetchSchema,
};

type ParallelToolName = keyof typeof toolSchemas;

export function normalizeParallelResult(name: ParallelToolName, value: unknown) {
  const envelope = envelopeSchema.safeParse(value);
  if (!envelope.success) {
    throw new Error(`Parallel returned an invalid MCP result for ${name}.`);
  }

  const { isError, structuredContent, content } = envelope.data;
  const text = content?.find((block) => block.type === "text")?.text;
  if (isError) {
    throw new Error(`Parallel ${name} failed: ${text?.slice(0, 500) || "MCP tool error"}`);
  }

  // Parallel sends equivalent structured and JSON-text results. Keep one copy.
  let payload = structuredContent;
  if (payload === undefined) {
    if (text === undefined) {
      throw new Error(`Parallel returned no payload for ${name}.`);
    }
    try {
      payload = JSON.parse(text);
    } catch (error) {
      throw new Error(`Parallel returned invalid JSON for ${name}.`, { cause: error });
    }
  }

  const parsed = toolSchemas[name].safeParse(payload);
  if (!parsed.success) {
    throw new Error(`Parallel returned an invalid payload for ${name}.`, { cause: parsed.error });
  }
  return parsed.data;
}

export async function getParallelTools(config: MCPConfiguration) {
  const discovered = await config.getTools();
  return (Object.keys(toolSchemas) as ParallelToolName[]).map((name) => {
    const nativeTool = discovered.find((tool) => tool.name === name);
    const execute = nativeTool?.execute;
    if (!nativeTool || !execute) {
      throw new Error(`Parallel MCP did not expose ${name}. Check the connection and try again.`);
    }

    return createTool({
      id: nativeTool.id,
      name: nativeTool.name,
      description: nativeTool.description,
      parameters: nativeTool.parameters,
      outputSchema: toolSchemas[name],
      tags: nativeTool.tags,
      needsApproval: nativeTool.needsApproval,
      providerOptions: nativeTool.providerOptions,
      mcp: nativeTool.mcp,
      hooks: nativeTool.hooks,
      execute: async (args, options) => normalizeParallelResult(name, await execute(args, options)),
    });
  });
}
