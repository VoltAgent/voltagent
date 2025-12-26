import { safeStringify } from "@voltagent/internal";
import { z } from "zod";
import type { ToolExecuteOptions } from "../../agent/providers/base/types";
import { LogEvents } from "../../logger/events";
import {
  ActionType,
  ResourceType,
  buildLogContext,
  buildRetrieverLogMessage,
} from "../../logger/message-builder";
import { type AgentTool, createTool } from "../../tool";
import type { Retriever } from "../types";

/**
 * Creates an AgentTool from a retriever, allowing it to be used as a tool in an agent.
 * This is the preferred way to use a retriever as a tool, as it properly maintains the 'this' context.
 *
 * @param retriever - The retriever instance to convert to a tool
 * @param options - Options for customizing the tool
 * @returns An AgentTool that can be added to an agent's tools
 *
 * @example
 * ```typescript
 * const retriever = new SimpleRetriever();
 * const searchTool = createRetrieverTool(retriever, {
 *   name: "search_knowledge",
 *   description: "Searches the knowledge base for information"
 * });
 *
 * agent.addTool(searchTool);
 * ```
 */
export const createRetrieverTool = (
  retriever: Retriever,
  options: {
    name?: string;
    description?: string;
  } = {},
): AgentTool => {
  const toolName = options.name || "search_knowledge";
  const toolDescription =
    options.description ||
    "Searches for relevant information in the knowledge base based on the query.";

  return createTool({
    name: toolName,
    description: toolDescription,
    parameters: z.object({
      query: z.string().describe("The search query to find relevant information"),
    }),
    execute: async ({ query }, options?: ToolExecuteOptions) => {
      // Pass complete options to retriever for access to userId, conversationId, etc.
      const startTime = Date.now();
      const toolSpan = options?.systemContext?.get("parentToolSpan") as
        | { setAttribute?: (key: string, value: unknown) => void }
        | undefined;

      const normalizeAttributeValue = (value: unknown) => {
        if (value === null || value === undefined) return null;
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          return value;
        }
        if (
          Array.isArray(value) &&
          value.every((item) => ["string", "number", "boolean"].includes(typeof item))
        ) {
          return value;
        }
        return safeStringify(value);
      };

      const attachRetrieverAttributes = () => {
        if (!toolSpan?.setAttribute) return;
        const candidate = retriever as unknown as {
          getObservabilityAttributes?: () => Record<string, unknown>;
        };
        const baseAttributes =
          typeof candidate.getObservabilityAttributes === "function"
            ? candidate.getObservabilityAttributes()
            : {};
        Object.entries(baseAttributes).forEach(([key, value]) => {
          const normalized = normalizeAttributeValue(value);
          if (normalized === null) return;
          toolSpan?.setAttribute?.(key, normalized as any);
        });
      };

      options?.logger?.debug(
        buildRetrieverLogMessage(toolName, ActionType.START, "search started"),
        buildLogContext(ResourceType.RETRIEVER, toolName, ActionType.START, {
          event: LogEvents.RETRIEVER_SEARCH_STARTED,
          query,
        }),
      );

      try {
        const result = await retriever.retrieve(query, options ?? {});
        attachRetrieverAttributes();

        options?.logger?.debug(
          buildRetrieverLogMessage(toolName, ActionType.COMPLETE, "search completed"),
          buildLogContext(ResourceType.RETRIEVER, toolName, ActionType.COMPLETE, {
            event: LogEvents.RETRIEVER_SEARCH_COMPLETED,
            duration: Date.now() - startTime,
            result,
          }),
        );

        return result;
      } catch (error) {
        attachRetrieverAttributes();
        options?.logger?.error(
          buildRetrieverLogMessage(toolName, ActionType.ERROR, "search failed"),
          buildLogContext(ResourceType.RETRIEVER, toolName, ActionType.ERROR, {
            event: LogEvents.RETRIEVER_SEARCH_FAILED,
            query,
            error,
          }),
        );
        throw error;
      }
    },
  });
};
