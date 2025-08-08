import { EventEmitter } from "node:events";
import { deepClone } from "@voltagent/internal/utils";
import { v4 as uuidv4 } from "uuid";
import { LoggerProxy } from "../logger";
import { BackgroundQueue } from "../utils/queue/queue";
import { WorkflowRegistry } from "../workflow/registry";
import type {
  WorkflowErrorEvent,
  WorkflowStartEvent,
  WorkflowStepErrorEvent,
  WorkflowStepStartEvent,
  WorkflowStepSuccessEvent,
  WorkflowStepSuspendEvent,
  WorkflowSuccessEvent,
  WorkflowSuspendEvent,
} from "./types";

/**
 * Union type for all workflow events
 */
export type WorkflowEvent =
  | WorkflowStartEvent
  | WorkflowSuccessEvent
  | WorkflowErrorEvent
  | WorkflowSuspendEvent
  | WorkflowStepStartEvent
  | WorkflowStepSuccessEvent
  | WorkflowStepErrorEvent
  | WorkflowStepSuspendEvent;

/**
 * Extended workflow event with persistence status
 */
export type WorkflowEventWithStatus = WorkflowEvent & {
  isPersisted?: boolean;
};

/**
 * Workflow event emitter for publishing workflow events to the timeline
 */
export class WorkflowEventEmitter extends EventEmitter {
  private static instance: WorkflowEventEmitter | null = null;

  // Background queue for workflow events (similar to AgentEventEmitter)
  private workflowEventQueue: BackgroundQueue;
  private logger = new LoggerProxy({ component: "workflow-event-emitter" });

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

    // DUAL-PATH: Emit immediately for real-time updates
    this.emitImmediateEvent({
      workflowId,
      executionId,
      event: { ...event, isPersisted: false } as WorkflowEventWithStatus,
    });

    // Add to the background queue for persistence
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
      const registry = WorkflowRegistry.getInstance();

      await registry.persistWorkflowTimelineEvent(workflowId, executionId, event);

      this.logger.trace(
        `Event delegated to WorkflowRegistry: ${event.name} for execution ${executionId}`,
      );
    } catch (error) {
      this.logger.error("Failed to delegate event to WorkflowRegistry", { error });
    }
  }

  /**
   * Emit immediate event for real-time updates (bypasses queue)
   */
  private emitImmediateEvent(params: {
    workflowId: string;
    executionId: string;
    event: WorkflowEventWithStatus;
  }): void {
    const { workflowId, executionId, event } = params;

    try {
      // Emit event immediately for WebSocket broadcast
      this.emit("immediateWorkflowEvent", {
        workflowId,
        executionId,
        event,
      });

      this.logger.trace(`Immediate event emitted: ${event.name} for execution ${executionId}`);
    } catch (error) {
      // Don't throw - immediate events are best-effort
      this.logger.error("Failed to emit immediate event", { error });
    }
  }
}
