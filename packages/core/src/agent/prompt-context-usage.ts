import { safeStringify } from "@voltagent/internal/utils";
import type { ToolSet } from "ai";
import { zodSchemaToJsonUI } from "../utils/toolParser";

const ESTIMATED_CHARS_PER_TOKEN = 4;
const BINARY_PART_TYPES = new Set([
  "audio",
  "file",
  "image",
  "input_audio",
  "input_image",
  "media",
]);
const LARGE_BINARY_KEYS = new Set(["audio", "base64", "bytes", "data", "image"]);

type PromptMessage = {
  role?: string;
  content?: unknown;
};

export interface PromptContextUsageEstimate {
  systemTokensEstimated: number;
  messageTokensEstimated: number;
  nonSystemMessageTokensEstimated: number;
  toolTokensEstimated: number;
  totalTokensEstimated: number;
  systemMessageCount: number;
  toolCount: number;
}

export function estimatePromptContextUsage(params: {
  messages?: PromptMessage[];
  tools?: ToolSet;
}): PromptContextUsageEstimate | undefined {
  let systemTokensEstimated = 0;
  let messageTokensEstimated = 0;
  let nonSystemMessageTokensEstimated = 0;
  let systemMessageCount = 0;

  for (const message of params.messages ?? []) {
    const serializedMessage = serializePromptMessage(message);
    if (!serializedMessage) {
      continue;
    }

    const estimatedTokens = estimateTokensFromText(serializedMessage);
    messageTokensEstimated += estimatedTokens;

    if (message.role === "system") {
      systemTokensEstimated += estimatedTokens;
      systemMessageCount += 1;
      continue;
    }

    nonSystemMessageTokensEstimated += estimatedTokens;
  }

  const serializedTools = Object.entries(params.tools ?? {}).map(([name, tool]) =>
    serializeToolDefinition(name, tool),
  );
  const toolTokensEstimated =
    serializedTools.length > 0 ? estimateTokensFromText(safeStringify(serializedTools)) : 0;
  const totalTokensEstimated = messageTokensEstimated + toolTokensEstimated;

  if (totalTokensEstimated === 0) {
    return undefined;
  }

  return {
    systemTokensEstimated,
    messageTokensEstimated,
    nonSystemMessageTokensEstimated,
    toolTokensEstimated,
    totalTokensEstimated,
    systemMessageCount,
    toolCount: serializedTools.length,
  };
}

export function promptContextUsageEstimateToAttributes(
  estimate: PromptContextUsageEstimate,
): Record<string, number> {
  return {
    "usage.prompt_context.system_tokens_estimated": estimate.systemTokensEstimated,
    "usage.prompt_context.message_tokens_estimated": estimate.messageTokensEstimated,
    "usage.prompt_context.non_system_message_tokens_estimated":
      estimate.nonSystemMessageTokensEstimated,
    "usage.prompt_context.tool_tokens_estimated": estimate.toolTokensEstimated,
    "usage.prompt_context.total_tokens_estimated": estimate.totalTokensEstimated,
    "usage.prompt_context.system_message_count": estimate.systemMessageCount,
    "usage.prompt_context.tool_count": estimate.toolCount,
  };
}

function estimateTokensFromText(text: string): number {
  if (!text) {
    return 0;
  }

  return Math.ceil(text.length / ESTIMATED_CHARS_PER_TOKEN);
}

function serializePromptMessage(message: PromptMessage): string {
  const content = serializePromptValue(message.content).trim();
  if (!content) {
    return "";
  }

  const role = typeof message.role === "string" ? message.role.toUpperCase() : "MESSAGE";
  return `${role}:\n${content}`;
}

function serializePromptValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => serializePromptValue(entry))
      .filter((entry) => entry.trim().length > 0)
      .join("\n");
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  const record = value as Record<string, unknown>;
  const type = typeof record.type === "string" ? record.type : undefined;

  if (typeof record.text === "string") {
    return record.text;
  }

  if (type && BINARY_PART_TYPES.has(type)) {
    return `[${type}]`;
  }

  if (type === "tool-call") {
    const toolName = typeof record.toolName === "string" ? record.toolName : "tool";
    const input = serializePromptValue(record.input);
    return input ? `tool-call ${toolName}: ${input}` : `tool-call ${toolName}`;
  }

  if (type === "tool-result") {
    const toolName = typeof record.toolName === "string" ? record.toolName : "tool";
    const output = serializePromptValue(record.output);
    return output ? `tool-result ${toolName}: ${output}` : `tool-result ${toolName}`;
  }

  if ("content" in record) {
    const nestedContent = serializePromptValue(record.content);
    if (nestedContent) {
      return nestedContent;
    }
  }

  return safeStringify(sanitizeRecord(record));
}

function sanitizeRecord(record: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    sanitized[key] = LARGE_BINARY_KEYS.has(key) ? "[omitted]" : value;
  }

  return sanitized;
}

function serializeToolDefinition(name: string, tool: unknown): Record<string, unknown> {
  if (!tool || typeof tool !== "object") {
    return { name };
  }

  const candidate = tool as Record<string, unknown>;

  return {
    name,
    ...(typeof candidate.type === "string" ? { type: candidate.type } : {}),
    ...(typeof candidate.id === "string" ? { id: candidate.id } : {}),
    ...(typeof candidate.description === "string" ? { description: candidate.description } : {}),
    ...(candidate.inputSchema || candidate.parameters || candidate.input_schema || candidate.schema
      ? {
          inputSchema: normalizeSchema(
            candidate.inputSchema ??
              candidate.parameters ??
              candidate.input_schema ??
              candidate.schema,
          ),
        }
      : {}),
    ...(candidate.outputSchema || candidate.output_schema
      ? {
          outputSchema: normalizeSchema(candidate.outputSchema ?? candidate.output_schema),
        }
      : {}),
    ...(candidate.providerOptions ? { providerOptions: candidate.providerOptions } : {}),
    ...(candidate.args ? { args: sanitizeRecord(candidate.args as Record<string, unknown>) } : {}),
    ...(candidate.needsApproval !== undefined ? { needsApproval: candidate.needsApproval } : {}),
  };
}

function normalizeSchema(schema: unknown): unknown {
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  try {
    if ("_def" in (schema as Record<string, unknown>)) {
      return zodSchemaToJsonUI(schema);
    }
  } catch (_error) {
    return schema;
  }

  return schema;
}
