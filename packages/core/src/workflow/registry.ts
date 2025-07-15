import type { VoltAgentExporter } from "../telemetry/exporter";
import type { Workflow } from "./types";
import type { WorkflowHistoryEntry, WorkflowStepHistoryEntry } from "./types";
import { EventEmitter } from "node:events";
import { createWorkflowStepNodeId } from "../utils/node-utils";
import { WorkflowMemoryManager } from "./memory/manager";
import { WorkflowHistoryManager } from "./history-manager";
import type { WorkflowEvent } from "../events/workflow-emitter";
import { devLogger } from "@voltagent/internal/dev";
import { LibSQLStorage } from "../memory/libsql";
import type { UserContext } from "../agent/types";

/**
 * Serialize a workflow step for API response
 */
function serializeWorkflowStep(step: any, index: number, workflowId: string): any {
  const baseStep: any = {
    id: step.id,
    name: step.name || `Step ${index + 1}`,
    purpose: step.purpose,
    type: step.type,
    stepIndex: index,
  };

  // Add type-specific data
  switch (step.type) {
    case "agent": {
      const agentStep = {
        ...baseStep,
        ...(step.agent && {
          agentId: step.agent.id,
          agentName: step.agent.name,
        }),
        // Serialize task function if it's a function
        ...(typeof step.task === "function" && {
          taskFunction: step.task.toString(),
        }),
        ...(typeof step.task === "string" && {
          taskString: step.task,
        }),
      };

      // ✅ Generate unified node_id for agent steps
      agentStep.node_id = createWorkflowStepNodeId("agent", index, workflowId, {
        agentId: step.agent?.id,
        stepName: step.name || `Step ${index + 1}`,
      });

      return agentStep;
    }

    case "func": {
      const funcStep = {
        ...baseStep,
        // ✅ Use original execute function (clean user code)
        ...(step.originalExecute && {
          executeFunction: step.originalExecute.toString(),
        }),
      };

      // ✅ Generate unified node_id for function steps
      funcStep.node_id = createWorkflowStepNodeId("func", index, workflowId, {
        stepName: step.name || `Step ${index + 1}`,
      });

      return funcStep;
    }

    case "conditional-when": {
      const conditionalStep = {
        ...baseStep,
        ...(step.originalCondition && {
          conditionFunction: step.originalCondition.toString(),
        }),
        // Serialize nested step if available
        ...(step.step && {
          nestedStep: serializeWorkflowStep(step.step, 0, workflowId),
        }),
      };

      // ✅ Generate unified node_id for conditional steps
      conditionalStep.node_id = createWorkflowStepNodeId("conditional-when", index, workflowId, {
        stepName: step.name || `Step ${index + 1}`,
      });

      return conditionalStep;
    }

    case "parallel-all":
    case "parallel-race": {
      const parallelStep = {
        ...baseStep,
        // Serialize sub-steps
        ...(step.steps &&
          Array.isArray(step.steps) && {
            subSteps: step.steps.map((subStep: any, subIndex: number) => {
              const serializedSubStep = serializeWorkflowStep(subStep, subIndex, workflowId);

              // ✅ Generate unified node_id for parallel sub-steps
              // Use same unique stepIndex formula as runtime: parent * 1000 + parallelIndex
              const uniqueStepIndex = index * 1000 + subIndex;
              serializedSubStep.node_id = createWorkflowStepNodeId(
                subStep.type || "func",
                uniqueStepIndex, // ✅ FIX: Use unique sub-step index
                workflowId,
                {
                  parallelIndex: subIndex,
                  stepName: serializedSubStep.name || `Sub-step ${subIndex + 1}`,
                },
              );

              return serializedSubStep;
            }),
            subStepsCount: step.steps.length,
          }),
      };

      // ✅ Generate unified node_id for parallel steps
      parallelStep.node_id = createWorkflowStepNodeId(
        step.type as "parallel-all" | "parallel-race",
        index,
        workflowId,
        {
          stepName: step.name || `Step ${index + 1}`,
        },
      );

      return parallelStep;
    }

    default: {
      const defaultStep = {
        ...baseStep,
      };

      // ✅ Generate unified node_id for default steps
      defaultStep.node_id = createWorkflowStepNodeId(
        "func", // Default type
        index,
        workflowId,
        {
          stepName: step.name || `Step ${index + 1}`,
        },
      );

      return defaultStep;
    }
  }
}

/**
 * Workflow registration information
 */
export interface RegisteredWorkflow {
  workflow: Workflow<any, any>;
  registeredAt: Date;
  executionCount: number;
  lastExecutedAt?: Date;
  inputSchema?: any; // Store the input schema for API access
}

/**
 * Workflow registry events
 */
export interface WorkflowRegistryEvents {
  workflowRegistered: (workflowId: string, workflow: RegisteredWorkflow) => void;
  workflowUnregistered: (workflowId: string) => void;
  historyCreated: (entry: WorkflowHistoryEntry) => void;
  historyUpdate: (executionId: string, entry: WorkflowHistoryEntry) => void;
}

/**
 * Singleton registry for managing workflows and their execution history
 */
export class WorkflowRegistry extends EventEmitter {
  private static instance: WorkflowRegistry;
  private workflows: Map<string, RegisteredWorkflow> = new Map();
  private memoryManager?: WorkflowMemoryManager;

  private workflowHistoryManagers: Map<string, WorkflowHistoryManager> = new Map();

  private constructor() {
    super();
    devLogger.info("[WorkflowRegistry] Initialized");
  }

  /**
   * Get the singleton instance of WorkflowRegistry
   */
  public static getInstance(): WorkflowRegistry {
    if (!WorkflowRegistry.instance) {
      WorkflowRegistry.instance = new WorkflowRegistry();
    }
    return WorkflowRegistry.instance;
  }

  /**
   * Set global exporter for workflow events
   */
  public setGlobalExporter(exporter: VoltAgentExporter): void {
    // Set exporter on memoryManager when it's available
    if (this.memoryManager) {
      this.memoryManager.setExporter(exporter);
    }
  }

  /**
   * Get the history manager instance
   * @deprecated Use async methods directly on WorkflowRegistry instead
   */
  public getHistoryManager(): never {
    throw new Error("HistoryManager is deprecated. Use async methods on WorkflowRegistry instead.");
  }

  /**
   * ✅ NEW: Get or create WorkflowHistoryManager for a specific workflow (following Agent pattern)
   */
  public getWorkflowHistoryManager(workflowId: string): WorkflowHistoryManager {
    if (!this.workflowHistoryManagers.has(workflowId)) {
      this.ensureMemoryManager();

      // Create new history manager for this workflow
      const historyManager = new WorkflowHistoryManager(
        workflowId,
        this.memoryManager,
        this.getGlobalVoltAgentExporter(),
      );
      this.workflowHistoryManagers.set(workflowId, historyManager);
    }

    const historyManager = this.workflowHistoryManagers.get(workflowId);
    if (!historyManager) {
      throw new Error(`Failed to create WorkflowHistoryManager for workflow: ${workflowId}`);
    }

    return historyManager;
  }

  public async persistWorkflowTimelineEvent(
    workflowId: string,
    executionId: string,
    event: WorkflowEvent,
  ): Promise<void> {
    try {
      // Get or create history manager for this workflow
      const historyManager = this.getWorkflowHistoryManager(workflowId);

      // Delegate persistence to the history manager
      const updatedEntry = await historyManager.persistTimelineEvent(executionId, event);

      if (updatedEntry) {
        this.emit("historyUpdate", executionId, updatedEntry);

        devLogger.debug(
          `[WorkflowRegistry] Event persisted and emitted: ${event.name} for execution ${executionId}`,
        );
      }
    } catch (error) {
      devLogger.error(
        `[WorkflowRegistry] Failed to persist timeline event: ${event.name} for execution ${executionId}:`,
        error,
      );
      throw error; // Re-throw to inform WorkflowEventEmitter
    }
  }

  /**
   * Get global VoltAgentExporter (helper method)
   */
  private getGlobalVoltAgentExporter(): VoltAgentExporter | undefined {
    return undefined;
  }

  /**
   * Auto-initialize memory manager with default LibSQLStorage
   * Similar to how Agent system auto-uses memory
   */
  public ensureMemoryManager(): void {
    // If memoryManager already exists, nothing to do
    if (this.memoryManager) return;

    // Always default to LibSQLStorage like Agent system does
    devLogger.debug(
      "[WorkflowRegistry] Auto-initializing memory manager with default LibSQLStorage",
    );
    const defaultMemory = new LibSQLStorage({ url: "file:memory.db" });
    this.memoryManager = new WorkflowMemoryManager(defaultMemory);
  }

  /**
   * Get the memory manager instance
   */
  public getMemoryManager(): WorkflowMemoryManager | undefined {
    return this.memoryManager;
  }

  /**
   * Register a workflow with the registry
   */
  public registerWorkflow(workflow: Workflow<any, any>): void {
    const registeredWorkflow: RegisteredWorkflow = {
      workflow,
      registeredAt: new Date(),
      executionCount: 0,
      inputSchema: workflow.inputSchema,
    };

    this.workflows.set(workflow.id, registeredWorkflow);
    this.emit("workflowRegistered", workflow.id, registeredWorkflow);
  }

  /**
   * Get a specific workflow by ID
   */
  public getWorkflow(id: string): RegisteredWorkflow | undefined {
    return this.workflows.get(id);
  }

  /**
   * Get all registered workflows
   */
  public getAllWorkflows(): RegisteredWorkflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Unregister a workflow from the registry
   */
  public unregisterWorkflow(id: string): void {
    const workflow = this.workflows.get(id);
    if (workflow) {
      this.workflows.delete(id);
      this.emit("workflowUnregistered", id);
    }
  }

  /**
   * Check if a workflow is registered
   */
  public isWorkflowRegistered(id: string): boolean {
    return this.workflows.has(id);
  }

  /**
   * Get workflow execution history
   * @deprecated Use getWorkflowExecutionsAsync instead
   */
  public getWorkflowExecutions(_workflowId: string): WorkflowHistoryEntry[] {
    devLogger.warn(
      "[WorkflowRegistry] getWorkflowExecutions is deprecated. Use getWorkflowExecutionsAsync instead.",
    );
    return [];
  }

  /**
   * Get workflow execution history (async version for persistent storage)
   */
  public async getWorkflowExecutionsAsync(workflowId: string): Promise<WorkflowHistoryEntry[]> {
    this.ensureMemoryManager();
    if (this.memoryManager) {
      // Get basic executions first
      const basicExecutions = await this.memoryManager.getExecutions(workflowId);

      const detailedExecutions: WorkflowHistoryEntry[] = [];
      for (const execution of basicExecutions) {
        const detailedExecution = await this.memoryManager.getExecutionWithDetails(execution.id);
        if (detailedExecution) {
          detailedExecutions.push(detailedExecution);
        }
      }

      return detailedExecutions;
    }
    return [];
  }

  /**
   * Get a specific workflow execution
   * @deprecated Use getWorkflowExecutionAsync instead
   */
  public getWorkflowExecution(_executionId: string): WorkflowHistoryEntry | undefined {
    devLogger.warn(
      "[WorkflowRegistry] getWorkflowExecution is deprecated. Use getWorkflowExecutionAsync instead.",
    );
    return undefined;
  }

  /**
   * Get a specific workflow execution (async version for persistent storage)
   */
  public async getWorkflowExecutionAsync(
    executionId: string,
  ): Promise<WorkflowHistoryEntry | undefined> {
    this.ensureMemoryManager();
    if (this.memoryManager) {
      const execution = await this.memoryManager.getExecutionWithDetails(executionId);
      return execution || undefined;
    }
    return undefined;
  }

  /**
   * Record workflow execution start
   */
  public async recordWorkflowExecutionStart(
    workflowId: string,
    workflowName: string,
    input: unknown,
    options: {
      userId?: string;
      conversationId?: string;
      userContext?: UserContext;
    } = {},
  ): Promise<WorkflowHistoryEntry> {
    const registeredWorkflow = this.workflows.get(workflowId);
    if (!registeredWorkflow) {
      throw new Error(`Workflow not registered: ${workflowId}`);
    }

    // Auto-initialize memory manager and persist to storage
    this.ensureMemoryManager();

    let executionId: string = crypto.randomUUID();

    // Persist to storage and wait for completion
    if (this.memoryManager) {
      try {
        const execution = await this.memoryManager.createExecution(
          workflowId,
          workflowName,
          input,
          {
            userId: options.userId,
            conversationId: options.conversationId,
            userContext: options.userContext,
          },
        );
        // Use the actual execution ID from database
        executionId = execution.id as string;
        devLogger.debug(`[WorkflowRegistry] Workflow execution persisted with ID: ${executionId}`);
      } catch (error) {
        devLogger.error("[WorkflowRegistry] Failed to persist workflow execution start:", error);
        // Continue with temporary ID for backward compatibility
      }
    }

    // Create history entry with actual execution ID
    const tempHistoryEntry: WorkflowHistoryEntry = {
      id: executionId,
      workflowId,
      workflowName,
      status: "running",
      startTime: new Date(),
      input,
      steps: [],
      events: [],
      userId: options.userId,
      conversationId: options.conversationId,
      metadata: {
        // Store userContext in metadata if provided
        ...(options.userContext && { userContext: options.userContext }),
      },
    };

    // Update execution count
    registeredWorkflow.executionCount++;
    registeredWorkflow.lastExecutedAt = new Date();
    this.workflows.set(workflowId, registeredWorkflow);

    // Emit history created event
    this.emit("historyCreated", tempHistoryEntry);

    return tempHistoryEntry;
  }

  /**
   * Record workflow execution completion
   */
  public recordWorkflowExecutionEnd(
    executionId: string,
    status: "completed" | "error" | "cancelled",
    output?: unknown,
    _error?: unknown,
  ): void {
    // Auto-initialize memory manager and update in storage
    this.ensureMemoryManager();
    if (this.memoryManager) {
      const memoryUpdates = {
        status: status,
        endTime: new Date(),
        output: output,
      };

      // ✅ CLEAN: Only update DB, don't emit events (WorkflowEventEmitter handles emission)
      this.memoryManager
        .updateExecution(executionId, memoryUpdates)
        .then(() => {
          devLogger.debug(
            `[WorkflowRegistry] Workflow execution end recorded in DB: ${executionId} (Status: ${status})`,
          );
        })
        .catch((error: Error) => {
          devLogger.error("[WorkflowRegistry] Failed to persist workflow execution end:", error);
        });
    }
  }

  /**
   * Record workflow step start
   */
  public recordWorkflowStepStart(
    executionId: string,
    stepIndex: number,
    stepType: string,
    stepName: string,
    stepId?: string,
    input?: unknown,
  ): WorkflowStepHistoryEntry {
    // Auto-initialize memory manager
    this.ensureMemoryManager();

    const stepEntry: WorkflowStepHistoryEntry = {
      id: stepId || `step-${stepIndex}`,
      stepId: stepId || `step-${stepIndex}`,
      workflowHistoryId: executionId,
      stepIndex,
      stepType: stepType as any,
      stepName,
      status: "running",
      startTime: new Date(),
      input,
    };

    // ✅ CLEAN: Only persist to storage, don't emit events (WorkflowEventEmitter handles emission)
    if (this.memoryManager) {
      this.memoryManager
        .recordStepStart(executionId, stepIndex, stepType as any, stepName, input, { stepId })
        .then(() => {
          devLogger.debug(
            `[WorkflowRegistry] Step start recorded in DB: ${executionId} (Step: ${stepIndex})`,
          );
        })
        .catch((error: Error) => {
          devLogger.error("[WorkflowRegistry] Failed to persist workflow step start:", error);
        });
    }

    return stepEntry;
  }

  /**
   * Record workflow step completion
   */
  public recordWorkflowStepEnd(
    executionId: string,
    stepIndex: number,
    status: "completed" | "error" | "skipped",
    output?: unknown,
    error?: unknown,
    agentExecutionId?: string,
  ): void {
    // Auto-initialize memory manager
    this.ensureMemoryManager();

    // Persist to storage and emit real data
    if (this.memoryManager) {
      this.memoryManager
        .getWorkflowSteps(executionId)
        .then((steps) => {
          const matchingStep = steps.find((step) => step.stepIndex === stepIndex);
          if (matchingStep && this.memoryManager) {
            this.memoryManager
              .recordStepEnd(matchingStep.id, {
                status: status as any,
                output,
                errorMessage: typeof error === "string" ? error : undefined,
                agentExecutionId,
              })
              .then(() => {
                // ✅ CLEAN: Only persist to storage, don't emit events (WorkflowEventEmitter handles emission)
                devLogger.debug(
                  `[WorkflowRegistry] Step end recorded in DB: ${executionId} (Step: ${stepIndex})`,
                );
              })
              .catch((stepError: Error) => {
                devLogger.error(
                  "[WorkflowRegistry] Failed to persist workflow step end:",
                  stepError,
                );
              });
          }
        })
        .catch((error: Error) => {
          devLogger.error("[WorkflowRegistry] Failed to get workflow steps for step end:", error);
        });
    }
  }

  /**
   * Get workflow statistics
   */
  public getWorkflowStats(_workflowId: string): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    lastExecutionTime?: Date;
  } {
    // Return default stats - use async version for real data
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
    };
  }

  /**
   * Get workflow statistics (async version)
   */
  public async getWorkflowStatsAsync(workflowId: string): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    lastExecutionTime?: Date;
  }> {
    this.ensureMemoryManager();
    if (this.memoryManager) {
      return await this.memoryManager.getWorkflowStats(workflowId);
    }
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
    };
  }

  /**
   * Get all workflow IDs that have registrations
   */
  public getAllWorkflowIds(): string[] {
    return Array.from(this.workflows.keys());
  }

  /**
   * Get total number of registered workflows
   */
  public getWorkflowCount(): number {
    return this.workflows.size;
  }

  /**
   * Get total execution count across all workflows
   */
  public getTotalExecutionCount(): number {
    return Array.from(this.workflows.values()).reduce(
      (total, workflow) => total + workflow.executionCount,
      0,
    );
  }

  /**
   * Clear all workflow registrations and history
   */
  public clearAll(): void {
    this.workflows.clear();
    // Note: For persistent storage cleanup, use async clearAllAsync() instead
  }

  /**
   * Clear all workflow registrations and history (async version)
   */
  public async clearAllAsync(): Promise<void> {
    this.workflows.clear();

    this.ensureMemoryManager();
    if (this.memoryManager) {
      // Clear all workflow histories
      const workflowIds = await this.memoryManager.getAllWorkflowIds();
      for (const workflowId of workflowIds) {
        const executions = await this.memoryManager.getExecutions(workflowId);
        for (const execution of executions) {
          await this.memoryManager.deleteExecution(execution.id);
        }
      }
    }
  }

  /**
   * Get registry summary
   */
  public getSummary(): {
    totalWorkflows: number;
    totalExecutions: number;
    registeredWorkflowIds: string[];
  } {
    return {
      totalWorkflows: this.getWorkflowCount(),
      totalExecutions: this.getTotalExecutionCount(),
      registeredWorkflowIds: this.getAllWorkflowIds(),
    };
  }

  /**
   * Get workflows as API response format
   */
  public getWorkflowsForApi() {
    return this.getAllWorkflows().map((registeredWorkflow) => ({
      id: registeredWorkflow.workflow.id,
      name: registeredWorkflow.workflow.name,
      purpose: registeredWorkflow.workflow.purpose,
      stepsCount: registeredWorkflow.workflow.steps.length,
      status: "idle" as const,
    }));
  }

  /**
   * Get detailed workflow with serialized steps for API response
   */
  public getWorkflowDetailForApi(id: string) {
    const registeredWorkflow = this.getWorkflow(id);
    if (!registeredWorkflow) {
      return null;
    }

    const workflow = registeredWorkflow.workflow;
    return {
      id: workflow.id,
      name: workflow.name,
      purpose: workflow.purpose,
      stepsCount: workflow.steps.length,
      status: "idle" as const,
      steps: workflow.steps.map((step, index) => serializeWorkflowStep(step, index, workflow.id)),
    };
  }
}
