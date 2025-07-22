import type { Client } from "@libsql/client";
import type { WorkflowHistoryEntry, WorkflowStepHistoryEntry } from "../../workflow/context";
import type { WorkflowTimelineEvent, WorkflowStats } from "../../workflow/types";
import { getGlobalLogger } from "../../logger";
import type { Logger } from "@voltagent/internal";

/**
 * LibSQL extension for workflow memory operations
 * This class provides workflow-specific storage operations for LibSQL
 */
export class LibSQLWorkflowExtension {
  private logger: Logger;

  constructor(
    private client: Client,
    private _tablePrefix = "voltagent_memory",
  ) {
    this.logger = getGlobalLogger().child({ component: "libsql-workflow" });
  }

  /**
   * Store a workflow history entry
   */
  async storeWorkflowHistory(entry: WorkflowHistoryEntry): Promise<void> {
    await this.client.execute({
      sql: `
        INSERT INTO ${this._tablePrefix}_workflow_history (
          id, name, workflow_id, status, start_time, end_time, 
          input, output, user_id, conversation_id, metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        entry.id,
        entry.workflowName,
        entry.workflowId,
        entry.status,
        entry.startTime.toISOString(),
        entry.endTime?.toISOString() || null,
        JSON.stringify(entry.input),
        entry.output ? JSON.stringify(entry.output) : null,
        entry.userId || null,
        entry.conversationId || null,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
        entry.createdAt?.toISOString() || new Date().toISOString(),
        entry.updatedAt?.toISOString() || new Date().toISOString(),
      ],
    });
  }

  /**
   * Get a workflow history entry by ID
   */
  async getWorkflowHistory(id: string): Promise<WorkflowHistoryEntry | null> {
    const result = await this.client.execute({
      sql: `SELECT * FROM ${this._tablePrefix}_workflow_history WHERE id = ?`,
      args: [id],
    });

    if (result.rows.length === 0) return null;

    return this.parseWorkflowHistoryRow(result.rows[0]);
  }

  /**
   * Get all workflow history entries for a specific workflow
   */
  async getWorkflowHistoryByWorkflowId(workflowId: string): Promise<WorkflowHistoryEntry[]> {
    const result = await this.client.execute({
      sql: `SELECT * FROM ${this._tablePrefix}_workflow_history WHERE workflow_id = ? ORDER BY start_time DESC`,
      args: [workflowId],
    });

    return result.rows.map((row) => this.parseWorkflowHistoryRow(row));
  }

  /**
   * Update a workflow history entry
   */
  async updateWorkflowHistory(id: string, updates: Partial<WorkflowHistoryEntry>): Promise<void> {
    this.logger.trace(`Updating workflow history ${id}`, {
      status: updates.status,
      hasMetadata: !!updates.metadata,
      hasSuspension: !!updates.metadata?.suspension,
    });

    const setClauses: string[] = [];
    const args: any[] = [];

    if (updates.status !== undefined) {
      setClauses.push("status = ?");
      args.push(updates.status);
    }
    if (updates.endTime !== undefined) {
      setClauses.push("end_time = ?");
      args.push(updates.endTime.toISOString());
    }
    if (updates.output !== undefined) {
      setClauses.push("output = ?");
      args.push(JSON.stringify(updates.output));
    }
    if (updates.userId !== undefined) {
      setClauses.push("user_id = ?");
      args.push(updates.userId);
    }
    if (updates.conversationId !== undefined) {
      setClauses.push("conversation_id = ?");
      args.push(updates.conversationId);
    }
    if (updates.metadata !== undefined) {
      setClauses.push("metadata = ?");
      const metadataJson = JSON.stringify(updates.metadata);
      args.push(metadataJson);
      this.logger.trace(`Setting metadata for ${id}:`, { metadata: metadataJson });
    }

    setClauses.push("updated_at = ?");
    args.push(new Date().toISOString());
    args.push(id);

    const sql = `UPDATE ${this._tablePrefix}_workflow_history SET ${setClauses.join(", ")} WHERE id = ?`;
    this.logger.trace("Executing SQL:", { sql, args });

    try {
      const result = await this.client.execute({ sql, args });
      this.logger.trace(
        `Successfully updated workflow history ${id}, rows affected: ${result.rowsAffected}`,
      );
    } catch (error) {
      this.logger.error(`Failed to update workflow history ${id}:`, { error });
      throw error;
    }
  }

  /**
   * Delete a workflow history entry
   */
  async deleteWorkflowHistory(id: string): Promise<void> {
    await this.client.execute({
      sql: `DELETE FROM ${this._tablePrefix}_workflow_history WHERE id = ?`,
      args: [id],
    });
  }

  /**
   * Store a workflow step entry
   */
  async storeWorkflowStep(step: WorkflowStepHistoryEntry): Promise<void> {
    await this.client.execute({
      sql: `
        INSERT INTO ${this._tablePrefix}_workflow_steps (
          id, workflow_history_id, step_index, step_type, step_name, step_id,
          status, start_time, end_time, input, output, error_message,
          agent_execution_id, parallel_index, parent_step_id, metadata,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        step.id,
        step.workflowHistoryId,
        step.stepIndex,
        step.stepType,
        step.stepName,
        step.stepId || null,
        step.status,
        step.startTime.toISOString(),
        step.endTime?.toISOString() || null,
        step.input ? JSON.stringify(step.input) : null,
        step.output ? JSON.stringify(step.output) : null,
        step.error ? JSON.stringify(step.error) : null,
        step.agentExecutionId || null,
        step.parallelIndex || null,
        step.parallelParentStepId || null,
        step.metadata ? JSON.stringify(step.metadata) : null,
        step.createdAt?.toISOString() || new Date().toISOString(),
        step.updatedAt?.toISOString() || new Date().toISOString(),
      ],
    });
  }

  /**
   * Get a workflow step by ID
   */
  async getWorkflowStep(id: string): Promise<WorkflowStepHistoryEntry | null> {
    const result = await this.client.execute({
      sql: `SELECT * FROM ${this._tablePrefix}_workflow_steps WHERE id = ?`,
      args: [id],
    });

    if (result.rows.length === 0) return null;

    return this.parseWorkflowStepRow(result.rows[0]);
  }

  /**
   * Get all workflow steps for a specific workflow history
   */
  async getWorkflowSteps(workflowHistoryId: string): Promise<WorkflowStepHistoryEntry[]> {
    const result = await this.client.execute({
      sql: `SELECT * FROM ${this._tablePrefix}_workflow_steps WHERE workflow_history_id = ? ORDER BY step_index ASC`,
      args: [workflowHistoryId],
    });

    return result.rows.map((row) => this.parseWorkflowStepRow(row));
  }

  /**
   * Update a workflow step
   */
  async updateWorkflowStep(id: string, updates: Partial<WorkflowStepHistoryEntry>): Promise<void> {
    const setClauses: string[] = [];
    const args: any[] = [];

    if (updates.status !== undefined) {
      setClauses.push("status = ?");
      args.push(updates.status);
    }
    if (updates.endTime !== undefined) {
      setClauses.push("end_time = ?");
      args.push(updates.endTime.toISOString());
    }
    if (updates.output !== undefined) {
      setClauses.push("output = ?");
      args.push(JSON.stringify(updates.output));
    }
    if (updates.error !== undefined) {
      setClauses.push("error_message = ?");
      args.push(JSON.stringify(updates.error));
    }
    if (updates.agentExecutionId !== undefined) {
      setClauses.push("agent_execution_id = ?");
      args.push(updates.agentExecutionId);
    }
    if (updates.metadata !== undefined) {
      setClauses.push("metadata = ?");
      args.push(JSON.stringify(updates.metadata));
    }

    setClauses.push("updated_at = ?");
    args.push(new Date().toISOString());
    args.push(id);

    await this.client.execute({
      sql: `UPDATE ${this._tablePrefix}_workflow_steps SET ${setClauses.join(", ")} WHERE id = ?`,
      args,
    });
  }

  /**
   * Delete a workflow step
   */
  async deleteWorkflowStep(id: string): Promise<void> {
    await this.client.execute({
      sql: `DELETE FROM ${this._tablePrefix}_workflow_steps WHERE id = ?`,
      args: [id],
    });
  }

  /**
   * Store a workflow timeline event
   */
  async storeWorkflowTimelineEvent(event: WorkflowTimelineEvent): Promise<void> {
    await this.client.execute({
      sql: `
        INSERT INTO ${this._tablePrefix}_workflow_timeline_events (
          id, workflow_history_id, event_id, name, type,
          start_time, end_time, status, level, input, output,
          status_message, metadata, trace_id, parent_event_id, event_sequence, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        event.id,
        event.workflowHistoryId,
        event.eventId,
        event.name,
        event.type,
        event.startTime,
        event.endTime || null,
        event.status,
        event.level || "INFO",
        event.input ? JSON.stringify(event.input) : null,
        event.output ? JSON.stringify(event.output) : null,
        event.statusMessage ? JSON.stringify(event.statusMessage) : null,
        event.metadata ? JSON.stringify(event.metadata) : null,
        event.traceId || null,
        event.parentEventId || null,
        event.eventSequence || null, // Event sequence for ordering
        event.createdAt.toISOString(),
      ],
    });
  }

  /**
   * Get a workflow timeline event by ID
   */
  async getWorkflowTimelineEvent(id: string): Promise<WorkflowTimelineEvent | null> {
    const result = await this.client.execute({
      sql: `SELECT * FROM ${this._tablePrefix}_workflow_timeline_events WHERE id = ?`,
      args: [id],
    });

    if (result.rows.length === 0) return null;

    return this.parseWorkflowTimelineEventRow(result.rows[0]);
  }

  /**
   * Get all workflow timeline events for a specific workflow history
   */
  async getWorkflowTimelineEvents(workflowHistoryId: string): Promise<WorkflowTimelineEvent[]> {
    const result = await this.client.execute({
      sql: `SELECT * FROM ${this._tablePrefix}_workflow_timeline_events WHERE workflow_history_id = ? ORDER BY event_sequence ASC, start_time ASC`,
      args: [workflowHistoryId],
    });

    return result.rows.map((row) => this.parseWorkflowTimelineEventRow(row));
  }

  /**
   * Delete a workflow timeline event
   */
  async deleteWorkflowTimelineEvent(id: string): Promise<void> {
    await this.client.execute({
      sql: `DELETE FROM ${this._tablePrefix}_workflow_timeline_events WHERE id = ?`,
      args: [id],
    });
  }

  /**
   * Get all workflow IDs
   */
  async getAllWorkflowIds(): Promise<string[]> {
    const result = await this.client.execute({
      sql: `SELECT DISTINCT workflow_id FROM ${this._tablePrefix}_workflow_history`,
      args: [],
    });

    return result.rows.map((row) => row.workflow_id as string);
  }

  /**
   * Get workflow statistics
   */
  async getWorkflowStats(workflowId: string): Promise<WorkflowStats> {
    const result = await this.client.execute({
      sql: `
        SELECT 
          COUNT(*) as total_executions,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_executions,
          SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed_executions,
          AVG(CASE WHEN end_time IS NOT NULL THEN 
            (julianday(end_time) - julianday(start_time)) * 24 * 60 * 60 * 1000 
            ELSE NULL END) as avg_duration_ms,
          MAX(start_time) as last_execution_time
        FROM ${this._tablePrefix}_workflow_history 
        WHERE workflow_id = ?
      `,
      args: [workflowId],
    });

    if (result.rows.length === 0) {
      return {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        lastExecutionTime: undefined,
      };
    }

    const row = result.rows[0];
    return {
      totalExecutions: Number(row.total_executions) || 0,
      successfulExecutions: Number(row.successful_executions) || 0,
      failedExecutions: Number(row.failed_executions) || 0,
      averageExecutionTime: Number(row.avg_duration_ms) || 0,
      lastExecutionTime: row.last_execution_time
        ? new Date(row.last_execution_time as string)
        : undefined,
    };
  }

  /**
   * Get workflow history with all related data (steps and events)
   */
  async getWorkflowHistoryWithStepsAndEvents(id: string): Promise<WorkflowHistoryEntry | null> {
    const history = await this.getWorkflowHistory(id);
    if (!history) return null;

    // Load steps and events
    const [steps, events] = await Promise.all([
      this.getWorkflowSteps(id),
      this.getWorkflowTimelineEvents(id),
    ]);

    history.steps = steps;
    history.events = events;

    return history;
  }

  /**
   * Delete workflow history and all related data
   */
  async deleteWorkflowHistoryWithRelated(id: string): Promise<void> {
    // Foreign key constraints will handle cascade deletion
    await this.deleteWorkflowHistory(id);
  }

  /**
   * Clean up old workflow histories
   */
  async cleanupOldWorkflowHistories(workflowId: string, maxEntries: number): Promise<number> {
    // Get count of current entries
    const countResult = await this.client.execute({
      sql: `SELECT COUNT(*) as count FROM ${this._tablePrefix}_workflow_history WHERE workflow_id = ?`,
      args: [workflowId],
    });

    const currentCount = Number(countResult.rows[0].count);
    if (currentCount <= maxEntries) return 0;

    // Delete old entries beyond maxEntries
    const deleteCount = currentCount - maxEntries;
    const deleteResult = await this.client.execute({
      sql: `
        DELETE FROM ${this._tablePrefix}_workflow_history 
        WHERE workflow_id = ? 
        AND id IN (
          SELECT id FROM ${this._tablePrefix}_workflow_history 
          WHERE workflow_id = ? 
          ORDER BY start_time ASC 
          LIMIT ?
        )
      `,
      args: [workflowId, workflowId, deleteCount],
    });

    return deleteResult.rowsAffected;
  }

  /**
   * Parse workflow history row from database
   */
  private parseWorkflowHistoryRow(row: any): WorkflowHistoryEntry {
    return {
      id: row.id as string,
      workflowName: row.name as string,
      workflowId: row.workflow_id as string,
      status: row.status as any,
      startTime: new Date(row.start_time as string),
      endTime: row.end_time ? new Date(row.end_time as string) : undefined,
      input: row.input ? JSON.parse(row.input as string) : null,
      output: row.output ? JSON.parse(row.output as string) : undefined,
      userId: row.user_id as string | undefined,
      conversationId: row.conversation_id as string | undefined,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
      steps: [], // Will be loaded separately if needed
      events: [], // Will be loaded separately if needed
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  /**
   * Parse workflow step row from database
   */
  private parseWorkflowStepRow(row: any): WorkflowStepHistoryEntry {
    return {
      id: row.id as string,
      workflowHistoryId: row.workflow_history_id as string,
      stepIndex: Number(row.step_index),
      stepType: row.step_type as any,
      stepName: row.step_name as string,
      stepId: (row.step_id as string) || undefined,
      status: row.status as any,
      startTime: new Date(row.start_time as string),
      endTime: row.end_time ? new Date(row.end_time as string) : undefined,
      input: row.input ? JSON.parse(row.input as string) : undefined,
      output: row.output ? JSON.parse(row.output as string) : undefined,
      error: row.error_message ? JSON.parse(row.error_message as string) : undefined,
      agentExecutionId: (row.agent_execution_id as string) || undefined,
      parallelIndex: row.parallel_index ? Number(row.parallel_index) : undefined,
      parallelParentStepId: (row.parent_step_id as string) || undefined,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  /**
   * Parse workflow timeline event row from database
   */
  private parseWorkflowTimelineEventRow(row: any): WorkflowTimelineEvent {
    return {
      id: row.id as string,
      workflowHistoryId: row.workflow_history_id as string,
      eventId: row.event_id as string,
      name: row.name as string,
      type: row.type as any,
      startTime: row.start_time as string,
      endTime: row.end_time ? (row.end_time as string) : undefined,
      status: row.status as string,
      level: (row.level as string) || undefined,
      input: row.input ? JSON.parse(row.input as string) : undefined,
      output: row.output ? JSON.parse(row.output as string) : undefined,
      statusMessage: row.status_message ? JSON.parse(row.status_message as string) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
      traceId: (row.trace_id as string) || undefined,
      parentEventId: (row.parent_event_id as string) || undefined,
      eventSequence: Number(row.event_sequence),
      createdAt: new Date(row.created_at as string),
    };
  }
}
