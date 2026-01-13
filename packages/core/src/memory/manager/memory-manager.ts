/**
 * MemoryManager - Unified manager for Memory and OpenTelemetry observability
 * Preserves all existing logging and business logic
 */

import type { Span } from "@opentelemetry/api";
import { type Logger, safeStringify } from "@voltagent/internal";
import type { UIMessage } from "ai";
import type { OperationContext } from "../../agent/types";
import { LogEvents, getGlobalLogger } from "../../logger";
import { randomUUID } from "../../utils/id";
import { NodeType, createNodeId } from "../../utils/node-utils";
import { BackgroundQueue } from "../../utils/queue/queue";

// Import Memory
import { Memory } from "../../memory";
import { InMemoryStorageAdapter } from "../../memory/adapters/storage/in-memory";

// Import AgentTraceContext for proper span hierarchy
import type { AgentTraceContext } from "../../agent/open-telemetry/trace-context";

import type { ConversationStepRecord, MemoryOptions } from "../types";

/**
 * MemoryManager - Simplified version for conversation management only
 * Uses Memory for conversations
 */
export class MemoryManager {
  /**
   * Memory instance for conversations
   */
  private conversationMemory: Memory | undefined;

  /**
   * The ID of the resource (agent) that owns this memory manager
   */
  private resourceId: string;

  /**
   * Memory configuration options
   */
  private options: MemoryOptions;

  /**
   * Logger instance
   */
  private logger: Logger;

  /**
   * Background queue for memory operations
   */
  private backgroundQueue: BackgroundQueue;

  /**
   * Creates a new MemoryManager V2 with same signature as original
   */
  constructor(
    resourceId: string,
    memory?: Memory | false,
    options: MemoryOptions = {},
    logger?: Logger,
  ) {
    this.resourceId = resourceId;
    this.logger = logger || getGlobalLogger().child({ component: "memory-manager", resourceId });
    this.options = options;

    // Handle conversation memory
    if (memory === false) {
      // Conversation memory explicitly disabled
      this.conversationMemory = undefined;
    } else if (memory instanceof Memory) {
      // Use provided Memory V2 instance
      this.conversationMemory = memory;
    } else if (memory) {
      // Legacy InternalMemory provided - create Memory V2 with InMemory adapter
      this.conversationMemory = new Memory({
        storage: new InMemoryStorageAdapter(),
      });
    } else {
      // Create default Memory V2 instance
      this.conversationMemory = new Memory({
        storage: new InMemoryStorageAdapter(),
      });
    }

    // Initialize background queue for memory operations
    this.backgroundQueue = new BackgroundQueue({
      maxConcurrency: 10,
      defaultTimeout: 30000, // 30 seconds timeout
      defaultRetries: 5, // 5 retries for memory operations
    });
  }

  /**
   * Save a message to memory
   * PRESERVED FROM ORIGINAL WITH MEMORY V2 INTEGRATION
   */
  async saveMessage(
    context: OperationContext,
    message: UIMessage,
    userId?: string,
    conversationId?: string,
  ): Promise<void> {
    if (!this.conversationMemory || !userId) return;

    const messageWithMetadata = this.applyOperationMetadata(message, context);

    // Use contextual logger from operation context - PRESERVED
    const memoryLogger = context.logger.child({
      operation: "write",
    });

    // Event tracking with OpenTelemetry spans
    const trace = context.traceContext;
    const spanInput = { userId, conversationId, message: messageWithMetadata };
    const writeSpan = trace.createChildSpan("memory.write", "memory", {
      label:
        messageWithMetadata.role === "user" ? "Persist User Message" : "Persist Assistant Message",
      attributes: {
        "memory.operation": "write",
        input: safeStringify(spanInput),
      },
    });

    try {
      await trace.withSpan(writeSpan, async () => {
        // Use Memory V2 to save message
        if (conversationId && userId) {
          // Ensure conversation exists
          const conv = await this.conversationMemory?.getConversation(conversationId);
          if (!conv) {
            await this.conversationMemory?.createConversation({
              id: conversationId,
              userId: userId,
              resourceId: this.resourceId,
              title: "Conversation",
              metadata: {},
            });
          }

          // Add message to conversation using Memory V2's saveMessageWithContext
          await this.conversationMemory?.saveMessageWithContext(
            messageWithMetadata,
            userId,
            conversationId,
            {
              logger: memoryLogger,
            },
            context, // Pass OperationContext to Memory
          );
        }
      });

      // End span successfully
      trace.endChildSpan(writeSpan, "completed", {
        output: { saved: true },
        attributes: { "memory.message_count": 1 },
      });

      // Log successful memory operation - PRESERVED
      memoryLogger.debug("[Memory] Write successful (1 record)", {
        event: LogEvents.MEMORY_OPERATION_COMPLETED,
        operation: "write",
        message: messageWithMetadata,
      });
    } catch (error) {
      // End span with error
      trace.endChildSpan(writeSpan, "error", { error: error as Error });

      // Log memory operation failure - PRESERVED
      memoryLogger.error(
        `Memory write failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        {
          event: LogEvents.MEMORY_OPERATION_FAILED,
          operation: "write",
          success: false,
          error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        },
      );
    }
  }

  private applyOperationMetadata(message: UIMessage, context: OperationContext): UIMessage {
    const operationId = context.operationId;
    if (!operationId) {
      return message;
    }

    const existingMetadata =
      typeof message.metadata === "object" && message.metadata !== null
        ? (message.metadata as Record<string, unknown>)
        : undefined;

    if (existingMetadata?.operationId === operationId) {
      return message;
    }

    return {
      ...message,
      metadata: {
        ...(existingMetadata ?? {}),
        operationId,
      },
    };
  }

  async saveConversationSteps(
    context: OperationContext,
    steps: ConversationStepRecord[],
    userId?: string,
    conversationId?: string,
  ): Promise<void> {
    if (!this.conversationMemory?.saveConversationSteps || !userId || !conversationId) {
      return;
    }
    if (steps.length === 0) {
      return;
    }

    const trace = context.traceContext;
    const span = trace.createChildSpan("memory.steps.write", "memory", {
      label: "Persist Conversation Steps",
      attributes: {
        "memory.operation": "write_steps",
        "memory.step.count": steps.length,
        conversationId,
        userId,
      },
    });

    try {
      await trace.withSpan(span, async () => {
        await this.conversationMemory?.saveConversationSteps?.(steps);
      });
      trace.endChildSpan(span, "completed", {
        attributes: {
          "memory.steps_saved": steps.length,
          conversationId,
          userId,
        },
      });
    } catch (error) {
      trace.endChildSpan(span, "error", { error: error as Error });
      context.logger.error("Failed to save conversation steps", {
        error,
        conversationId,
        userId,
      });
    }
  }

  /**
   * Get messages from memory with proper logging
   * PRESERVED FROM ORIGINAL WITH MEMORY V2 INTEGRATION
   */
  async getMessages(
    context: OperationContext,
    userId?: string,
    conversationId?: string,
    limit?: number,
    options?: {
      useSemanticSearch?: boolean;
      currentQuery?: string;
      semanticLimit?: number;
      semanticThreshold?: number;
      mergeStrategy?: "prepend" | "append" | "interleave";
      traceContext?: AgentTraceContext; // TraceContext for proper span hierarchy
      parentMemorySpan?: Span; // Parent memory span for proper nesting
    },
  ): Promise<UIMessage<{ createdAt: Date }>[]> {
    if (!this.conversationMemory || !userId) {
      return [];
    }

    // Use contextual logger from operation context - PRESERVED
    const memoryLogger = context.logger.child({
      operation: "read",
    });

    try {
      // Use Memory V2 to get messages with optional semantic search
      let messages: UIMessage<{ createdAt: Date }>[] = [];

      if (conversationId && userId) {
        // Check if semantic search is requested
        if (options?.useSemanticSearch && options?.currentQuery) {
          // Use the extracted semantic search method
          messages = await this.performSemanticSearch(
            userId,
            conversationId,
            options.currentQuery,
            options.semanticLimit || limit,
            options.semanticLimit,
            options.semanticThreshold,
            options.mergeStrategy,
            memoryLogger,
            options.traceContext,
            options.parentMemorySpan,
          );

          memoryLogger.debug("Semantic search completed", {
            query: options.currentQuery,
            resultsCount: messages.length,
          });
        } else {
          // Use regular message retrieval
          messages = (await this.conversationMemory.getMessages(
            userId,
            conversationId,
            { limit },
            context, // Pass OperationContext to Memory
          )) as UIMessage<{ createdAt: Date }>[];
        }
      }

      // Log successful memory operation - PRESERVED
      memoryLogger.debug(`[Memory] Read successful (${messages.length} records)`, {
        event: LogEvents.MEMORY_OPERATION_COMPLETED,
        operation: "read",
        messages: messages.length,
      });

      return messages;
    } catch (error) {
      // Log memory operation failure - PRESERVED
      memoryLogger.error(
        `Memory read failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        {
          event: LogEvents.MEMORY_OPERATION_FAILED,
          operation: "read",
          success: false,
          error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        },
      );

      return [];
    }
  }

  /**
   * Search messages semantically
   * PRESERVED FROM ORIGINAL WITH MEMORY V2 INTEGRATION
   */
  async searchMessages(
    context: OperationContext,
    _query: string,
    userId?: string,
    conversationId?: string,
    limit?: number,
  ): Promise<UIMessage<{ createdAt: Date }>[]> {
    if (!this.conversationMemory || !userId || !conversationId) {
      return [];
    }

    // Use contextual logger from operation context
    const memoryLogger = context.logger.child({
      operation: "search",
    });

    try {
      const messages = await this.conversationMemory.getMessages(
        userId,
        conversationId,
        { limit },
        context, // Pass OperationContext to Memory
      );

      memoryLogger.debug(`[Memory] Search successful (${messages.length} records)`, {
        event: LogEvents.MEMORY_OPERATION_COMPLETED,
        operation: "search",
        messages: messages.length,
      });

      return messages;
    } catch (error) {
      memoryLogger.error(
        `Memory search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        {
          event: LogEvents.MEMORY_OPERATION_FAILED,
          operation: "search",
          success: false,
          error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        },
      );

      return [];
    }
  }

  /**
   * Clear messages from memory
   * PRESERVED FROM ORIGINAL WITH MEMORY V2 INTEGRATION
   */
  async clearMessages(
    context: OperationContext,
    userId?: string,
    conversationId?: string,
  ): Promise<void> {
    if (!this.conversationMemory || !userId || !conversationId) return;

    const memoryLogger = context.logger.child({
      operation: "clear",
    });

    try {
      // Delete and recreate conversation to clear messages
      await this.conversationMemory.deleteConversation(conversationId);
      await this.conversationMemory.createConversation({
        id: conversationId,
        userId: userId,
        resourceId: this.resourceId,
        title: "Conversation",
        metadata: {},
      });

      memoryLogger.debug("[Memory] Clear successful", {
        event: LogEvents.MEMORY_OPERATION_COMPLETED,
        operation: "clear",
      });
    } catch (error) {
      memoryLogger.error(
        `Memory clear failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        {
          event: LogEvents.MEMORY_OPERATION_FAILED,
          operation: "clear",
          success: false,
          error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        },
      );
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Prepare conversation context for message generation (CONTEXT-FIRST OPTIMIZED)
   * Ensures context is always loaded, optimizes non-critical operations in background
   * PRESERVED FROM ORIGINAL
   */
  async prepareConversationContext(
    context: OperationContext,
    input: string | UIMessage[],
    userId?: string,
    conversationIdParam?: string,
    contextLimit = 10,
  ): Promise<{ messages: UIMessage<{ createdAt: Date }>[]; conversationId: string }> {
    // Use the provided conversationId or generate a new one
    const conversationId = conversationIdParam || randomUUID();

    if (contextLimit === 0) {
      return { messages: [], conversationId };
    }

    // Return empty context immediately if no conversation memory/userId
    if (!this.conversationMemory || !userId) {
      return { messages: [], conversationId };
    }

    // 🎯 CRITICAL: Always load conversation context (conversation continuity is essential)
    let messages: UIMessage<{ createdAt: Date }>[] = [];

    try {
      // Get UIMessages from memory directly - no conversion needed!
      // Filter to only get user and assistant messages (exclude tool, system, etc.)
      messages = (await this.conversationMemory.getMessages(
        userId,
        conversationId,
        {
          limit: contextLimit,
        },
        context, // Pass OperationContext to Memory
      )) as UIMessage<{ createdAt: Date }>[];

      context.logger.debug(
        `[Memory] Fetched messages from memory. Message Count: ${messages.length}`,
        {
          messages,
        },
      );
    } catch (error) {
      context.logger.error("[Memory] Failed to load context", {
        error,
      });
      // Continue with empty messages, but don't fail the operation
    }

    this.handleSequentialBackgroundOperations(context, input, userId, conversationId);

    return { messages, conversationId };
  }

  /**
   * Handle sequential background operations using the queue
   * Setup conversation and save input in a single atomic operation
   * PRESERVED FROM ORIGINAL
   */
  private handleSequentialBackgroundOperations(
    context: OperationContext,
    input: string | UIMessage[],
    userId: string,
    conversationId: string,
  ): void {
    if (!this.conversationMemory) return;

    // Single atomic operation combining conversation setup and input saving
    this.backgroundQueue.enqueue({
      id: `conversation-and-input-${conversationId}-${Date.now()}`,
      operation: async () => {
        try {
          // First ensure conversation exists
          await this.ensureConversationExists(context, userId, conversationId);

          // Then save current input
          await this.saveCurrentInput(context, input, userId, conversationId);
        } catch (error) {
          context.logger.error("[Memory] Failed to setup conversation and save input", {
            error,
          });
          throw error; // Re-throw to trigger retry mechanism
        }
      },
    });
  }

  /**
   * Public: Enqueue saving current input in the background.
   * Ensures conversation exists and then saves input without blocking.
   */
  queueSaveInput(
    context: OperationContext,
    input: string | UIMessage[],
    userId: string,
    conversationId: string,
  ): void {
    this.handleSequentialBackgroundOperations(context, input, userId, conversationId);
  }

  /**
   * Ensure conversation exists (background task)
   * PRESERVED FROM ORIGINAL
   */
  private async ensureConversationExists(
    context: OperationContext,
    userId: string,
    conversationId: string,
  ): Promise<void> {
    if (!this.conversationMemory) return;

    try {
      const existingConversation = await this.conversationMemory.getConversation(conversationId);
      if (!existingConversation) {
        const title = `New Chat ${new Date().toISOString()}`;
        try {
          await this.conversationMemory.createConversation({
            id: conversationId,
            resourceId: this.resourceId,
            userId: userId,
            title,
            metadata: {},
          });
          context.logger.debug("[Memory] Created new conversation", {
            title,
          });
        } catch (createError: any) {
          // If conversation already exists (race condition), that's fine - our goal is achieved
          if (createError.code === "CONVERSATION_ALREADY_EXISTS") {
            context.logger.debug("[Memory] Conversation already exists (race condition handled)", {
              conversationId,
            });
            // Update the conversation to refresh updatedAt
            await this.conversationMemory.updateConversation(conversationId, {});
          } else {
            // Re-throw other errors
            throw createError;
          }
        }
      } else {
        // Update conversation's updatedAt
        await this.conversationMemory.updateConversation(conversationId, {});
        context.logger.trace("[Memory] Updated conversation");
      }
    } catch (error) {
      context.logger.error("[Memory] Failed to ensure conversation exists", {
        error,
      });
    }
  }

  /**
   * Save current input (background task)
   * PRESERVED FROM ORIGINAL
   */
  private async saveCurrentInput(
    context: OperationContext,
    input: string | UIMessage[],
    userId: string,
    conversationId: string,
  ): Promise<void> {
    if (!this.conversationMemory) return;

    try {
      // Handle input based on type
      if (typeof input === "string") {
        // The user message with content
        const userMessage: UIMessage = {
          id: randomUUID(),
          role: "user",
          parts: [{ type: "text", text: input }],
        };

        await this.saveMessage(context, userMessage, userId, conversationId);
      } else if (Array.isArray(input)) {
        // If input is UIMessage[], save all to memory
        for (const message of input) {
          await this.saveMessage(context, message, userId, conversationId);
        }
      }
    } catch (error) {
      context.logger.error("[Memory] Failed to save current input", {
        error,
      });
    }
  }

  /**
   * Check if conversation memory is enabled
   */
  hasConversationMemory(): boolean {
    return this.conversationMemory !== undefined;
  }

  /**
   * Get options
   */
  getOptions(): MemoryOptions {
    return { ...this.options };
  }

  /**
   * Get memory state for display in UI
   */
  getMemoryState(): Record<string, any> {
    // Create a standard node ID
    const memoryNodeId = createNodeId(NodeType.MEMORY, this.resourceId);

    if (!this.conversationMemory) {
      return {
        type: "NoMemory",
        resourceId: this.resourceId,
        options: this.options || {},
        available: false,
        status: "idle",
        node_id: memoryNodeId,
      };
    }

    const memoryObject = {
      type: this.conversationMemory?.constructor.name || "NoMemory",
      resourceId: this.resourceId,
      options: this.getOptions(),
      available: !!this.conversationMemory,
      status: "idle", // Default to idle since we're only updating status during operations
      node_id: memoryNodeId,
      storage: this.conversationMemory?.getStorageMetadata?.(),
      workingMemory: this.conversationMemory?.getWorkingMemorySummary?.() || undefined,
    };

    return memoryObject;
  }

  /**
   * Get the Memory V2 instance (for direct access if needed)
   */
  getMemory(): Memory | undefined {
    return this.conversationMemory;
  }

  // ============================================================================
  // Working Memory Proxy Methods
  // ============================================================================

  /**
   * Get working memory content
   */
  async getWorkingMemory(params: {
    conversationId?: string;
    userId?: string;
  }): Promise<string | null> {
    if (!this.conversationMemory) {
      return null;
    }
    return this.conversationMemory.getWorkingMemory(params);
  }

  /**
   * Update working memory content
   */
  async updateWorkingMemory(params: {
    conversationId?: string;
    userId?: string;
    content: string | Record<string, unknown>;
  }): Promise<void> {
    if (!this.conversationMemory) {
      throw new Error("Memory is not configured");
    }
    return this.conversationMemory.updateWorkingMemory(params);
  }

  /**
   * Clear working memory
   */
  async clearWorkingMemory(params: {
    conversationId?: string;
    userId?: string;
  }): Promise<void> {
    if (!this.conversationMemory) {
      return;
    }
    return this.conversationMemory.clearWorkingMemory(params);
  }

  /**
   * Check if working memory is supported
   */
  hasWorkingMemorySupport(): boolean {
    return this.conversationMemory?.hasWorkingMemorySupport() ?? false;
  }

  /**
   * Get working memory configuration
   */
  getWorkingMemoryConfig(): {
    template?: string | null;
    schema?: any | null;
    format?: "markdown" | "json" | null;
  } {
    if (!this.conversationMemory) {
      return { template: null, schema: null, format: null };
    }

    return {
      template: this.conversationMemory.getWorkingMemoryTemplate(),
      schema: this.conversationMemory.getWorkingMemorySchema(),
      format: this.conversationMemory.getWorkingMemoryFormat(),
    };
  }

  /**
   * Get working memory instructions
   */
  async getWorkingMemoryInstructions(params: {
    conversationId?: string;
    userId?: string;
  }): Promise<string | null> {
    if (!this.conversationMemory) {
      return null;
    }
    return this.conversationMemory.getWorkingMemoryInstructions(params);
  }

  /**
   * Perform semantic search with proper span hierarchy
   * Extracted from getMessages for clarity
   */
  private async performSemanticSearch(
    userId: string,
    conversationId: string,
    query: string,
    limit: number | undefined,
    semanticLimit: number | undefined,
    semanticThreshold: number | undefined,
    mergeStrategy: "prepend" | "append" | "interleave" | undefined,
    logger: Logger,
    traceContext?: AgentTraceContext,
    parentMemorySpan?: Span,
  ): Promise<UIMessage<{ createdAt: Date }>[]> {
    if (!this.conversationMemory?.hasVectorSupport?.()) {
      logger.debug("Vector support not available, falling back to regular retrieval");
      return ((await this.conversationMemory?.getMessages(userId, conversationId, { limit })) ||
        []) as UIMessage<{ createdAt: Date }>[];
    }

    // Get adapter info for logging
    const embeddingAdapter = this.conversationMemory.getEmbeddingAdapter?.();
    const vectorAdapter = this.conversationMemory.getVectorAdapter?.();
    const embeddingModel = embeddingAdapter?.getModelName?.() || "unknown";
    const vectorDBName = vectorAdapter?.constructor?.name || "unknown";

    if (traceContext && parentMemorySpan) {
      const spanInput = {
        query,
        userId,
        conversationId,
        model: embeddingModel,
      };
      // Use TraceContext with specific parent span for proper hierarchy
      const embeddingSpan = traceContext.createChildSpanWithParent(
        parentMemorySpan,
        "embedding.generate",
        "embedding",
        {
          label: "Query Embedding",
          attributes: {
            input: safeStringify(spanInput),
          },
        },
      );

      return await traceContext.withSpan(embeddingSpan, async () => {
        try {
          // Create vector span as child of embedding span
          const spanInput = {
            query,
            userId,
            conversationId,
            vectorDB: vectorDBName,
            limit,
          };
          const vectorSpan = traceContext.createChildSpanWithParent(
            embeddingSpan,
            "vector.search",
            "vector",
            {
              label: "Semantic Search",
              attributes: {
                "vector.operation": "search",
                input: safeStringify(spanInput),
              },
            },
          );

          // Execute the actual search within vector context
          const searchResults = await traceContext.withSpan(vectorSpan, async () => {
            return await this.conversationMemory?.getMessagesWithContext(userId, conversationId, {
              limit,
              useSemanticSearch: true,
              currentQuery: query,
              logger: logger,
              semanticLimit,
              semanticThreshold,
              mergeStrategy,
            });
          });

          // End vector span successfully
          traceContext.endChildSpan(vectorSpan, "completed", {
            output: searchResults,
            attributes: {
              output: searchResults,
            },
          });

          return searchResults || [];
        } finally {
          // End embedding span
          const dimension = embeddingAdapter?.getDimensions?.() || 0;
          traceContext.endChildSpan(embeddingSpan, "completed", {
            attributes: {
              output: dimension,
            },
          });
        }
      });
    }
    // No TraceContext, just execute without spans
    return (
      (await this.conversationMemory.getMessagesWithContext(userId, conversationId, {
        limit,
        useSemanticSearch: true,
        currentQuery: query,
        logger: logger,
        semanticLimit,
        semanticThreshold,
        mergeStrategy,
      })) || []
    );
  }

  /**
   * Shutdown the memory manager
   */
  async shutdown(): Promise<void> {
    // Wait for any pending background operations
    // Note: BackgroundQueue doesn't have waitForCompletion method yet
    this.logger.debug("Memory manager shutdown complete");
  }
}
