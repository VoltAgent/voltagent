import type { VoltAgentExporter } from "../telemetry/exporter";
import type { Workflow, WorkflowSuspendController } from "./types";
import type { WorkflowHistoryEntry } from "./types";
import { EventEmitter } from "node:events";
import { createWorkflowStepNodeId } from "../utils/node-utils";
import { WorkflowMemoryManager } from "./memory/manager";
import { WorkflowHistoryManager } from "./history-manager";
import type { WorkflowEvent, WorkflowEventWithStatus } from "../events/workflow-emitter";
import { WorkflowEventEmitter } from "../events/workflow-emitter";
import { devLogger } from "@voltagent/internal/dev";
import type { Memory } from "../memory/types";

/**
 * Serialize a workflow step for API response
 */
function serializeWorkflowStep(step: any, index: number, workflowId: string): any {
  const baseStep: any = {
    id: step.id,
    name: step.name || step.id,
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
        stepName: step.name || step.id,
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
        stepName: step.name || step.id,
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
        stepName: step.name || step.id,
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
          stepName: step.name || step.id,
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
          stepName: step.name || step.id,
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
  suspendSchema?: any; // Store the suspend schema for API access
  resumeSchema?: any; // Store the resume schema for API access
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

  // Track active workflow executions for suspension
  public activeExecutions: Map<string, WorkflowSuspendController> = new Map();

  private constructor() {
    super();
    devLogger.info("[WorkflowRegistry] Initialized");

    // Listen for immediate workflow events from WorkflowEventEmitter
    const emitter = WorkflowEventEmitter.getInstance();
    emitter.on(
      "immediateWorkflowEvent",
      (params: {
        workflowId: string;
        executionId: string;
        event: WorkflowEventWithStatus;
      }) => {
        this.handleImmediateWorkflowEvent(params);
      },
    );
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
        // Emit persisted event with isPersisted flag
        this.emit("historyUpdate", executionId, {
          ...updatedEntry,
          isPersisted: true,
        });

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
    devLogger.info(
      `[WorkflowRegistry] Creating workflow execution for workflow ${workflowId} (${workflowName})`,
    );
    try {
      const workflowMemoryManager = this.getWorkflowMemoryManager(workflowId);
      if (!workflowMemoryManager) {
        devLogger.error(
          `[WorkflowRegistry] No memory manager available for workflow: ${workflowId}`,
        );
        return null;
      }

      devLogger.debug(
        `[WorkflowRegistry] Found memory manager for workflow ${workflowId}, creating execution`,
      );
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

      devLogger.info(
        `[WorkflowRegistry] Created workflow execution ${historyEntry.id} for workflow ${workflowId}`,
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
    devLogger.debug(`[WorkflowRegistry] Updating workflow execution ${executionId}`, {
      workflowId,
      status: updates.status,
      hasSuspension: !!updates.metadata?.suspension,
    });

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
      suspendSchema: workflow.suspendSchema,
      resumeSchema: workflow.resumeSchema,
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
   * Resume a suspended workflow execution
   */
  public async resumeSuspendedWorkflow(
    workflowId: string,
    executionId: string,
    newInput?: any,
  ): Promise<{
    executionId: string;
    startAt: Date;
    endAt: Date;
    status: "completed" | "suspended" | "error";
    result: any;
    suspension?: any;
    error?: unknown;
  } | null> {
    devLogger.info(
      `[WorkflowRegistry] Attempting to resume workflow ${workflowId} execution ${executionId}`,
    );

    const registeredWorkflow = this.getWorkflow(workflowId);
    if (!registeredWorkflow) {
      devLogger.error(`[WorkflowRegistry] Workflow not found: ${workflowId}`);
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    // Get the suspended execution details
    const workflowMemoryManager = this.getWorkflowMemoryManager(workflowId);
    if (!workflowMemoryManager) {
      devLogger.error(`[WorkflowRegistry] No memory manager available for workflow: ${workflowId}`);
      throw new Error(`No memory manager available for workflow: ${workflowId}`);
    }

    devLogger.debug(`[WorkflowRegistry] Fetching execution details for ${executionId}`);
    const execution = await workflowMemoryManager.getExecutionWithDetails(executionId);
    if (!execution) {
      devLogger.error(`[WorkflowRegistry] Execution not found: ${executionId}`);
      throw new Error(`Execution not found: ${executionId}`);
    }

    devLogger.debug(`[WorkflowRegistry] Execution found with status: ${execution.status}`);
    if (execution.status !== ("suspended" as any)) {
      devLogger.error(
        `[WorkflowRegistry] Execution ${executionId} is not in suspended state. Current status: ${execution.status}`,
      );
      throw new Error(
        `Execution ${executionId} is not in suspended state. Current status: ${execution.status}`,
      );
    }

    // Extract suspension metadata
    const suspensionMetadata = (execution.metadata as any)?.suspension;
    if (!suspensionMetadata) {
      devLogger.error(
        `[WorkflowRegistry] No suspension metadata found for execution: ${executionId}`,
      );
      throw new Error(`No suspension metadata found for execution: ${executionId}`);
    }

    devLogger.debug(`[WorkflowRegistry] Found suspension metadata:`, suspensionMetadata);

    // Create a new suspend controller for the resumed execution
    const suspendController = registeredWorkflow.workflow.createSuspendController?.();
    if (!suspendController) {
      throw new Error("Workflow does not support suspension");
    }

    // Add to active executions BEFORE running
    this.activeExecutions.set(executionId, suspendController);
    devLogger.info(
      `[WorkflowRegistry] Added suspension controller for resumed execution ${executionId}`,
    );

    // Run the workflow with resume options
    const resumeOptions: any = {
      executionId,
      userId: execution.userId,
      conversationId: execution.conversationId,
      signal: suspendController.signal,
      suspendController: suspendController,
      resumeFrom: {
        executionId,
        checkpoint: suspensionMetadata.checkpoint,
        resumeStepIndex: suspensionMetadata.suspendedStepIndex,
        lastEventSequence: suspensionMetadata.lastEventSequence,
      },
    };

    devLogger.info(
      `[WorkflowRegistry] Resuming workflow from step ${suspensionMetadata.suspendedStepIndex}`,
    );

    try {
      // Use new input if provided, otherwise use original input
      const inputToUse = newInput !== undefined ? newInput : execution.input;
      const result = await registeredWorkflow.workflow.run(inputToUse, resumeOptions);

      // Remove from active executions when complete
      this.activeExecutions.delete(executionId);
      devLogger.info(`[WorkflowRegistry] Resumed workflow execution ${executionId} completed`);

      return result;
    } catch (error) {
      // Remove from active executions on error
      this.activeExecutions.delete(executionId);
      devLogger.error(
        `[WorkflowRegistry] Resumed workflow execution ${executionId} failed:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get all suspended workflow executions
   */
  public async getSuspendedWorkflows(): Promise<
    Array<{
      workflowId: string;
      executionId: string;
      suspendedAt: Date;
      reason?: string;
      suspendedStepIndex: number;
    }>
  > {
    const suspended = [];
    devLogger.debug(
      `[WorkflowRegistry] Getting suspended workflows for ${this.workflows.size} registered workflows`,
    );

    for (const [workflowId] of this.workflows) {
      const workflowMemoryManager = this.getWorkflowMemoryManager(workflowId);
      if (workflowMemoryManager) {
        devLogger.debug(`[WorkflowRegistry] Fetching executions for workflow ${workflowId}`);
        const executions = await workflowMemoryManager.getExecutions(workflowId);
        devLogger.debug(
          `[WorkflowRegistry] Found ${executions.length} executions for workflow ${workflowId}`,
        );

        for (const execution of executions) {
          devLogger.debug(
            `[WorkflowRegistry] Checking execution ${execution.id} with status ${execution.status}`,
          );
          if (execution.status === ("suspended" as any)) {
            const detailedExecution = await workflowMemoryManager.getExecutionWithDetails(
              execution.id,
            );
            const suspensionMetadata = (detailedExecution?.metadata as any)?.suspension;

            if (suspensionMetadata) {
              suspended.push({
                workflowId,
                executionId: execution.id,
                suspendedAt: suspensionMetadata.suspendedAt,
                reason: suspensionMetadata.reason,
                suspendedStepIndex: suspensionMetadata.suspendedStepIndex,
              });
            }
          }
        }
      } else {
        devLogger.warn(`[WorkflowRegistry] No memory manager for workflow ${workflowId}`);
      }
    }

    devLogger.info(`[WorkflowRegistry] Found ${suspended.length} suspended workflows`);
    return suspended;
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
   * Suspend all active workflows for graceful shutdown
   */
  public async suspendAllActiveWorkflows(reason: string = "Server shutting down"): Promise<void> {
    const activeEntries = Array.from(this.activeExecutions.entries());

    devLogger.info(
      `[WorkflowRegistry] Suspending ${activeEntries.length} active workflows for shutdown`,
    );

    for (const [executionId, controller] of activeEntries) {
      if (!controller.isSuspended()) {
        devLogger.info(`[WorkflowRegistry] Suspending workflow execution: ${executionId}`);
        controller.suspend(reason);
      }
    }

    // Wait a bit for all workflows to process suspension
    if (activeEntries.length > 0) {
      devLogger.info(`[WorkflowRegistry] Waiting for workflows to suspend...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    devLogger.info(`[WorkflowRegistry] All workflows suspended`);
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

  /**
   * Handle immediate workflow events for real-time WebSocket broadcast
   */
  private async handleImmediateWorkflowEvent(params: {
    workflowId: string;
    executionId: string;
    event: WorkflowEventWithStatus;
  }): Promise<void> {
    try {
      // Get the execution details to build the update
      const historyManager = this.getWorkflowHistoryManager(params.workflowId);
      if (!historyManager) {
        devLogger.warn(
          `[WorkflowRegistry] No history manager for immediate event: ${params.event.name}`,
        );
        return;
      }

      // Get current execution state
      const currentEntry = await historyManager.getExecutionWithDetails(params.executionId);
      if (!currentEntry) {
        devLogger.warn(
          `[WorkflowRegistry] No execution found for immediate event: ${params.executionId}`,
        );
        return;
      }

      // Create a temporary update with the new event
      const immediateUpdate = {
        ...currentEntry,
        events: [...(currentEntry.events || []), params.event],
        isPersisted: false, // Mark as not persisted yet
      };

      // Emit immediate update for WebSocket
      this.emit("historyUpdate", params.executionId, immediateUpdate);

      devLogger.debug(
        `[WorkflowRegistry] Immediate event broadcast: ${params.event.name} for execution ${params.executionId}`,
      );
    } catch (error) {
      // Don't throw - immediate events are best-effort
      devLogger.error("[WorkflowRegistry] Failed to handle immediate event:", error);
    }
  }
}
