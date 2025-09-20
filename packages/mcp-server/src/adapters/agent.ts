import type {
  CallToolResult,
  ElicitRequest,
  Tool as MCPTool,
} from "@modelcontextprotocol/sdk/types.js";
import type { Agent, GenerateTextOptions } from "@voltagent/core";
import { safeStringify } from "@voltagent/internal/utils";
import type { ElicitationRequestHandler } from "../constants";
import type { JsonSchemaObject } from "../utils/json-schema";

interface AgentCallArgs {
  prompt?: string;
  context?: Map<string | symbol, unknown> | Record<string, unknown>;
  conversationId?: string;
  userId?: string;
  maxSteps?: number;
}

function toMcpTool(agent: Agent, name: string): MCPTool {
  const purpose = typeof agent.purpose === "string" ? agent.purpose.trim() : undefined;
  const instructions =
    typeof agent.instructions === "string" ? agent.instructions.trim() : undefined;
  const description =
    purpose && purpose.length > 0
      ? purpose
      : instructions && instructions.length > 0
        ? instructions
        : `VoltAgent agent ${agent.name}`;

  const inputSchema = {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        description: "Primary prompt to send to the agent.",
      },
      context: {
        type: "object",
        description: "Optional context map forwarded to the agent execution.",
        additionalProperties: true,
      },
      conversationId: {
        type: "string",
        description: "Optional conversation identifier used for memory threading.",
      },
      userId: {
        type: "string",
        description: "Optional user identifier forwarded to VoltAgent for telemetry.",
      },
      maxSteps: {
        type: "number",
        description: "Override maximum tool steps for this invocation.",
      },
    },
    required: ["prompt"],
    additionalProperties: false,
  } satisfies JsonSchemaObject;

  return {
    name,
    title: agent.name,
    description,
    inputSchema: inputSchema as MCPTool["inputSchema"],
    annotations: {
      title: agent.name,
      agentId: agent.id,
      toolType: "agent",
    },
  };
}

async function executeAgent(
  agent: Agent,
  args: unknown,
  requestElicitation?: ElicitationRequestHandler,
): Promise<CallToolResult> {
  const parsed = parseArgs(args);
  if (!parsed.prompt) {
    throw new Error("Agent call requires a 'prompt' string argument");
  }

  const options: GenerateTextOptions = {
    conversationId: parsed.conversationId,
    userId: parsed.userId,
    maxSteps: parsed.maxSteps,
    context: parsed.context,
  };

  if (requestElicitation) {
    options.elicitation = (request: unknown) =>
      requestElicitation(request as ElicitRequest["params"]);
  }

  const result = await agent.generateText(parsed.prompt, options);
  const payload = {
    text: result.text,
    finishReason: result.finishReason,
    usage: result.usage,
  };

  return {
    content: [
      {
        type: "text",
        text: safeStringify(payload, { indentation: 2 }),
      },
    ],
  };
}

function toMcpResource(_agent: Agent) {
  throw new Error("AgentAdapter.toMCPResource is not implemented yet");
}

export const AgentAdapter = {
  toMCPTool: toMcpTool,
  executeAgent,
  toMCPResource: toMcpResource,
};

function parseArgs(args: unknown): AgentCallArgs {
  if (!args || typeof args !== "object") {
    return {};
  }

  const record = args as Record<string, unknown>;

  const prompt = typeof record.prompt === "string" ? record.prompt : undefined;
  const contextValue = record.context;
  const context =
    contextValue instanceof Map
      ? (contextValue as Map<string | symbol, unknown>)
      : typeof contextValue === "object" && contextValue !== null
        ? (contextValue as Record<string, unknown>)
        : undefined;
  const conversationId =
    typeof record.conversationId === "string" ? record.conversationId : undefined;
  const userId = typeof record.userId === "string" ? record.userId : undefined;
  const maxSteps =
    typeof record.maxSteps === "number" && Number.isFinite(record.maxSteps)
      ? record.maxSteps
      : undefined;

  return { prompt, context, conversationId, userId, maxSteps };
}
