import { z } from "zod";
import { type AgentTool, createTool } from "../../tool";
import type { ToolExecuteOptions } from "../../agent/providers";
import type { Retriever } from "../types";
import { LogEvents } from "../../logger/events";
import {
  buildRetrieverLogMessage,
  ActionType,
  buildLogContext,
  ResourceType,
} from "../../logger/message-builder";

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
    execute: async ({ query }, executeOptions?: ToolExecuteOptions) => {
      // Extract userContext and logger from tool execution context
      const userContext = executeOptions?.operationContext?.userContext;
      const logger = executeOptions?.operationContext?.logger;
      const startTime = Date.now();

      logger?.debug(
        buildRetrieverLogMessage(toolName, ActionType.START, "search started"),
        buildLogContext(ResourceType.RETRIEVER, toolName, ActionType.START, {
          event: LogEvents.RETRIEVER_SEARCH_STARTED,
          query,
        }),
      );

      try {
        const result = await retriever.retrieve(query, {
          userContext,
          logger,
        });

        logger?.debug(
          buildRetrieverLogMessage(toolName, ActionType.COMPLETE, "search completed"),
          buildLogContext(ResourceType.RETRIEVER, toolName, ActionType.COMPLETE, {
            event: LogEvents.RETRIEVER_SEARCH_COMPLETED,
            duration: Date.now() - startTime,
            result,
          }),
        );

        return result;
      } catch (error) {
        logger?.error(
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
