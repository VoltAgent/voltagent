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
 * Singleton class for managing workflow events
 * Separate from AgentEventEmitter to maintain clean separation of concerns
 */
export class WorkflowEventEmitter extends EventEmitter {
  private static instance: WorkflowEventEmitter | null = null;

  // Background queue for workflow events
  private workflowEventQueue: BackgroundQueue;

  private constructor() {
    super();

    // Initialize specialized queue for workflow events
    this.workflowEventQueue = new BackgroundQueue({
      maxConcurrency: 10, // Higher concurrency for workflow events
      defaultTimeout: 60000, // 60 seconds timeout
      defaultRetries: 5, // Reasonable retries for workflow events
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

      // Persist event in workflow history
      try {
        const historyManager = registry.getHistoryManager();
        historyManager.addEventToExecution(executionId, event);

        // ✅ FIX: Manually emit historyUpdate since addEventToExecution doesn't do it
        const updatedEntry = historyManager.getEntry(executionId);
        if (updatedEntry) {
          registry.emit("historyUpdate", executionId, updatedEntry);
        }
      } catch (historyError) {
        devLogger.warn("Failed to persist workflow event in history:", historyError);
      }
    } catch (error) {
      devLogger.error("Error processing workflow event:", error);
    }
  }

  // Event listeners removed - WorkflowRegistry handles event distribution via historyUpdate
}
