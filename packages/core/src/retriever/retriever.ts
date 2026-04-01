import type { BaseMessage } from "../agent/providers";
import { type Logger, getGlobalLogger } from "../logger";
import { LogEvents } from "../logger/events";
import { ResourceType, buildLogContext, buildRetrieverLogMessage } from "../logger/message-builder";
import type { AgentTool } from "../tool";
import { createRetrieverTool } from "./tools";
import type { RetrieveOptions, Retriever, RetrieverOptions } from "./types";

/**
 * Abstract base class for Retriever implementations.
 * This class provides a common structure for different types of retrievers.
 */
export abstract class BaseRetriever {
  /**
   * Options that configure the retriever's behavior
   */
  protected options: RetrieverOptions;

  /**
   * Logger instance for the retriever
   */
  protected logger: Logger;

  /**
   * Ready-to-use tool property for direct destructuring
   * This can be used with object destructuring syntax
   *
   * @example
   * ```typescript
   * // ✅ You can use destructuring with the tool property
   * const { tool } = new SimpleRetriever();
   *
   * // And use it directly in an agent
   * const agent = new Agent({
   *   name: "RAG Agent",
   *   model: "gpt-4",
   *   provider,
   *   tools: [tool],
   * });
   * ```
   */
  readonly tool: AgentTool;

  /**
   * Constructor for the BaseRetriever class.
   * @param options - Configuration options for the retriever.
   */
  constructor(options: RetrieverOptions = {}) {
    this.options = {
      ...options,
    };

    // Initialize logger
    this.logger = this.options.logger || getGlobalLogger().child({ component: "retriever" });

    // Log initialization
    const retrieverName = this.options.toolName || "search_knowledge";
    this.logger.debug(
      buildRetrieverLogMessage(retrieverName, "initialized", "retriever instance created"),
      buildLogContext(ResourceType.RETRIEVER, retrieverName, "initialized", {
        event: LogEvents.RETRIEVER_INITIALIZED,
      }),
    );

    // Create the bound tool property during initialization with proper fallbacks
    // This ensures the tool always maintains its 'this' context
    const toolParams = {
      name: retrieverName,
      description:
        this.options.toolDescription ||
        "Searches for relevant information in the knowledge base based on the query.",
    };

    // Safely create tool with type assertion to ensure compatibility
    this.tool = createRetrieverTool(this as unknown as Retriever, toolParams);

    // Explicitly bind all methods to 'this' to support destructuring
    if (this.retrieve) {
      const originalRetrieve = this.retrieve.bind(this);
      this.retrieve = originalRetrieve as any;
    }
  }

  /**
   * Abstract method that must be implemented by concrete retriever classes.
   * Retrieves relevant information based on the input text or messages.
   *
   * @param input - The input to use for retrieval (string or BaseMessage array)
   * @param options - Configuration and context for the retrieval
   * @returns Promise resolving to a string with the retrieved content
   */
  abstract retrieve(input: string | BaseMessage[], options: RetrieveOptions): Promise<string>;

  /**
   * Optional observability attributes for retriever spans.
   * Override in subclasses to add context (e.g. knowledge base metadata).
   */
  getObservabilityAttributes(): Record<string, unknown> {
    return {};
  }
}
