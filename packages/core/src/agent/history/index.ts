import type { Logger } from "@voltagent/internal";
import type { UIMessage } from "ai";
import { v4 as uuidv4 } from "uuid";
import { AgentEventEmitter } from "../../events";
import type { NewTimelineEvent } from "../../events/types";
import { getGlobalLogger } from "../../logger";
import type { MemoryManager } from "../../memory";
import type {
  AgentHistoryUpdatableFields,
  ExportAgentHistoryPayload,
  ExportTimelineEventPayload,
} from "../../telemetry/client";
import type { VoltAgentExporter } from "../../telemetry/exporter";
import { BackgroundQueue } from "../../utils/queue/queue";
import type { BaseMessage, StepWithContent, UsageInfo } from "../providers/base/types";
import type { AgentStatus } from "../types";

// Export types
export type { HistoryStatus } from "./types";

/**
 * Step information for history
 */
export interface HistoryStep {
  type: "message" | "tool_call" | "tool_result" | "text";
  name?: string;
  content?: string;
  arguments?: Record<string, unknown>;
}

/**
 * Timeline event for detailed history
 */
export interface TimelineEvent {
  /**
   * Unique identifier for the event
   */
  id?: string;

  /**
   * Timestamp when the event occurred
   */
  timestamp: string;

  /**
   * Name of the event (e.g., "generating", "tool_calling", "tool_result", etc.)
   * In the new format, "componentName:operationName" style (e.g.: "memory:getMessages")
   */
  name: string;

  /**
   * Optional timestamp for when the event was last updated
   */
  updatedAt?: string;

  data?: Record<string, unknown>;

  /**
   * Type of the event
   */
  type: "memory" | "tool" | "agent" | "retriever";
}

/**
 * Parameters for adding a history entry
 */
export interface AddEntryParams {
  /**
   * Input to the agent
   */
  input: string | Record<string, unknown> | UIMessage[] | BaseMessage[];

  /**
   * Output from the agent
   */
  output: string;

  /**
   * Status of the entry
   */
  status: AgentStatus;

  /**
   * Steps taken during generation
   */
  steps?: HistoryStep[];

  /**
   * Additional options for the entry
   */
  options?: Partial<
    Omit<AgentHistoryEntry, "id" | "timestamp" | "input" | "output" | "status" | "steps">
  >;

  /**
   * Optional userId for telemetry
   */
  userId?: string;

  /**
   * Optional conversationId for telemetry
   */
  conversationId?: string;

  /**
   * Optional model name for telemetry
   */
  model?: string;
}

/**
 * Agent history entry
 */
export interface AgentHistoryEntry {
  /**
   * Unique identifier
   */
  id: string;

  /**
   * Timestamp of the entry
   */
  startTime: Date;
  endTime?: Date;

  /**
   * Original input to the agent
   */
  input: string | Record<string, unknown> | UIMessage[] | BaseMessage[];

  /**
   * Final output from the agent
   */
  output: string;

  /**
   * Status of the history entry
   */
  status: AgentStatus;

  statusMessage?: {
    message: string;
    stack?: string;
    code?: string | number;
    [key: string]: unknown; // For additional error details
  };

  /**
   * Steps taken during generation
   */
  steps?: HistoryStep[];

  /**
   * Usage information returned by the LLM
   */
  usage?: UsageInfo;

  metadata?: Record<string, unknown>;

  /**
   * User ID associated with this history entry
   */
  userId?: string;

  /**
   * Conversation ID associated with this history entry
   */
  conversationId?: string;

  /**
   * Sequence number for the history entry
   */
  _sequenceNumber?: number;
}

/**
 * Manages agent interaction history
 */
export class HistoryManager {
  /**
   * Maximum number of history entries to keep
   * Set to 0 for unlimited
   */
  private maxEntries: number;

  /**
   * Agent ID for emitting events
   */
  private agentId?: string;

  /**
   * Memory manager for storing history entries
   */
  private memoryManager: MemoryManager;

  /**
   * Optional VoltAgentExporter for sending telemetry data.
   */
  private voltAgentExporter?: VoltAgentExporter;

  /**
   * Background queue for non-blocking history operations
   * Uses lower concurrency to preserve operation order when telemetryExporter is enabled
   */
  private historyQueue: BackgroundQueue;

  /**
   * Logger instance
   */
  private logger: Logger;

  /**
   * Create a new history manager
   *
   * @param agentId - Agent ID for emitting events and for storage
   * @param memoryManager - Memory manager instance to use
   * @param maxEntries - Maximum number of history entries to keep (0 = unlimited)
   * @param voltAgentExporter - Optional exporter for telemetry
   */
  constructor(
    agentId: string,
    memoryManager: MemoryManager,
    maxEntries = 0,
    voltAgentExporter?: VoltAgentExporter,
    logger?: Logger,
  ) {
    this.agentId = agentId;
    this.memoryManager = memoryManager;
    this.maxEntries = maxEntries;
    this.voltAgentExporter = voltAgentExporter;
    this.logger = logger || getGlobalLogger().child({ component: "history-manager", agentId });

    // Initialize background queue for all history operations
    this.historyQueue = new BackgroundQueue({
      maxConcurrency: 1,
      defaultTimeout: 60000, // 60 seconds timeout for complex operations
      defaultRetries: 2,
    });
  }

  /**
   * Set the agent ID for this history manager
   */
  public setAgentId(agentId: string): void {
    this.agentId = agentId;
  }

  /**
   * Sets the VoltAgentExporter for this history manager instance.
   * This allows the exporter to be set after the HistoryManager is created.
   */
  public setExporter(exporter: VoltAgentExporter): void {
    this.voltAgentExporter = exporter;
  }

  /**
   * Get the VoltAgentExporter instance
   * @returns The VoltAgentExporter instance or undefined if not configured
   */
  public getExporter(): VoltAgentExporter | undefined {
    return this.voltAgentExporter;
  }

  /**
   * Checks if a VoltAgentExporter is configured for this history manager.
   * @returns True if an exporter is configured, false otherwise.
   */
  public isExporterConfigured(): boolean {
    return !!this.voltAgentExporter;
  }

  /**
   * Queue a history operation for background processing
   * @param operationId Unique identifier for the operation
   * @param operation The async operation to execute
   */
  private queueHistoryOperation(operationId: string, operation: () => Promise<void>): void {
    this.historyQueue.enqueue({
      id: operationId,
      operation,
    });
  }

  /**
   * Add a new history entry
   *
   * @param params - Parameters for adding a history entry
   * @returns The new history entry
   */
  public async addEntry(params: AddEntryParams): Promise<AgentHistoryEntry> {
    if (!this.agentId) {
      throw new Error("Agent ID must be set to manage history");
    }

    if (this.maxEntries > 0) {
      const result = await this.getEntries();
      if (result.entries.length >= this.maxEntries) {
        // TODO: Implement deletion of oldest entry
      }
    }

    const entryTimestamp = new Date();
    const entry: AgentHistoryEntry = {
      id: uuidv4(),
      startTime: entryTimestamp,
      input: params.input,
      output: params.output,
      status: params.status,
      steps: params.steps || [],
      userId: params.userId,
      conversationId: params.conversationId,
      ...(params.options || {}),
    };

    // Store entry in memory (background)
    const agentId = this.agentId; // Capture agentId in closure
    if (agentId) {
      this.queueHistoryOperation(`store-entry-${entry.id}`, async () => {
        await this.memoryManager.storeHistoryEntry(agentId, entry);
        this.logger.trace(`History entry stored: ${entry.id}`);
      });
    }

    if (agentId) {
      AgentEventEmitter.getInstance().emitHistoryEntryCreated(agentId, entry);
    }

    const voltAgentExporter = this.voltAgentExporter;

    if (voltAgentExporter) {
      let sanitizedInput: Record<string, unknown>;
      if (typeof entry.input === "string") {
        sanitizedInput = { text: entry.input };
      } else if (Array.isArray(entry.input)) {
        sanitizedInput = { messages: entry.input };
      } else {
        sanitizedInput = entry.input;
      }

      const historyPayload: ExportAgentHistoryPayload = {
        agent_id: this.agentId,
        project_id: voltAgentExporter.publicKey,
        history_id: entry.id,
        startTime: entry.startTime.toISOString(),
        endTime: entry.endTime?.toISOString(),
        status: entry.status,
        input: sanitizedInput,
        output: { text: entry.output },
        steps: entry.steps,
        usage: entry.usage,
        metadata: {
          agentSnapshot: params.options?.metadata?.agentSnapshot,
        },
        userId: params.userId,
        conversationId: params.conversationId,
        model: params.model,
      };

      voltAgentExporter.exportHistoryEntryAsync(historyPayload);
    }

    return entry;
  }

  /**
   * Add steps to an existing history entry
   *
   * @param entryId - ID of the entry to update
   * @param steps - Steps to add
   * @returns The updated entry or undefined if not found
   */
  public addStepsToEntry(entryId: string, steps: StepWithContent[]): void {
    if (!this.agentId) return;

    const agentId = this.agentId; // Capture agentId in closure

    const historySteps: HistoryStep[] = steps.map((step) => ({
      type: step.type,
      name: step.name,
      content: step.content,
      arguments: step.arguments as Record<string, unknown>,
    }));

    const voltAgentExporter = this.voltAgentExporter;
    const agentEventEmitter = AgentEventEmitter.getInstance();
    const memoryManager = this.memoryManager;

    // Add steps to entry in memory (background)
    this.queueHistoryOperation(`add-steps-${entryId}`, async () => {
      const updatedEntry = await memoryManager.addStepsToHistoryEntry(
        agentId,
        entryId,
        historySteps,
      );
      this.logger.trace(`Steps added to entry: ${entryId}`);

      if (voltAgentExporter && updatedEntry) {
        voltAgentExporter.exportHistoryStepsAsync(entryId, historySteps);
      }

      if (updatedEntry) {
        agentEventEmitter.emitHistoryUpdate(agentId, updatedEntry);
      }
    });
  }

  /**
   * Get history entry by ID
   *
   * @param id - ID of the entry to find
   * @returns The history entry or undefined if not found
   */
  public async getEntryById(id: string): Promise<AgentHistoryEntry | undefined> {
    if (!this.agentId) return undefined;
    return this.memoryManager.getHistoryEntryById(this.agentId, id);
  }

  /**
   * Get all history entries with optional pagination
   *
   * @returns Object with entries array and pagination info
   */
  public async getEntries(options?: { page?: number; limit?: number }): Promise<{
    entries: AgentHistoryEntry[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    if (!this.agentId) {
      return {
        entries: [],
        pagination: {
          page: 0,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };
    }
    return this.memoryManager.getAllHistoryEntries(this.agentId, options);
  }

  /**
   * Clear all history entries
   */
  public async clear(): Promise<void> {
    // Not implemented yet
  }

  /**
   * Update an existing history entry
   *
   * @param id - ID of the entry to update
   * @param updates - Partial entry with fields to update
   * @returns The updated entry or undefined if not found
   */
  public updateEntry(
    id: string,
    updates: Partial<
      Omit<AgentHistoryEntry, "id" | "timestamp"> & {
        metadata?: Record<string, unknown>;
      }
    >,
  ): void {
    if (!this.agentId) return;

    const agentId = this.agentId; // Capture agentId in closure

    const voltAgentExporter = this.voltAgentExporter;
    const agentEventEmitter = AgentEventEmitter.getInstance();
    const memoryManager = this.memoryManager;

    // Update entry in memory (background)
    this.queueHistoryOperation(`update-entry-${id}`, async () => {
      const updatedEntry = await memoryManager.updateHistoryEntry(
        agentId,
        id,
        updates as Partial<AgentHistoryEntry>,
      );
      this.logger.trace(`History entry updated in memory: ${id}`);

      agentEventEmitter.emitHistoryUpdate(agentId, updatedEntry);
      try {
        if (voltAgentExporter) {
          const finalUpdates: Partial<AgentHistoryUpdatableFields> = {};

          if (updates.input !== undefined) {
            if (typeof updates.input === "string") finalUpdates.input = { text: updates.input };
            else finalUpdates.input = updates.input as Record<string, unknown> | BaseMessage[];
          }
          if (updates.output !== undefined) finalUpdates.output = updates.output;
          if (updates.status !== undefined) finalUpdates.status = updates.status;
          if (updates.usage !== undefined) finalUpdates.usage = updates.usage;
          if (updates.metadata !== undefined) finalUpdates.metadata = updates.metadata;
          if (updates.endTime !== undefined) finalUpdates.endTime = updates.endTime.toISOString();

          if (Object.keys(finalUpdates).length > 0) {
            voltAgentExporter.updateHistoryEntryAsync(
              id,
              finalUpdates as AgentHistoryUpdatableFields,
            );
          }
        }
      } catch (error) {
        this.logger.error("Failed to update history entry", { error });
      }
    });
  }

  /**
   * Persists a timeline event for a history entry.
   * This is used by the new immutable event system.
   *
   *
   * @param historyId - ID of the history entry
   * @param event - The NewTimelineEvent object to persist
   * @returns A promise that resolves to the updated entry or undefined if an error occurs
   */
  public async persistTimelineEvent(
    historyId: string,
    event: NewTimelineEvent,
  ): Promise<AgentHistoryEntry | undefined> {
    const agentId = this.agentId;
    if (!agentId) {
      this.logger.warn("persistTimelineEvent called without agentId");
      return undefined;
    }

    // Capture all dependencies in closure to avoid context issues
    const voltAgentExporter = this.voltAgentExporter;
    const memoryManager = this.memoryManager;

    // Ensure the event has an ID before queueing
    const eventId = event.id || crypto.randomUUID();
    event.id = eventId;

    return new Promise<AgentHistoryEntry | undefined>((resolve) => {
      this.queueHistoryOperation(`persist-timeline-event-${eventId}`, async () => {
        try {
          this.logger.trace(`Processing timeline event: ${eventId} for agent: ${agentId}`);

          // Persist to memory within the queue (maintains order)
          const updatedEntry = await memoryManager.addTimelineEvent(
            agentId,
            historyId,
            eventId,
            event,
          );

          if (!updatedEntry) {
            this.logger.warn(`Failed to persist timeline event: ${eventId}`);
            resolve(undefined);
            return;
          }

          this.logger.trace(`Timeline event persisted successfully: ${eventId}`);

          // Queue telemetry export separately (non-blocking, preserves event order)
          if (voltAgentExporter && event.id) {
            const payload: ExportTimelineEventPayload = {
              history_id: historyId,
              event_id: eventId,
              agent_id: agentId, // Use captured agentId instead of this.agentId
              event,
            };

            // Non-blocking telemetry export
            voltAgentExporter.exportTimelineEventAsync(payload);
          }

          // Resolve with the updated entry
          resolve(updatedEntry);
        } catch (error) {
          this.logger.error(`Error persisting timeline event ${eventId}`, { error });
          resolve(undefined);
        }
      });
    });
  }
}
