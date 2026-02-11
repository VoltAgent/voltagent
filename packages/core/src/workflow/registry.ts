import { LoggerProxy } from "../logger";
import { SimpleEventEmitter } from "../utils/simple-event-emitter";
import { serializeWorkflowStep } from "./core";
import type { Workflow, WorkflowExecutionResult, WorkflowSuspendController } from "./types";

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
  resultSchema?: any; // Store the result schema for API access
}

/**
 * Workflow registry events
 */
export interface WorkflowRegistryEvents {
  workflowRegistered: (workflowId: string, workflow: RegisteredWorkflow) => void;
  workflowUnregistered: (workflowId: string) => void;
}

/**
 * Singleton registry for managing workflows and their execution history
 */
declare global {
  // eslint-disable-next-line no-var
  var ___voltagent_workflow_registry: WorkflowRegistry | undefined;
}

export class WorkflowRegistry extends SimpleEventEmitter {
  // Avoid module-level static for cross-bundle consistency
  // private static instance: WorkflowRegistry;
  private workflows: Map<string, RegisteredWorkflow> = new Map();
  private logger = new LoggerProxy({ component: "workflow-registry" });

  // Track active workflow executions for suspension
  public activeExecutions: Map<string, WorkflowSuspendController> = new Map();

  private constructor() {
    super();
  }

  /**
   * Get the singleton instance of WorkflowRegistry
   */
  public static getInstance(): WorkflowRegistry {
    if (!globalThis.___voltagent_workflow_registry) {
      globalThis.___voltagent_workflow_registry = new WorkflowRegistry();
    }
    return globalThis.___voltagent_workflow_registry;
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
      suspendSchema: workflow.suspendSchema,
      resumeSchema: workflow.resumeSchema,
      resultSchema: workflow.resultSchema,
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
    resumeData?: any,
    resumeStepId?: string,
  ): Promise<WorkflowExecutionResult<any, any> | null> {
    this.logger.debug(`Attempting to resume workflow ${workflowId} execution ${executionId}`);

    const registeredWorkflow = this.getWorkflow(workflowId);
    if (!registeredWorkflow) {
      this.logger.error(`Workflow not found: ${workflowId}`);
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    // Get the suspended state from Memory V2
    this.logger.trace(`Fetching workflow state for ${executionId}`);
    const workflowState = await registeredWorkflow.workflow.memory.getWorkflowState(executionId);
    if (!workflowState) {
      this.logger.error(`Workflow state not found: ${executionId}`);
      throw new Error(`Workflow state not found: ${executionId}`);
    }

    this.logger.trace(`Workflow state found with status: ${workflowState.status}`);
    if (workflowState.status !== "suspended") {
      this.logger.error(
        `Execution ${executionId} is not in suspended state. Current status: ${workflowState.status}`,
      );
      throw new Error(
        `Execution ${executionId} is not in suspended state. Current status: ${workflowState.status}`,
      );
    }

    // Extract suspension metadata from state
    const suspensionMetadata = workflowState.suspension;
    if (!suspensionMetadata) {
      this.logger.error(`No suspension metadata found for execution: ${executionId}`);
      throw new Error(`No suspension metadata found for execution: ${executionId}`);
    }

    this.logger.trace("Found suspension metadata:", suspensionMetadata);

    // Create a new suspend controller for the resumed execution
    const suspendController = registeredWorkflow.workflow.createSuspendController?.();
    if (!suspendController) {
      throw new Error("Workflow does not support suspension");
    }

    // Add to active executions BEFORE running
    this.activeExecutions.set(executionId, suspendController);
    this.logger.trace(`Added suspension controller for resumed execution ${executionId}`);

    // Run the workflow with resume options
    const resumeOptions: any = {
      executionId,
      userId: workflowState.userId ?? workflowState.metadata?.userId,
      conversationId: workflowState.conversationId ?? workflowState.metadata?.conversationId,
      suspendController: suspendController,
      resumeFrom: {
        executionId,
        checkpoint: suspensionMetadata.checkpoint,
        resumeStepIndex: suspensionMetadata.stepIndex,
        lastEventSequence: suspensionMetadata.lastEventSequence,
      },
    };

    // If a specific stepId is provided, find its index and override the resumeStepIndex
    if (resumeStepId) {
      const stepIndex = registeredWorkflow.workflow.steps.findIndex(
        (step) => step.id === resumeStepId,
      );

      if (stepIndex === -1) {
        throw new Error(`Step '${resumeStepId}' not found in workflow '${workflowId}'`);
      }

      resumeOptions.resumeFrom.resumeStepIndex = stepIndex;
      this.logger.trace(
        `Overriding resume step index to ${stepIndex} for stepId '${resumeStepId}'`,
      );
    }

    this.logger.debug(`Resuming workflow from step ${resumeOptions.resumeFrom.resumeStepIndex}`);

    try {
      // Prefer persisted workflow input; fall back to the workflow-start event payload.
      // This keeps resume compatible with adapters that don't store input in a dedicated column.
      const workflowStartEventInput = workflowState.events?.find(
        (event) => event.type === "workflow-start",
      )?.input;
      const inputToUse = workflowState.input ?? workflowStartEventInput;

      // Add resumeData to resumeOptions if provided
      if (resumeData !== undefined) {
        resumeOptions.resumeFrom = {
          ...resumeOptions.resumeFrom,
          resumeData,
        };
      }

      const result = await registeredWorkflow.workflow.run(inputToUse, resumeOptions);

      // Remove from active executions when complete
      this.activeExecutions.delete(executionId);
      this.logger.debug(`Resumed workflow execution ${executionId} completed`);

      return result;
    } catch (error) {
      // Remove from active executions on error
      this.activeExecutions.delete(executionId);
      this.logger.error(`Resumed workflow execution ${executionId} failed:`, { error });
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
    this.logger.trace(
      `Getting suspended workflows for ${this.workflows.size} registered workflows`,
    );

    for (const [workflowId, registeredWorkflow] of this.workflows) {
      this.logger.trace(`Fetching suspended states for workflow ${workflowId}`);
      const suspendedStates =
        await registeredWorkflow.workflow.memory.getSuspendedWorkflowStates(workflowId);
      this.logger.trace(
        `Found ${suspendedStates.length} suspended states for workflow ${workflowId}`,
      );

      for (const state of suspendedStates) {
        if (state.suspension) {
          suspended.push({
            workflowId,
            executionId: state.id,
            suspendedAt: state.suspension.suspendedAt,
            reason: state.suspension.reason,
            suspendedStepIndex: state.suspension.stepIndex,
          });
        }
      }
    }

    this.logger.trace(`Found ${suspended.length} suspended workflows`);
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
  public async suspendAllActiveWorkflows(reason = "Server shutting down"): Promise<void> {
    const activeEntries = Array.from(this.activeExecutions.entries());

    if (activeEntries.length === 0) {
      return;
    }

    this.logger.debug(`Suspending ${activeEntries.length} active workflows for shutdown`);

    for (const [executionId, controller] of activeEntries) {
      if (!controller.isSuspended()) {
        this.logger.debug(`Suspending workflow execution: ${executionId}`);
        controller.suspend(reason);
      }
    }

    // Wait a bit for all workflows to process suspension
    if (activeEntries.length > 0) {
      this.logger.trace("Waiting for workflows to suspend...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
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
      steps: workflow.steps.map((step, index) => serializeWorkflowStep(step, index)),
      inputSchema: registeredWorkflow.inputSchema,
      resultSchema: registeredWorkflow.resultSchema,
      suspendSchema: registeredWorkflow.suspendSchema,
      resumeSchema: registeredWorkflow.resumeSchema,
    };
  }
}
