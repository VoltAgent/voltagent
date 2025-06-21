import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import { devLogger } from "@voltagent/internal/dev";
import { v4 as uuidv4 } from "uuid";
import type { AgentHistoryEntry } from "../agent/history";
import type { AgentStatus } from "../agent/types";
import type { BaseMessage } from "../index";
import { AgentRegistry } from "../server/registry";
import { BackgroundQueue } from "../utils/queue/queue";
import type { NewTimelineEvent } from "./types";

// New type exports
export type EventStatus = AgentStatus;
export type TimelineEventType = "memory" | "tool" | "agent" | "retriever";

/**
 * Types for tracked event functionality
 */
export type EventUpdater = (updateOptions: {
  status?: AgentStatus;
  data?: Record<string, any>;
}) => Promise<AgentHistoryEntry | undefined>;

export type TrackedEventOptions = {
  agentId: string;
  historyId: string;
  name: string;
  status?: AgentStatus;
  data?: Record<string, any>;
  type: "memory" | "tool" | "agent" | "retriever";
};

export type TrackEventOptions = {
  agentId: string;
  historyId: string;
  name: string;
  initialData?: Record<string, any>;
  initialStatus?: AgentStatus;
  operation: (update: EventUpdater) => Promise<any>;
  type: "memory" | "tool" | "agent" | "retriever";
};

/**
 * Events that can be emitted by agents
 */
export interface AgentEvents {
  /**
   * Emitted when an agent is registered
   */
  agentRegistered: (agentId: string) => void;

  /**
   * Emitted when an agent is unregistered
   */
  agentUnregistered: (agentId: string) => void;

  /**
   * Emitted when an agent's history entry is updated
   */
  historyUpdate: (agentId: string, historyEntry: AgentHistoryEntry) => void;

  /**
   * Emitted when a new history entry is created for an agent
   */
  historyEntryCreated: (agentId: string, historyEntry: AgentHistoryEntry) => void;
}

/**
 * Singleton class for managing agent events
 */
export class AgentEventEmitter extends EventEmitter {
  private static instance: AgentEventEmitter | null = null;

  // Background queue for timeline events
  private timelineEventQueue: BackgroundQueue;

  private constructor() {
    super();

    // Initialize specialized queue for timeline events
    this.timelineEventQueue = new BackgroundQueue({
      maxConcurrency: 5, // Higher concurrency for timeline events (real-time feedback)
      defaultTimeout: 5000, // 5 seconds timeout (faster for UI feedback)
      defaultRetries: 2, // Less retries (timeline events are less critical)
      drainTimeout: 3000, // 3 seconds to drain (quick shutdown)
    });
  }

  /**
   * Get the singleton instance of AgentEventEmitter
   */
  public static getInstance(): AgentEventEmitter {
    if (!AgentEventEmitter.instance) {
      AgentEventEmitter.instance = new AgentEventEmitter();
    }
    return AgentEventEmitter.instance;
  }

  /**
   * Drain all pending timeline events
   * This should be called when shutting down to ensure all events are processed
   */
  public async drainTimelineEvents(): Promise<void> {
    await this.timelineEventQueue.drain();
  }

  /**
   * Queue timeline event for background processing (non-blocking)
   * Uses the new BackgroundQueue utility for better reliability
   */
  public publishTimelineEventAsync(params: {
    agentId: string;
    historyId: string;
    event: NewTimelineEvent;
    skipPropagation?: boolean;
  }): void {
    const { agentId, historyId, event, skipPropagation = false } = params;

    // Ensure event has an id and startTime
    if (!event.id) {
      event.id = uuidv4();
    }
    if (!event.startTime) {
      event.startTime = new Date().toISOString();
    }

    // Add to the background queue
    this.timelineEventQueue.enqueue({
      id: `timeline-event-${event.id}`,
      operation: async () => {
        // 🔴 FIX: Proper deep clone to avoid mutation issues
        const clonedEvent = this.deepCloneEvent(event);

        await this.publishTimelineEventSync({
          agentId,
          historyId,
          event: clonedEvent,
          skipPropagation,
        });
      },
    });
  }

  /**
   * Deep clone event to prevent mutation issues
   */
  private deepCloneEvent(event: NewTimelineEvent): NewTimelineEvent {
    try {
      return JSON.parse(JSON.stringify(event));
    } catch (error) {
      devLogger.warn("Failed to deep clone event, using shallow clone:", error);
      return { ...event };
    }
  }

  /**
   * Synchronous version of publishTimelineEvent (internal use)
   * This is what gets called by the background queue
   */
  private async publishTimelineEventSync(params: {
    agentId: string;
    historyId: string;
    event: NewTimelineEvent;
    skipPropagation?: boolean;
  }): Promise<AgentHistoryEntry | undefined> {
    const { agentId, historyId, event, skipPropagation = false } = params;

    const agent = AgentRegistry.getInstance().getAgent(agentId);
    if (!agent) {
      devLogger.warn("Agent not found: ", agentId);
      return undefined;
    }

    const historyManager = agent.getHistoryManager();

    try {
      // Call the new method in HistoryManager to persist this new event type
      const updatedEntry = await historyManager.persistTimelineEvent(historyId, event);

      if (updatedEntry) {
        this.emitHistoryUpdate(agentId, updatedEntry);

        // Propagate the event to parent agents if not explicitly skipped
        if (!skipPropagation) {
          await this.propagateEventToParentAgents(agentId, historyId, event);
        }

        return updatedEntry;
      }
      devLogger.warn("Failed to persist event for history: ", historyId);
      return undefined;
    } catch (error) {
      devLogger.error("Error persisting event:", error);
      return undefined;
    }
  }

  /**
   * Propagates a timeline event from a subagent to all its parent agents (optimized batch version)
   * This ensures all events from subagents appear in parent agent timelines
   *
   * @param agentId - The source agent ID (subagent)
   * @param historyId - The history entry ID of the source (not used directly but needed for context)
   * @param event - The event to propagate
   * @param visited - Set of already visited agents (to prevent cycles)
   */
  private async propagateEventToParentAgents(
    agentId: string,
    _historyId: string,
    event: NewTimelineEvent,
    visited: Set<string> = new Set(),
  ): Promise<void> {
    // Prevent infinite loops in cyclic agent relationships by tracking visited agents
    if (visited.has(agentId)) return;
    visited.add(agentId);

    // Get parent agent IDs for this agent
    const parentIds = AgentRegistry.getInstance().getParentAgentIds(agentId);
    if (parentIds.length === 0) return; // No parents, nothing to propagate to

    // Batch process all parent propagations to reduce queue pressure
    const propagationPromises = parentIds.map(async (parentId) => {
      const parentAgent = AgentRegistry.getInstance().getAgent(parentId);
      if (!parentAgent) return;

      try {
        // Find active history entry for the parent agent
        const parentHistory = await parentAgent.getHistory();
        const activeParentEntry =
          parentHistory.length > 0 ? parentHistory[parentHistory.length - 1] : undefined;

        if (!activeParentEntry) return;

        // Publish the enriched event to the parent, but skip further propagation
        // to avoid propagation cycles (skipPropagation=true)
        this.publishTimelineEventAsync({
          agentId: parentId,
          historyId: activeParentEntry.id,
          event: {
            ...event,
            id: crypto.randomUUID(),
            metadata: {
              ...event.metadata,
              agentId: event.metadata.agentId || parentId,
            },
          },
          skipPropagation: true, // Prevent cycles
        });

        // Recursively propagate to higher level ancestors (grandparents)
        await this.propagateEventToParentAgents(parentId, activeParentEntry.id, event, visited);
      } catch (error) {
        devLogger.warn(`Failed to propagate event to parent agent ${parentId}:`, error);
      }
    });

    // Wait for all propagations to complete
    await Promise.allSettled(propagationPromises);
  }

  /**
   * Emit a history update event
   */
  public emitHistoryUpdate(agentId: string, historyEntry: AgentHistoryEntry): void {
    // Add a sequence number based on timestamp to ensure correct ordering
    const updatedHistoryEntry = {
      ...historyEntry,
      _sequenceNumber: Date.now(),
    };

    this.emit("historyUpdate", agentId, updatedHistoryEntry);
    // After emitting the direct update, propagate to parent agents
    // this.emitHierarchicalHistoryUpdate(agentId, updatedHistoryEntry);
  }

  /**
   * Emit hierarchical history entry created events to parent agents
   * This ensures that parent agents are aware of new subagent history entries
   */
  public async emitHierarchicalHistoryEntryCreated(
    agentId: string,
    historyEntry: AgentHistoryEntry,
    visited: Set<string> = new Set(),
  ): Promise<void> {
    // Prevent infinite loops by tracking visited agents
    if (visited.has(agentId)) return;
    visited.add(agentId);

    // Get parent agent IDs for this agent
    const parentIds = AgentRegistry.getInstance().getParentAgentIds(agentId);

    // Get agent information for better naming
    const agent = AgentRegistry.getInstance().getAgent(agentId);
    const agentName = agent ? agent.name : agentId;

    // Propagate history creation to each parent agent
    for (const parentId of parentIds) {
      const parentAgent = AgentRegistry.getInstance().getAgent(parentId);
      if (!parentAgent) continue;

      // Find active history entry for the parent
      const parentHistory = await parentAgent.getHistory();
      const activeParentHistoryEntry =
        parentHistory.length > 0 ? parentHistory[parentHistory.length - 1] : undefined;

      if (activeParentHistoryEntry) {
        // Create agent:start event in parent's history for the subagent
        this.publishTimelineEventAsync({
          agentId: parentId,
          historyId: activeParentHistoryEntry.id,
          event: {
            id: crypto.randomUUID(),
            name: "agent:start",
            type: "agent",
            startTime: new Date().toISOString(),
            status: "running",
            input: {
              input: historyEntry.input as string | BaseMessage[],
            },
            output: null,
            metadata: {
              displayName: agentName,
              id: agentId,
              agentId: parentId,
            },
            traceId: activeParentHistoryEntry.id,
          },
        });
      }

      // Recursively propagate to higher-level ancestors
      await this.emitHierarchicalHistoryEntryCreated(parentId, historyEntry, visited);
    }
  }

  /**
   * Emit hierarchical history update events to parent agents
   * This ensures that parent agents are aware of subagent history changes
   */
  public async emitHierarchicalHistoryUpdate(
    agentId: string,
    historyEntry: AgentHistoryEntry,
    visited: Set<string> = new Set(),
  ): Promise<void> {
    // Prevent infinite loops by tracking visited agents
    if (visited.has(agentId)) return;
    visited.add(agentId);

    // Get parent agent IDs for this agent
    const parentIds = AgentRegistry.getInstance().getParentAgentIds(agentId);

    // Get agent information for better naming
    const agent = AgentRegistry.getInstance().getAgent(agentId);
    const agentName = agent ? agent.name : agentId;

    // Propagate history update to each parent agent
    for (const parentId of parentIds) {
      const parentAgent = AgentRegistry.getInstance().getAgent(parentId);
      if (!parentAgent) continue;

      // Find active history entry for the parent
      const parentHistory = await parentAgent.getHistory();
      const activeParentHistoryEntry =
        parentHistory.length > 0 ? parentHistory[parentHistory.length - 1] : undefined;

      if (activeParentHistoryEntry) {
        // Create appropriate event based on history entry status
        if (historyEntry.status === "completed") {
          // Create agent:success event
          this.publishTimelineEventAsync({
            agentId: parentId,
            historyId: activeParentHistoryEntry.id,
            event: {
              id: crypto.randomUUID(),
              name: "agent:success",
              type: "agent",
              startTime:
                typeof historyEntry.startTime === "string"
                  ? historyEntry.startTime
                  : new Date().toISOString(),
              endTime: new Date().toISOString(),
              status: "completed",
              input: null,
              output: { content: historyEntry.output },
              metadata: {
                displayName: agentName,
                id: agentId,
                agentId: parentId,
              },
              traceId: activeParentHistoryEntry.id,
            },
          });
        } else if (historyEntry.status === "error") {
          // Create agent:error event
          this.publishTimelineEventAsync({
            agentId: parentId,
            historyId: activeParentHistoryEntry.id,
            event: {
              id: crypto.randomUUID(),
              name: "agent:error",
              type: "agent",
              startTime:
                typeof historyEntry.startTime === "string"
                  ? historyEntry.startTime
                  : new Date().toISOString(),
              endTime: new Date().toISOString(),
              status: "error",
              level: "ERROR",
              input: null,
              output: null,
              statusMessage: { message: historyEntry.output || "Subagent error" },
              metadata: {
                displayName: agentName,
                id: agentId,
                agentId: parentId,
              },
              traceId: activeParentHistoryEntry.id,
            },
          });
        }
        // Other statuses can be handled here if needed (e.g., "working", "cancelled", etc.)

        // Recursively propagate to higher-level ancestors
        await this.emitHierarchicalHistoryUpdate(parentId, historyEntry, visited);
      }
    }
  }

  /**
   * Emit a history entry created event
   */
  public emitHistoryEntryCreated(agentId: string, historyEntry: AgentHistoryEntry): void {
    this.emit("historyEntryCreated", agentId, historyEntry);
    // After emitting the direct creation, propagate to parent agents
    //this.emitHierarchicalHistoryEntryCreated(agentId, historyEntry);
  }

  /**
   * Emit an agent registered event
   */
  public emitAgentRegistered(agentId: string): void {
    this.emit("agentRegistered", agentId);
  }

  /**
   * Emit an agent unregistered event
   */
  public emitAgentUnregistered(agentId: string): void {
    this.emit("agentUnregistered", agentId);
  }

  /**
   * Subscribe to history update events
   */
  public onHistoryUpdate(
    callback: (agentId: string, historyEntry: AgentHistoryEntry) => void,
  ): () => void {
    this.on("historyUpdate", callback);
    return () => this.off("historyUpdate", callback);
  }

  /**
   * Subscribe to history entry created events
   */
  public onHistoryEntryCreated(
    callback: (agentId: string, historyEntry: AgentHistoryEntry) => void,
  ): () => void {
    this.on("historyEntryCreated", callback);
    return () => this.off("historyEntryCreated", callback);
  }

  /**
   * Subscribe to agent registered events
   */
  public onAgentRegistered(callback: (agentId: string) => void): () => void {
    this.on("agentRegistered", callback);
    return () => this.off("agentRegistered", callback);
  }

  /**
   * Subscribe to agent unregistered events
   */
  public onAgentUnregistered(callback: (agentId: string) => void): () => void {
    this.on("agentUnregistered", callback);
    return () => this.off("agentUnregistered", callback);
  }
}
