import type { GroqTools } from "@/types";
import type { Groq } from "groq-sdk";

/**
 * Convert VoltAgent tools to Groq SDK format
 * @param tools Array of agent tools
 * @returns Object mapping tool names to their SDK implementations or undefined if no tools
 */
export const convertToolsForSDK = (tools: any[]): Groq.Chat.ChatCompletionTool[] | undefined => {
  if (!tools || tools.length === 0) {
    return undefined;
  }

  const toolsMap: GroqTools[] = [];

  for (const agentTool of tools) {
    // Wrap the tool with Vercel AI SDK's tool helper
    const sdkTool: GroqTools = {
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
