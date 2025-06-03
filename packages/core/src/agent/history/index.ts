import { v4 as uuidv4 } from "uuid";
import { AgentEventEmitter } from "../../events";
import type { BaseMessage, StepWithContent, UsageInfo } from "../providers/base/types";
import type { AgentStatus } from "../types";
import type { MemoryManager } from "../../memory";
import type { VoltAgentExporter } from "../../telemetry/exporter";
import type {
  ExportAgentHistoryPayload,
  AgentHistoryUpdatableFields,
  ExportTimelineEventPayload,
} from "../../telemetry/client";
import type { NewTimelineEvent } from "../../events/types";

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
  input: string | Record<string, unknown> | BaseMessage[];

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
  input: string | Record<string, unknown> | BaseMessage[];

  /**
   * Final output from the agent
   */
  output: string;

  /**
   * Status of the history entry
   */
  status: AgentStatus;

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
  ) {
    this.agentId = agentId;
    this.memoryManager = memoryManager;
    this.maxEntries = maxEntries;
    this.voltAgentExporter = voltAgentExporter;
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
   * Checks if a VoltAgentExporter is configured for this history manager.
   * @returns True if an exporter is configured, false otherwise.
   */
  public isExporterConfigured(): boolean {
    return !!this.voltAgentExporter;
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
      const entries = await this.getEntries();
      if (entries.length >= this.maxEntries) {
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
      ...(params.options || {}),
    };

    await this.memoryManager.storeHistoryEntry(this.agentId, entry);

    AgentEventEmitter.getInstance().emitHistoryEntryCreated(this.agentId, entry);

    if (this.voltAgentExporter) {
      try {
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
          project_id: this.voltAgentExporter.publicKey,
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
        await this.voltAgentExporter.exportHistoryEntry(historyPayload);
      } catch (telemetryError: any) {
        if (telemetryError?.message?.includes("401")) {
          console.warn(
            `[HistoryManager] Failed to export history entry to telemetry service for agent ${this.agentId}. Status: 401. Please check your VoltAgentExporter public and secret keys.`,
          );
        } else {
          console.warn(
            `[HistoryManager] Failed to export history entry to telemetry service for agent ${this.agentId}. Error:`,
            telemetryError,
            "If this issue persists, please open an issue on GitHub: @https://github.com/VoltAgent/voltagent/issues or ask on our Discord server: @https://s.voltagent.dev/discord/",
          );
        }
      }
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
  public async addStepsToEntry(
    entryId: string,
    steps: StepWithContent[],
  ): Promise<AgentHistoryEntry | undefined> {
    if (!this.agentId) return undefined;

    const historySteps: HistoryStep[] = steps.map((step) => ({
      type: step.type,
      name: step.name,
      content: step.content,
      arguments: step.arguments as Record<string, unknown>,
    }));

    const updatedEntry = await this.memoryManager.addStepsToHistoryEntry(
      this.agentId,
      entryId,
      historySteps,
    );

    if (this.voltAgentExporter && updatedEntry) {
      await this.voltAgentExporter.exportHistorySteps(entryId, historySteps);
    }

    if (updatedEntry) {
      AgentEventEmitter.getInstance().emitHistoryUpdate(this.agentId, updatedEntry);
    }

    return updatedEntry;
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
   * Get all history entries
   *
   * @returns Array of history entries
   */
  public async getEntries(): Promise<AgentHistoryEntry[]> {
    if (!this.agentId) return [];
    return this.memoryManager.getAllHistoryEntries(this.agentId);
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
  public async updateEntry(
    id: string,
    updates: Partial<
      Omit<AgentHistoryEntry, "id" | "timestamp"> & {
        metadata?: Record<string, unknown>;
      }
    >,
  ): Promise<AgentHistoryEntry | undefined> {
    if (!this.agentId) return undefined;

    const updatedEntry = await this.memoryManager.updateHistoryEntry(
      this.agentId,
      id,
      updates as Partial<AgentHistoryEntry>,
    );

    if (updatedEntry) {
      AgentEventEmitter.getInstance().emitHistoryUpdate(this.agentId, updatedEntry);

      if (this.voltAgentExporter) {
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
          await this.voltAgentExporter.updateHistoryEntry(
            id,
            finalUpdates as AgentHistoryUpdatableFields,
          );
        }
      }
    }

    return updatedEntry;
  }

  /**
   * Persists a timeline event for a history entry.
   * This is used by the new immutable event system.
   *
   * @param historyId - ID of the history entry
   * @param event - The NewTimelineEvent object to persist
   * @returns A promise that resolves to the updated entry or undefined if an error occurs
   */
  public async persistTimelineEvent(
    historyId: string,
    event: NewTimelineEvent,
  ): Promise<AgentHistoryEntry | undefined> {
    if (!this.agentId) return undefined;

    try {
      // Ensure the event has an ID
      const eventId = event.id || crypto.randomUUID();

      // Ensure event has ID set for any future references
      event.id = eventId;

      // Use the memory manager to add the timeline event
      const updatedEntry = await this.memoryManager.addTimelineEvent(
        this.agentId,
        historyId,
        eventId,
        event,
      );

      if (this.voltAgentExporter && updatedEntry && event.id) {
        // The backend now expects the entire event object nested, likely under a 'value' key
        // or as the main event payload itself depending on the exporter implementation.
        // Assuming the exporter expects the event object directly:
        const payload: ExportTimelineEventPayload = {
          history_id: historyId,
          event_id: eventId,
          agent_id: this.agentId,
          event,
        };

        // We need to ensure the type ExportTimelineEventPayload matches this structure
        await this.voltAgentExporter.exportTimelineEvent(payload);
      }

      return updatedEntry;
    } catch (error) {
      console.error("[HistoryManager] Failed to persist timeline event:", error);
      return undefined;
    }
  }
}
