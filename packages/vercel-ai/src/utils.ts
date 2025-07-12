import type { BaseTool } from "@voltagent/core";
import { tool } from "ai";

/**
 * Convert VoltAgent tools to Vercel AI SDK format
 * @param tools Array of agent tools
 * @returns Object mapping tool names to their SDK implementations or undefined if no tools
 */
export function convertToolsForSDK(tools: BaseTool[]): Record<string, any> | undefined {
  if (!tools || tools.length === 0) {
    return undefined;
  }

  const toolsMap: Record<string, any> = {};

  for (const agentTool of tools) {
    // Wrap the tool with Vercel AI SDK's tool helper
    const sdkTool = tool({
      description: agentTool.description,
      parameters: agentTool.parameters,
      execute: agentTool.execute,
    });

    toolsMap[agentTool.name] = sdkTool;
  }

  return toolsMap;
}
