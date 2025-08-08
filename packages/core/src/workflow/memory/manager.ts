import type { Logger } from "@voltagent/internal";
import { LoggerProxy } from "../../logger";
import type { Memory } from "../../memory/types";
import type { VoltAgentExporter } from "../../telemetry/exporter";
import type {
  CreateWorkflowExecutionOptions,
  RecordWorkflowStepOptions,
  UpdateWorkflowStepOptions,
  WorkflowHistoryEntry,
  WorkflowStats,
  WorkflowStepHistoryEntry,
  WorkflowTimelineEvent,
} from "../types";

/**
 * Manages workflow execution history and persistence and provides a
 * high-level interface for workflow memory operations
 */
export class WorkflowMemoryManager {
  // @ts-expect-error - TODO: Add exporter to the constructor
  private _exporter?: VoltAgentExporter;
  /**
   * The logger instance
   */
  private logger: Logger;

  constructor(
    private storage: Memory,
    _exporter?: VoltAgentExporter,
  ) {
    this._exporter = _exporter;
    this.logger = new LoggerProxy({ component: "workflow-memory-manager" });
  }

  /**
   * Set the VoltAgent exporter for telemetry
   */
  public setExporter(exporter: VoltAgentExporter): void {
    this._exporter = exporter;
  }

  /**
   * Create a new workflow execution entry
   *
   * @param workflowId - The ID of the workflow
   * @param workflowName - The name of the workflow
   * @param input - The input to the workflow
   * @param options - The options for the workflow execution
   * @returns The created workflow execution
   */
  public async createExecution(
    workflowId: string,
    workflowName: string,
    input: unknown,
    options: CreateWorkflowExecutionOptions = {},
  ): Promise<WorkflowHistoryEntry> {
    const entry: WorkflowHistoryEntry = {
      id: options.executionId || crypto.randomUUID(),
      workflowName: workflowName,
      workflowId,
      status: "running",
      startTime: new Date(),
      input,
      userId: options.userId,
      conversationId: options.conversationId,
      metadata: {
        // Store userContext in metadata if provided
        ...(options.userContext && { userContext: options.userContext }),
        ...options.metadata,
      },
      steps: [],
      events: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.storage.storeWorkflowHistory(entry);
    this.logger.trace(`Created workflow execution: ${entry.id}`);

    // Export to telemetry
    // TODO: Add workflow-specific telemetry methods to VoltAgentExporter
    // if (this._exporter) {
    //   this._exporter.exportWorkflowHistoryAsync({
    //     workflow_id: workflowId,
    //     execution_id: entry.id,
    //     workflow_name: workflowName,
    //     status: entry.status,
    //     start_time: entry.startTime.toISOString(),
    //     input: entry.input,
    //     metadata: entry.metadata,
    //   });
    // }

    return entry;
  }

  /**
   * Update an existing workflow execution
   *
   * @param id - The ID of the workflow execution to update
   * @param updates - The updates to apply to the workflow execution
   * @returns The updated workflow execution
   */
  public async updateExecution(
    id: string,
    updates: Partial<WorkflowHistoryEntry>,
  ): Promise<WorkflowHistoryEntry | null> {
    this.logger.trace(`Updating workflow execution ${id}`, {
      updates: {
        status: updates.status,
        hasSuspension: !!updates.metadata?.suspension,
        metadata: updates.metadata,
      },
    });

    const updatedEntry = {
      ...updates,
      updatedAt: new Date(),
    };

    await this.storage.updateWorkflowHistory(id, updatedEntry);
    this.logger.trace(`Updated workflow execution: ${id} with status: ${updates.status}`);

    // Export update to telemetry
    // TODO: Add workflow-specific telemetry methods to VoltAgentExporter
    // if (this._exporter && updates.status) {
    //   const entry = await this.storage.getWorkflowHistory(id);
    //   if (entry) {
    //     this._exporter.exportWorkflowHistoryAsync({
    //       workflow_id: entry.workflowId,
    //       execution_id: entry.id,
    //       workflow_name: entry.name,
    //       status: entry.status,
    //       start_time: entry.startTime.toISOString(),
    //       end_time: entry.endTime?.toISOString(),
    //       input: entry.input,
    //       output: entry.output,
    //       metadata: entry.metadata,
    //     });
    //   }
    // }

    return this.storage.getWorkflowHistory(id);
  }

  /**
   * Get a workflow execution by ID
   *
   * @param id - The ID of the workflow execution to get
   * @returns The workflow execution
   */
  public async getExecution(id: string): Promise<WorkflowHistoryEntry | null> {
    return this.storage.getWorkflowHistory(id);
  }

  /**
   * Get all executions for a workflow
   *
   * @param workflowId - The ID of the workflow to get executions for
   * @returns The workflow executions
   */
  public async getExecutions(workflowId: string): Promise<WorkflowHistoryEntry[]> {
    return this.storage.getWorkflowHistoryByWorkflowId(workflowId);
  }

  /**
   * Get workflow execution with all related data (steps and events)
   */
  public async getExecutionWithDetails(id: string): Promise<WorkflowHistoryEntry | null> {
    return this.storage.getWorkflowHistoryWithStepsAndEvents(id);
  }

  /**
   * Record the start of a workflow step
   *
   * @param workflowHistoryId - The ID of the workflow execution
   * @param stepIndex - The index of the step
   * @param stepType - The type of step
   * @param stepName - The name of the step
   * @param input - The input to the step
   * @param options - The options for the step
   * @returns The recorded step
   */
  public async recordStepStart(
    workflowHistoryId: string,
    stepIndex: number,
    stepType: "agent" | "func" | "conditional-when" | "parallel-all" | "parallel-race",
    stepName: string,
    input?: unknown,
    options: RecordWorkflowStepOptions = {},
  ): Promise<WorkflowStepHistoryEntry> {
    const step: WorkflowStepHistoryEntry = {
      id: crypto.randomUUID(),
      workflowHistoryId,
      stepIndex,
      stepType,
      stepName,
      stepId: options.stepId,
      status: "running",
      startTime: new Date(),
      input,
      parallelIndex: options.parallelIndex,
      parallelParentStepId: options.parentStepId,
      metadata: options.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.storage.storeWorkflowStep(step);
    this.logger.trace(`Recorded step start: ${step.id}`);

    return step;
  }

  /**
   * Record the end of a workflow step
   *
   * @param stepId - The ID of the step to record the end of
   * @param options - The options for the step
   * @returns The recorded step
   */
  public async recordStepEnd(
    stepId: string,
    options: UpdateWorkflowStepOptions = {},
  ): Promise<WorkflowStepHistoryEntry | null> {
    const updates: Partial<WorkflowStepHistoryEntry> = {
      status: options.status || "completed",
      endTime: new Date(),
      output: options.output,
      error: options.errorMessage,
      agentExecutionId: options.agentExecutionId,
      metadata: options.metadata,
      updatedAt: new Date(),
    };

    await this.storage.updateWorkflowStep(stepId, updates);
    this.logger.trace(`Recorded step end: ${stepId}`);

    return this.storage.getWorkflowStep(stepId);
  }

  /**
   * Record a timeline event for a workflow
   *
   * @param workflowHistoryId - The ID of the workflow execution
   * @param event - The event to record
   */
  public async recordTimelineEvent(
    workflowHistoryId: string,
    event: Omit<WorkflowTimelineEvent, "workflowHistoryId" | "createdAt">,
  ): Promise<void> {
    const fullEvent: WorkflowTimelineEvent = {
      ...event,
      workflowHistoryId,
      createdAt: new Date(),
    };

    await this.storage.storeWorkflowTimelineEvent(fullEvent);
    this.logger.trace(`Recorded timeline event: ${event.eventId}`);

    // Export event to telemetry
    // TODO: Add workflow-specific telemetry methods to VoltAgentExporter
    // if (this._exporter) {
    //   this._exporter.exportWorkflowTimelineEventAsync({
    //     workflow_history_id: workflowHistoryId,
    //     event_id: event.eventId,
    //     event: fullEvent,
    //   });
    // }
  }

  /**
   * Get workflow statistics
   *
   * @param workflowId - The ID of the workflow to get statistics for
   * @returns The workflow statistics
   */
  public async getWorkflowStats(workflowId: string): Promise<WorkflowStats> {
    return this.storage.getWorkflowStats(workflowId);
  }

  /**
   * Get all workflow IDs
   *
   * @returns The workflow IDs
   */
  public async getAllWorkflowIds(): Promise<string[]> {
    return this.storage.getAllWorkflowIds();
  }

  /**
   * Delete a workflow execution and all related data
   *
   * @param id - The ID of the workflow execution to delete
   */
  public async deleteExecution(id: string): Promise<void> {
    await this.storage.deleteWorkflowHistoryWithRelated(id);
    this.logger.trace(`Deleted workflow execution: ${id}`);
  }

  /**
   * Clean up old workflow executions
   *
   * @param workflowId - The ID of the workflow to clean up
   * @param maxEntries - The maximum number of entries to keep
   * @returns The number of deleted entries
   */
  public async cleanupOldExecutions(workflowId: string, maxEntries: number): Promise<number> {
    const deletedCount = await this.storage.cleanupOldWorkflowHistories(workflowId, maxEntries);
    this.logger.trace(`Cleaned up ${deletedCount} old executions for workflow: ${workflowId}`);
    return deletedCount;
  }

  /**
   * Get workflow steps for a specific execution
   *
   * @param workflowHistoryId - The ID of the workflow execution
   * @returns The workflow steps
   */
  public async getWorkflowSteps(workflowHistoryId: string): Promise<WorkflowStepHistoryEntry[]> {
    return this.storage.getWorkflowSteps(workflowHistoryId);
  }

  /**
   * Get timeline events for a specific execution
   *
   * @param workflowHistoryId - The ID of the workflow execution
   * @returns The timeline events
   */
  public async getTimelineEvents(workflowHistoryId: string): Promise<WorkflowTimelineEvent[]> {
    return this.storage.getWorkflowTimelineEvents(workflowHistoryId);
  }

  /**
   * Update a workflow step
   *
   * @param stepId - The ID of the step to update
   * @param updates - The updates to apply to the step
   * @returns The updated step
   */
  public async updateStep(
    stepId: string,
    updates: Partial<WorkflowStepHistoryEntry>,
  ): Promise<WorkflowStepHistoryEntry | null> {
    const updatedStep = {
      ...updates,
      updatedAt: new Date(),
    };

    await this.storage.updateWorkflowStep(stepId, updatedStep);
    this.logger.trace(`Updated workflow step: ${stepId}`);

    return this.storage.getWorkflowStep(stepId);
  }

  /**
   * Get a single workflow step
   *
   * @param stepId - The ID of the step to get
   * @returns The workflow step
   */
  public async getStep(stepId: string): Promise<WorkflowStepHistoryEntry | null> {
    return this.storage.getWorkflowStep(stepId);
  }

  /**
   * Get all suspended workflow executions for a workflow
   *
   * @param workflowId - The ID of the workflow to get suspended executions for
   * @returns The suspended workflow executions
   */
  public async getSuspendedExecutions(workflowId: string): Promise<WorkflowHistoryEntry[]> {
    const allExecutions = await this.getExecutions(workflowId);
    return allExecutions.filter((execution) => execution.status === ("suspended" as any));
  }

  /**
   * Store suspension checkpoint data
   *
   * @param executionId - The ID of the execution to store the suspension checkpoint for
   * @param suspensionMetadata - The suspension metadata to store
   */
  public async storeSuspensionCheckpoint(
    executionId: string,
    suspensionMetadata: any,
  ): Promise<void> {
    this.logger.trace(`Attempting to store suspension checkpoint for execution ${executionId}`);
    const execution = await this.getExecution(executionId);
    if (execution) {
      this.logger.trace(`Found execution ${executionId}, updating with suspension metadata`);
      await this.updateExecution(executionId, {
        status: "suspended" as any,
        metadata: {
          ...execution.metadata,
          suspension: suspensionMetadata,
        },
      });
      this.logger.trace(`Successfully stored suspension checkpoint for execution ${executionId}`);
    } else {
      this.logger.error(
        `Execution ${executionId} not found when trying to store suspension checkpoint`,
      );
      throw new Error(`Execution ${executionId} not found`);
    }
  }

  /**
   * Get a single timeline event
   *
   * @param eventId - The ID of the timeline event to get
   * @returns The timeline event
   */
  public async getTimelineEvent(eventId: string): Promise<WorkflowTimelineEvent | null> {
    return this.storage.getWorkflowTimelineEvent(eventId);
  }
}
