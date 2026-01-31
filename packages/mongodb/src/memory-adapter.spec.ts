/**
 * MongoDB Storage Adapter for Memory
 * Stores conversations and messages in MongoDB database
 */

import { ConversationAlreadyExistsError, ConversationNotFoundError } from "@voltagent/core";
import type {
  Conversation,
  ConversationQueryOptions,
  ConversationStepRecord,
  CreateConversationInput,
  GetConversationStepsOptions,
  GetMessagesOptions,
  StorageAdapter,
  WorkflowRunQuery,
  WorkflowStateEntry,
  WorkingMemoryScope,
} from "@voltagent/core";
import type { UIMessage } from "ai";
import { type Collection, type Db, type Document, MongoClient } from "mongodb";

/**
 * MongoDB configuration options for Memory
 */
export interface MongoDBMemoryOptions {
  /**
   * MongoDB connection URI
   * Examples:
   * - "mongodb://localhost:27017"
   * - "mongodb://username:password@localhost:27017"
   * - "mongodb+srv://username:password@cluster.mongodb.net"
   */
  connection: string;

  /**
   * Database name to use for collections
   * @default "voltagent"
   */
  database?: string;

  /**
   * Prefix for collection names
   * @default "voltagent_memory"
   */
  collectionPrefix?: string;

  /**
   * Whether to enable debug logging
   * @default false
   */
  debug?: boolean;
}

/**
 * MongoDB Storage Adapter for Memory
 * Production-ready storage for conversations and messages
 */
export class MongoDBMemoryAdapter implements StorageAdapter {
  private client: MongoClient;
  private db: Db | null = null;
  private databaseName: string;
  private collectionPrefix: string;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private debug: boolean;

  constructor(options: MongoDBMemoryOptions) {
    this.databaseName = options.database ?? "voltagent";
    this.collectionPrefix = options.collectionPrefix ?? "voltagent_memory";
    this.debug = options.debug ?? false;

    // Validate collection prefix
    if (
      this.collectionPrefix.includes("\0") ||
      this.collectionPrefix.includes("$") ||
      this.collectionPrefix.startsWith("system.")
    ) {
      throw new Error(`Invalid collection prefix: ${this.collectionPrefix}`);
    }

    // Create MongoDB client
    this.client = new MongoClient(options.connection);

    this.log("MongoDB Memory adapter initialized");

    // Start initialization but don't await it
    this.initPromise = this.initialize();
  }

  /**
   * Log debug messages
   */
  private log(...args: any[]): void {
    if (this.debug) {
      console.log("[MongoDB Memory]", ...args);
    }
  }

  /**
   * Generate a random ID
   */
  private generateId(): string {
    return (
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
  }

  /**
   * Get collection by name
   */
  private getCollection<T extends Document = Document>(collectionName: string): Collection<T> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    return this.db.collection<T>(`${this.collectionPrefix}_${collectionName}`);
  }

  /**
   * Initialize database schema
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    // Prevent multiple simultaneous initializations
    if (this.initPromise && !this.initialized) {
      return this.initPromise;
    }

    try {
      // Connect to MongoDB
      await this.client.connect();
      this.db = this.client.db(this.databaseName);

      this.log(`Connected to MongoDB database: ${this.databaseName}`);

      // Create indexes for all collections
      const conversationsCollection = this.getCollection("conversations");
      const messagesCollection = this.getCollection("messages");
      const workflowStatesCollection = this.getCollection("workflow_states");
      const stepsCollection = this.getCollection("steps");

      // Users collection indexes (none needed beyond _id)

      // Conversations collection indexes
      await conversationsCollection.createIndex({ userId: 1 }, { background: true });
      await conversationsCollection.createIndex({ resourceId: 1 }, { background: true });
      await conversationsCollection.createIndex({ updatedAt: -1 }, { background: true });

      // Messages collection indexes
      await messagesCollection.createIndex(
        { conversationId: 1, createdAt: 1 },
        { background: true },
      );
      await messagesCollection.createIndex({ conversationId: 1 }, { background: true });
      // Unique compound index to enforce message uniqueness
      await messagesCollection.createIndex(
        { conversationId: 1, messageId: 1 },
        { unique: true, background: true },
      );

      // Workflow states collection indexes
      await workflowStatesCollection.createIndex({ workflowId: 1 }, { background: true });
      await workflowStatesCollection.createIndex({ status: 1 }, { background: true });
      await workflowStatesCollection.createIndex({ createdAt: -1 }, { background: true });

      // Steps collection indexes
      await stepsCollection.createIndex({ conversationId: 1, stepIndex: 1 }, { background: true });
      await stepsCollection.createIndex(
        { conversationId: 1, operationId: 1 },
        { background: true },
      );

      this.initialized = true;
      this.log("Database schema initialized with indexes");
    } catch (error) {
      throw new Error(
        `Failed to connect to MongoDB: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Close MongoDB connection
   */
  async close(): Promise<void> {
    await this.client.close();
    this.log("MongoDB connection closed");
  }

  // ============================================================================
  // Message Operations
  // ============================================================================

  /**
   * Add a single message
   */
  async addMessage(message: UIMessage, userId: string, conversationId: string): Promise<void> {
    await this.initPromise;

    const messagesCollection = this.getCollection("messages");

    // Ensure conversation exists
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    const messageId = message.id || this.generateId();

    try {
      await messagesCollection.insertOne({
        _id: undefined, // Let MongoDB generate ObjectId
        conversationId,
        messageId,
        userId,
        role: message.role,
        parts: message.parts,
        metadata: message.metadata || {},
        formatVersion: 2,
        createdAt: new Date(),
      } as any);

      this.log(`Added message ${messageId} to conversation ${conversationId}`);
    } catch (error: any) {
      if (error.code === 11000) {
        throw new Error(
          `Message with ID ${messageId} already exists in conversation ${conversationId}`,
        );
      }
      throw error;
    }
  }

  /**
   * Add multiple messages
   */
  async addMessages(messages: UIMessage[], userId: string, conversationId: string): Promise<void> {
    await this.initPromise;

    if (messages.length === 0) return;

    const messagesCollection = this.getCollection("messages");

    // Ensure conversation exists
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    const documentsToInsert = messages.map((message) => ({
      _id: undefined, // Let MongoDB generate ObjectId
      conversationId,
      messageId: message.id || this.generateId(),
      userId,
      role: message.role,
      parts: message.parts,
      metadata: message.metadata || {},
      formatVersion: 2,
      createdAt: new Date(),
    }));

    try {
      await messagesCollection.insertMany(documentsToInsert as any);
      this.log(`Added ${messages.length} messages to conversation ${conversationId}`);
    } catch (error: any) {
      if (error.code === 11000) {
        throw new Error(`One or more messages already exist in conversation ${conversationId}`);
      }
      throw error;
    }
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(
    userId: string,
    conversationId: string,
    options?: GetMessagesOptions,
  ): Promise<UIMessage<{ createdAt: Date }>[]> {
    await this.initPromise;

    const messagesCollection = this.getCollection("messages");

    const filter: any = { conversationId, userId };

    if (options?.roles && options.roles.length > 0) {
      filter.role = { $in: options.roles };
    }

    if (options?.after) {
      filter.createdAt = { $gt: options.after };
    }

    if (options?.before) {
      filter.createdAt = { ...filter.createdAt, $lt: options.before };
    }

    let cursor = messagesCollection.find(filter).sort({ createdAt: 1 });

    if (options?.limit) {
      cursor = cursor.limit(options.limit);
    }

    const messages = await cursor.toArray();

    return messages.map((msg: any) => ({
      id: msg.messageId,
      role: msg.role,
      parts: msg.parts,
      metadata: {
        ...msg.metadata,
        createdAt: msg.createdAt,
      },
    }));
  }

  /**
   * Clear messages for a conversation or all conversations for a user
   */
  async clearMessages(userId: string, conversationId?: string): Promise<void> {
    await this.initPromise;

    const messagesCollection = this.getCollection("messages");
    const stepsCollection = this.getCollection("steps");

    if (conversationId) {
      // Clear messages for specific conversation
      await messagesCollection.deleteMany({ conversationId, userId });
      await stepsCollection.deleteMany({ conversationId, userId });
      this.log(`Cleared messages for conversation ${conversationId}`);
    } else {
      // Clear all messages for user
      // First get all conversation IDs for this user
      const conversationsCollection = this.getCollection("conversations");
      const userConversations = await conversationsCollection
        .find({ userId })
        .project({ _id: 1 })
        .toArray();

      const conversationIds = userConversations.map((conv: any) => conv._id);

      if (conversationIds.length > 0) {
        await messagesCollection.deleteMany({ conversationId: { $in: conversationIds } });
        await stepsCollection.deleteMany({ conversationId: { $in: conversationIds } });
        this.log(`Cleared all messages for user ${userId}`);
      }
    }
  }

  // ============================================================================
  // Conversation Operations
  // ============================================================================

  /**
   * Create a new conversation
   */
  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    await this.initPromise;

    const conversationsCollection = this.getCollection<any>("conversations");

    const now = new Date();
    const conversation = {
      _id: input.id,
      resourceId: input.resourceId,
      userId: input.userId,
      title: input.title,
      metadata: input.metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    try {
      await conversationsCollection.insertOne(conversation as any);
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ConversationAlreadyExistsError(input.id);
      }
      throw error;
    }

    this.log(`Created conversation ${input.id}`);

    return {
      id: conversation._id,
      resourceId: conversation.resourceId,
      userId: conversation.userId,
      title: conversation.title,
      metadata: conversation.metadata,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(id: string): Promise<Conversation | null> {
    await this.initPromise;

    const conversationsCollection = this.getCollection("conversations");
    const conversation = await conversationsCollection.findOne({ _id: id } as any);

    if (!conversation) {
      return null;
    }

    return {
      id: (conversation as any)._id,
      resourceId: (conversation as any).resourceId,
      userId: (conversation as any).userId,
      title: (conversation as any).title,
      metadata: (conversation as any).metadata || {},
      createdAt: (conversation as any).createdAt.toISOString(),
      updatedAt: (conversation as any).updatedAt.toISOString(),
    };
  }

  /**
   * Get all conversations for a resource
   */
  async getConversations(resourceId: string): Promise<Conversation[]> {
    await this.initPromise;

    const conversationsCollection = this.getCollection("conversations");
    const conversations = await conversationsCollection
      .find({ resourceId } as any)
      .sort({ updatedAt: -1 })
      .toArray();

    return conversations.map((conv: any) => ({
      id: conv._id,
      resourceId: conv.resourceId,
      userId: conv.userId,
      title: conv.title,
      metadata: conv.metadata || {},
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
    }));
  }

  /**
   * Get all conversations for a user
   */
  async getConversationsByUserId(
    userId: string,
    options?: Omit<ConversationQueryOptions, "userId">,
  ): Promise<Conversation[]> {
    return this.queryConversations({ ...options, userId });
  }

  /**
   * Query conversations with filters
   */
  async queryConversations(options: ConversationQueryOptions): Promise<Conversation[]> {
    await this.initPromise;

    const conversationsCollection = this.getCollection("conversations");

    const filter: any = {};

    if (options.userId) {
      filter.userId = options.userId;
    }

    if (options.resourceId) {
      filter.resourceId = options.resourceId;
    }

    let cursor = conversationsCollection.find(filter).sort({ updatedAt: -1 });

    if (options.limit) {
      cursor = cursor.limit(options.limit);
    }

    if (options.offset) {
      cursor = cursor.skip(options.offset);
    }

    const conversations = await cursor.toArray();

    return conversations.map((conv: any) => ({
      id: conv._id,
      resourceId: conv.resourceId,
      userId: conv.userId,
      title: conv.title,
      metadata: conv.metadata || {},
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
    }));
  }

  /**
   * Update a conversation
   */
  async updateConversation(
    id: string,
    updates: Partial<Omit<Conversation, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Conversation> {
    await this.initPromise;

    const conversationsCollection = this.getCollection("conversations");

    const updateDoc: any = {
      updatedAt: new Date(),
    };

    if (updates.title !== undefined) {
      updateDoc.title = updates.title;
    }

    if (updates.metadata !== undefined) {
      updateDoc.metadata = updates.metadata;
    }

    if (updates.resourceId !== undefined) {
      updateDoc.resourceId = updates.resourceId;
    }

    if (updates.userId !== undefined) {
      updateDoc.userId = updates.userId;
    }

    const result = await conversationsCollection.findOneAndUpdate(
      { _id: id } as any,
      { $set: updateDoc },
      { returnDocument: "after" },
    );

    if (!result) {
      throw new ConversationNotFoundError(id);
    }

    this.log(`Updated conversation ${id}`);

    return {
      id: (result as any)._id,
      resourceId: (result as any).resourceId,
      userId: (result as any).userId,
      title: (result as any).title,
      metadata: (result as any).metadata || {},
      createdAt: (result as any).createdAt.toISOString(),
      updatedAt: (result as any).updatedAt.toISOString(),
    };
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(id: string): Promise<void> {
    await this.initPromise;

    const conversationsCollection = this.getCollection("conversations");

    // MongoDB will cascade delete messages and steps automatically via application logic
    const messagesCollection = this.getCollection("messages");
    const stepsCollection = this.getCollection("steps");

    await messagesCollection.deleteMany({ conversationId: id } as any);
    await stepsCollection.deleteMany({ conversationId: id } as any);
    await conversationsCollection.deleteOne({ _id: id } as any);

    this.log(`Deleted conversation ${id}`);
  }

  // ============================================================================
  // Conversation Steps Operations
  // ============================================================================

  /**
   * Save conversation steps
   */
  async saveConversationSteps(steps: ConversationStepRecord[]): Promise<void> {
    await this.initPromise;

    if (steps.length === 0) return;

    const stepsCollection = this.getCollection("steps");

    const operations = steps.map((step) => {
      const id = step.id || this.generateId();
      return {
        replaceOne: {
          filter: { _id: id },
          replacement: {
            _id: id,
            conversationId: step.conversationId,
            userId: step.userId,
            agentId: step.agentId,
            agentName: step.agentName,
            operationId: step.operationId,
            stepIndex: step.stepIndex,
            type: step.type,
            role: step.role,
            content: step.content,
            arguments: step.arguments,
            result: step.result,
            usage: step.usage,
            subAgentId: step.subAgentId,
            subAgentName: step.subAgentName,
            createdAt: new Date(),
          },
          upsert: true,
        },
      };
    });

    await stepsCollection.bulkWrite(operations as any);

    this.log(`Saved ${steps.length} conversation steps`);
  }

  /**
   * Get conversation steps
   */
  async getConversationSteps(
    userId: string,
    conversationId: string,
    options?: GetConversationStepsOptions,
  ): Promise<ConversationStepRecord[]> {
    await this.initPromise;

    const stepsCollection = this.getCollection("steps");

    const filter: any = { conversationId, userId };

    if (options?.operationId) {
      filter.operationId = options.operationId;
    }

    let cursor = stepsCollection.find(filter).sort({ stepIndex: 1 });

    if (options?.limit) {
      cursor = cursor.limit(options.limit);
    }

    const steps = await cursor.toArray();

    return steps.map((step: any) => ({
      id: step._id,
      conversationId: step.conversationId,
      userId: step.userId,
      agentId: step.agentId,
      agentName: step.agentName,
      operationId: step.operationId,
      stepIndex: step.stepIndex,
      type: step.type,
      role: step.role,
      content: step.content,
      arguments: step.arguments,
      result: step.result,
      usage: step.usage,
      subAgentId: step.subAgentId,
      subAgentName: step.subAgentName,
      createdAt: step.createdAt.toISOString(),
    }));
  }

  // ============================================================================
  // Working Memory Operations
  // ============================================================================

  /**
   * Get working memory
   */
  async getWorkingMemory(params: {
    conversationId?: string;
    userId?: string;
    scope: WorkingMemoryScope;
  }): Promise<string | null> {
    await this.initPromise;

    if (params.scope === "conversation" && params.conversationId) {
      const conversationsCollection = this.getCollection("conversations");
      const conversation = await conversationsCollection.findOne({
        _id: params.conversationId,
      } as any);

      if (!conversation) {
        return null;
      }

      const workingMemory = (conversation as any).metadata?.workingMemory;
      return workingMemory || null;
    }

    if (params.scope === "user" && params.userId) {
      const usersCollection = this.getCollection("users");
      const user = await usersCollection.findOne({ _id: params.userId } as any);

      if (!user) {
        return null;
      }

      const workingMemory = (user as any).metadata?.workingMemory;
      return workingMemory || null;
    }

    return null;
  }

  /**
   * Set working memory
   */
  async setWorkingMemory(params: {
    conversationId?: string;
    userId?: string;
    content: string;
    scope: WorkingMemoryScope;
  }): Promise<void> {
    await this.initPromise;

    if (params.scope === "conversation" && params.conversationId) {
      const conversationsCollection = this.getCollection("conversations");

      const conversation = await conversationsCollection.findOne({
        _id: params.conversationId,
      } as any);
      if (!conversation) {
        throw new ConversationNotFoundError(params.conversationId);
      }

      await conversationsCollection.updateOne({ _id: params.conversationId } as any, {
        $set: {
          "metadata.workingMemory": params.content,
          updatedAt: new Date(),
        },
      });

      this.log(`Set working memory for conversation ${params.conversationId}`);
    } else if (params.scope === "user" && params.userId) {
      const usersCollection = this.getCollection("users");

      // Upsert user document with working memory
      await usersCollection.updateOne(
        { _id: params.userId } as any,
        {
          $set: {
            "metadata.workingMemory": params.content,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );

      this.log(`Set working memory for user ${params.userId}`);
    }
  }

  /**
   * Delete working memory
   */
  async deleteWorkingMemory(params: {
    conversationId?: string;
    userId?: string;
    scope: WorkingMemoryScope;
  }): Promise<void> {
    await this.initPromise;

    if (params.scope === "conversation" && params.conversationId) {
      const conversationsCollection = this.getCollection("conversations");

      await conversationsCollection.updateOne({ _id: params.conversationId } as any, {
        $unset: { "metadata.workingMemory": "" },
        $set: { updatedAt: new Date() },
      });

      this.log(`Deleted working memory for conversation ${params.conversationId}`);
    } else if (params.scope === "user" && params.userId) {
      const usersCollection = this.getCollection("users");

      await usersCollection.updateOne({ _id: params.userId } as any, {
        $unset: { "metadata.workingMemory": "" },
        $set: { updatedAt: new Date() },
      });

      this.log(`Deleted working memory for user ${params.userId}`);
    }
  }

  // ============================================================================
  // Workflow State Operations
  // ============================================================================

  /**
   * Get workflow state by execution ID
   */
  async getWorkflowState(executionId: string): Promise<WorkflowStateEntry | null> {
    await this.initPromise;

    const workflowStatesCollection = this.getCollection("workflow_states");
    const state = await workflowStatesCollection.findOne({ _id: executionId } as any);

    if (!state) {
      return null;
    }

    return {
      id: (state as any)._id,
      workflowId: (state as any).workflowId,
      workflowName: (state as any).workflowName,
      status: (state as any).status,
      suspension: (state as any).suspension,
      events: (state as any).events,
      output: (state as any).output,
      cancellation: (state as any).cancellation,
      userId: (state as any).userId,
      conversationId: (state as any).conversationId,
      metadata: (state as any).metadata,
      createdAt: (state as any).createdAt,
      updatedAt: (state as any).updatedAt,
    };
  }

  /**
   * Query workflow runs with filters
   */
  async queryWorkflowRuns(query: WorkflowRunQuery): Promise<WorkflowStateEntry[]> {
    await this.initPromise;

    const workflowStatesCollection = this.getCollection("workflow_states");

    const filter: any = {};

    if (query.workflowId) {
      filter.workflowId = query.workflowId;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.from) {
      filter.createdAt = { $gte: query.from };
    }

    if (query.to) {
      filter.createdAt = { ...filter.createdAt, $lte: query.to };
    }

    let cursor = workflowStatesCollection.find(filter).sort({ createdAt: -1 });

    if (query.limit) {
      cursor = cursor.limit(query.limit);
    }

    if (query.offset) {
      cursor = cursor.skip(query.offset);
    }

    const states = await cursor.toArray();

    return states.map((state: any) => ({
      id: state._id,
      workflowId: state.workflowId,
      workflowName: state.workflowName,
      status: state.status,
      suspension: state.suspension,
      events: state.events,
      output: state.output,
      cancellation: state.cancellation,
      userId: state.userId,
      conversationId: state.conversationId,
      metadata: state.metadata,
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
    }));
  }

  /**
   * Set workflow state (create or replace)
   */
  async setWorkflowState(executionId: string, state: WorkflowStateEntry): Promise<void> {
    await this.initPromise;

    const workflowStatesCollection = this.getCollection("workflow_states");

    const now = new Date();

    await workflowStatesCollection.replaceOne(
      { _id: executionId } as any,
      {
        _id: executionId,
        workflowId: state.workflowId,
        workflowName: state.workflowName,
        status: state.status,
        suspension: state.suspension,
        events: state.events,
        output: state.output,
        cancellation: state.cancellation,
        userId: state.userId,
        conversationId: state.conversationId,
        metadata: state.metadata,
        createdAt: state.createdAt ? new Date(state.createdAt) : now,
        updatedAt: now,
      } as any,
      { upsert: true },
    );

    this.log(`Set workflow state ${executionId}`);
  }

  /**
   * Update workflow state (partial update)
   */
  async updateWorkflowState(
    executionId: string,
    updates: Partial<WorkflowStateEntry>,
  ): Promise<void> {
    await this.initPromise;

    const workflowStatesCollection = this.getCollection("workflow_states");

    const updateDoc: any = {
      updatedAt: new Date(),
    };

    if (updates.status !== undefined) {
      updateDoc.status = updates.status;
    }

    if (updates.suspension !== undefined) {
      updateDoc.suspension = updates.suspension;
    }

    if (updates.events !== undefined) {
      updateDoc.events = updates.events;
    }

    if (updates.output !== undefined) {
      updateDoc.output = updates.output;
    }

    if (updates.cancellation !== undefined) {
      updateDoc.cancellation = updates.cancellation;
    }

    if (updates.metadata !== undefined) {
      updateDoc.metadata = updates.metadata;
    }

    await workflowStatesCollection.updateOne({ _id: executionId } as any, { $set: updateDoc });

    this.log(`Updated workflow state ${executionId}`);
  }

  /**
   * Get suspended workflow states
   */
  async getSuspendedWorkflowStates(workflowId: string): Promise<WorkflowStateEntry[]> {
    await this.initPromise;

    const workflowStatesCollection = this.getCollection("workflow_states");

    const states = await workflowStatesCollection
      .find({ workflowId, status: "suspended" } as any)
      .sort({ createdAt: -1 })
      .toArray();

    return states.map((state: any) => ({
      id: state._id,
      workflowId: state.workflowId,
      workflowName: state.workflowName,
      status: state.status,
      suspension: state.suspension,
      events: state.events,
      output: state.output,
      cancellation: state.cancellation,
      userId: state.userId,
      conversationId: state.conversationId,
      metadata: state.metadata,
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
    }));
  }
}
