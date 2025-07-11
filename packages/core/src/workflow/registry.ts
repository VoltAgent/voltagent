import type { VoltAgentExporter } from "../telemetry/exporter";
import type { Workflow } from "./types";
import { WorkflowHistoryManager } from "./history";
import type { WorkflowHistoryEntry, WorkflowStepHistoryEntry } from "./context";
import { EventEmitter } from "node:events";
import { createWorkflowStepNodeId } from "../utils/node-utils";

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
  private historyManager: WorkflowHistoryManager;

  private constructor() {
    super();
    this.historyManager = new WorkflowHistoryManager();
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
    this.historyManager.setGlobalExporter(exporter);
  }

  /**
   * Get the history manager instance
   */
  public getHistoryManager(): WorkflowHistoryManager {
    return this.historyManager;
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
   */
  public getWorkflowExecutions(workflowId: string): WorkflowHistoryEntry[] {
    return this.historyManager.getEntries(workflowId);
  }

  /**
   * Get a specific workflow execution
   */
  public getWorkflowExecution(executionId: string): WorkflowHistoryEntry | undefined {
    return this.historyManager.getEntry(executionId);
  }

  /**
   * Record workflow execution start
   */
  public recordWorkflowExecutionStart(
    workflowId: string,
    workflowName: string,
    input: unknown,
    options: {
      userId?: string;
      conversationId?: string;
    } = {},
  ): WorkflowHistoryEntry {
    const registeredWorkflow = this.workflows.get(workflowId);
    if (!registeredWorkflow) {
      throw new Error(`Workflow not registered: ${workflowId}`);
    }

    // Create history entry
    const historyEntry = this.historyManager.addEntry({
      workflowId,
      workflowName,
      status: "running",
      startTime: new Date(),
      input,
      steps: [],
      events: [],
      userId: options.userId,
      conversationId: options.conversationId,
    });

    // Update execution count
    registeredWorkflow.executionCount++;
    registeredWorkflow.lastExecutedAt = new Date();
    this.workflows.set(workflowId, registeredWorkflow);

    // Emit history created event
    this.emit("historyCreated", historyEntry);

    return historyEntry;
  }

  /**
   * Record workflow execution completion
   */
  public recordWorkflowExecutionEnd(
    executionId: string,
    status: "completed" | "error" | "cancelled",
    output?: unknown,
    error?: unknown,
  ): void {
    const historyEntry = this.historyManager.getEntry(executionId);
    if (!historyEntry) {
      console.warn(`Workflow execution not found: ${executionId}`);
      return;
    }

    const updates: Partial<WorkflowHistoryEntry> = {
      status,
      endTime: new Date(),
    };

    if (output !== undefined) {
      updates.output = output;
    }

    if (error !== undefined && status === "error") {
      updates.output = error;
    }

    this.historyManager.updateEntry(executionId, updates);

    // Get updated entry and emit update event
    const updatedEntry = this.historyManager.getEntry(executionId);
    if (updatedEntry) {
      this.emit("historyUpdate", executionId, updatedEntry);
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
    input?: unknown, // ✅ ADD: Input parameter
  ): WorkflowStepHistoryEntry {
    const historyEntry = this.historyManager.getEntry(executionId);
    if (!historyEntry) {
      console.warn(`Workflow execution not found: ${executionId}`);
      throw new Error(`Workflow execution not found: ${executionId}`);
    }

    const stepEntry: WorkflowStepHistoryEntry = {
      stepId: stepId || `step-${stepIndex}`,
      stepIndex,
      stepType: stepType as any,
      stepName,
      status: "running",
      startTime: new Date(),
      input, // ✅ Store input data
    };

    // Add step to the execution
    historyEntry.steps.push(stepEntry);

    // Update the history entry
    this.historyManager.updateEntry(executionId, {
      steps: historyEntry.steps,
    });

    // Emit history update
    const updatedEntry = this.historyManager.getEntry(executionId);
    if (updatedEntry) {
      this.emit("historyUpdate", executionId, updatedEntry);
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
    const historyEntry = this.historyManager.getEntry(executionId);
    if (!historyEntry) {
      console.warn(`Workflow execution not found: ${executionId}`);
      return;
    }

    // Find the step in the history
    const stepIndex_actual = historyEntry.steps.findIndex((step) => step.stepIndex === stepIndex);
    if (stepIndex_actual === -1) {
      console.warn(`Step ${stepIndex} not found in execution ${executionId}`);
      return;
    }

    // Update the step
    const step = historyEntry.steps[stepIndex_actual];
    step.status = status as any;
    step.endTime = new Date();

    if (output !== undefined) {
      step.output = output;
    }

    if (error !== undefined) {
      step.error = error;
    }

    if (agentExecutionId !== undefined) {
      step.agentExecutionId = agentExecutionId;
    }

    // Update the history entry
    this.historyManager.updateEntry(executionId, {
      steps: historyEntry.steps,
    });

    // Emit history update
    const updatedEntry = this.historyManager.getEntry(executionId);
    if (updatedEntry) {
      this.emit("historyUpdate", executionId, updatedEntry);
    }
  }

  /**
   * Get workflow statistics
   */
  public getWorkflowStats(workflowId: string): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    lastExecutionTime?: Date;
  } {
    return this.historyManager.getWorkflowStats(workflowId);
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
    this.historyManager.clearAllHistory();
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
