import { hasKey, isPlainObject } from "@voltagent/internal/utils";

/**
 * Check if an object has the subAgentId and subAgentName properties identifying it as a sub-agent.
 * @param input - The object to check.
 * @returns True if the object has the subAgentId and subAgentName properties, false otherwise.
 */
export function isSubAgent(input: unknown): input is {
  subAgentId: string;
  subAgentName: string;
} {
  return isPlainObject(input) && hasKey(input, "subAgentId") && hasKey(input, "subAgentName");
}
