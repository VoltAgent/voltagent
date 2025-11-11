/**
 * VoltOps Client Implementation
 *
 * Unified client for both telemetry export and prompt management functionality.
 * Replaces the old telemetryExporter approach with a comprehensive solution.
 */

import { safeStringify } from "@voltagent/internal";
import type { UIMessage } from "ai";
import { type Logger, LoggerProxy } from "../logger";
import { LogEvents } from "../logger/events";
import { ResourceType, buildLogContext, buildVoltOpsLogMessage } from "../logger/message-builder";
import type { SearchResult, VectorItem } from "../memory/adapters/vector/types";
import type {
  Conversation,
  ConversationQueryOptions,
  CreateConversationInput,
  GetMessagesOptions,
  WorkflowStateEntry,
} from "../memory/types";
import { AgentRegistry } from "../registries/agent-registry";
import { VoltOpsActionsClient } from "./actions/client";
// VoltAgentExporter removed - migrated to OpenTelemetry
import { VoltOpsPromptManagerImpl } from "./prompt-manager";
import type {
  VoltOpsClient as IVoltOpsClient,
  ManagedMemoryAddMessageInput,
  ManagedMemoryAddMessagesInput,
  ManagedMemoryClearMessagesInput,
  ManagedMemoryCredentialCreateResult,
  ManagedMemoryCredentialListResult,
  ManagedMemoryDatabaseSummary,
  ManagedMemoryDeleteVectorsInput,
  ManagedMemoryGetMessagesInput,
  ManagedMemorySearchVectorsInput,
  ManagedMemorySetWorkingMemoryInput,
  ManagedMemoryStoreVectorInput,
  ManagedMemoryStoreVectorsBatchInput,
  ManagedMemoryUpdateConversationInput,
  ManagedMemoryVoltOpsClient,
  ManagedMemoryWorkflowStateUpdateInput,
  ManagedMemoryWorkingMemoryInput,
  PromptHelper,
  PromptReference,
  VoltOpsAppendEvalRunResultsRequest,
  VoltOpsClientOptions,
  VoltOpsCompleteEvalRunRequest,
  VoltOpsCreateEvalRunRequest,
  VoltOpsCreateScorerRequest,
  VoltOpsEvalRunSummary,
  VoltOpsEvalsApi,
  VoltOpsFailEvalRunRequest,
  VoltOpsPromptManager,
  VoltOpsScorerSummary,
} from "./types";

/**
 * Main VoltOps client class that provides unified access to both
 * telemetry export and prompt management functionality.
 */
export class VoltOpsClient implements IVoltOpsClient {
  public readonly options: VoltOpsClientOptions & { baseUrl: string };
  // observability removed - now handled by VoltAgentObservability
  public readonly prompts?: VoltOpsPromptManager;
  public readonly managedMemory: ManagedMemoryVoltOpsClient;
  public readonly actions: VoltOpsActionsClient;
  public readonly evals: VoltOpsEvalsApi;
  private readonly logger: Logger;

  private get fetchImpl(): typeof fetch {
    return this.options.fetch ?? fetch;
  }

  constructor(options: VoltOpsClientOptions) {
    // Merge promptCache options properly to preserve defaults
    const defaultPromptCache = {
      enabled: true,
      ttl: 5 * 60, // 5 minutes
      maxSize: 100,
    };

    this.options = {
      // observability removed - now handled by VoltAgentObservability
      prompts: true,
      ...options,
      baseUrl: options.baseUrl || "https://api.voltagent.dev",
      promptCache: {
        ...defaultPromptCache,
        ...options.promptCache,
      },
    };

    this.logger = new LoggerProxy({ component: "voltops-client" });
    this.managedMemory = this.createManagedMemoryClient();
    this.actions = new VoltOpsActionsClient(this, { useProjectEndpoint: true });
    this.evals = {
      runs: {
        create: this.createEvalRun.bind(this),
        appendResults: this.appendEvalRunResults.bind(this),
        complete: this.completeEvalRun.bind(this),
        fail: this.failEvalRun.bind(this),
      },
      scorers: {
        create: this.createEvalScorer.bind(this),
      },
    };

    // Check if keys are valid (not empty and have correct prefixes)
    const hasValidKeys =
      this.options.publicKey &&
      this.options.publicKey.trim() !== "" &&
      this.options.publicKey.startsWith("pk_") &&
      this.options.secretKey &&
      this.options.secretKey.trim() !== "" &&
      this.options.secretKey.startsWith("sk_");

    // Only initialize services if we have valid keys
    if (hasValidKeys) {
      // Observability is now handled by VoltAgentObservability, not VoltOpsClient

      // Initialize prompt manager if enabled
      if (this.options.prompts !== false) {
        try {
          this.prompts = new VoltOpsPromptManagerImpl(this.options);
        } catch (error) {
          this.logger.error("Failed to initialize prompt manager", { error });
        }
      }
    }

    // Log initialization
    this.logger.debug(
      buildVoltOpsLogMessage("client", "initialized", "VoltOps client initialized"),
      buildLogContext(ResourceType.VOLTOPS, "client", "initialized", {
        event: LogEvents.VOLTOPS_CLIENT_INITIALIZED,
        // observability now handled by VoltAgentObservability
        promptsEnabled: this.options.prompts !== false,
        baseUrl: this.options.baseUrl,
        cacheEnabled: this.options.promptCache?.enabled ?? true,
        cacheTTL: this.options.promptCache?.ttl ?? defaultPromptCache.ttl,
        cacheMaxSize: this.options.promptCache?.maxSize ?? defaultPromptCache.maxSize,
      }),
    );
  }

  /**
   * Create a prompt helper for agent instructions
   */
  public createPromptHelper(_agentId: string): PromptHelper {
    return {
      getPrompt: async (reference: PromptReference) => {
        if (!this.prompts) {
          throw new Error("Prompt management is not enabled in VoltOpsClient");
        }

        try {
          const result = await this.prompts.getPrompt(reference);

          // Note: Usage tracking is handled by backend automatically

          return result;
        } catch (error) {
          this.logger.error("Failed to get prompt", { error });
          throw error;
        }
      },
    };
  }

  // Backward compatibility methods removed - observability now handled by VoltAgentObservability

  /**
   * Check if observability is enabled and configured
   * @deprecated Observability is now handled by VoltAgentObservability
   */
  public isObservabilityEnabled(): boolean {
    return false; // Always false since VoltOpsClient no longer handles observability
  }

  /**
   * Check if the client has valid API keys
   */
  public hasValidKeys(): boolean {
    return !!(
      this.options.publicKey &&
      this.options.publicKey.trim() !== "" &&
      this.options.publicKey.startsWith("pk_") &&
      this.options.secretKey &&
      this.options.secretKey.trim() !== "" &&
      this.options.secretKey.startsWith("sk_")
    );
  }

  /**
   * Check if prompt management is enabled and configured
   */
  public isPromptManagementEnabled(): boolean {
    return this.prompts !== undefined;
  }

  /**
   * Get the API base URL
   */
  public getApiUrl(): string {
    return this.options.baseUrl;
  }

  /**
   * Get authentication headers for API requests
   */
  public getAuthHeaders(): Record<string, string> {
    return {
      "X-Public-Key": this.options.publicKey || "",
      "X-Secret-Key": this.options.secretKey || "",
    };
  }

  public async sendRequest(path: string, init?: RequestInit): Promise<Response> {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = `${this.getApiUrl()}${normalizedPath}`;
    const headers = {
      ...this.getAuthHeaders(),
      ...(init?.headers ?? {}),
    };

    const requestInit: RequestInit = {
      method: "GET",
      ...init,
      headers,
    };

    return await this.fetchImpl(url, requestInit);
  }

  // getObservabilityExporter removed - observability now handled by VoltAgentObservability

  /**
   * Get prompt manager for direct access
   */
  public getPromptManager(): VoltOpsPromptManager | undefined {
    return this.prompts;
  }

  private async createEvalRun(
    payload: VoltOpsCreateEvalRunRequest = {},
  ): Promise<VoltOpsEvalRunSummary> {
    const response = await this.request<unknown>("POST", "/evals/runs", payload);
    return this.normalizeRunSummary(response);
  }

  private async appendEvalRunResults(
    runId: string,
    payload: VoltOpsAppendEvalRunResultsRequest,
  ): Promise<VoltOpsEvalRunSummary> {
    const response = await this.request<unknown>(
      "POST",
      `/evals/runs/${encodeURIComponent(runId)}/results`,
      payload,
    );
    return this.normalizeRunSummary(response);
  }

  private async completeEvalRun(
    runId: string,
    payload: VoltOpsCompleteEvalRunRequest,
  ): Promise<VoltOpsEvalRunSummary> {
    const response = await this.request<unknown>(
      "POST",
      `/evals/runs/${encodeURIComponent(runId)}/complete`,
      payload,
    );
    return this.normalizeRunSummary(response);
  }

  private async failEvalRun(
    runId: string,
    payload: VoltOpsFailEvalRunRequest,
  ): Promise<VoltOpsEvalRunSummary> {
    const response = await this.request<unknown>(
      "POST",
      `/evals/runs/${encodeURIComponent(runId)}/fail`,
      payload,
    );
    return this.normalizeRunSummary(response);
  }

  private async createEvalScorer(
    payload: VoltOpsCreateScorerRequest,
  ): Promise<VoltOpsScorerSummary> {
    const response = await this.request<unknown>("POST", "/evals/scorers", payload);
    return this.normalizeScorerSummary(response);
  }

  private async request<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
    const url = `${this.options.baseUrl.replace(/\/$/, "")}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Public-Key": this.options.publicKey || "",
      "X-Secret-Key": this.options.secretKey || "",
    };

    try {
      const response = await this.fetchImpl(url, {
        method,
        headers,
        body: body !== undefined ? safeStringify(body) : undefined,
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || `VoltOps request failed (${response.status})`);
      }

      return payload as T;
    } catch (error) {
      this.logger.error("VoltOps request failed", { endpoint, method, error });
      throw error;
    }
  }

  private buildQueryString(params: Record<string, unknown>): string {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) {
        continue;
      }

      if (Array.isArray(value)) {
        if (value.length === 0) {
          continue;
        }
        searchParams.set(key, value.join(","));
      } else if (value instanceof Date) {
        searchParams.set(key, value.toISOString());
      } else {
        searchParams.set(key, String(value));
      }
    }

    const query = searchParams.toString();
    return query ? `?${query}` : "";
  }

  private createManagedMemoryClient(): ManagedMemoryVoltOpsClient {
    return {
      messages: {
        add: (databaseId, input) => this.addManagedMemoryMessage(databaseId, input),
        addBatch: (databaseId, input) => this.addManagedMemoryMessages(databaseId, input),
        list: (databaseId, input) => this.getManagedMemoryMessages(databaseId, input),
        clear: (databaseId, input) => this.clearManagedMemoryMessages(databaseId, input),
      },
      conversations: {
        create: (databaseId, input) => this.createManagedMemoryConversation(databaseId, input),
        get: (databaseId, conversationId) =>
          this.getManagedMemoryConversation(databaseId, conversationId),
        query: (databaseId, options) => this.queryManagedMemoryConversations(databaseId, options),
        update: (databaseId, input) => this.updateManagedMemoryConversation(databaseId, input),
        delete: (databaseId, conversationId) =>
          this.deleteManagedMemoryConversation(databaseId, conversationId),
      },
      workingMemory: {
        get: (databaseId, input) => this.getManagedMemoryWorkingMemory(databaseId, input),
        set: (databaseId, input) => this.setManagedMemoryWorkingMemory(databaseId, input),
        delete: (databaseId, input) => this.deleteManagedMemoryWorkingMemory(databaseId, input),
      },
      workflowStates: {
        get: (databaseId, executionId) =>
          this.getManagedMemoryWorkflowState(databaseId, executionId),
        set: (databaseId, executionId, state) =>
          this.setManagedMemoryWorkflowState(databaseId, executionId, state),
        update: (databaseId, input) => this.updateManagedMemoryWorkflowState(databaseId, input),
        listSuspended: (databaseId, workflowId) =>
          this.getManagedMemorySuspendedWorkflowStates(databaseId, workflowId),
      },
      vectors: {
        store: (databaseId, input) => this.storeManagedMemoryVector(databaseId, input),
        storeBatch: (databaseId, input) => this.storeManagedMemoryVectors(databaseId, input),
        search: (databaseId, input) => this.searchManagedMemoryVectors(databaseId, input),
        get: (databaseId, vectorId) => this.getManagedMemoryVector(databaseId, vectorId),
        delete: (databaseId, vectorId) => this.deleteManagedMemoryVector(databaseId, vectorId),
        deleteBatch: (databaseId, input) => this.deleteManagedMemoryVectors(databaseId, input),
        clear: (databaseId) => this.clearManagedMemoryVectors(databaseId),
        count: (databaseId) => this.countManagedMemoryVectors(databaseId),
      },
    };
  }

  public async listManagedMemoryDatabases(): Promise<ManagedMemoryDatabaseSummary[]> {
    const payload = await this.request<{
      success: boolean;
      data: { databases: ManagedMemoryDatabaseSummary[] };
    }>("GET", "/managed-memory/projects/databases");

    if (!payload?.success) {
      throw new Error("Failed to fetch managed memory databases from VoltOps");
    }

    return payload.data?.databases ?? [];
  }

  public async listManagedMemoryCredentials(
    databaseId: string,
  ): Promise<ManagedMemoryCredentialListResult> {
    const payload = await this.request<{
      success: boolean;
      data: ManagedMemoryCredentialListResult;
    }>("GET", `/managed-memory/projects/databases/${databaseId}/credentials`);

    if (!payload?.success || !payload.data) {
      throw new Error("Failed to fetch managed memory credentials from VoltOps");
    }

    return payload.data;
  }

  public async createManagedMemoryCredential(
    databaseId: string,
    input: { name?: string } = {},
  ): Promise<ManagedMemoryCredentialCreateResult> {
    const payload = await this.request<{
      success: boolean;
      data: ManagedMemoryCredentialCreateResult;
    }>("POST", `/managed-memory/projects/databases/${databaseId}/credentials`, input);

    if (!payload?.success || !payload.data) {
      throw new Error("Failed to create managed memory credential via VoltOps");
    }

    return payload.data;
  }

  private async addManagedMemoryMessage(
    databaseId: string,
    input: ManagedMemoryAddMessageInput,
  ): Promise<void> {
    const payload = await this.request<{ success: boolean }>(
      "POST",
      `/managed-memory/projects/databases/${databaseId}/messages`,
      input,
    );

    if (!payload?.success) {
      throw new Error("Failed to add managed memory message via VoltOps");
    }
  }

  private async addManagedMemoryMessages(
    databaseId: string,
    input: ManagedMemoryAddMessagesInput,
  ): Promise<void> {
    const payload = await this.request<{ success: boolean }>(
      "POST",
      `/managed-memory/projects/databases/${databaseId}/messages/batch`,
      input,
    );

    if (!payload?.success) {
      throw new Error("Failed to add managed memory messages via VoltOps");
    }
  }

  private async getManagedMemoryMessages(
    databaseId: string,
    input: ManagedMemoryGetMessagesInput,
  ): Promise<UIMessage[]> {
    const options: GetMessagesOptions | undefined = input.options;
    const query = this.buildQueryString({
      conversationId: input.conversationId,
      userId: input.userId,
      limit: options?.limit,
      before: options?.before,
      after: options?.after,
      roles: options?.roles,
    });

    const payload = await this.request<{
      success: boolean;
      data?: { messages?: UIMessage[] };
    }>("GET", `/managed-memory/projects/databases/${databaseId}/messages${query}`);

    if (!payload?.success) {
      throw new Error("Failed to fetch managed memory messages via VoltOps");
    }

    return payload.data?.messages ?? [];
  }

  private async clearManagedMemoryMessages(
    databaseId: string,
    input: ManagedMemoryClearMessagesInput,
  ): Promise<void> {
    const payload = await this.request<{ success: boolean }>(
      "DELETE",
      `/managed-memory/projects/databases/${databaseId}/messages`,
      input,
    );

    if (!payload?.success) {
      throw new Error("Failed to clear managed memory messages via VoltOps");
    }
  }

  private async storeManagedMemoryVector(
    databaseId: string,
    input: ManagedMemoryStoreVectorInput,
  ): Promise<void> {
    const payload = await this.request<{ success: boolean }>(
      "POST",
      `/managed-memory/projects/databases/${databaseId}/vectors`,
      input,
    );

    if (!payload?.success) {
      throw new Error("Failed to store managed memory vector via VoltOps");
    }
  }

  private async storeManagedMemoryVectors(
    databaseId: string,
    input: ManagedMemoryStoreVectorsBatchInput,
  ): Promise<void> {
    if (!input.items || input.items.length === 0) {
      return;
    }

    const payload = await this.request<{ success: boolean }>(
      "POST",
      `/managed-memory/projects/databases/${databaseId}/vectors/batch`,
      input,
    );

    if (!payload?.success) {
      throw new Error("Failed to store managed memory vectors via VoltOps");
    }
  }

  private async searchManagedMemoryVectors(
    databaseId: string,
    input: ManagedMemorySearchVectorsInput,
  ): Promise<SearchResult[]> {
    const payload = await this.request<{
      success: boolean;
      data?: { results?: SearchResult[] };
    }>("POST", `/managed-memory/projects/databases/${databaseId}/vectors/search`, input);

    if (!payload?.success) {
      throw new Error("Failed to search managed memory vectors via VoltOps");
    }

    return payload.data?.results ?? [];
  }

  private async getManagedMemoryVector(
    databaseId: string,
    vectorId: string,
  ): Promise<VectorItem | null> {
    const payload = await this.request<{
      success: boolean;
      data?: { vector?: VectorItem | null };
    }>("GET", `/managed-memory/projects/databases/${databaseId}/vectors/${vectorId}`);

    if (!payload?.success) {
      throw new Error("Failed to fetch managed memory vector via VoltOps");
    }

    return payload.data?.vector ?? null;
  }

  private async deleteManagedMemoryVector(databaseId: string, vectorId: string): Promise<void> {
    const payload = await this.request<{ success: boolean }>(
      "DELETE",
      `/managed-memory/projects/databases/${databaseId}/vectors/${vectorId}`,
    );

    if (!payload?.success) {
      throw new Error("Failed to delete managed memory vector via VoltOps");
    }
  }

  private async deleteManagedMemoryVectors(
    databaseId: string,
    input: ManagedMemoryDeleteVectorsInput,
  ): Promise<void> {
    if (!input.ids || input.ids.length === 0) {
      return;
    }

    const payload = await this.request<{ success: boolean }>(
      "POST",
      `/managed-memory/projects/databases/${databaseId}/vectors/delete`,
      input,
    );

    if (!payload?.success) {
      throw new Error("Failed to delete managed memory vectors via VoltOps");
    }
  }

  private async clearManagedMemoryVectors(databaseId: string): Promise<void> {
    const payload = await this.request<{ success: boolean }>(
      "POST",
      `/managed-memory/projects/databases/${databaseId}/vectors/clear`,
    );

    if (!payload?.success) {
      throw new Error("Failed to clear managed memory vectors via VoltOps");
    }
  }

  private async countManagedMemoryVectors(databaseId: string): Promise<number> {
    const payload = await this.request<{
      success: boolean;
      data?: { count?: number };
    }>("GET", `/managed-memory/projects/databases/${databaseId}/vectors/count`);

    if (!payload?.success || typeof payload.data?.count !== "number") {
      throw new Error("Failed to count managed memory vectors via VoltOps");
    }

    return payload.data.count;
  }

  private async createManagedMemoryConversation(
    databaseId: string,
    input: CreateConversationInput,
  ): Promise<Conversation> {
    const payload = await this.request<{
      success: boolean;
      data?: { conversation?: Conversation };
    }>("POST", `/managed-memory/projects/databases/${databaseId}/conversations`, { input });

    if (!payload?.success || !payload.data?.conversation) {
      throw new Error("Failed to create managed memory conversation via VoltOps");
    }

    return payload.data.conversation;
  }

  private async getManagedMemoryConversation(
    databaseId: string,
    conversationId: string,
  ): Promise<Conversation | null> {
    const payload = await this.request<{
      success: boolean;
      data?: { conversation?: Conversation | null };
    }>("GET", `/managed-memory/projects/databases/${databaseId}/conversations/${conversationId}`);

    if (!payload?.success) {
      throw new Error("Failed to fetch managed memory conversation via VoltOps");
    }

    return payload.data?.conversation ?? null;
  }

  private async queryManagedMemoryConversations(
    databaseId: string,
    options: ConversationQueryOptions = {},
  ): Promise<Conversation[]> {
    const query = this.buildQueryString({
      userId: options.userId,
      resourceId: options.resourceId,
      limit: options.limit,
      offset: options.offset,
      orderBy: options.orderBy,
      orderDirection: options.orderDirection,
    });

    const payload = await this.request<{
      success: boolean;
      data?: { conversations?: Conversation[] };
    }>("GET", `/managed-memory/projects/databases/${databaseId}/conversations${query}`);

    if (!payload?.success) {
      throw new Error("Failed to query managed memory conversations via VoltOps");
    }

    return payload.data?.conversations ?? [];
  }

  private async updateManagedMemoryConversation(
    databaseId: string,
    input: ManagedMemoryUpdateConversationInput,
  ): Promise<Conversation> {
    const payload = await this.request<{
      success: boolean;
      data?: { conversation?: Conversation };
    }>(
      "PATCH",
      `/managed-memory/projects/databases/${databaseId}/conversations/${input.conversationId}`,
      { updates: input.updates },
    );

    if (!payload?.success || !payload.data?.conversation) {
      throw new Error("Failed to update managed memory conversation via VoltOps");
    }

    return payload.data.conversation;
  }

  private async deleteManagedMemoryConversation(
    databaseId: string,
    conversationId: string,
  ): Promise<void> {
    const payload = await this.request<{ success: boolean }>(
      "DELETE",
      `/managed-memory/projects/databases/${databaseId}/conversations/${conversationId}`,
    );

    if (!payload?.success) {
      throw new Error("Failed to delete managed memory conversation via VoltOps");
    }
  }

  private async getManagedMemoryWorkingMemory(
    databaseId: string,
    input: ManagedMemoryWorkingMemoryInput,
  ): Promise<string | null> {
    const query = this.buildQueryString({
      scope: input.scope,
      conversationId: input.conversationId,
      userId: input.userId,
    });

    const payload = await this.request<{
      success: boolean;
      data?: { content?: string | null };
    }>("GET", `/managed-memory/projects/databases/${databaseId}/working-memory${query}`);

    if (!payload?.success) {
      throw new Error("Failed to fetch managed memory working memory via VoltOps");
    }

    return payload.data?.content ?? null;
  }

  private async setManagedMemoryWorkingMemory(
    databaseId: string,
    input: ManagedMemorySetWorkingMemoryInput,
  ): Promise<void> {
    const payload = await this.request<{ success: boolean }>(
      "PUT",
      `/managed-memory/projects/databases/${databaseId}/working-memory`,
      input,
    );

    if (!payload?.success) {
      throw new Error("Failed to set managed memory working memory via VoltOps");
    }
  }

  private async deleteManagedMemoryWorkingMemory(
    databaseId: string,
    input: ManagedMemoryWorkingMemoryInput,
  ): Promise<void> {
    const payload = await this.request<{ success: boolean }>(
      "DELETE",
      `/managed-memory/projects/databases/${databaseId}/working-memory`,
      input,
    );

    if (!payload?.success) {
      throw new Error("Failed to delete managed memory working memory via VoltOps");
    }
  }

  private async getManagedMemoryWorkflowState(
    databaseId: string,
    executionId: string,
  ): Promise<WorkflowStateEntry | null> {
    const payload = await this.request<{
      success: boolean;
      data?: { workflowState?: WorkflowStateEntry | null };
    }>("GET", `/managed-memory/projects/databases/${databaseId}/workflow-states/${executionId}`);

    if (!payload?.success) {
      throw new Error("Failed to fetch managed memory workflow state via VoltOps");
    }

    return payload.data?.workflowState ?? null;
  }

  private async setManagedMemoryWorkflowState(
    databaseId: string,
    executionId: string,
    state: WorkflowStateEntry,
  ): Promise<void> {
    const payload = await this.request<{ success: boolean }>(
      "PUT",
      `/managed-memory/projects/databases/${databaseId}/workflow-states/${executionId}`,
      { state },
    );

    if (!payload?.success) {
      throw new Error("Failed to set managed memory workflow state via VoltOps");
    }
  }

  private async updateManagedMemoryWorkflowState(
    databaseId: string,
    input: ManagedMemoryWorkflowStateUpdateInput,
  ): Promise<void> {
    const payload = await this.request<{ success: boolean }>(
      "PATCH",
      `/managed-memory/projects/databases/${databaseId}/workflow-states/${input.executionId}`,
      { updates: input.updates },
    );

    if (!payload?.success) {
      throw new Error("Failed to update managed memory workflow state via VoltOps");
    }
  }

  private async getManagedMemorySuspendedWorkflowStates(
    databaseId: string,
    workflowId: string,
  ): Promise<WorkflowStateEntry[]> {
    const query = this.buildQueryString({ workflowId });

    const payload = await this.request<{
      success: boolean;
      data?: { workflowStates?: WorkflowStateEntry[] };
    }>("GET", `/managed-memory/projects/databases/${databaseId}/workflow-states${query}`);

    if (!payload?.success) {
      throw new Error("Failed to fetch suspended managed memory workflow states via VoltOps");
    }

    return payload.data?.workflowStates ?? [];
  }

  /**
   * Static method to create prompt helper with priority-based fallback
   * Priority: Agent VoltOpsClient > Global VoltOpsClient > Fallback instructions
   */
  public static createPromptHelperWithFallback(
    agentId: string,
    agentName: string,
    fallbackInstructions: string,
    agentVoltOpsClient?: VoltOpsClient,
  ): PromptHelper {
    // Priority 1: Agent-specific VoltOpsClient (highest priority)
    if (agentVoltOpsClient?.prompts) {
      return agentVoltOpsClient.createPromptHelper(agentId);
    }

    // Priority 2: Global VoltOpsClient
    const globalVoltOpsClient = AgentRegistry.getInstance().getGlobalVoltOpsClient();
    if (globalVoltOpsClient?.prompts) {
      return globalVoltOpsClient.createPromptHelper(agentId);
    }

    // Priority 3: Fallback to default instructions
    const logger = new LoggerProxy({ component: "voltops-prompt-fallback", agentName });

    return {
      getPrompt: async () => {
        logger.info(`
💡 VoltOps Prompts
   
   Agent: ${agentName}
   ❌ Agent VoltOpsClient: ${agentVoltOpsClient ? "Found but prompts disabled" : "Not configured"}
   ❌ Global VoltOpsClient: ${globalVoltOpsClient ? "Found but prompts disabled" : "Not configured"}
   ✅ Using fallback instructions
   
   Priority Order:
   1. Agent VoltOpsClient (agent-specific, highest priority)
   2. Global VoltOpsClient (from VoltAgent constructor)  
   3. Fallback instructions (current)
   
   To enable dynamic prompt management:
   1. Create prompts at: http://console.voltagent.dev/prompts
   2. Configure VoltOpsClient:
   
   // Option A: Agent-specific (highest priority)
   const agent = new Agent({
     voltOpsClient: new VoltOpsClient({
       baseUrl: 'https://api.voltops.dev',
       publicKey: 'your-public-key',
       secretKey: 'your-secret-key'
     })
   });
   
   // Option B: Global (lower priority)
   new VoltAgent({
     voltOpsClient: new VoltOpsClient({ ... })
   });
   
   📖 Full documentation: https://voltagent.dev/docs/agents/prompts/#3-voltops-prompt-management
        `);

        logger.warn(
          `⚠️  Using fallback instructions for agent '${agentName}'. Configure VoltOpsClient to use dynamic prompts.`,
        );

        // Return fallback as PromptContent
        return {
          type: "text",
          text: fallbackInstructions,
        };
      },
    };
  }

  /**
   * Cleanup resources when client is no longer needed
   */
  public async dispose(): Promise<void> {
    try {
      if (this.prompts) {
        this.prompts.clearCache();
      }
      this.logger.trace(
        buildVoltOpsLogMessage("client", "disposed", "resources cleaned up"),
        buildLogContext(ResourceType.VOLTOPS, "client", "disposed", {}),
      );
    } catch (error) {
      this.logger.error("Error during disposal", { error });
    }
  }

  private normalizeRunSummary(raw: any): VoltOpsEvalRunSummary {
    const toNumber = (value: unknown, fallback: number): number => {
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const toNullableNumber = (value: unknown): number | null => {
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const tags = Array.isArray(raw?.tags)
      ? raw.tags.filter((tag: unknown) => typeof tag === "string")
      : null;

    const createdAt = this.normalizeDate(raw?.createdAt) ?? new Date().toISOString();
    const updatedAt = this.normalizeDate(raw?.updatedAt) ?? createdAt;

    return {
      id: raw?.id ? String(raw.id) : "",
      status: typeof raw?.status === "string" ? raw.status : "pending",
      triggerSource: typeof raw?.triggerSource === "string" ? raw.triggerSource : "",
      datasetId: raw?.datasetId ?? raw?.dataset_id ?? null,
      datasetVersionId: raw?.datasetVersionId ?? raw?.dataset_version_id ?? null,
      datasetVersionLabel: raw?.datasetVersionLabel ?? raw?.dataset_version_label ?? null,
      itemCount: toNumber(raw?.itemCount ?? raw?.item_count, 0),
      successCount: toNumber(raw?.successCount ?? raw?.success_count, 0),
      failureCount: toNumber(raw?.failureCount ?? raw?.failure_count, 0),
      meanScore: toNullableNumber(raw?.meanScore ?? raw?.mean_score),
      medianScore: toNullableNumber(raw?.medianScore ?? raw?.median_score),
      sumScore: toNullableNumber(raw?.sumScore ?? raw?.sum_score),
      passRate: toNullableNumber(raw?.passRate ?? raw?.pass_rate),
      startedAt: this.normalizeDate(raw?.startedAt ?? raw?.started_at),
      completedAt: this.normalizeDate(raw?.completedAt ?? raw?.completed_at),
      durationMs: toNullableNumber(raw?.durationMs ?? raw?.duration_ms),
      tags,
      createdAt,
      updatedAt,
    };
  }

  private normalizeDate(value: unknown): string | null {
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === "string") {
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? value : new Date(parsed).toISOString();
    }
    const parsed = Date.parse(String(value));
    return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
  }

  private normalizeScorerSummary(raw: any): VoltOpsScorerSummary {
    return {
      id: String(raw?.id ?? ""),
      name: String(raw?.name ?? raw?.id ?? ""),
      category: raw?.category ?? null,
      description: raw?.description ?? null,
      defaultThreshold: raw?.defaultThreshold ?? raw?.default_threshold ?? null,
      thresholdOperator: raw?.thresholdOperator ?? raw?.threshold_operator ?? null,
      metadata: raw?.metadata ?? null,
      createdAt: this.normalizeDate(raw?.createdAt ?? raw?.created_at) ?? new Date().toISOString(),
      updatedAt: this.normalizeDate(raw?.updatedAt ?? raw?.updated_at) ?? new Date().toISOString(),
    };
  }
}

/**
 * Factory function to create VoltOps client
 */
export const createVoltOpsClient = (options: VoltOpsClientOptions): VoltOpsClient => {
  return new VoltOpsClient(options);
};
