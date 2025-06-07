import type { BaseMessage } from "../agent/providers";
import type { AgentTool } from "../tool";
import { createRetrieverTool } from "./tools";
import type { Retriever, RetrieverOptions } from "./types";

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

    // Create the bound tool property during initialization with proper fallbacks
    // This ensures the tool always maintains its 'this' context
    const toolParams = {
      name: this.options.toolName || "search_knowledge",
      description:
        this.options.toolDescription ||
        "Searches for relevant information in the knowledge base based on the query.",
    };

    // Safely create tool with type assertion to ensure compatibility
    this.tool = createRetrieverTool(this as unknown as Retriever, toolParams);

    // Explicitly bind all methods to 'this' to support destructuring
    if (this.retrieve) {
      const originalRetrieve = this.retrieve;
      this.retrieve = (input: string | BaseMessage[]) => {
        return originalRetrieve.call(this, input);
      };
    }
  }

  /**
   * Retrieve information based on input.
   * This method must be implemented by all concrete subclasses.
   *
   * @param input - The input to base the retrieval on, can be string or BaseMessage array
   * @returns A Promise that resolves to a formatted context string
   */
  abstract retrieve(input: string | BaseMessage[]): Promise<string>;
}
