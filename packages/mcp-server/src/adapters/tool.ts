import type { CallToolResult, Tool as MCPTool } from "@modelcontextprotocol/sdk/types.js";
import type { OperationContext, Tool } from "@voltagent/core";
import { safeStringify } from "@voltagent/internal/utils";
import { type ElicitationRequestHandler, createStubOperationContext } from "../constants";
import { toJsonSchema } from "../utils/json-schema";

interface ExecuteToolOptions {
  requestElicitation?: ElicitationRequestHandler;
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
  let operationContext: OperationContext | undefined;

  if (options?.requestElicitation) {
    operationContext = createStubOperationContext(options.requestElicitation);
  }

  if (!tool.execute) {
    throw new Error(`Tool ${tool.name} does not have "execute" method`);
  }
  const result = await tool.execute(args as Record<string, unknown>, operationContext);
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
