import type { VoltAgentExporter } from "../telemetry/exporter";
import type { Workflow } from "./types";
import type {
  WorkflowRuntimeHistoryEntry as WorkflowHistoryEntry,
  WorkflowRuntimeStepHistoryEntry as WorkflowStepHistoryEntry,
} from "./types";
import { EventEmitter } from "node:events";
import { createWorkflowStepNodeId } from "../utils/node-utils";
import type { WorkflowMemory } from "./types";
import { WorkflowMemoryManager } from "./memory/manager";
import { devLogger } from "@voltagent/internal/dev";
import { LibSQLStorage } from "../memory/libsql";

/**
 * Convert memory WorkflowHistoryEntry to context WorkflowHistoryEntry
 */
function memoryToContextHistoryEntry(
  memoryEntry: import("./types").WorkflowHistoryEntry,
): WorkflowHistoryEntry {
  // Convert memory steps to context steps format (minor field mapping)
  const contextSteps: WorkflowStepHistoryEntry[] = (memoryEntry.steps || []).map((step) => ({
    stepId: step.stepId || step.id, // Ensure stepId is always present
    stepIndex: step.stepIndex,
    stepType: step.stepType,
    stepName: step.stepName,
    status: step.status as any,
    startTime: step.startTime,
    endTime: step.endTime,
    input: step.input,
    output: step.output,
    error: step.errorMessage, // errorMessage -> error
    agentExecutionId: step.agentExecutionId,
    parallelIndex: step.parallelIndex,
    parallelParentStepId: step.parentStepId, // parentStepId -> parallelParentStepId
  }));

  // Convert memory events to context events format (Date -> ISO string, etc.)
  const contextEvents = (memoryEntry.events || []).map((event) => ({
    id: event.id,
    name: event.name,
    type: event.type,
    startTime: event.startTime.toISOString(), // Date -> ISO string
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
    workflowName: memoryEntry.name, // name -> workflowName
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

/**
 * Serialize function content for API response
 */
function serializeFunctionContent(fn: (...args: any[]) => any): string | null {
  try {
    const fnString = fn.toString();
    // Remove unnecessary whitespace and format for display
    return fnString
      .replace(/^\s+/gm, "") // Remove leading whitespace
      .replace(/\n\s*\n/g, "\n") // Remove empty lines
      .trim();
  } catch {
    return null;
  }
}

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
          taskFunction: serializeFunctionContent(step.task),
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
          executeFunction: serializeFunctionContent(step.originalExecute),
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
        // ✅ Use original condition function (clean user code)
        ...(step.originalCondition && {
          conditionFunction: serializeFunctionContent(step.originalCondition),
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
  private globalMemory?: WorkflowMemory;

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
    // Store for later use when memoryManager is initialized
    // TODO: Store exporter for later initialization if memoryManager doesn't exist yet
  }

  /**
   * Set global memory for all workflow operations (similar to Agent memory system)
   * @param memory WorkflowMemory implementation (e.g., LibSQLStorage)
   * @param exporter Optional VoltAgentExporter for telemetry
   */
  public setGlobalMemory(memory: WorkflowMemory, exporter?: VoltAgentExporter): void {
    devLogger.info("[WorkflowRegistry] Setting global workflow memory");

    try {
      this.globalMemory = memory;
      this.memoryManager = new WorkflowMemoryManager(memory, exporter);
      devLogger.info("[WorkflowRegistry] Global workflow memory configured successfully");
    } catch (error) {
      devLogger.error("[WorkflowRegistry] Failed to configure global workflow memory:", error);
      throw error;
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
   * Auto-initialize memory manager with default LibSQLStorage
   * Similar to how Agent system auto-uses memory
   */
  public ensureMemoryManager(): void {
    // If memoryManager already exists, nothing to do
    if (this.memoryManager) return;

    // If global memory is set, use it
    if (this.globalMemory) {
      devLogger.debug("[WorkflowRegistry] Auto-initializing memory manager with global memory");
      this.memoryManager = new WorkflowMemoryManager(this.globalMemory);
    } else {
      // Default to LibSQLStorage like Agent system does
      devLogger.debug(
        "[WorkflowRegistry] Auto-initializing memory manager with default LibSQLStorage",
      );
      const defaultMemory = new LibSQLStorage({ url: "file:memory.db" });
      this.memoryManager = new WorkflowMemoryManager(defaultMemory);
    }
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

      // 🔥 FIX: Get detailed executions with steps and events
      const detailedExecutions: WorkflowHistoryEntry[] = [];
      for (const execution of basicExecutions) {
        const detailedExecution = await this.memoryManager.getExecutionWithDetails(execution.id);
        if (detailedExecution) {
          detailedExecutions.push(memoryToContextHistoryEntry(detailedExecution));
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
      return execution ? memoryToContextHistoryEntry(execution) : undefined;
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

      // Update in DB and emit real data
      this.memoryManager
        .updateExecution(executionId, memoryUpdates)
        .then(async () => {
          // 🔥 GET REAL DATA FROM DB AND EMIT (no more fake temp entry!)
          if (this.memoryManager) {
            const realWorkflowHistory =
              await this.memoryManager.getExecutionWithDetails(executionId);
            if (realWorkflowHistory) {
              // Convert memory format to context format for WebSocket
              const realHistoryEntry = {
                id: realWorkflowHistory.id,
                workflowId: realWorkflowHistory.workflowId,
                workflowName: realWorkflowHistory.name,
                status: realWorkflowHistory.status,
                startTime: realWorkflowHistory.startTime,
                endTime: realWorkflowHistory.endTime,
                input: realWorkflowHistory.input,
                output: realWorkflowHistory.output,
                steps: realWorkflowHistory.steps || [], // ✅ Real steps from DB
                events: realWorkflowHistory.events || [], // ✅ Real events from DB
                userId: realWorkflowHistory.metadata?.userId as string,
                conversationId: realWorkflowHistory.metadata?.conversationId as string,
              };

              this.emit("historyUpdate", executionId, realHistoryEntry);
              devLogger.debug(
                `[WorkflowRegistry] Emitted real workflow history for execution end: ${executionId}`,
              );
            } else {
              devLogger.warn(
                `[WorkflowRegistry] Could not find workflow history for execution ${executionId}`,
              );
            }
          }
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
      stepId: stepId || `step-${stepIndex}`,
      stepIndex,
      stepType: stepType as any,
      stepName,
      status: "running",
      startTime: new Date(),
      input,
    };

    // Persist to storage and emit real data
    if (this.memoryManager) {
      this.memoryManager
        .recordStepStart(executionId, stepIndex, stepType as any, stepName, input, { stepId })
        .then(async () => {
          // 🔥 GET REAL DATA FROM DB AND EMIT (no more fake temp entry!)
          if (this.memoryManager) {
            const realWorkflowHistory =
              await this.memoryManager.getExecutionWithDetails(executionId);
            if (realWorkflowHistory) {
              // Convert memory format to context format for WebSocket
              const realHistoryEntry = {
                id: realWorkflowHistory.id,
                workflowId: realWorkflowHistory.workflowId,
                workflowName: realWorkflowHistory.name,
                status: realWorkflowHistory.status,
                startTime: realWorkflowHistory.startTime,
                endTime: realWorkflowHistory.endTime,
                input: realWorkflowHistory.input,
                output: realWorkflowHistory.output,
                steps: realWorkflowHistory.steps || [], // ✅ Real steps from DB
                events: realWorkflowHistory.events || [], // ✅ Real events from DB
                userId: realWorkflowHistory.metadata?.userId as string,
                conversationId: realWorkflowHistory.metadata?.conversationId as string,
              };

              this.emit("historyUpdate", executionId, realHistoryEntry);
              devLogger.debug(
                `[WorkflowRegistry] Emitted real workflow history for step start: ${executionId}`,
              );
            } else {
              devLogger.warn(
                `[WorkflowRegistry] Could not find workflow history for step start: ${executionId}`,
              );
            }
          }
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
              .then(async () => {
                // 🔥 GET REAL DATA FROM DB AND EMIT (no more fake temp entry!)
                if (this.memoryManager) {
                  const realWorkflowHistory =
                    await this.memoryManager.getExecutionWithDetails(executionId);
                  if (realWorkflowHistory) {
                    // Convert memory format to context format for WebSocket
                    const realHistoryEntry = {
                      id: realWorkflowHistory.id,
                      workflowId: realWorkflowHistory.workflowId,
                      workflowName: realWorkflowHistory.name,
                      status: realWorkflowHistory.status,
                      startTime: realWorkflowHistory.startTime,
                      endTime: realWorkflowHistory.endTime,
                      input: realWorkflowHistory.input,
                      output: realWorkflowHistory.output,
                      steps: realWorkflowHistory.steps || [], // ✅ Real steps from DB
                      events: realWorkflowHistory.events || [], // ✅ Real events from DB
                      userId: realWorkflowHistory.metadata?.userId as string,
                      conversationId: realWorkflowHistory.metadata?.conversationId as string,
                    };

                    this.emit("historyUpdate", executionId, realHistoryEntry);
                    devLogger.debug(
                      `[WorkflowRegistry] Emitted real workflow history for step end: ${executionId}`,
                    );
                  } else {
                    devLogger.warn(
                      `[WorkflowRegistry] Could not find workflow history for step end: ${executionId}`,
                    );
                  }
                }
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
