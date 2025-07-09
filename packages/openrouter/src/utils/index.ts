import type { OpenRouterTool } from "../types";

/**
 * Convert VoltAgent tools to OpenRouter format
 * @param tools Array of agent tools
 * @returns Array of OpenRouter tools or undefined if no tools
 */
export const convertToolsForSDK = (
  tools: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }[],
): OpenRouterTool[] | undefined => {
  if (!tools || tools.length === 0) {
    return undefined;
  }

  const toolsMap: OpenRouterTool[] = [];

  for (const agentTool of tools) {
    // Wrap the tool with OpenRouter's tool format
    const sdkTool: OpenRouterTool = {
      type: "function",
      function: {
        name: agentTool.name,
        description: agentTool.description,
        parameters: agentTool.parameters,
      },
    };

    toolsMap.push(sdkTool);
  }

  return toolsMap;
};
