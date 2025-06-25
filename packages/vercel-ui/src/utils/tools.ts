/**
 * Remove the agent prefix from the tool name
 * @param toolName - The tool name to remove the agent prefix from
 * @returns The tool name without the agent prefix
 */
export function removeAgentPrefix(toolName: string): string {
  return toolName.replace(/^[a-zA-Z0-9_-]+:/, "").trim();
}
