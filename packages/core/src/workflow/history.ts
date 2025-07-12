import type { VoltAgentExporter } from "../telemetry/exporter";
import type { NewTimelineEvent } from "../events/types";
import type {
  WorkflowRuntimeHistoryEntry as WorkflowHistoryEntry,
  WorkflowRuntimeStepHistoryEntry as WorkflowStepHistoryEntry,
} from "./types";

/**
 * Manages workflow execution history and event tracking
 */
export class WorkflowHistoryManager {
  private workflowHistories: Map<string, WorkflowHistoryEntry[]> = new Map();
  private exporter?: VoltAgentExporter;

  /**
   * Set global exporter for workflow events
   */
  public setGlobalExporter(exporter: VoltAgentExporter): void {
    this.exporter = exporter;
  }

  /**
   * Add a new workflow execution entry
   */
  public addEntry(entry: Omit<WorkflowHistoryEntry, "id">): WorkflowHistoryEntry {
    const workflowEntry: WorkflowHistoryEntry = {
      id: crypto.randomUUID(),
      ...entry,
    };

    // Get existing entries for this workflow
    const existingEntries = this.workflowHistories.get(entry.workflowId) || [];
    existingEntries.push(workflowEntry);
    this.workflowHistories.set(entry.workflowId, existingEntries);

    // Cleanup old entries if we have too many
    this.cleanupOldExecutions(entry.workflowId);

    return workflowEntry;
  }

  /**
   * Update an existing workflow execution entry
   */
  public updateEntry(id: string, updates: Partial<WorkflowHistoryEntry>): void {
    for (const [workflowId, entries] of this.workflowHistories) {
      const entryIndex = entries.findIndex((entry) => entry.id === id);
      if (entryIndex !== -1) {
        entries[entryIndex] = { ...entries[entryIndex], ...updates };
        this.workflowHistories.set(workflowId, entries);
        break;
      }
    }
  }

  /**
   * Get all execution entries for a specific workflow
   */
  public getEntries(workflowId: string): WorkflowHistoryEntry[] {
    return this.workflowHistories.get(workflowId) || [];
  }

  /**
   * Get a specific execution entry by ID
   */
  public getEntry(executionId: string): WorkflowHistoryEntry | undefined {
    for (const entries of this.workflowHistories.values()) {
      const entry = entries.find((e) => e.id === executionId);
      if (entry) return entry;
    }
    return undefined;
  }

  /**
   * Add a step to an existing workflow execution entry
   */
  public addStepToEntry(entryId: string, step: WorkflowStepHistoryEntry): void {
    for (const [workflowId, entries] of this.workflowHistories) {
      const entryIndex = entries.findIndex((entry) => entry.id === entryId);
      if (entryIndex !== -1) {
        entries[entryIndex].steps.push(step);
        this.workflowHistories.set(workflowId, entries);
        break;
      }
    }
  }

  /**
   * Update a specific step in an execution entry
   */
  public updateStepInEntry(
    entryId: string,
    stepId: string,
    updates: Partial<WorkflowStepHistoryEntry>,
  ): void {
    for (const [workflowId, entries] of this.workflowHistories) {
      const entryIndex = entries.findIndex((entry) => entry.id === entryId);
      if (entryIndex !== -1) {
        const stepIndex = entries[entryIndex].steps.findIndex((step) => step.stepId === stepId);
        if (stepIndex !== -1) {
          entries[entryIndex].steps[stepIndex] = {
            ...entries[entryIndex].steps[stepIndex],
            ...updates,
          };
          this.workflowHistories.set(workflowId, entries);
        }
        break;
      }
    }
  }

  /**
   * Add an event to an existing workflow execution entry
   */
  public addEventToExecution(executionId: string, event: any): void {
    for (const [workflowId, entries] of this.workflowHistories) {
      const entryIndex = entries.findIndex((entry) => entry.id === executionId);
      if (entryIndex !== -1) {
        entries[entryIndex].events.push(event);
        this.workflowHistories.set(workflowId, entries);

        // Export event if exporter is configured
        if (this.exporter) {
          try {
            this.exporter.exportTimelineEventAsync({
              agent_id: `workflow:${workflowId}`,
              history_id: executionId,
              event_id: event.id,
              event: event,
            });
          } catch (error) {
            console.error("Failed to export workflow timeline event:", error);
          }
        }
        break;
      }
    }
  }

  /**
   * Persist a timeline event to an execution entry
   */
  public async persistTimelineEvent(
    entryId: string,
    event: NewTimelineEvent,
  ): Promise<WorkflowHistoryEntry | null> {
    for (const [workflowId, entries] of this.workflowHistories) {
      const entryIndex = entries.findIndex((entry) => entry.id === entryId);
      if (entryIndex !== -1) {
        entries[entryIndex].events.push(event);
        this.workflowHistories.set(workflowId, entries);

        // Export event if exporter is configured
        if (this.exporter) {
          try {
            this.exporter.exportTimelineEventAsync({
              agent_id: `workflow:${workflowId}`,
              history_id: entryId,
              event_id: event.id,
              event: event,
            });
          } catch (error) {
            console.error("Failed to export workflow timeline event:", error);
          }
        }

        return entries[entryIndex];
      }
    }
    return null;
  }

  /**
   * Get all workflow IDs that have history entries
   */
  public getAllWorkflowIds(): string[] {
    return Array.from(this.workflowHistories.keys());
  }

  /**
   * Clear all history entries for a specific workflow
   */
  public clearWorkflowHistory(workflowId: string): void {
    this.workflowHistories.delete(workflowId);
  }

  /**
   * Clear all history entries
   */
  public clearAllHistory(): void {
    this.workflowHistories.clear();
  }

  /**
   * Cleanup old executions to prevent memory leaks
   */
  private cleanupOldExecutions(workflowId: string): void {
    const MAX_EXECUTIONS_PER_WORKFLOW = 100;
    const executions = this.workflowHistories.get(workflowId);

    if (executions && executions.length > MAX_EXECUTIONS_PER_WORKFLOW) {
      // Keep only the most recent executions
      const keepExecutions = executions
        .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
        .slice(0, MAX_EXECUTIONS_PER_WORKFLOW);

      this.workflowHistories.set(workflowId, keepExecutions);
    }
  }
  /**
   * Get execution statistics for a workflow
   */
  public getWorkflowStats(workflowId: string): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    lastExecutionTime?: Date;
  } {
    const entries = this.getEntries(workflowId);

    const totalExecutions = entries.length;
    const successfulExecutions = entries.filter((e) => e.status === "completed").length;
    const failedExecutions = entries.filter((e) => e.status === "error").length;

    const completedExecutions = entries.filter((e) => e.endTime);
    const averageExecutionTime =
      completedExecutions.length > 0
        ? completedExecutions.reduce((sum, e) => {
            const duration = (e.endTime?.getTime() ?? 0) - e.startTime.getTime();
            return sum + duration;
          }, 0) / completedExecutions.length
        : 0;

    const lastExecutionTime =
      entries.length > 0
        ? entries.sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0].startTime
        : undefined;

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      averageExecutionTime,
      lastExecutionTime,
    };
  }
}
