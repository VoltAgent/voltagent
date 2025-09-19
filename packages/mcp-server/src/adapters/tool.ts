import type { CallToolResult, Tool as MCPTool } from "@modelcontextprotocol/sdk/types.js";
import type { Tool } from "@voltagent/core";
import { safeStringify } from "@voltagent/internal/utils";
import { toJsonSchema } from "../utils/json-schema";

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

async function executeTool(tool: Tool, args: unknown): Promise<CallToolResult> {
  const result = await tool.execute(args as Record<string, unknown>);
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
