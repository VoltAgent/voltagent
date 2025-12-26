import { type Tool, zodSchemaToJsonUI } from "@voltagent/core";
import type { ServerProviderDeps } from "@voltagent/core";
import { type Logger, safeStringify } from "@voltagent/internal";
import type { ApiResponse } from "../types";

type ToolMetadata = {
  id?: string;
  name: string;
  description?: string;
  parameters?: any;
  status?: string;
  agents?: Array<{
    id: string;
    name?: string;
  }>;
  tags?: string[];
};

type AgentWithTools = {
  id: string;
  name?: string;
  getTools: () => Tool[];
};

function findTool(
  deps: ServerProviderDeps,
  toolName: string,
): { tool: Tool; agent: AgentWithTools } | undefined {
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
  const candidate = tool as { tags?: unknown };
  if (!candidate || !Array.isArray(candidate.tags)) {
    return undefined;
  }

  const normalized = candidate.tags
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  return normalized.length > 0 ? normalized : undefined;
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
        if (!tool?.execute) {
          continue;
        }

        const parameters =
          tool.parameters && typeof tool.parameters === "object"
            ? zodSchemaToJsonUI(tool.parameters)
            : undefined;

        const tags = extractToolTags(tool);

        const existing = toolsByName.get(tool.name);
        const agentEntry = { id: agent.id, name: agent.name };

        if (existing) {
          const alreadyAdded = existing.agents?.some((a) => a.id === agentEntry.id);
          if (!alreadyAdded) {
            existing.agents = [...(existing.agents ?? []), agentEntry];
          }
          if (tags && tags.length > 0) {
            const merged = new Set([...(existing.tags ?? []), ...tags]);
            existing.tags = Array.from(merged);
          }
        } else {
          toolsByName.set(tool.name, {
            id: tool.id,
            name: tool.name,
            description: tool.description,
            parameters,
            status: "ready",
            agents: [agentEntry],
            tags,
          });
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

  const lookup = findTool(deps, toolName);
  if (!lookup) {
    return {
      success: false,
      error: `Tool ${toolName} not found`,
      httpStatus: 404,
    };
  }

  const { tool, agent } = lookup;

  if (!tool.execute) {
    return {
      success: false,
      error: `Tool ${toolName} cannot be executed on the server`,
      httpStatus: 400,
    };
  }

  // Validate input using Zod if available
  let parsedInput = input;
  if (tool.parameters && isZodLikeSchema(tool.parameters)) {
    const parsed = tool.parameters.safeParse(input ?? {});
    if (!parsed.success) {
      return {
        success: false,
        error: `Invalid tool input: ${safeStringify(parsed.error.format ? parsed.error.format() : (parsed.error.issues ?? parsed.error))}`,
        httpStatus: 400,
      };
    }
    parsedInput = parsed.data;
  }

  const executionStart = Date.now();
  const abortController = new AbortController();

  try {
    const userId = context?.userId ?? body?.userId;
    const conversationId = context?.conversationId ?? body?.conversationId;

    // Build a minimal execution context for tools
    const result = await tool.execute(parsedInput, {
      userId,
      conversationId,
      context: new Map(
        context && typeof context === "object"
          ? Object.entries(context as Record<string, unknown>)
          : [],
      ),
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
