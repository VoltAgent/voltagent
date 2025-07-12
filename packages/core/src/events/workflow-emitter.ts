import { EventEmitter } from "node:events";
import { devLogger } from "@voltagent/internal/dev";
import { v4 as uuidv4 } from "uuid";
import { BackgroundQueue } from "../utils/queue/queue";
import { deepClone } from "@voltagent/internal/utils";
import type {
  WorkflowStartEvent,
  WorkflowSuccessEvent,
  WorkflowErrorEvent,
  WorkflowStepStartEvent,
  WorkflowStepSuccessEvent,
  WorkflowStepErrorEvent,
} from "./types";

/**
 * Union type for all workflow events
 */
export type WorkflowEvent =
  | WorkflowStartEvent
  | WorkflowSuccessEvent
  | WorkflowErrorEvent
  | WorkflowStepStartEvent
  | WorkflowStepSuccessEvent
  | WorkflowStepErrorEvent;

// WorkflowEvents interface removed - events now handled via WorkflowRegistry historyUpdate

/**
 * Workflow event emitter for publishing workflow events to the timeline
 */
export class WorkflowEventEmitter extends EventEmitter {
  private static instance: WorkflowEventEmitter | null = null;

  // Background queue for workflow events (similar to AgentEventEmitter)
  private workflowEventQueue: BackgroundQueue;

  private constructor() {
    super();

    // Initialize background queue for workflow events
    this.workflowEventQueue = new BackgroundQueue({
      maxConcurrency: 5, // Medium concurrency for workflow events
      defaultTimeout: 30000, // 30 seconds timeout
      defaultRetries: 3, // 3 retries for workflow events
    });
  }

  /**
   * Get the singleton instance of WorkflowEventEmitter
   */
  public static getInstance(): WorkflowEventEmitter {
    if (!WorkflowEventEmitter.instance) {
      WorkflowEventEmitter.instance = new WorkflowEventEmitter();
    }
    return WorkflowEventEmitter.instance;
  }

  /**
   * Queue workflow event for background processing (non-blocking)
   * This is the main entry point for publishing workflow events
   */
  public publishWorkflowEventAsync(params: {
    workflowId: string;
    executionId: string;
    event: WorkflowEvent;
  }): void {
    const { workflowId, executionId, event } = params;

    // Ensure event has an id and startTime
    if (!event.id) {
      event.id = uuidv4();
    }
    if (!event.startTime) {
      event.startTime = new Date().toISOString();
    }

    // Add to the background queue
    this.workflowEventQueue.enqueue({
      id: `workflow-event-${event.id}`,
      operation: async () => {
        const clonedEvent = deepClone(event);

        await this.publishWorkflowEventSync({
          workflowId,
          executionId,
          event: clonedEvent,
        });
      },
    });
  }

  /**
   * Synchronous version of publishWorkflowEvent (internal use)
   * This is what gets called by the background queue
   */
  private async publishWorkflowEventSync(params: {
    workflowId: string;
    executionId: string;
    event: WorkflowEvent;
  }): Promise<void> {
    const { executionId, event } = params;

    try {
      // Import WorkflowRegistry dynamically to avoid circular dependencies
      const { WorkflowRegistry } = await import("../workflow/registry");
      const registry = WorkflowRegistry.getInstance();

      // 🔥 PERSIST EVENT TO DATABASE
      registry.ensureMemoryManager();
      const memoryManager = registry.getMemoryManager();
      if (memoryManager) {
        try {
          // Simplified event persistence - bypass type issues
          await memoryManager.recordTimelineEvent(executionId, {
            id: uuidv4(), // Required primary key for WorkflowTimelineEvent
            eventId: event.id || uuidv4(),
            name: event.name, // 🔥 FIXED: Use correct field name
            type: event.type as "workflow" | "workflow-step", // 🔥 FIXED: Use correct field name
            startTime: new Date(event.startTime),
            endTime: event.endTime ? new Date(event.endTime) : undefined,
            status: event.status,
            level: event.level || "INFO",
            input: event.input || null,
            output: event.output || null,
            statusMessage:
              typeof event.statusMessage === "string"
                ? event.statusMessage
                : (event.statusMessage as any)?.message || null,
            metadata: {},
            traceId: event.traceId || executionId,
            parentEventId: event.parentEventId || undefined,
          });
          devLogger.debug(
            `WorkflowEventEmitter: Event persisted to DB: ${event.name} for execution ${executionId}`,
          );
        } catch (persistError) {
          devLogger.error("WorkflowEventEmitter: Failed to persist event to DB:", persistError);
        }
      }

      // Note: WorkflowRegistry now handles real-time WebSocket emission with real DB data
      // No need for additional emit here - WorkflowRegistry.emit("historyUpdate") handles it
      devLogger.debug(
        `WorkflowEventEmitter: Event processed (persist-only): ${event.name} for execution ${executionId}`,
      );
    } catch (error) {
      devLogger.error("Error processing workflow event:", error);
    }
  }

  // Event listeners removed - WorkflowRegistry handles event distribution via historyUpdate
}
