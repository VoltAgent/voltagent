import type { VoltAgentExporter } from "../telemetry/exporter";
import type { WorkflowEvent } from "../events/workflow-emitter";
import type { WorkflowMemoryManager } from "./memory/manager";
import type { WorkflowRuntimeHistoryEntry as WorkflowHistoryEntry } from "./types";
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
        metadata: eventMetadata,
        traceId: event.traceId || executionId,
        parentEventId: event.parentEventId || undefined,
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
        // Convert memory format to context format
        return this.memoryToContextHistoryEntry(updatedExecution);
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
          detailedExecutions.push(this.memoryToContextHistoryEntry(detailedExecution));
        }
      }

      return detailedExecutions;
    } catch (error) {
      devLogger.error("[WorkflowHistoryManager] Failed to get executions:", error);
      return [];
    }
  }

  /**
   * Get specific execution with details
   */
  public async getExecutionWithDetails(executionId: string): Promise<WorkflowHistoryEntry | null> {
    if (!this.memoryManager) {
      return null;
    }

    try {
      const execution = await this.memoryManager.getExecutionWithDetails(executionId);
      return execution ? this.memoryToContextHistoryEntry(execution) : null;
    } catch (error) {
      devLogger.error("[WorkflowHistoryManager] Failed to get execution details:", error);
      return null;
    }
  }

  /**
   * Convert memory WorkflowHistoryEntry to context WorkflowHistoryEntry
   * (Same conversion logic as in WorkflowRegistry but centralized here)
   */
  private memoryToContextHistoryEntry(
    memoryEntry: import("./types").WorkflowHistoryEntry,
  ): WorkflowHistoryEntry {
    // Convert memory steps to context steps format
    const contextSteps = (memoryEntry.steps || []).map((step) => ({
      stepId: step.stepId || step.id,
      stepIndex: step.stepIndex,
      stepType: step.stepType,
      stepName: step.stepName,
      status: step.status as any,
      startTime: step.startTime,
      endTime: step.endTime,
      input: step.input,
      output: step.output,
      error: step.errorMessage,
      agentExecutionId: step.agentExecutionId,
      parallelIndex: step.parallelIndex,
      parallelParentStepId: step.parentStepId,
    }));

    // Convert memory events to context events format
    const contextEvents = (memoryEntry.events || []).map((event) => ({
      id: event.id,
      name: event.name,
      type: event.type,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime?.toISOString(),
      status: event.status,
      level: event.level,
      input: event.input,
      output: event.output,
      statusMessage: event.statusMessage,
      metadata: {
        ...event.metadata,
        workflowId: memoryEntry.workflowId,
        workflowName: memoryEntry.name,
        executionId: memoryEntry.id,
      },
      traceId: event.traceId || memoryEntry.id,
      parentEventId: event.parentEventId,
    })) as any;

    return {
      id: memoryEntry.id,
      workflowId: memoryEntry.workflowId,
      workflowName: memoryEntry.name,
      status: memoryEntry.status,
      startTime: memoryEntry.startTime,
      endTime: memoryEntry.endTime,
      input: memoryEntry.input,
      output: memoryEntry.output,
      steps: contextSteps,
      events: contextEvents,
      userId: memoryEntry.metadata?.userId as string,
      conversationId: memoryEntry.metadata?.conversationId as string,
    };
  }
}
