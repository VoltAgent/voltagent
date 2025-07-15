import type { VoltAgentExporter } from "../telemetry/exporter";
import type { WorkflowEvent } from "../events/workflow-emitter";
import type { WorkflowMemoryManager } from "./memory/manager";
import type { WorkflowHistoryEntry, WorkflowStepHistoryEntry } from "./types";
import { devLogger } from "@voltagent/internal/dev";
import { v4 as uuidv4 } from "uuid";

/**
 * Manages workflow execution history and event tracking
 * Follows the same pattern as Agent HistoryManager for consistency
 */
export class WorkflowHistoryManager {
  private readonly workflowId: string;
  private memoryManager?: WorkflowMemoryManager;
  private exporter?: VoltAgentExporter;

  constructor(
    workflowId: string,
    memoryManager?: WorkflowMemoryManager,
    exporter?: VoltAgentExporter,
  ) {
    this.workflowId = workflowId;
    this.memoryManager = memoryManager;
    this.exporter = exporter;
  }

  /**
   * Set memory manager for persistence
   */
  public setMemoryManager(memoryManager: WorkflowMemoryManager): void {
    this.memoryManager = memoryManager;
  }

  /**
   * Set exporter for telemetry
   */
  public setExporter(exporter: VoltAgentExporter): void {
    this.exporter = exporter;
  }

  /**
   * Check if memory manager is configured
   */
  public isMemoryManagerConfigured(): boolean {
    return !!this.memoryManager;
  }

  /**
   * Record the start of a workflow step (similar to Agent system)
   * This creates persistent step records for historical analysis
   */
  public async recordStepStart(
    executionId: string,
    stepIndex: number,
    stepType: "agent" | "func" | "conditional-when" | "parallel-all" | "parallel-race",
    stepName: string,
    input?: unknown,
    options?: {
      stepId?: string;
      parallelIndex?: number;
      parentStepId?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<WorkflowStepHistoryEntry | null> {
    if (!this.memoryManager) {
      devLogger.warn(
        "[WorkflowHistoryManager] No memory manager configured, skipping step start recording",
      );
      return null;
    }

    try {
      const step = await this.memoryManager.recordStepStart(
        executionId,
        stepIndex,
        stepType,
        stepName,
        input,
        {
          stepId: options?.stepId,
          parallelIndex: options?.parallelIndex,
          parentStepId: options?.parentStepId,
          metadata: options?.metadata,
        },
      );

      devLogger.debug(
        `[WorkflowHistoryManager] Step start recorded: ${stepName} (${step.id}) for execution ${executionId}`,
      );

      return step;
    } catch (error) {
      devLogger.error("[WorkflowHistoryManager] Failed to record step start:", error);
      return null;
    }
  }

  /**
   * Record the end of a workflow step
   */
  public async recordStepEnd(
    stepId: string,
    options?: {
      status?: "completed" | "error" | "skipped";
      output?: unknown;
      errorMessage?: string;
      agentExecutionId?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<WorkflowStepHistoryEntry | null> {
    if (!this.memoryManager) {
      devLogger.warn(
        "[WorkflowHistoryManager] No memory manager configured, skipping step end recording",
      );
      return null;
    }

    try {
      const step = await this.memoryManager.recordStepEnd(stepId, {
        status: options?.status || "completed",
        output: options?.output,
        errorMessage: options?.errorMessage,
        agentExecutionId: options?.agentExecutionId,
        metadata: options?.metadata,
      });

      devLogger.debug(
        `[WorkflowHistoryManager] Step end recorded: ${stepId} with status ${options?.status || "completed"}`,
      );

      return step;
    } catch (error) {
      devLogger.error("[WorkflowHistoryManager] Failed to record step end:", error);
      return null;
    }
  }

  /**
   * Persist a timeline event to workflow history (following Agent pattern)
   * This is the main responsibility of this class
   */
  public async persistTimelineEvent(
    executionId: string,
    event: WorkflowEvent,
  ): Promise<WorkflowHistoryEntry | null> {
    if (!this.memoryManager) {
      devLogger.warn("[WorkflowHistoryManager] No memory manager configured, skipping persistence");
      return null;
    }

    try {
      // Persist event to database
      const eventMetadata = event.metadata
        ? (event.metadata as unknown as Record<string, unknown>)
        : {};

      await this.memoryManager.recordTimelineEvent(executionId, {
        id: uuidv4(), // Required primary key for WorkflowTimelineEvent
        eventId: event.id || uuidv4(),
        name: event.name,
        type: event.type as "workflow" | "workflow-step",
        startTime: event.startTime,
        endTime: event.endTime || undefined,
        status: event.status,
        level: event.level || "INFO",
        input: event.input || null,
        output: event.output || null,
        statusMessage:
          typeof event.statusMessage === "string"
            ? event.statusMessage
            : (event.statusMessage as any)?.message || null,
        metadata: eventMetadata,
        traceId: event.traceId || executionId,
        parentEventId: event.parentEventId || undefined,
        eventSequence: eventMetadata.eventSequence as number, // Extract sequence from metadata (required)
      });

      devLogger.debug(
        `[WorkflowHistoryManager] Event persisted: ${event.name} for execution ${executionId}`,
      );

      // Export to telemetry if configured
      if (this.exporter) {
        try {
          this.exporter.exportTimelineEventAsync({
            agent_id: `workflow:${this.workflowId}`,
            history_id: executionId,
            event_id: event.id,
            event: event,
          });
        } catch (exportError) {
          devLogger.error("[WorkflowHistoryManager] Failed to export timeline event:", exportError);
        }
      }

      // Get updated execution with details
      const updatedExecution = await this.memoryManager.getExecutionWithDetails(executionId);
      if (updatedExecution) {
        return updatedExecution;
      }

      return null;
    } catch (error) {
      devLogger.error("[WorkflowHistoryManager] Failed to persist timeline event:", error);
      return null;
    }
  }

  /**
   * Get workflow execution history entries
   */
  public async getExecutions(): Promise<WorkflowHistoryEntry[]> {
    if (!this.memoryManager) {
      return [];
    }

    try {
      const basicExecutions = await this.memoryManager.getExecutions(this.workflowId);

      // Get detailed executions with steps and events
      const detailedExecutions: WorkflowHistoryEntry[] = [];
      for (const execution of basicExecutions) {
        const detailedExecution = await this.memoryManager.getExecutionWithDetails(execution.id);
        if (detailedExecution) {
          detailedExecutions.push(detailedExecution);
        }
      }

      return detailedExecutions;
    } catch (error) {
      devLogger.error("[WorkflowHistoryManager] Failed to get executions:", error);
      return [];
    }
  }

  /**
   * Get specific execution with details (including steps)
   */
  public async getExecutionWithDetails(executionId: string): Promise<WorkflowHistoryEntry | null> {
    if (!this.memoryManager) {
      return null;
    }

    try {
      const execution = await this.memoryManager.getExecutionWithDetails(executionId);
      return execution || null;
    } catch (error) {
      devLogger.error("[WorkflowHistoryManager] Failed to get execution details:", error);
      return null;
    }
  }

  /**
   * Get all steps for a specific execution
   */
  public async getWorkflowSteps(executionId: string): Promise<WorkflowStepHistoryEntry[]> {
    if (!this.memoryManager) {
      return [];
    }

    try {
      return await this.memoryManager.getWorkflowSteps(executionId);
    } catch (error) {
      devLogger.error("[WorkflowHistoryManager] Failed to get workflow steps:", error);
      return [];
    }
  }

  /**
   * Update a specific step
   */
  public async updateStep(
    stepId: string,
    updates: Partial<WorkflowStepHistoryEntry>,
  ): Promise<WorkflowStepHistoryEntry | null> {
    if (!this.memoryManager) {
      return null;
    }

    try {
      return await this.memoryManager.updateStep(stepId, updates);
    } catch (error) {
      devLogger.error("[WorkflowHistoryManager] Failed to update step:", error);
      return null;
    }
  }
}
