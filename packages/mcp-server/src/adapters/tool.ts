import { randomUUID } from "node:crypto";
import type { CallToolResult, Tool as MCPTool } from "@modelcontextprotocol/sdk/types.js";
import type { OperationContext, Tool } from "@voltagent/core";
import { safeStringify } from "@voltagent/internal/utils";
import { type ElicitationRequestHandler, createStubOperationContext } from "../constants";
import { toJsonSchema } from "../utils/json-schema";

interface ExecuteToolOptions {
  requestElicitation?: ElicitationRequestHandler;
}

async function requiresApproval(tool: Tool, args: Record<string, unknown>): Promise<boolean> {
  if (typeof tool.needsApproval !== "function") return tool.needsApproval === true;
  return Boolean(
    await tool.needsApproval(args, {
      toolCallId: `mcp-${randomUUID()}`,
      messages: [],
      experimental_context: undefined,
    }),
  );
}

async function requestApproval(
  tool: Tool,
  requestElicitation: ElicitationRequestHandler | undefined,
): Promise<void> {
  if (!requestElicitation) {
    throw new Error(`Tool ${tool.name} requires approval, but MCP elicitation is unavailable`);
  }
  const response = await requestElicitation({
    mode: "form",
    message: `Approve execution of the approval-gated tool ${tool.name}? Review its arguments in your MCP client before confirming.`,
    requestedSchema: {
      type: "object",
      properties: {
        approved: {
          type: "boolean",
          title: "Approve this tool execution",
          description: "Confirm only after reviewing the exact tool arguments.",
          default: false,
        },
      },
      required: ["approved"],
    },
  });
  if (response.action !== "accept" || response.content?.approved !== true) {
    throw new Error(`Tool ${tool.name} was not approved`);
  }
}

function toMcpTool(tool: Tool, name: string, title?: string): MCPTool {
  const inputSchema = toJsonSchema(tool.parameters) as MCPTool["inputSchema"];
  const outputSchema = tool.outputSchema
    ? (toJsonSchema(tool.outputSchema) as MCPTool["outputSchema"])
    : undefined;

  return {
    name,
    title,
    description: tool.description,
    inputSchema,
    outputSchema,
    annotations: {
      title: title ?? tool.name,
      ...tool.mcp?.annotations,
    },
    _meta: {
      ...tool.mcp?._meta,
      toolId: tool.id,
      toolType: "tool",
    },
  };
}

async function executeTool(
  tool: Tool,
  args: unknown,
  options?: ExecuteToolOptions,
): Promise<CallToolResult> {
  if (!tool.execute) {
    throw new Error(`Tool ${tool.name} does not have "execute" method`);
  }
  const parsedArgs = args as Record<string, unknown>;
  if (await requiresApproval(tool, parsedArgs)) {
    await requestApproval(tool, options?.requestElicitation);
  }

  let operationContext: OperationContext | undefined;

  if (options?.requestElicitation) {
    operationContext = createStubOperationContext(options.requestElicitation);
  }

  const result = await tool.execute(parsedArgs, operationContext);
  const text = typeof result === "string" ? result : safeStringify(result, { indentation: 2 });

  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
  };
}

export const ToolAdapter = {
  toMCPTool: toMcpTool,
  executeTool,
};
