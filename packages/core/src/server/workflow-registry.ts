import type { Workflow } from "../workflow/types";
import type { DangerouslyAllowAny } from "@voltagent/internal/types";

/**
 * Registry to manage and track workflows
 */
export class WorkflowRegistry {
  private static instance: WorkflowRegistry | null = null;
  private workflows: Map<string, Workflow<DangerouslyAllowAny, DangerouslyAllowAny>> = new Map();
  private isInitialized = false;

  private constructor() {}

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
   * Initialize the registry
   */
  public initialize(): void {
    if (!this.isInitialized) {
      this.isInitialized = true;
    }
  }

  /**
   * Register a new workflow
   */
  public registerWorkflow(workflow: Workflow<DangerouslyAllowAny, DangerouslyAllowAny>): void {
    if (!this.isInitialized) {
      this.initialize();
    }
    this.workflows.set(workflow.id, workflow);
  }

  /**
   * Get a workflow by ID
   */
  public getWorkflow(id: string): Workflow<DangerouslyAllowAny, DangerouslyAllowAny> | undefined {
    return this.workflows.get(id);
  }

  /**
   * Get all registered workflows
   */
  public getAllWorkflows(): Workflow<DangerouslyAllowAny, DangerouslyAllowAny>[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Remove a workflow by ID
   */
  public removeWorkflow(id: string): boolean {
    return this.workflows.delete(id);
  }

  /**
   * Get workflow count
   */
  public getWorkflowCount(): number {
    return this.workflows.size;
  }

  /**
   * Check if registry is initialized
   */
  public isRegistryInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if a workflow is registered
   */
  public hasWorkflow(id: string): boolean {
    return this.workflows.has(id);
  }

  /**
   * Clear all workflows
   */
  public clearWorkflows(): void {
    this.workflows.clear();
  }

  /**
   * Get workflows as API response format
   */
  public getWorkflowsForApi() {
    return this.getAllWorkflows().map((workflow) => ({
      id: workflow.id,
      name: workflow.name,
      purpose: workflow.purpose,
      stepsCount: workflow.steps.length,
      status: "idle" as const,
    }));
  }
}
