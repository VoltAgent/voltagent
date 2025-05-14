import { v4 as uuidv4 } from "uuid";
import { AgentEventEmitter } from "../../events";
import type { BaseMessage, StepWithContent, UsageInfo } from "../providers/base/types";
import type { AgentStatus } from "../types";
import type { MemoryManager } from "../../memory";
import type { VoltAgentExporter } from "../../telemetry/exporter";
import type {
  ExportAgentHistoryPayload,
  ExportTimelineEventPayload,
  AgentHistoryUpdatableFields,
} from "../../telemetry/client";

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
   * ID of the affected Flow node
   * Added with the new format
   */
  affectedNodeId?: string;

  /**
   * Optional additional data specific to the event type
   * In the new format: { status, input, output, updatedAt etc. }
   */
  data?: Record<string, unknown>;

  /**
   * Optional timestamp for when the event was last updated
   */
  updatedAt?: string;

  /**
   * Type of the event
   */
  type: "memory" | "tool" | "agent" | "retriever";
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
  timestamp: Date;

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

  /**
   * Timeline events for detailed agent state history
   */
  events?: TimelineEvent[];

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
   * @param input - Input to the agent
   * @param output - Output from the agent
   * @param status - Status of the entry
   * @param steps - Steps taken during generation
   * @param options - Additional options for the entry
   * @param agentSnapshot - Optional agent snapshot for telemetry
   * @param userId - Optional userId for telemetry
   * @param conversationId - Optional conversationId for telemetry
   * @returns The new history entry
   */
  public async addEntry(
    input: string | Record<string, unknown> | BaseMessage[],
    output: string,
    status: AgentStatus,
    steps: HistoryStep[] = [],
    options: Partial<
      Omit<AgentHistoryEntry, "id" | "timestamp" | "input" | "output" | "status" | "steps">
    > = {},
    agentSnapshot?: Record<string, unknown>,
    userId?: string,
    conversationId?: string,
  ): Promise<AgentHistoryEntry> {
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
      timestamp: entryTimestamp,
      input,
      output,
      status,
      steps,
      ...options,
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
          timestamp: entry.timestamp.toISOString(),
          type: "agent_run",
          status: entry.status,
          input: sanitizedInput,
          output: { text: entry.output },
          steps: entry.steps,
          usage: entry.usage,
          agent_snapshot: agentSnapshot,
          userId: userId,
          conversationId: conversationId,
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
   * Add a timeline event to an existing history entry
   *
   * @param entryId - ID of the entry to update
   * @param event - Timeline event to add
   * @returns The updated entry or undefined if not found
   */
  public async addEventToEntry(
    entryId: string,
    event: TimelineEvent,
  ): Promise<AgentHistoryEntry | undefined> {
    if (!this.agentId) return undefined;

    try {
      const updatedEntry = await this.memoryManager.addEventToHistoryEntry(
        this.agentId,
        entryId,
        event,
      );

      if (this.voltAgentExporter && updatedEntry && event.id) {
        // The backend now expects the entire event object nested, likely under a 'value' key
        // or as the main event payload itself depending on the exporter implementation.
        // Assuming the exporter expects the event object directly:
        const payload: ExportTimelineEventPayload = {
          history_id: entryId,
          event_id: event.id,
          event,
        };

        // We need to ensure the type ExportTimelineEventPayload matches this structure
        await this.voltAgentExporter.exportTimelineEvent(payload);
      }

      return updatedEntry;
    } catch (_error) {
      return undefined;
    }
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
      await this.voltAgentExporter.exportHistorySteps(
        this.voltAgentExporter.publicKey,
        entryId,
        historySteps,
      );
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
   * Get the latest history entry
   *
   * @returns The latest history entry or undefined if no entries
   */
  public async getLatestEntry(): Promise<AgentHistoryEntry | undefined> {
    if (!this.agentId) return undefined;

    const entries = await this.getEntries();
    if (entries.length === 0) {
      return undefined;
    }

    return entries[0];
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
        agent_snapshot?: Record<string, unknown>;
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
        if (updates.agent_snapshot !== undefined)
          finalUpdates.agent_snapshot = updates.agent_snapshot;

        if (Object.keys(finalUpdates).length > 0) {
          await this.voltAgentExporter.updateHistoryEntry(
            this.voltAgentExporter.publicKey,
            id,
            finalUpdates as AgentHistoryUpdatableFields,
          );
        }
      }
    }

    return updatedEntry;
  }

  /**
   * Get a tracked event by ID
   *
   * @param historyId - ID of the history entry
   * @param eventId - ID of the event or _trackedEventId
   * @returns The tracked event or undefined if not found
   */
  public async getTrackedEvent(
    historyId: string,
    eventId: string,
  ): Promise<TimelineEvent | undefined> {
    if (!this.agentId) return undefined;

    try {
      const entry = await this.getEntryById(historyId);
      if (!entry || !entry.events) return undefined;

      let timelineEvent = entry.events.find((event) => event.id === eventId);

      if (!timelineEvent) {
        timelineEvent = entry.events.find(
          (event) => event.data && event.data._trackedEventId === eventId,
        );
      }

      return timelineEvent;
    } catch (error) {
      console.error(`[HistoryManager] Failed to get tracked event: ${eventId}`, error);
      return undefined;
    }
  }

  /**
   * Update a tracked event by ID
   *
   * @param historyId - ID of the history entry
   * @param eventId - ID of the event or _trackedEventId
   * @param updates - Updates to apply to the event
   * @returns The updated history entry or undefined if not found
   */
  public async updateTrackedEvent(
    historyId: string,
    eventId: string,
    updates: {
      status?: AgentStatus;
      data?: Record<string, unknown>;
    },
  ): Promise<AgentHistoryEntry | undefined> {
    if (!this.agentId) return undefined;

    try {
      const entry = await this.getEntryById(historyId);
      if (!entry || !entry.events) return undefined;

      let eventIndex = entry.events.findIndex((event) => event.id === eventId);

      if (eventIndex === -1) {
        eventIndex = entry.events.findIndex(
          (event) => event.data && event.data._trackedEventId === eventId,
        );
      }

      // If event is not found, show error message and return undefined
      if (eventIndex === -1) {
        console.debug(`[HistoryManager] Tracked event not found: ${eventId}`);
        return undefined;
      }

      // Copy the entry to be updated
      const updatedEntry = { ...entry };

      // Define the events array definitively
      if (!updatedEntry.events) {
        updatedEntry.events = [];
        return undefined;
      }

      const originalEvent = updatedEntry.events[eventIndex];

      // Update the event
      updatedEntry.events[eventIndex] = {
        ...originalEvent,
        updatedAt: new Date().toISOString(),
        data: {
          ...originalEvent.data,
          ...(updates.data || {}),
        },
      };

      // Save the updated entry to the database
      const result = await this.updateEntry(historyId, {
        events: updatedEntry.events,
        status: updates.status,
      });

      const updatedEvent = updatedEntry.events[eventIndex]; // This is the complete, updated event

      // Export the specific timeline event update if exporter is configured
      if (this.voltAgentExporter && originalEvent.id) {
        // Use originalEvent.id as it's guaranteed
        // Timestamps in updatedEvent are already strings (timestamp from original, updatedAt just set to ISOString)
        const serializedEvent = {
          ...updatedEvent,
          // timestamp: updatedEvent.timestamp, // No longer needed, already string
          // updatedAt: updatedEvent.updatedAt, // No longer needed, already string
        };

        // Standardize: Send the serialized event object with string timestamps
        await this.voltAgentExporter.updateTimelineEvent(
          historyId, // history_id (maps to history_entry_id in the backend via lookup)
          originalEvent.id, // event_id
          serializedEvent, // Send the serialized event object with string timestamps
        );
      }

      return result;
    } catch (error) {
      console.error(`[HistoryManager] Failed to update tracked event: ${eventId}`, error);
      return undefined;
    }
  }
}
