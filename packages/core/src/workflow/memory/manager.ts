import { devLogger } from "@voltagent/internal/dev";
import type { VoltAgentExporter } from "../../telemetry/exporter";
import type {
  WorkflowHistoryEntry,
  WorkflowStepHistoryEntry,
  WorkflowTimelineEvent,
  WorkflowStats,
  CreateWorkflowExecutionOptions,
  RecordWorkflowStepOptions,
  UpdateWorkflowStepOptions,
} from "../types";
import type { Memory } from "../../memory/types";

/**
 * Manages workflow execution history and persistence
 * Provides a high-level interface for workflow memory operations
 */
export class WorkflowMemoryManager {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // @ts-ignore
  private _exporter?: VoltAgentExporter;

  constructor(
    private storage: Memory,
    _exporter?: VoltAgentExporter,
  ) {
    this._exporter = _exporter;
    devLogger.info("[WorkflowMemoryManager] Initialized with storage backend");
  }

  /**
   * Set the VoltAgent exporter for telemetry
   */
  setExporter(exporter: VoltAgentExporter): void {
    this._exporter = exporter;
    devLogger.info("[WorkflowMemoryManager] VoltAgent exporter configured");
  }

  /**
   * Create a new workflow execution entry
   */
  async createExecution(
    workflowId: string,
    workflowName: string,
    input: unknown,
    options: CreateWorkflowExecutionOptions = {},
  ): Promise<WorkflowHistoryEntry> {
    const entry: WorkflowHistoryEntry = {
      id: crypto.randomUUID(),
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
    devLogger.debug(`[WorkflowMemoryManager] Created workflow execution: ${entry.id}`);

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
   */
  async updateExecution(
    id: string,
    updates: Partial<WorkflowHistoryEntry>,
  ): Promise<WorkflowHistoryEntry | null> {
    const updatedEntry = {
      ...updates,
      updatedAt: new Date(),
    };

    await this.storage.updateWorkflowHistory(id, updatedEntry);
    devLogger.debug(`[WorkflowMemoryManager] Updated workflow execution: ${id}`);

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
   */
  async getExecution(id: string): Promise<WorkflowHistoryEntry | null> {
    return this.storage.getWorkflowHistory(id);
  }

  /**
   * Get all executions for a workflow
   */
  async getExecutions(workflowId: string): Promise<WorkflowHistoryEntry[]> {
    return this.storage.getWorkflowHistoryByWorkflowId(workflowId);
  }

  /**
   * Get workflow execution with all related data (steps and events)
   */
  async getExecutionWithDetails(id: string): Promise<WorkflowHistoryEntry | null> {
    return this.storage.getWorkflowHistoryWithStepsAndEvents(id);
  }

  /**
   * Record the start of a workflow step
   */
  async recordStepStart(
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
    devLogger.debug(`[WorkflowMemoryManager] Recorded step start: ${step.id}`);

    return step;
  }

  /**
   * Record the end of a workflow step
   */
  async recordStepEnd(
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
    devLogger.debug(`[WorkflowMemoryManager] Recorded step end: ${stepId}`);

    return this.storage.getWorkflowStep(stepId);
  }

  /**
   * Record a timeline event for a workflow
   */
  async recordTimelineEvent(
    workflowHistoryId: string,
    event: Omit<WorkflowTimelineEvent, "workflowHistoryId" | "createdAt">,
  ): Promise<void> {
    const fullEvent: WorkflowTimelineEvent = {
      ...event,
      workflowHistoryId,
      createdAt: new Date(),
    };

    await this.storage.storeWorkflowTimelineEvent(fullEvent);
    devLogger.debug(`[WorkflowMemoryManager] Recorded timeline event: ${event.eventId}`);

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
   */
  async getWorkflowStats(workflowId: string): Promise<WorkflowStats> {
    return this.storage.getWorkflowStats(workflowId);
  }

  /**
   * Get all workflow IDs
   */
  async getAllWorkflowIds(): Promise<string[]> {
    return this.storage.getAllWorkflowIds();
  }

  /**
   * Delete a workflow execution and all related data
   */
  async deleteExecution(id: string): Promise<void> {
    await this.storage.deleteWorkflowHistoryWithRelated(id);
    devLogger.debug(`[WorkflowMemoryManager] Deleted workflow execution: ${id}`);
  }

  /**
   * Clean up old workflow executions
   */
  async cleanupOldExecutions(workflowId: string, maxEntries: number): Promise<number> {
    const deletedCount = await this.storage.cleanupOldWorkflowHistories(workflowId, maxEntries);
    devLogger.debug(
      `[WorkflowMemoryManager] Cleaned up ${deletedCount} old executions for workflow: ${workflowId}`,
    );
    return deletedCount;
  }

  /**
   * Get workflow steps for a specific execution
   */
  async getWorkflowSteps(workflowHistoryId: string): Promise<WorkflowStepHistoryEntry[]> {
    return this.storage.getWorkflowSteps(workflowHistoryId);
  }

  /**
   * Get timeline events for a specific execution
   */
  async getTimelineEvents(workflowHistoryId: string): Promise<WorkflowTimelineEvent[]> {
    return this.storage.getWorkflowTimelineEvents(workflowHistoryId);
  }

  /**
   * Update a workflow step
   */
  async updateStep(
    stepId: string,
    updates: Partial<WorkflowStepHistoryEntry>,
  ): Promise<WorkflowStepHistoryEntry | null> {
    const updatedStep = {
      ...updates,
      updatedAt: new Date(),
    };

    await this.storage.updateWorkflowStep(stepId, updatedStep);
    devLogger.debug(`[WorkflowMemoryManager] Updated workflow step: ${stepId}`);

    return this.storage.getWorkflowStep(stepId);
  }

  /**
   * Get a single workflow step
   */
  async getStep(stepId: string): Promise<WorkflowStepHistoryEntry | null> {
    return this.storage.getWorkflowStep(stepId);
  }

  /**
   * Get a single timeline event
   */
  async getTimelineEvent(eventId: string): Promise<WorkflowTimelineEvent | null> {
    return this.storage.getWorkflowTimelineEvent(eventId);
  }
}
