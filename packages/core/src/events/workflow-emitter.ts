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
   * ✅ CLEAN: This is the main entry point for publishing workflow events
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
   */
  private async publishWorkflowEventSync(params: {
    workflowId: string;
    executionId: string;
    event: WorkflowEvent;
  }): Promise<void> {
    const { workflowId, executionId, event } = params;

    try {
      const { WorkflowRegistry } = await import("../workflow/registry");
      const registry = WorkflowRegistry.getInstance();

      await registry.persistWorkflowTimelineEvent(workflowId, executionId, event);

      devLogger.debug(
        `[WorkflowEventEmitter] Event delegated to WorkflowRegistry: ${event.name} for execution ${executionId}`,
      );
    } catch (error) {
      devLogger.error(
        "[WorkflowEventEmitter] Failed to delegate event to WorkflowRegistry:",
        error,
      );
    }
  }
}
