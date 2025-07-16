import type { VoltAgentExporter } from "../telemetry/exporter";
import type { Workflow } from "./types";
import type { WorkflowHistoryEntry } from "./types";
import { EventEmitter } from "node:events";
import { createWorkflowStepNodeId } from "../utils/node-utils";
import { WorkflowMemoryManager } from "./memory/manager";
import { WorkflowHistoryManager } from "./history-manager";
import type { WorkflowEvent } from "../events/workflow-emitter";
import { devLogger } from "@voltagent/internal/dev";
import type { Memory } from "../memory/types";

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
  workflowMemory?: Memory;
  workflowMemoryManager?: WorkflowMemoryManager;
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

  public getWorkflowHistoryManager(workflowId: string): WorkflowHistoryManager {
    if (!this.workflowHistoryManagers.has(workflowId)) {
      const workflowMemoryManager = this.getWorkflowMemoryManager(workflowId);
      if (!workflowMemoryManager) {
        throw new Error(`No memory manager available for workflow: ${workflowId}`);
      }

      // Create new history manager for this workflow with its specific memory
      const historyManager = new WorkflowHistoryManager(
        workflowId,
        workflowMemoryManager,
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
   * Each workflow must manage its own memory
   */
  public getWorkflowMemoryManager(workflowId: string): WorkflowMemoryManager | undefined {
    const registeredWorkflow = this.workflows.get(workflowId);

    // Only use workflow-specific memory manager - no fallback to global
    if (registeredWorkflow?.workflowMemoryManager) {
      devLogger.debug(`[WorkflowRegistry] Using workflow-specific memory for ${workflowId}`);
      return registeredWorkflow.workflowMemoryManager;
    }

    devLogger.warn(
      `[WorkflowRegistry] No memory manager available for workflow ${workflowId} - workflow must define its own memory`,
    );
    return undefined;
  }

  /**
   * Create a new workflow execution and emit historyCreated event
   */
  public async createWorkflowExecution(
    workflowId: string,
    workflowName: string,
    input: unknown,
    options: {
      userId?: string;
      conversationId?: string;
      userContext?: Map<string | symbol, unknown>;
      metadata?: Record<string, unknown>;
    } = {},
  ): Promise<WorkflowHistoryEntry | null> {
    try {
      const workflowMemoryManager = this.getWorkflowMemoryManager(workflowId);
      if (!workflowMemoryManager) {
        devLogger.error(
          `[WorkflowRegistry] No memory manager available for workflow: ${workflowId}`,
        );
        return null;
      }

      // Create execution through memory manager
      const historyEntry = await workflowMemoryManager.createExecution(
        workflowId,
        workflowName,
        input,
        {
          userId: options.userId,
          conversationId: options.conversationId,
          userContext: options.userContext,
          metadata: options.metadata,
        },
      );

      // Emit historyCreated event for WebSocket notifications
      this.emit("historyCreated", historyEntry);

      devLogger.debug(
        `[WorkflowRegistry] Workflow execution created and historyCreated event emitted: ${historyEntry.id}`,
      );

      return historyEntry;
    } catch (error) {
      devLogger.error(
        `[WorkflowRegistry] Failed to create workflow execution for ${workflowId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Update a workflow execution and emit historyUpdate event
   */
  public async updateWorkflowExecution(
    workflowId: string,
    executionId: string,
    updates: Partial<WorkflowHistoryEntry>,
  ): Promise<WorkflowHistoryEntry | null> {
    try {
      const workflowMemoryManager = this.getWorkflowMemoryManager(workflowId);
      if (!workflowMemoryManager) {
        devLogger.error(
          `[WorkflowRegistry] No memory manager available for workflow: ${workflowId}`,
        );
        return null;
      }

      // Update execution through memory manager
      const updatedEntry = await workflowMemoryManager.updateExecution(executionId, updates);

      if (updatedEntry) {
        // Emit historyUpdate event for WebSocket notifications
        this.emit("historyUpdate", executionId, updatedEntry);

        devLogger.debug(
          `[WorkflowRegistry] Workflow execution updated and historyUpdate event emitted: ${executionId}`,
        );
      }

      return updatedEntry;
    } catch (error) {
      devLogger.error(
        `[WorkflowRegistry] Failed to update workflow execution ${executionId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Register a workflow with the registry
   */
  public registerWorkflow(workflow: Workflow<any, any>): void {
    let workflowMemoryManager: WorkflowMemoryManager | undefined;
    if (workflow.memory) {
      workflowMemoryManager = new WorkflowMemoryManager(workflow.memory);
      devLogger.debug(
        `[WorkflowRegistry] Created workflow-specific memory manager for ${workflow.id}`,
      );
    }

    const registeredWorkflow: RegisteredWorkflow = {
      workflow,
      registeredAt: new Date(),
      executionCount: 0,
      inputSchema: workflow.inputSchema,
      workflowMemory: workflow.memory,
      workflowMemoryManager,
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
   * Get workflow execution history (async version for persistent storage)
   */
  public async getWorkflowExecutionsAsync(workflowId: string): Promise<WorkflowHistoryEntry[]> {
    const workflowMemoryManager = this.getWorkflowMemoryManager(workflowId);
    if (workflowMemoryManager) {
      // Get basic executions first
      const basicExecutions = await workflowMemoryManager.getExecutions(workflowId);

      const detailedExecutions: WorkflowHistoryEntry[] = [];
      for (const execution of basicExecutions) {
        const detailedExecution = await workflowMemoryManager.getExecutionWithDetails(execution.id);
        if (detailedExecution) {
          detailedExecutions.push(detailedExecution);
        }
      }

      return detailedExecutions;
    }
    return [];
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
