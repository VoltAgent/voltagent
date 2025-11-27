/**
 * Memory - Clean architecture for conversation memory and state management
 */

import { type Logger, safeStringify } from "@voltagent/internal";
import type { UIMessage } from "ai";
import type { z } from "zod";
import type { OperationContext } from "../agent/types";
import { EmbeddingAdapterNotConfiguredError, VectorAdapterNotConfiguredError } from "./errors";
import type {
  Conversation,
  ConversationQueryOptions,
  ConversationStepRecord,
  CreateConversationInput,
  Document,
  EmbeddingAdapter,
  GetConversationStepsOptions,
  GetMessagesOptions,
  MemoryConfig,
  MemoryStorageMetadata,
  SearchOptions,
  SearchResult,
  StorageAdapter,
  VectorAdapter,
  WorkflowStateEntry,
  WorkingMemoryConfig,
  WorkingMemorySummary,
  WorkingMemoryUpdateOptions,
} from "./types";
import { BatchEmbeddingCache } from "./utils/cache";

/**
 * Memory Class
 * Handles conversation memory with optional vector search capabilities
 */
export class Memory {
  private readonly storage: StorageAdapter;
  private readonly embedding?: EmbeddingAdapter;
  private readonly vector?: VectorAdapter;
  private embeddingCache?: BatchEmbeddingCache;
  private readonly workingMemoryConfig?: WorkingMemoryConfig;

  // Internal properties for Agent integration
  private resourceId?: string;
  private logger?: Logger;

  constructor(options: MemoryConfig) {
    this.storage = options.storage;
    this.embedding = options.embedding;
    this.vector = options.vector;
    this.workingMemoryConfig = options.workingMemory;

    // Initialize embedding cache if enabled
    if (options.enableCache && this.embedding) {
      this.embeddingCache = new BatchEmbeddingCache(
        options.cacheSize ?? 1000,
        options.cacheTTL ?? 3600000, // 1 hour default
      );
    }
  }

  // ============================================================================
  // Message Operations
  // ============================================================================

  /**
   * Get messages from a conversation
   */
  async getMessages(
    userId: string,
    conversationId: string,
    options?: GetMessagesOptions,
    context?: OperationContext,
  ): Promise<UIMessage<{ createdAt: Date }>[]> {
    return this.storage.getMessages(userId, conversationId, options, context);
  }

  /**
   * Save a single message
   */
  async saveMessage(message: UIMessage, userId: string, conversationId: string): Promise<void> {
    await this.addMessage(message, userId, conversationId);
  }

  async saveConversationSteps(steps: ConversationStepRecord[]): Promise<void> {
    if (this.storage.saveConversationSteps) {
      await this.storage.saveConversationSteps(steps);
    }
  }

  /**
   * Add a single message (alias for consistency with existing API)
   */
  async addMessage(
    message: UIMessage,
    userId: string,
    conversationId: string,
    context?: OperationContext,
  ): Promise<void> {
    // If embedding is configured, auto-embed the message
    if (this.embedding && this.vector) {
      await this.embedAndStoreMessage(message, userId, conversationId);
    }

    await this.storage.addMessage(message, userId, conversationId, context);
  }

  /**
   * Add multiple messages in batch
   */
  async addMessages(
    messages: UIMessage[],
    userId: string,
    conversationId: string,
    context?: OperationContext,
  ): Promise<void> {
    // If embedding is configured, auto-embed the messages
    if (this.embedding && this.vector) {
      await this.embedAndStoreMessages(messages, userId, conversationId);
    }

    await this.storage.addMessages(messages, userId, conversationId, context);
  }

  /**
   * Clear messages for a user
   */
  async clearMessages(
    userId: string,
    conversationId?: string,
    context?: OperationContext,
  ): Promise<void> {
    return this.storage.clearMessages(userId, conversationId, context);
  }

  async getConversationSteps(
    userId: string,
    conversationId: string,
    options?: GetConversationStepsOptions,
  ): Promise<ConversationStepRecord[]> {
    if (!this.storage.getConversationSteps) {
      return [];
    }
    return this.storage.getConversationSteps(userId, conversationId, options);
  }

  // ============================================================================
  // Conversation Operations
  // ============================================================================

  /**
   * Get a conversation by ID
   */
  async getConversation(id: string): Promise<Conversation | null> {
    return this.storage.getConversation(id);
  }

  /**
   * Get conversations for a resource
   */
  async getConversations(resourceId: string): Promise<Conversation[]> {
    return this.storage.getConversations(resourceId);
  }

  /**
   * Get conversations by user ID with query options
   */
  async getConversationsByUserId(
    userId: string,
    options?: Omit<ConversationQueryOptions, "userId">,
  ): Promise<Conversation[]> {
    return this.storage.getConversationsByUserId(userId, options);
  }

  /**
   * Query conversations with advanced options
   */
  async queryConversations(options: ConversationQueryOptions): Promise<Conversation[]> {
    return this.storage.queryConversations(options);
  }

  /**
   * Create a new conversation
   */
  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    return this.storage.createConversation(input);
  }

  /**
   * Update a conversation
   */
  async updateConversation(
    id: string,
    updates: Partial<Omit<Conversation, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Conversation> {
    return this.storage.updateConversation(id, updates);
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(id: string): Promise<void> {
    // If vector adapter is configured, delete associated vectors
    if (this.vector) {
      try {
        // Try to get the conversation first to get userId
        const conversation = await this.storage.getConversation(id);
        if (conversation) {
          // Get all messages to find vector IDs
          const messages = await this.storage.getMessages(conversation.userId, id);
          const vectorIds = messages.map((msg) => `msg_${id}_${msg.id}`);
          if (vectorIds.length > 0) {
            await this.vector.deleteBatch(vectorIds);
          }
        }
      } catch (error) {
        // Log error but continue with deletion
        console.warn(`Failed to delete vectors for conversation ${id}:`, error);
      }
    }

    return this.storage.deleteConversation(id);
  }

  // ============================================================================
  // Vector Search Operations
  // ============================================================================

  /**
   * Get messages with semantic search
   * Combines recent messages with semantically similar messages
   */
  async getMessagesWithSemanticSearch(
    userId: string,
    conversationId: string,
    currentQuery?: string,
    options?: {
      limit?: number;
      semanticLimit?: number;
      semanticThreshold?: number;
      mergeStrategy?: "prepend" | "append" | "interleave";
    },
  ): Promise<UIMessage<{ createdAt: Date }>[]> {
    // Get recent messages
    const recentMessages = await this.storage.getMessages(userId, conversationId, {
      limit: options?.limit,
    });

    // If no semantic search requested or not configured, return recent messages
    if (!currentQuery || !this.embedding || !this.vector) {
      return recentMessages;
    }

    try {
      // Get embedding for current query
      const queryVector = await this.getEmbedding(currentQuery);

      // Search for similar messages
      const semanticResults = await this.vector.search(queryVector, {
        limit: options?.semanticLimit ?? 5,
        filter: { userId, conversationId },
        threshold: options?.semanticThreshold,
      });

      // Extract message IDs from results
      const messageIds = semanticResults
        .map((r) => r.metadata?.messageId as string)
        .filter((id) => id);

      if (messageIds.length === 0) {
        return recentMessages;
      }

      // Get actual messages by IDs
      const semanticMessages = await this.getMessagesByIds(userId, conversationId, messageIds);

      // Merge messages based on strategy
      return this.mergeMessages(
        recentMessages,
        semanticMessages,
        options?.mergeStrategy ?? "append",
      );
    } catch (error) {
      // Log error but don't fail - return recent messages as fallback
      console.warn("Semantic search failed, returning recent messages only:", error);
      return recentMessages;
    }
  }

  /**
   * Get messages by their IDs
   */
  private async getMessagesByIds(
    userId: string,
    conversationId: string,
    messageIds: string[],
  ): Promise<UIMessage<{ createdAt: Date }>[]> {
    // Get all messages once and map by id to preserve the order of messageIds
    const allMessages = await this.storage.getMessages(userId, conversationId);
    const byId = new Map(allMessages.map((m) => [m.id, m] as const));
    const ordered = messageIds
      .map((id) => byId.get(id))
      .filter((m): m is UIMessage<{ createdAt: Date }> => Boolean(m));
    return ordered;
  }

  /**
   * Merge two arrays of messages, removing duplicates
   */
  private mergeMessages(
    recentMessages: UIMessage<{ createdAt: Date }>[],
    semanticMessages: UIMessage<{ createdAt: Date }>[],
    strategy: "prepend" | "append" | "interleave" = "append",
  ): UIMessage<{ createdAt: Date }>[] {
    // Create a Set of message IDs from recent messages
    const recentIds = new Set(recentMessages.map((m) => m.id));

    // Filter semantic messages to avoid duplicates
    const uniqueSemanticMessages = semanticMessages.filter((m) => !recentIds.has(m.id));

    // Merge based on strategy
    switch (strategy) {
      case "prepend":
        // Add semantic messages before recent messages
        return [...uniqueSemanticMessages, ...recentMessages];
      case "append":
        // Add semantic messages after recent messages
        return [...recentMessages, ...uniqueSemanticMessages];
      case "interleave": {
        // Interleave semantic messages with recent messages
        const merged: UIMessage<{ createdAt: Date }>[] = [];
        const maxLength = Math.max(recentMessages.length, uniqueSemanticMessages.length);
        for (let i = 0; i < maxLength; i++) {
          if (i < uniqueSemanticMessages.length) {
            merged.push(uniqueSemanticMessages[i]);
          }
          if (i < recentMessages.length) {
            merged.push(recentMessages[i]);
          }
        }
        return merged;
      }
      default:
        return [...uniqueSemanticMessages, ...recentMessages];
    }
  }

  /**
   * Check if vector support is configured
   */
  hasVectorSupport(): boolean {
    return !!(this.embedding && this.vector);
  }

  /**
   * Search for similar content
   */
  async searchSimilar(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    if (!this.embedding) {
      throw new EmbeddingAdapterNotConfiguredError("searchSimilar");
    }
    if (!this.vector) {
      throw new VectorAdapterNotConfiguredError("searchSimilar");
    }

    // Get embedding for query
    const queryVector = await this.getEmbedding(query);

    // Search in vector store
    return this.vector.search(queryVector, {
      limit: options?.limit,
      filter: options?.filter,
      threshold: options?.threshold,
    });
  }

  /**
   * Add a document for RAG
   */
  async addDocument(document: Document): Promise<void> {
    if (!this.embedding) {
      throw new EmbeddingAdapterNotConfiguredError("addDocument");
    }
    if (!this.vector) {
      throw new VectorAdapterNotConfiguredError("addDocument");
    }

    // Get embedding for document
    const vector = await this.getEmbedding(document.content);

    // Store in vector database
    await this.vector.store(document.id, vector, {
      ...document.metadata,
      content: document.content,
    });
  }

  /**
   * Remove a document
   */
  async removeDocument(id: string): Promise<void> {
    if (!this.vector) {
      throw new VectorAdapterNotConfiguredError("removeDocument");
    }

    await this.vector.delete(id);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Get embedding with caching
   */
  private async getEmbedding(text: string): Promise<number[]> {
    if (!this.embedding) {
      throw new EmbeddingAdapterNotConfiguredError("getEmbedding");
    }

    // Check cache if enabled
    if (this.embeddingCache) {
      const cached = this.embeddingCache.get(text);
      if (cached) {
        return cached;
      }
    }

    // Generate embedding
    const embedding = await this.embedding.embed(text);

    // Cache if enabled
    if (this.embeddingCache) {
      this.embeddingCache.set(text, embedding);
    }

    return embedding;
  }

  /**
   * Embed and store a message
   */
  private async embedAndStoreMessage(
    message: UIMessage,
    userId: string,
    conversationId: string,
  ): Promise<void> {
    if (!this.embedding || !this.vector) return;

    // Extract text content: prefer parts, fallback to content if available
    let textContent: string | null = null;
    if (message.parts && Array.isArray(message.parts)) {
      const textParts: string[] = [];
      for (const part of message.parts) {
        if (part.type === "text" && "text" in part && typeof (part as any).text === "string") {
          textParts.push((part as any).text);
        }
      }
      textContent = textParts.length > 0 ? textParts.join(" ") : null;
    }
    // Fallback: some callers might still use message.content
    if (!textContent && (message as any).content && typeof (message as any).content === "string") {
      textContent = (message as any).content as string;
    }
    if (!textContent) return;

    // Generate embedding
    const vector = await this.getEmbedding(textContent);

    // Store in vector database
    await this.vector.store(`msg_${conversationId}_${message.id}`, vector, {
      messageId: message.id,
      conversationId,
      userId,
      role: message.role,
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Embed and store multiple messages
   */
  private async embedAndStoreMessages(
    messages: UIMessage[],
    userId: string,
    conversationId: string,
  ): Promise<void> {
    if (!this.embedding || !this.vector) return;

    // Extract text content from messages
    const messagesWithText = messages
      .map((msg) => {
        // Extract text from message parts, fallback to content
        let text: string | null = null;
        if (msg.parts && Array.isArray(msg.parts)) {
          const textParts: string[] = [];
          for (const part of msg.parts) {
            if (part.type === "text" && "text" in part && typeof (part as any).text === "string") {
              textParts.push((part as any).text);
            }
          }
          text = textParts.length > 0 ? textParts.join(" ") : null;
        }
        if (!text && (msg as any).content && typeof (msg as any).content === "string") {
          text = (msg as any).content as string;
        }
        return text ? { message: msg, text } : null;
      })
      .filter((item): item is { message: UIMessage; text: string } => item !== null);

    if (messagesWithText.length === 0) return;

    const texts = messagesWithText.map((item) => item.text);
    let embeddings: number[][];

    // Use cache if available
    if (this.embeddingCache) {
      const { cached, uncached } = this.embeddingCache.splitByCached(texts);

      // Generate embeddings only for uncached texts
      if (uncached.length > 0) {
        const uncachedTexts = uncached.map((item) => item.text);
        const newEmbeddings = await this.embedding.embedBatch(uncachedTexts);

        // Cache the new embeddings
        this.embeddingCache.setBatch(uncachedTexts, newEmbeddings);

        // Combine cached and new embeddings in correct order
        embeddings = new Array(texts.length);
        cached.forEach((item) => {
          embeddings[item.index] = item.embedding;
        });
        uncached.forEach((item, i) => {
          embeddings[item.index] = newEmbeddings[i];
        });
      } else {
        // All texts were cached
        embeddings = cached.map((item) => item.embedding);
      }
    } else {
      // No cache, generate all embeddings
      embeddings = await this.embedding.embedBatch(texts);
    }

    // Prepare vector items
    const vectorItems = messagesWithText.map((item, index) => ({
      id: `msg_${conversationId}_${item.message.id}`,
      vector: embeddings[index],
      metadata: {
        messageId: item.message.id,
        conversationId,
        userId,
        role: item.message.role,
        createdAt: new Date().toISOString(),
      },
    }));

    // Store in vector database
    await this.vector.storeBatch(vectorItems);
  }

  // ============================================================================
  // Working Memory Operations
  // ============================================================================

  /**
   * Get working memory for a conversation or user
   */
  async getWorkingMemory(params: {
    conversationId?: string;
    userId?: string;
  }): Promise<string | null> {
    if (!this.workingMemoryConfig?.enabled) {
      return null;
    }

    const scope = this.workingMemoryConfig.scope || "conversation";
    return this.storage.getWorkingMemory({
      conversationId: params.conversationId,
      userId: params.userId,
      scope,
    });
  }

  /**
   * Update working memory (simplified)
   */
  async updateWorkingMemory(params: {
    conversationId?: string;
    userId?: string;
    content: string | Record<string, unknown>;
    options?: WorkingMemoryUpdateOptions;
  }): Promise<void> {
    if (!this.workingMemoryConfig?.enabled) {
      throw new Error("Working memory is not enabled");
    }

    const scope = this.workingMemoryConfig.scope || "conversation";
    const mode = params.options?.mode || "replace";

    let finalContent: string;

    if (mode === "append") {
      // Get existing content for append mode
      const existingContent = await this.getWorkingMemory({
        conversationId: params.conversationId,
        userId: params.userId,
      });

      if (existingContent) {
        const format = this.getWorkingMemoryFormat();
        const newContent = this.processContent(params.content);

        if (format === "json") {
          // For JSON, merge objects
          try {
            const existingObj = JSON.parse(existingContent);
            const newObj =
              typeof params.content === "string" ? JSON.parse(params.content) : params.content;
            const merged = this.simpleDeepMerge(existingObj, newObj);
            finalContent = safeStringify(merged, { indentation: 2 });
          } catch {
            // If parse fails, just replace
            finalContent = newContent;
          }
        } else {
          // For Markdown, append with separator
          finalContent = `${existingContent}\n\n${newContent}`;
        }
      } else {
        finalContent = this.processContent(params.content);
      }
    } else {
      // Replace mode (default)
      finalContent = this.processContent(params.content);
    }

    // Validate against schema if present
    if ("schema" in this.workingMemoryConfig && this.workingMemoryConfig.schema) {
      try {
        const parsed = JSON.parse(finalContent);
        const validated = this.workingMemoryConfig.schema.safeParse(parsed);
        if (!validated.success) {
          throw new Error(`Invalid working memory format: ${validated.error.message}`);
        }
        finalContent = safeStringify(validated.data, { indentation: 2 });
      } catch (e) {
        // Allow non-JSON for markdown
        if (this.getWorkingMemoryFormat() !== "json") {
          // OK for markdown
        } else {
          throw new Error(`Failed to validate working memory: ${e}`);
        }
      }
    }

    await this.storage.setWorkingMemory({
      conversationId: params.conversationId,
      userId: params.userId,
      content: finalContent,
      scope,
    });
  }

  /**
   * Process content to string format
   */
  private processContent(content: string | Record<string, unknown>): string {
    if (typeof content === "object") {
      return safeStringify(content, { indentation: 2 });
    }
    return content;
  }

  /**
   * Simple deep merge for JSON objects
   */
  private simpleDeepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        if (
          typeof source[key] === "object" &&
          source[key] !== null &&
          !Array.isArray(source[key]) &&
          typeof target[key] === "object" &&
          target[key] !== null &&
          !Array.isArray(target[key])
        ) {
          // Recursive merge for nested objects
          result[key] = this.simpleDeepMerge(target[key], source[key]);
        } else if (Array.isArray(source[key]) && Array.isArray(target[key])) {
          // For arrays, concat and remove duplicates
          result[key] = [...new Set([...target[key], ...source[key]])];
        } else {
          // Replace value
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  /**
   * Clear working memory
   */
  async clearWorkingMemory(params: {
    conversationId?: string;
    userId?: string;
  }): Promise<void> {
    if (!this.workingMemoryConfig?.enabled) {
      return;
    }

    const scope = this.workingMemoryConfig.scope || "conversation";
    await this.storage.deleteWorkingMemory({
      conversationId: params.conversationId,
      userId: params.userId,
      scope,
    });
  }

  /**
   * Get working memory template
   */
  getWorkingMemoryTemplate(): string | null {
    if (!this.workingMemoryConfig?.enabled) {
      return null;
    }

    if ("template" in this.workingMemoryConfig) {
      return this.workingMemoryConfig.template || null;
    }

    return null;
  }

  /**
   * Get working memory schema
   */
  getWorkingMemorySchema(): z.ZodObject<any> | null {
    if (!this.workingMemoryConfig?.enabled) {
      return null;
    }

    if ("schema" in this.workingMemoryConfig) {
      return this.workingMemoryConfig.schema || null;
    }

    return null;
  }

  /**
   * Get working memory format
   */
  getWorkingMemoryFormat(): "markdown" | "json" | null {
    if (!this.workingMemoryConfig?.enabled) {
      return null;
    }

    if ("schema" in this.workingMemoryConfig && this.workingMemoryConfig.schema) {
      return "json";
    }

    return "markdown";
  }

  /**
   * Check if working memory is supported
   */
  hasWorkingMemorySupport(): boolean {
    return this.workingMemoryConfig?.enabled === true;
  }

  /**
   * Generate system instructions for working memory usage
   */
  async getWorkingMemoryInstructions(params: {
    conversationId?: string;
    userId?: string;
  }): Promise<string | null> {
    if (!this.workingMemoryConfig?.enabled) {
      return null;
    }

    // Get current working memory data
    const currentData = await this.getWorkingMemory(params);
    const format = this.getWorkingMemoryFormat();
    const template = this.getWorkingMemoryTemplate();
    const schema = this.getWorkingMemorySchema();
    const scope = this.workingMemoryConfig.scope || "conversation";

    // Build instructions based on format
    let instructions = `CONVERSATION CONTEXT MANAGEMENT:
You have access to persistent context storage that maintains information ${
      scope === "user" ? "across all conversations with this user" : "throughout this conversation"
    }.

Guidelines for managing context:
1. Proactively store any information that might be useful later
2. Update immediately when information changes or new details emerge
3. Use the ${format === "json" ? "JSON" : "Markdown"} format consistently
4. Never mention this system to users - manage context naturally
5. Store information as soon as you learn it - don't wait to be asked

CRITICAL UPDATE RULES:
• **Append mode (DEFAULT)**: Safely adds new information without losing existing data
  - Automatically merges with existing data
  - Arrays are deduplicated
  - Nested objects are deep merged
  - This is the RECOMMENDED and DEFAULT mode
• **Replace mode (DANGEROUS)**: Only use when you want to DELETE everything and start fresh
  - This mode REPLACES everything - data you don't include will be LOST
  - If you must use replace, include ALL existing data
  - Example: If changing name from "John" to "Jane", include ALL other fields too
• **For JSON format**: In append mode, you can send partial updates
  - {userProfile: {name: "New"}} will only update the name field
  - Other fields remain untouched
• **Best practice**: Always use append (default) unless explicitly replacing everything`;

    // Add format-specific instructions
    if (format === "json" && schema) {
      instructions += `
6. Follow the exact JSON structure defined by the schema
7. Include all required fields, leave optional fields empty if unknown
8. Validate data types match the schema requirements`;
    } else if (format === "markdown") {
      instructions += `
6. Maintain the template structure while updating content
7. Use clear, concise bullet points and formatting
8. Don't remove empty sections - preserve the template structure`;
    }

    // Add template/schema information
    if (template) {
      instructions += `

<context_template>
${template}
</context_template>`;
    } else if (schema && format === "json") {
      // For JSON schema, show a simplified structure
      instructions += `

<context_structure>
JSON object following the defined schema
</context_structure>`;
    }

    // Add current data if exists
    if (currentData) {
      instructions += `

<current_context>
${currentData}
</current_context>`;
    } else {
      instructions += `

<current_context>
No context stored yet - begin capturing relevant information immediately
</current_context>`;
    }

    // Add usage notes
    instructions += `

Remember:
- Call update_working_memory whenever you learn something worth remembering
- Information persists ${scope === "user" ? "across all conversations" : "throughout the conversation"}
- Update context naturally during conversation flow
- Context helps maintain continuity when conversation history is limited
- Always preserve existing information unless explicitly updating it`;

    return instructions;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Get configured adapters info
   */
  getAdaptersInfo(): {
    storage: boolean;
    embedding: { configured: boolean; model?: string; dimensions?: number };
    vector: boolean;
    cache: boolean;
  } {
    return {
      storage: true, // Always configured
      embedding: this.embedding
        ? {
            configured: true,
            model: this.embedding.getModelName(),
            dimensions: this.embedding.getDimensions(),
          }
        : { configured: false },
      vector: !!this.vector,
      cache: !!this.embeddingCache,
    };
  }

  // ============================================================================
  // MemoryManager Compatible Methods
  // ============================================================================

  /**
   * Save a message to memory
   * Simple version without event publishing (handled by MemoryManagerV2)
   */
  async saveMessageWithContext(
    message: UIMessage,
    userId: string,
    conversationId: string,
    context?: {
      logger?: Logger;
    },
    operationContext?: OperationContext,
  ): Promise<void> {
    if (!userId || !conversationId) return;

    const logger = context?.logger || this.logger;

    try {
      // Ensure conversation exists
      const conv = await this.getConversation(conversationId);
      if (!conv) {
        await this.createConversation({
          id: conversationId,
          userId: userId,
          resourceId: this.resourceId || "",
          title: "Conversation",
          metadata: {},
        });
      }

      // Add message to conversation with OperationContext
      await this.addMessage(message, userId, conversationId, operationContext);
    } catch (error) {
      // Log error
      logger?.error?.(
        `[Memory] Write failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Get messages with semantic search support
   * Simple version without event publishing (handled by MemoryManagerV2)
   */
  async getMessagesWithContext(
    userId: string,
    conversationId: string,
    options?: {
      limit?: number;
      useSemanticSearch?: boolean;
      currentQuery?: string;
      traceId?: string;
      logger?: Logger;
      semanticLimit?: number;
      semanticThreshold?: number;
      mergeStrategy?: "prepend" | "append" | "interleave";
    },
    operationContext?: OperationContext,
  ): Promise<UIMessage<{ createdAt: Date }>[]> {
    const logger = options?.logger || this.logger;

    try {
      let messages: UIMessage<{ createdAt: Date }>[] = [];

      // Semantic search decision
      if (options?.useSemanticSearch && options?.currentQuery && this.hasVectorSupport()) {
        // Use semantic search
        messages = await this.getMessagesWithSemanticSearch(
          userId,
          conversationId,
          options.currentQuery,
          {
            limit: options.limit,
            semanticLimit: options.semanticLimit ?? 5,
            semanticThreshold: options.semanticThreshold ?? 0.7,
            mergeStrategy: options.mergeStrategy ?? "append",
          },
        );
      } else {
        // Regular message retrieval with OperationContext
        messages = await this.getMessages(
          userId,
          conversationId,
          {
            limit: options?.limit,
          },
          operationContext,
        );
      }

      logger?.debug?.(`[Memory] Read successful (${messages.length} records)`);

      return messages;
    } catch (error) {
      logger?.error?.("[Memory] Read failed");
      throw error;
    }
  }

  // ============================================================================
  // Internal Setters for Agent Integration
  // ============================================================================

  /**
   * Internal: Set resource ID (agent ID)
   */
  _setResourceId(id: string): void {
    this.resourceId = id;
  }

  /**
   * Internal: Set logger
   */
  _setLogger(logger: Logger): void {
    this.logger = logger;
  }

  // ============================================================================
  // Public Getters for UI/Console
  // ============================================================================

  /**
   * Get vector adapter if configured
   */
  getVectorAdapter(): VectorAdapter | undefined {
    return this.vector;
  }

  /**
   * Get embedding adapter if configured
   */
  getEmbeddingAdapter(): EmbeddingAdapter | undefined {
    return this.embedding;
  }

  /**
   * Get metadata about the configured storage adapter
   */
  getStorageMetadata(): MemoryStorageMetadata {
    const adapter = this.storage?.constructor?.name || "UnknownStorageAdapter";
    return { adapter };
  }

  /**
   * Get a UI-friendly summary of working memory configuration
   */
  getWorkingMemorySummary(): WorkingMemorySummary | null {
    if (!this.workingMemoryConfig?.enabled) {
      return null;
    }

    const scope = this.workingMemoryConfig.scope || "conversation";
    const format = this.getWorkingMemoryFormat();
    const hasTemplate = Boolean(
      "template" in this.workingMemoryConfig && this.workingMemoryConfig.template,
    );
    const hasSchema = Boolean(
      "schema" in this.workingMemoryConfig && this.workingMemoryConfig.schema,
    );

    let template: string | null = null;
    let schemaSummary: Record<string, string> | null = null;

    if (hasTemplate && "template" in this.workingMemoryConfig) {
      template = this.workingMemoryConfig.template ?? null;
    }

    if (hasSchema && "schema" in this.workingMemoryConfig && this.workingMemoryConfig.schema) {
      const schemaShape = this.workingMemoryConfig.schema.shape;
      schemaSummary = Object.fromEntries(
        Object.entries(schemaShape || {}).map(([key, value]) => {
          const typeName = (value as z.ZodTypeAny)?._def?.typeName;
          const friendlyName = typeName ? typeName.replace(/^Zod/, "").toLowerCase() : "unknown";
          return [key, friendlyName];
        }),
      );
    }

    return {
      enabled: true,
      scope,
      format,
      hasTemplate,
      hasSchema,
      template,
      schema: schemaSummary,
    };
  }

  // ============================================================================
  // Workflow State Operations
  // ============================================================================

  /**
   * Get workflow state by execution ID
   */
  async getWorkflowState(executionId: string): Promise<WorkflowStateEntry | null> {
    return this.storage.getWorkflowState(executionId);
  }

  /**
   * Set workflow state
   */
  async setWorkflowState(executionId: string, state: WorkflowStateEntry): Promise<void> {
    return this.storage.setWorkflowState(executionId, state);
  }

  /**
   * Update workflow state
   */
  async updateWorkflowState(
    executionId: string,
    updates: Partial<WorkflowStateEntry>,
  ): Promise<void> {
    return this.storage.updateWorkflowState(executionId, updates);
  }

  /**
   * Get suspended workflow states for a workflow
   */
  async getSuspendedWorkflowStates(workflowId: string): Promise<WorkflowStateEntry[]> {
    return this.storage.getSuspendedWorkflowStates(workflowId);
  }
}

// Re-export types
export * from "./types";
export * from "./errors";

// Export vector adapter types
export type {
  VectorAdapter,
  VectorItem,
  VectorSearchOptions,
  SearchResult,
} from "./adapters/vector/types";

// Export vector math utilities
export { cosineSimilarity } from "./utils/vector-math";
