import { convertUint8ArrayToBase64 } from "@ai-sdk/provider-utils";
import type { DataContent } from "ai";
import { isSubAgent } from "..";

/**
 * Converts data content to a base64-encoded string.
 *
 * NOTE: Original is copied from `@vercel/ai/packages/ai/core/prompt/data-content.ts`
 *
 * @param content - Data content to convert.
 * @returns Base64-encoded string.
 */
export function convertDataContentToBase64String(content: DataContent): string {
  if (typeof content === "string") {
    return content;
  }

  if (content instanceof ArrayBuffer) {
    return convertUint8ArrayToBase64(new Uint8Array(content));
  }

  return convertUint8ArrayToBase64(content);
}

/**
 * Build sub-agent data from the input.
 * @param input - The input to build sub-agent data from.
 * @returns The sub-agent data.
 */
export function buildSubAgentData(input: unknown): {
  subAgentId?: string;
  subAgentName?: string;
  subAgent: boolean;
} {
  if (!isSubAgent(input)) {
    return { subAgent: false };
  }

  return {
    subAgentId: input.subAgentId,
    subAgentName: input.subAgentName,
    subAgent: true,
  };
}
