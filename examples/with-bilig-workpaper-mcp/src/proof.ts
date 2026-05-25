import { safeStringify } from "@voltagent/internal/utils";
import { biligWorkPaperPackage, createBiligWorkPaperMcpConfig } from "./mcp.js";

type JsonRecord = Record<string, unknown>;
type ExecutableTool = {
  name: string;
  execute?: (args: JsonRecord) => Promise<unknown> | unknown;
};

const expectedToolSuffixes = [
  "list_sheets",
  "read_range",
  "read_cell",
  "set_cell_contents",
  "get_cell_display_value",
  "export_workpaper_document",
  "validate_formula",
];

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): JsonRecord {
  if (isRecord(value)) {
    return value;
  }

  throw new Error(`${label} was not an object: ${safeStringify(value)}`);
}

function requireNumber(value: unknown, label: string): number {
  if (typeof value === "number") {
    return value;
  }

  throw new Error(`${label} was not a number: ${safeStringify(value)}`);
}

function requireString(value: unknown, label: string): string {
  if (typeof value === "string") {
    return value;
  }

  throw new Error(`${label} was not a string: ${safeStringify(value)}`);
}

function requireBoolean(value: unknown, label: string): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  throw new Error(`${label} was not a boolean: ${safeStringify(value)}`);
}

function toolSuffix(toolName: string): string {
  const prefix = "bilig_";
  return toolName.startsWith(prefix) ? toolName.slice(prefix.length) : toolName;
}

function findTool(tools: readonly ExecutableTool[], suffix: string): ExecutableTool {
  const tool = tools.find((candidate) => toolSuffix(candidate.name) === suffix);
  if (!tool || typeof tool.execute !== "function") {
    throw new Error(`Missing executable Bilig MCP tool: ${suffix}`);
  }

  return tool;
}

function parseToolText(text: string, label: string): JsonRecord {
  try {
    return requireRecord(JSON.parse(text), `${label} text payload`);
  } catch (error) {
    throw new Error(
      `${label} did not contain JSON tool output: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function structuredContent(value: unknown, label: string): JsonRecord {
  const result = requireRecord(value, label);
  const direct = result.structuredContent;

  if (isRecord(direct)) {
    return direct;
  }

  const content = result.content;
  if (Array.isArray(content)) {
    const textPart = content.find((part) => isRecord(part) && typeof part.text === "string");
    if (isRecord(textPart) && typeof textPart.text === "string") {
      return parseToolText(textPart.text, label);
    }
  }

  throw new Error(`${label} missing structured MCP output: ${safeStringify(result)}`);
}

async function callTool(
  tools: readonly ExecutableTool[],
  suffix: string,
  args: JsonRecord,
): Promise<JsonRecord> {
  const tool = findTool(tools, suffix);
  const execute = tool.execute;
  if (typeof execute !== "function") {
    throw new Error(`Missing executable Bilig MCP tool: ${suffix}`);
  }

  return structuredContent(await execute(args), suffix);
}

function cellValue(cell: JsonRecord, label: string): number {
  if (typeof cell.value === "number") {
    return cell.value;
  }

  const taggedValue = requireRecord(cell.value, `${label}.value`);
  return requireNumber(taggedValue.value, `${label}.value.value`);
}

async function runProof() {
  const mcpConfig = createBiligWorkPaperMcpConfig();
  let tools: ExecutableTool[] = [];
  let afterValue = 0;

  try {
    tools = (await mcpConfig.getTools()) as ExecutableTool[];
    const discoveredSuffixes = tools.map((tool) => toolSuffix(tool.name)).sort();
    const missingTools = expectedToolSuffixes.filter(
      (suffix) => !discoveredSuffixes.includes(suffix),
    );
    if (missingTools.length > 0) {
      throw new Error(`Bilig MCP tools missing: ${missingTools.join(", ")}`);
    }

    const sheets = await callTool(tools, "list_sheets", {});
    const sheetList = sheets.sheets;
    if (!Array.isArray(sheetList) || sheetList.length < 2) {
      throw new Error(`Expected demo WorkPaper sheets, received: ${safeStringify(sheetList)}`);
    }
    requireBoolean(sheets.writable, "list_sheets.writable");

    const before = await callTool(tools, "read_cell", {
      sheetName: "Summary",
      address: "B3",
    });
    const beforeValue = cellValue(before, "before");

    const validation = await callTool(tools, "validate_formula", {
      formula: "=SUM(1,2)",
    });
    if (validation.valid !== true) {
      throw new Error(`Formula validation failed: ${safeStringify(validation)}`);
    }

    const write = await callTool(tools, "set_cell_contents", {
      sheetName: "Inputs",
      address: "B3",
      value: 0.4,
    });
    const checks = requireRecord(write.checks, "set_cell_contents.checks");
    const persistence = requireRecord(write.persistence, "set_cell_contents.persistence");
    if (write.editedCell !== "Inputs!B3") {
      throw new Error(`Unexpected edited cell: ${safeStringify(write.editedCell)}`);
    }
    if (checks.persisted !== true || checks.restoredMatchesAfter !== true) {
      throw new Error(`Write did not persist and restore cleanly: ${safeStringify(checks)}`);
    }
    if (
      persistence.persisted !== true ||
      requireNumber(persistence.serializedBytes, "serializedBytes") <= 0
    ) {
      throw new Error(`Persistence proof failed: ${safeStringify(persistence)}`);
    }

    const after = await callTool(tools, "read_cell", {
      sheetName: "Summary",
      address: "B3",
    });
    afterValue = cellValue(after, "after");

    const display = await callTool(tools, "get_cell_display_value", {
      sheetName: "Summary",
      address: "B3",
    });
    const displayValue = requireString(display.displayValue, "display.displayValue");

    const exported = await callTool(tools, "export_workpaper_document", {
      includeConfig: true,
    });
    const exportedBytes = requireNumber(exported.serializedBytes, "exported.serializedBytes");

    if (
      beforeValue !== 60000 ||
      afterValue !== 96000 ||
      displayValue !== "96000" ||
      exportedBytes <= 0
    ) {
      throw new Error(
        `Unexpected WorkPaper proof values: ${safeStringify({
          beforeValue,
          afterValue,
          displayValue,
          exportedBytes,
        })}`,
      );
    }
  } finally {
    await mcpConfig.disconnect();
  }

  const restartedConfig = createBiligWorkPaperMcpConfig();
  try {
    const restartedTools = (await restartedConfig.getTools()) as ExecutableTool[];
    const restarted = await callTool(restartedTools, "read_cell", {
      sheetName: "Summary",
      address: "B3",
    });
    const restartedValue = cellValue(restarted, "restarted");
    if (restartedValue !== afterValue) {
      throw new Error(
        `Restarted readback did not match recalculated value: ${safeStringify({
          afterValue,
          restartedValue,
        })}`,
      );
    }

    console.log(
      safeStringify(
        {
          ok: true,
          package: biligWorkPaperPackage,
          discoveredTools: tools.map((tool) => tool.name).sort(),
          recalculated: {
            summaryB3: restartedValue,
          },
          persisted: true,
        },
        { indentation: 2 },
      ),
    );
  } finally {
    await restartedConfig.disconnect();
  }
}

runProof().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : safeStringify(error));
  process.exitCode = 1;
});
