import {
  type NamedAiSdkTool,
  type ProviderTool,
  type Tool,
  getVoltAgentToolMetadata,
  zodSchemaToJsonUI,
} from "@voltagent/core";
import type { ServerProviderDeps } from "@voltagent/core";
import { type Logger, safeStringify } from "@voltagent/internal";
import type { ApiResponse } from "../types";

type ToolMetadata = {
  id?: string;
  name: string;
  displayName?: string;
  purpose?: string;
  description?: string;
  parameters?: any;
  status?: string;
  metadata?: Record<string, unknown>;
  agents?: Array<{
    id: string;
    name?: string;
  }>;
  tags?: string[];
};

type ToolAgentEntry = NonNullable<ToolMetadata["agents"]>[number];
type ListableTool = Tool | NamedAiSdkTool | ProviderTool;

type AgentWithTools = {
  id: string;
  name?: string;
  getTools: () => ListableTool[];
};

function findTool(
  deps: ServerProviderDeps,
  toolName: string,
): { tool: ListableTool; agent: AgentWithTools } | undefined {
  const agents = deps.agentRegistry.getAllAgents();

  for (const agent of agents) {
    const tool = agent.getTools().find((t) => t.name === toolName);
    if (tool) {
      return { tool, agent: agent as AgentWithTools };
    }
  }

  return undefined;
}

function generateId() {
  const cryptoApi =
    typeof globalThis !== "undefined" && "crypto" in globalThis
      ? (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
      : undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

const isZodLikeSchema = (
  value: unknown,
): value is {
  safeParse: (input: unknown) => { success: boolean; data?: unknown; error?: unknown };
} =>
  Boolean(
    value &&
      typeof value === "object" &&
      "safeParse" in value &&
      typeof (value as { safeParse: unknown }).safeParse === "function",
  );

const extractToolTags = (tool: unknown): string[] | undefined => {
  const metadata = getVoltAgentToolMetadata(tool);
  const rawTags = Array.isArray(metadata?.tags)
    ? metadata.tags
    : (tool as { tags?: unknown } | undefined)?.tags;
  if (!Array.isArray(rawTags)) {
    return undefined;
  }

  const normalized = rawTags
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  return normalized.length > 0 ? normalized : undefined;
};

const getMetadataString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const getExistingVoltAgentMetadata = (tool: unknown): Record<string, unknown> => {
  const existingMetadata =
    tool && typeof tool === "object"
      ? (tool as { metadata?: { voltagent?: unknown } }).metadata
      : undefined;
  const existingVoltAgentMetadata = existingMetadata?.voltagent;
  return existingVoltAgentMetadata && typeof existingVoltAgentMetadata === "object"
    ? (existingVoltAgentMetadata as Record<string, unknown>)
    : {};
};

const createToolMetadataPayload = (tool: unknown): Record<string, unknown> | undefined => {
  const metadata = getVoltAgentToolMetadata(tool);
  const displayName = getMetadataString(metadata?.name);
  const purpose = getMetadataString(metadata?.purpose);
  const tags = extractToolTags(tool);
  const userMetadata =
    metadata?.metadata && typeof metadata.metadata === "object" ? metadata.metadata : undefined;
  const api = metadata?.api && typeof metadata.api === "object" ? metadata.api : undefined;
  const voltagent = {
    ...getExistingVoltAgentMetadata(tool),
    ...(displayName ? { name: displayName } : {}),
    ...(purpose ? { purpose } : {}),
    ...(tags ? { tags } : {}),
    ...(userMetadata ? { metadata: userMetadata } : {}),
    ...(api ? { api } : {}),
  };

  if (Object.keys(voltagent).length === 0) {
    return undefined;
  }

  return {
    ...((tool as { metadata?: Record<string, unknown> } | undefined)?.metadata ?? {}),
    voltagent,
  };
};

const mergeToolMetadata = (
  existing: ToolMetadata,
  update: {
    agent: ToolAgentEntry;
    displayName?: string;
    purpose?: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
  },
): void => {
  const alreadyAdded = existing.agents?.some((agent) => agent.id === update.agent.id);
  if (!alreadyAdded) {
    existing.agents = [...(existing.agents ?? []), update.agent];
  }

  if (update.tags && update.tags.length > 0) {
    const merged = new Set([...(existing.tags ?? []), ...update.tags]);
    existing.tags = Array.from(merged);
  }

  existing.displayName ??= update.displayName;
  existing.purpose ??= update.purpose;
  existing.metadata ??= update.metadata;
};

const createToolListEntry = (
  tool: ListableTool,
  agent: ToolAgentEntry,
  parameters: unknown,
): ToolMetadata => {
  const tags = extractToolTags(tool);
  const metadata = getVoltAgentToolMetadata(tool);
  const displayName = getMetadataString(metadata?.name);
  const purpose = getMetadataString(metadata?.purpose);
  const toolMetadata = createToolMetadataPayload(tool);

  return {
    id: tool.id,
    name: tool.name,
    ...(displayName ? { displayName } : {}),
    ...(purpose ? { purpose } : {}),
    description: tool.description,
    parameters,
    status: "ready",
    ...(toolMetadata ? { metadata: toolMetadata } : {}),
    agents: [agent],
    tags,
  };
};

const getToolParameters = (tool: ListableTool): unknown => {
  return "parameters" in tool ? tool.parameters : undefined;
};

const getToolExecute = (
  tool: ListableTool,
):
  | ((input: unknown, options: Record<string, unknown>) => Promise<unknown> | unknown)
  | undefined => {
  return "execute" in tool && typeof tool.execute === "function"
    ? (tool.execute as (
        input: unknown,
        options: Record<string, unknown>,
      ) => Promise<unknown> | unknown)
    : undefined;
};

export async function handleListTools(
  deps: ServerProviderDeps,
  logger: Logger,
): Promise<ApiResponse<ToolMetadata[]>> {
  try {
    const toolsByName: Map<string, ToolMetadata> = new Map();
    const agents = deps.agentRegistry.getAllAgents();

    for (const agent of agents) {
      const agentTools = agent.getTools();

      for (const tool of agentTools) {
        // Only expose tools that can run server-side
        if (!getToolExecute(tool)) {
          continue;
        }

        const toolParameters = getToolParameters(tool);
        const parameters =
          toolParameters && typeof toolParameters === "object"
            ? zodSchemaToJsonUI(toolParameters)
            : undefined;

        const existing = toolsByName.get(tool.name);
        const agentEntry = { id: agent.id, name: agent.name };

        if (existing) {
          const metadata = getVoltAgentToolMetadata(tool);
          mergeToolMetadata(existing, {
            agent: agentEntry,
            displayName: getMetadataString(metadata?.name),
            purpose: getMetadataString(metadata?.purpose),
            metadata: createToolMetadataPayload(tool),
            tags: extractToolTags(tool),
          });
        } else {
          toolsByName.set(tool.name, createToolListEntry(tool, agentEntry, parameters));
        }
      }
    }

    return {
      success: true,
      data: Array.from(toolsByName.values()),
    };
  } catch (error) {
    logger.error("Failed to list tools", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      httpStatus: 500,
    };
  }
}

export async function handleExecuteTool(
  toolName: string,
  body: any,
  deps: ServerProviderDeps,
  logger: Logger,
): Promise<ApiResponse> {
  const { input, context } = body || {};
  const contextMap =
    context instanceof Map
      ? context
      : context && typeof context === "object"
        ? new Map(Object.entries(context as Record<string, unknown>))
        : new Map<string | symbol, unknown>();

  const lookup = findTool(deps, toolName);
  if (!lookup) {
    return {
      success: false,
      error: `Tool ${toolName} not found`,
      httpStatus: 404,
    };
  }

  const { tool, agent } = lookup;

  const execute = getToolExecute(tool);
  if (!execute) {
    return {
      success: false,
      error: `Tool ${toolName} cannot be executed on the server`,
      httpStatus: 400,
    };
  }

  // Validate input using Zod if available
  let parsedInput = input;
  const toolParameters = getToolParameters(tool);
  if (toolParameters && isZodLikeSchema(toolParameters)) {
    const parsed = toolParameters.safeParse(input ?? {});
    if (!parsed.success) {
      const parseError = parsed.error as { format?: () => unknown; issues?: unknown };
      return {
        success: false,
        error: `Invalid tool input: ${safeStringify(parseError.format ? parseError.format() : (parseError.issues ?? parseError))}`,
        httpStatus: 400,
      };
    }
    parsedInput = parsed.data;
  }

  const executionStart = Date.now();
  const abortController = new AbortController();

  try {
    const userId =
      (context instanceof Map ? context.get("userId") : context?.userId) ?? body?.userId;
    const conversationId =
      (context instanceof Map ? context.get("conversationId") : context?.conversationId) ??
      body?.conversationId;

    // Build a minimal execution context for tools
    const result = await execute(parsedInput, {
      userId,
      conversationId,
      context: contextMap,
      systemContext: new Map(),
      abortController,
      toolContext: {
        name: tool.name,
        callId: generateId(),
        messages: [],
        abortSignal: abortController.signal,
      },
      logger,
    });

    const executionTime = Date.now() - executionStart;

    return {
      success: true,
      data: {
        toolName: tool.name,
        result,
        executionTime,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    logger.error("Failed to execute tool", {
      tool: toolName,
      agentId: agent.id,
      error: error instanceof Error ? error.message : safeStringify(error),
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      httpStatus: 500,
    };
  }
}
