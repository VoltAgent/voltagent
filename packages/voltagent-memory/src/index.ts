import {
  AgentRegistry,
  type Conversation,
  type ConversationQueryOptions,
  type ConversationStepRecord,
  type CreateConversationInput,
  type GetConversationStepsOptions,
  type GetMessagesOptions,
  type OperationContext,
  type SearchResult,
  type StorageAdapter,
  type VectorAdapter,
  type VectorItem,
  type VoltOpsClient,
  type WorkflowStateEntry,
  type WorkingMemoryScope,
} from "@voltagent/core";
import type {
  ManagedMemoryConnectionInfo,
  ManagedMemoryCredentialCreateResult,
  ManagedMemoryCredentialListResult,
  ManagedMemoryDatabaseSummary,
} from "@voltagent/core";
import { safeStringify } from "@voltagent/internal";
import type { UIMessage } from "ai";

export interface ManagedMemoryAdapterOptions {
  databaseId?: string;
  databaseName?: string;
  voltOpsClient?: VoltOpsClient;
  debug?: boolean;
}

export class ManagedMemoryAdapter implements StorageAdapter {
  private readonly options: ManagedMemoryAdapterOptions;
  private voltOpsClient?: VoltOpsClient;
  private readonly debug: boolean;
  private initializationPromise: Promise<void> | null = null;
  private initCheckInterval?: NodeJS.Timeout;
  private initializationAttempts = 0;
  private readonly maxInitializationAttempts = 50;
  private database?: ManagedMemoryDatabaseSummary;
  private connection?: ManagedMemoryConnectionInfo;

  constructor(options: ManagedMemoryAdapterOptions) {
    this.options = options;
    this.debug = options.debug ?? false;
    this.voltOpsClient = this.resolveVoltOpsClient(options);

    if (this.voltOpsClient?.hasValidKeys()) {
      this.initializationPromise = this.initialize();
    } else {
      this.startInitializationCheck();
    }
  }

  private resolveVoltOpsClient(options: ManagedMemoryAdapterOptions): VoltOpsClient | undefined {
    if (options.voltOpsClient) {
      return options.voltOpsClient;
    }

    const registryClient = AgentRegistry.getInstance().getGlobalVoltOpsClient();
    if (registryClient?.hasValidKeys()) {
      return registryClient;
    }

    return undefined;
  }

  private async initialize(): Promise<void> {
    if (!this.voltOpsClient) {
      throw new Error(
        "VoltOps client is not available for managed memory initialization. " +
          "Set VOLTAGENT_PUBLIC_KEY and VOLTAGENT_SECRET_KEY environment variables, " +
          "or pass voltOpsClient explicitly. " +
          "See: https://voltagent.dev/docs/agents/memory/managed-memory",
      );
    }

    this.log("Loading managed memory databases via VoltOps API");
    const databases = await this.voltOpsClient.listManagedMemoryDatabases();

    if (!Array.isArray(databases) || databases.length === 0) {
      throw new Error("No managed memory databases found for the provided VoltOps credentials.");
    }

    const targetDatabase = this.findTargetDatabase(databases);
    if (!targetDatabase) {
      throw new Error(
        `Unable to locate managed memory database. Provided databaseId=${this.options.databaseId ?? "-"}, databaseName=${
          this.options.databaseName ?? "-"
        }.`,
      );
    }

    this.database = targetDatabase;
    this.connection = targetDatabase.connection;

    this.log(
      "Managed memory adapter initialized",
      safeStringify({
        databaseId: targetDatabase.id,
        databaseName: targetDatabase.name,
        region: targetDatabase.region,
      }),
    );
  }

  private findTargetDatabase(
    databases: ManagedMemoryDatabaseSummary[],
  ): ManagedMemoryDatabaseSummary | undefined {
    if (this.options.databaseId) {
      const match = databases.find((db) => db.id === this.options.databaseId);
      if (match) {
        return match;
      }
    }

    if (this.options.databaseName) {
      const needle = this.options.databaseName.toLowerCase();
      const match = databases.find((db) => db.name.toLowerCase() === needle);
      if (match) {
        return match;
      }
    }

    return undefined;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.voltOpsClient) {
      this.startInitializationCheck();
    }

    if (!this.initializationPromise && this.voltOpsClient?.hasValidKeys() && !this.database) {
      this.initializationPromise = this.initialize();
    }

    if (this.initializationPromise) {
      await this.initializationPromise.catch((error) => {
        this.log("Managed memory initialization failed", String(error));
        throw error;
      });
      this.initializationPromise = null;
    }
  }

  private async withClientContext<T>(
    handler: (context: {
      client: VoltOpsClient;
      database: ManagedMemoryDatabaseSummary;
    }) => Promise<T>,
  ): Promise<T> {
    await this.ensureInitialized();

    if (!this.voltOpsClient) {
      throw new Error("VoltOps client is not available to execute managed memory operation");
    }

    if (!this.database) {
      throw new Error("Managed memory database metadata is unavailable");
    }

    return handler({ client: this.voltOpsClient, database: this.database });
  }

  private log(message: string, context?: string): void {
    if (this.debug) {
      console.log("[ManagedMemoryAdapter]", message, context ?? "");
    }
  }

  addMessage(
    message: UIMessage,
    userId: string,
    conversationId: string,
    _context?: OperationContext,
  ): Promise<void> {
    return this.withClientContext(async ({ client, database }) => {
      this.log("Executing managed memory addMessage", safeStringify({ userId, conversationId }));
      await client.managedMemory.messages.add(database.id, { message, userId, conversationId });
    }).then(() => undefined);
  }

  addMessages(
    messages: UIMessage[],
    userId: string,
    conversationId: string,
    _context?: OperationContext,
  ): Promise<void> {
    return this.withClientContext(async ({ client, database }) => {
      this.log(
        "Executing managed memory addMessages",
        safeStringify({ count: messages.length, userId, conversationId }),
      );
      await client.managedMemory.messages.addBatch(database.id, {
        messages,
        userId,
        conversationId,
      });
    }).then(() => undefined);
  }

  getMessages(
    userId: string,
    conversationId: string,
    options?: GetMessagesOptions,
    _context?: OperationContext,
  ): Promise<UIMessage<{ createdAt: Date }>[]> {
    return this.withClientContext(async ({ client, database }) => {
      this.log(
        "Fetching managed memory messages",
        safeStringify({ userId, conversationId, options }),
      );
      const messages = await client.managedMemory.messages.list(database.id, {
        userId,
        conversationId,
        options,
      });
      return messages as UIMessage<{ createdAt: Date }>[];
    });
  }

  saveConversationSteps(steps: ConversationStepRecord[]): Promise<void> {
    if (!steps.length) {
      return Promise.resolve();
    }

    return this.withClientContext(async ({ client, database }) => {
      this.log(
        "Saving managed memory conversation steps",
        safeStringify({ count: steps.length, conversationId: steps[0]?.conversationId }),
      );
      await client.managedMemory.steps.save(database.id, steps);
    }).then(() => undefined);
  }

  getConversationSteps(
    userId: string,
    conversationId: string,
    options?: GetConversationStepsOptions,
  ): Promise<ConversationStepRecord[]> {
    return this.withClientContext(({ client, database }) => {
      this.log(
        "Fetching managed memory conversation steps",
        safeStringify({ userId, conversationId, options }),
      );
      return client.managedMemory.steps.list(database.id, { userId, conversationId, options });
    });
  }

  clearMessages(
    userId: string,
    conversationId?: string,
    _context?: OperationContext,
  ): Promise<void> {
    return this.withClientContext(async ({ client, database }) => {
      this.log("Clearing managed memory messages", safeStringify({ userId, conversationId }));
      await client.managedMemory.messages.clear(database.id, { userId, conversationId });
    }).then(() => undefined);
  }

  deleteMessages(
    messageIds: string[],
    userId: string,
    conversationId: string,
    _context?: OperationContext,
  ): Promise<void> {
    return this.withClientContext(async ({ client, database }) => {
      if (messageIds.length === 0) {
        return;
      }

      this.log(
        "Deleting managed memory messages",
        safeStringify({ count: messageIds.length, userId, conversationId }),
      );
      await client.managedMemory.messages.delete(database.id, {
        messageIds,
        userId,
        conversationId,
      });
    }).then(() => undefined);
  }

  createConversation(input: CreateConversationInput): Promise<Conversation> {
    return this.withClientContext(({ client, database }) => {
      this.log("Creating managed memory conversation", safeStringify({ conversationId: input.id }));
      return client.managedMemory.conversations.create(database.id, input);
    });
  }

  getConversation(id: string): Promise<Conversation | null> {
    return this.withClientContext(({ client, database }) => {
      this.log("Fetching managed memory conversation", safeStringify({ id }));
      return client.managedMemory.conversations.get(database.id, id);
    });
  }

  getConversations(resourceId: string): Promise<Conversation[]> {
    return this.withClientContext(({ client, database }) => {
      this.log("Listing managed memory conversations by resource", safeStringify({ resourceId }));
      return client.managedMemory.conversations.query(database.id, { resourceId });
    });
  }

  getConversationsByUserId(
    userId: string,
    options?: Omit<ConversationQueryOptions, "userId">,
  ): Promise<Conversation[]> {
    return this.withClientContext(({ client, database }) => {
      this.log("Listing managed memory conversations by user", safeStringify({ userId, options }));
      return client.managedMemory.conversations.query(database.id, { ...options, userId });
    });
  }

  queryConversations(options: ConversationQueryOptions): Promise<Conversation[]> {
    return this.withClientContext(({ client, database }) => {
      this.log("Querying managed memory conversations", safeStringify(options));
      return client.managedMemory.conversations.query(database.id, options);
    });
  }

  countConversations(options: ConversationQueryOptions): Promise<number> {
    return this.withClientContext(async ({ client, database }) => {
      const pageSize = 200;
      let offset = 0;
      let total = 0;

      while (true) {
        const page = await client.managedMemory.conversations.query(database.id, {
          userId: options.userId,
          resourceId: options.resourceId,
          orderBy: options.orderBy,
          orderDirection: options.orderDirection,
          limit: pageSize,
          offset,
        });

        total += page.length;

        if (page.length < pageSize) {
          break;
        }

        offset += pageSize;
      }

      return total;
    });
  }

  updateConversation(
    id: string,
    updates: Partial<Omit<Conversation, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Conversation> {
    return this.withClientContext(({ client, database }) => {
      this.log("Updating managed memory conversation", safeStringify({ id, updates }));
      return client.managedMemory.conversations.update(database.id, {
        conversationId: id,
        updates,
      });
    });
  }

  deleteConversation(id: string): Promise<void> {
    return this.withClientContext(async ({ client, database }) => {
      this.log("Deleting managed memory conversation", safeStringify({ id }));
      await client.managedMemory.conversations.delete(database.id, id);
    }).then(() => undefined);
  }

  getWorkingMemory(params: {
    conversationId?: string;
    userId?: string;
    scope: WorkingMemoryScope;
  }): Promise<string | null> {
    return this.withClientContext(({ client, database }) => {
      this.log("Fetching managed memory working memory", safeStringify(params));
      return client.managedMemory.workingMemory.get(database.id, params);
    });
  }

  setWorkingMemory(params: {
    conversationId?: string;
    userId?: string;
    content: string;
    scope: WorkingMemoryScope;
  }): Promise<void> {
    return this.withClientContext(async ({ client, database }) => {
      this.log(
        "Setting managed memory working memory",
        safeStringify({ ...params, content: params.content.length }),
      );
      await client.managedMemory.workingMemory.set(database.id, params);
    }).then(() => undefined);
  }

  deleteWorkingMemory(params: {
    conversationId?: string;
    userId?: string;
    scope: WorkingMemoryScope;
  }): Promise<void> {
    return this.withClientContext(async ({ client, database }) => {
      this.log("Deleting managed memory working memory", safeStringify(params));
      await client.managedMemory.workingMemory.delete(database.id, params);
    }).then(() => undefined);
  }

  getWorkflowState(executionId: string): Promise<WorkflowStateEntry | null> {
    return this.withClientContext(({ client, database }) => {
      this.log("Fetching managed memory workflow state", safeStringify({ executionId }));
      return client.managedMemory.workflowStates.get(database.id, executionId);
    });
  }

  queryWorkflowRuns(query: {
    workflowId?: string;
    status?: WorkflowStateEntry["status"];
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  }): Promise<WorkflowStateEntry[]> {
    return this.withClientContext(({ client, database }) => {
      this.log("Querying managed memory workflow states", safeStringify(query));
      return client.managedMemory.workflowStates.query(database.id, query);
    });
  }

  setWorkflowState(executionId: string, state: WorkflowStateEntry): Promise<void> {
    return this.withClientContext(async ({ client, database }) => {
      this.log("Setting managed memory workflow state", safeStringify({ executionId }));
      await client.managedMemory.workflowStates.set(database.id, executionId, state);
    }).then(() => undefined);
  }

  updateWorkflowState(executionId: string, updates: Partial<WorkflowStateEntry>): Promise<void> {
    return this.withClientContext(async ({ client, database }) => {
      this.log("Updating managed memory workflow state", safeStringify({ executionId, updates }));
      await client.managedMemory.workflowStates.update(database.id, { executionId, updates });
    }).then(() => undefined);
  }

  getSuspendedWorkflowStates(workflowId: string): Promise<WorkflowStateEntry[]> {
    return this.withClientContext(({ client, database }) => {
      this.log("Fetching suspended workflow states", safeStringify({ workflowId }));
      return client.managedMemory.workflowStates.listSuspended(database.id, workflowId);
    });
  }

  private startInitializationCheck(): void {
    if (this.initCheckInterval || this.voltOpsClient?.hasValidKeys()) {
      return;
    }

    this.initCheckInterval = setInterval(() => {
      this.initializationAttempts++;

      if (!this.voltOpsClient) {
        const registryClient = AgentRegistry.getInstance().getGlobalVoltOpsClient();
        if (registryClient?.hasValidKeys()) {
          this.voltOpsClient = registryClient;
          this.initializationPromise = this.initialize();
        }
      }

      const initialized = Boolean(this.database);
      const exhausted = this.initializationAttempts >= this.maxInitializationAttempts;

      if (initialized || exhausted) {
        if (this.initCheckInterval) {
          clearInterval(this.initCheckInterval);
          this.initCheckInterval = undefined;
        }

        if (exhausted && !this.voltOpsClient) {
          this.log("VoltOps client not available after waiting for managed memory initialization");
        }
      }
    }, 100);
  }

  async getConnectionInfo(): Promise<ManagedMemoryConnectionInfo | undefined> {
    await this.ensureInitialized();
    return this.connection;
  }

  async getDatabaseMetadata(): Promise<ManagedMemoryDatabaseSummary | undefined> {
    await this.ensureInitialized();
    return this.database;
  }

  async listCredentials(): Promise<ManagedMemoryCredentialListResult> {
    await this.ensureInitialized();
    if (!this.database) {
      throw new Error("Managed memory database metadata is unavailable");
    }
    if (!this.voltOpsClient) {
      throw new Error("VoltOps client is not available to list managed memory credentials");
    }

    return this.voltOpsClient.listManagedMemoryCredentials(this.database.id);
  }

  async createCredential(name?: string): Promise<ManagedMemoryCredentialCreateResult> {
    await this.ensureInitialized();
    if (!this.database) {
      throw new Error("Managed memory database metadata is unavailable");
    }
    if (!this.voltOpsClient) {
      throw new Error("VoltOps client is not available to create managed memory credential");
    }

    return this.voltOpsClient.createManagedMemoryCredential(this.database.id, { name });
  }
}

export class ManagedMemoryVectorAdapter implements VectorAdapter {
  private readonly options: ManagedMemoryAdapterOptions;
  private voltOpsClient?: VoltOpsClient;
  private readonly debug: boolean;
  private initializationPromise: Promise<void> | null = null;
  private initCheckInterval?: NodeJS.Timeout;
  private initializationAttempts = 0;
  private readonly maxInitializationAttempts = 50;
  private database?: ManagedMemoryDatabaseSummary;

  constructor(options: ManagedMemoryAdapterOptions) {
    this.options = options;
    this.debug = options.debug ?? false;
    this.voltOpsClient = options.voltOpsClient ?? this.resolveVoltOpsClient(options);

    if (this.voltOpsClient?.hasValidKeys()) {
      this.initializationPromise = this.initialize();
    } else {
      this.startInitializationCheck();
    }
  }

  private resolveVoltOpsClient(options: ManagedMemoryAdapterOptions): VoltOpsClient | undefined {
    if (options.voltOpsClient) {
      return options.voltOpsClient;
    }

    const registryClient = AgentRegistry.getInstance().getGlobalVoltOpsClient();
    if (registryClient?.hasValidKeys()) {
      return registryClient;
    }

    return undefined;
  }

  private async initialize(): Promise<void> {
    if (!this.voltOpsClient) {
      throw new Error(
        "VoltOps client is not available for managed memory initialization. " +
          "Set VOLTAGENT_PUBLIC_KEY and VOLTAGENT_SECRET_KEY environment variables, " +
          "or pass voltOpsClient explicitly. " +
          "See: https://voltagent.dev/docs/agents/memory/managed-memory",
      );
    }

    this.log("Loading managed memory databases via VoltOps API");
    const databases = await this.voltOpsClient.listManagedMemoryDatabases();

    if (!Array.isArray(databases) || databases.length === 0) {
      throw new Error("No managed memory databases found for the provided VoltOps credentials.");
    }

    const targetDatabase = this.findTargetDatabase(databases);
    if (!targetDatabase) {
      throw new Error(
        `Unable to locate managed memory database. Provided databaseId=${this.options.databaseId ?? "-"}, databaseName=${
          this.options.databaseName ?? "-"
        }.`,
      );
    }

    this.database = targetDatabase;

    this.log(
      "Managed memory vector adapter initialized",
      safeStringify({
        databaseId: targetDatabase.id,
        databaseName: targetDatabase.name,
        region: targetDatabase.region,
      }),
    );
  }

  private findTargetDatabase(
    databases: ManagedMemoryDatabaseSummary[],
  ): ManagedMemoryDatabaseSummary | undefined {
    if (this.options.databaseId) {
      const match = databases.find((db) => db.id === this.options.databaseId);
      if (match) {
        return match;
      }
    }

    if (this.options.databaseName) {
      const needle = this.options.databaseName.toLowerCase();
      const match = databases.find((db) => db.name.toLowerCase() === needle);
      if (match) {
        return match;
      }
    }

    return undefined;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.voltOpsClient) {
      this.startInitializationCheck();
    }

    if (!this.initializationPromise && this.voltOpsClient?.hasValidKeys() && !this.database) {
      this.initializationPromise = this.initialize();
    }

    if (this.initializationPromise) {
      await this.initializationPromise.catch((error) => {
        this.log("Managed memory vector initialization failed", String(error));
        throw error;
      });
      this.initializationPromise = null;
    }

    if (!this.database) {
      throw new Error("ManagedMemoryVectorAdapter failed to initialize managed database metadata");
    }
  }

  private startInitializationCheck(): void {
    if (this.initCheckInterval || this.voltOpsClient?.hasValidKeys()) {
      return;
    }

    this.initCheckInterval = setInterval(() => {
      this.initializationAttempts++;

      if (!this.voltOpsClient) {
        const registryClient = AgentRegistry.getInstance().getGlobalVoltOpsClient();
        if (registryClient?.hasValidKeys()) {
          this.voltOpsClient = registryClient;
          this.initializationPromise = this.initialize();
        }
      }

      const initialized = Boolean(this.database);
      const exhausted = this.initializationAttempts >= this.maxInitializationAttempts;

      if (initialized || exhausted) {
        if (this.initCheckInterval) {
          clearInterval(this.initCheckInterval);
          this.initCheckInterval = undefined;
        }

        if (exhausted && !this.voltOpsClient) {
          this.log("VoltOps client not available after waiting for managed memory initialization");
        }
      }
    }, 100);
  }

  private async withClientContext<T>(
    handler: (context: {
      client: VoltOpsClient;
      database: ManagedMemoryDatabaseSummary;
    }) => Promise<T>,
  ): Promise<T> {
    await this.ensureInitialized();

    if (!this.voltOpsClient) {
      throw new Error("VoltOps client is not available to execute managed memory operation");
    }

    if (!this.database) {
      throw new Error("Managed memory database metadata is unavailable");
    }

    return handler({ client: this.voltOpsClient, database: this.database });
  }

  private log(message: string, context?: string): void {
    if (this.debug) {
      console.log("[ManagedMemoryVectorAdapter]", message, context ?? "");
    }
  }

  store(id: string, vector: number[], metadata?: Record<string, unknown>): Promise<void> {
    return this.withClientContext(async ({ client, database }) => {
      this.log("Storing managed memory vector", safeStringify({ id }));
      await client.managedMemory.vectors.store(database.id, {
        id,
        vector,
        metadata,
      });
    }).then(() => undefined);
  }

  storeBatch(items: VectorItem[]): Promise<void> {
    if (items.length === 0) {
      return Promise.resolve();
    }

    return this.withClientContext(async ({ client, database }) => {
      this.log("Storing managed memory vectors batch", safeStringify({ count: items.length }));
      await client.managedMemory.vectors.storeBatch(database.id, { items });
    }).then(() => undefined);
  }

  search(
    vector: number[],
    options?: { limit?: number; filter?: Record<string, unknown>; threshold?: number },
  ): Promise<SearchResult[]> {
    return this.withClientContext(({ client, database }) => {
      this.log("Searching managed memory vectors", safeStringify({ limit: options?.limit }));
      return client.managedMemory.vectors.search(database.id, {
        vector,
        limit: options?.limit,
        threshold: options?.threshold,
        filter: options?.filter,
      });
    });
  }

  delete(id: string): Promise<void> {
    return this.withClientContext(async ({ client, database }) => {
      this.log("Deleting managed memory vector", safeStringify({ id }));
      await client.managedMemory.vectors.delete(database.id, id);
    }).then(() => undefined);
  }

  deleteBatch(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return Promise.resolve();
    }

    return this.withClientContext(async ({ client, database }) => {
      this.log("Deleting managed memory vector batch", safeStringify({ count: ids.length }));
      await client.managedMemory.vectors.deleteBatch(database.id, { ids });
    }).then(() => undefined);
  }

  clear(): Promise<void> {
    return this.withClientContext(async ({ client, database }) => {
      this.log("Clearing managed memory vectors");
      await client.managedMemory.vectors.clear(database.id);
    }).then(() => undefined);
  }

  count(): Promise<number> {
    return this.withClientContext(({ client, database }) => {
      this.log("Counting managed memory vectors");
      return client.managedMemory.vectors.count(database.id);
    });
  }

  get(id: string): Promise<VectorItem | null> {
    return this.withClientContext(({ client, database }) => {
      this.log("Fetching managed memory vector", safeStringify({ id }));
      return client.managedMemory.vectors.get(database.id, id);
    });
  }
}
