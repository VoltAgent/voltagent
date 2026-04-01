import type { OperationContext } from "../agent/types";
import type { Logger } from "../logger";

/**
 * Options for configuring the Retriever
 */
export type RetrieverOptions = {
  /**
   * Name for the default tool created from this retriever
   * This is used for the pre-created 'tool' property
   * @default "search_knowledge"
   */
  toolName?: string;

  /**
   * Description for the default tool created from this retriever
   * This is used for the pre-created 'tool' property
   * @default "Searches for relevant information in the knowledge base based on the query."
   */
  toolDescription?: string;

  /**
   * Optional logger instance for the retriever
   * If not provided, a default logger will be created
   */
  logger?: Logger;

  /**
   * Additional configuration specific to concrete retriever implementations
   */
  [key: string]: any;
};

/**
 * Options passed to retrieve method.
 * Includes all operation context fields for user-specific and context-aware retrieval.
 */
export interface RetrieveOptions extends Partial<OperationContext> {
  /**
   * User-managed context map for this specific retrieval operation
   * Can be used to store metadata, results, or any custom data
   *
   * Inherited from OperationContext but explicitly documented here for clarity
   */
  context?: Map<string | symbol, unknown>;

  /**
   * Optional logger instance for this retrieval operation.
   * Provides execution-scoped logging with full context.
   * Available when retriever is called from an agent or workflow context.
   *
   * Inherited from OperationContext but explicitly documented here for clarity
   */
  logger?: Logger;

  /**
   * Optional user identifier for user-specific retrieval.
   * Can be used to filter results by user or implement multi-tenant retrieval.
   *
   * Inherited from OperationContext
   */
  userId?: string;

  /**
   * Optional conversation identifier for conversation-aware retrieval.
   * Can be used to retrieve conversation-specific context or history.
   *
   * Inherited from OperationContext
   */
  conversationId?: string;
}

/**
 * Retriever interface for retrieving relevant information
 */
export type Retriever = {
  /**
   * Retrieve relevant documents based on input text
   * @param text The text to use for retrieval
   * @param options Configuration and context for the retrieval
   * @returns Promise resolving to a string with the retrieved content
   */
  retrieve(text: string, options: RetrieveOptions): Promise<string>;

  /**
   * Configuration options for the retriever
   * This is optional and may not be present in all implementations
   */
  options?: RetrieverOptions;

  /**
   * Pre-created tool for easy destructuring
   * This is optional and may not be present in all implementations
   */
  tool?: any;

  /**
   * Optional observability attributes for retriever spans.
   */
  getObservabilityAttributes?: () => Record<string, unknown>;
};
