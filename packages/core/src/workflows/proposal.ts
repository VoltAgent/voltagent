import type { z } from "zod";
import type { Agent } from "../agent";
import type { BaseMessage } from "../agent/providers";
import type {
  InferGenerateObjectResponse,
  InferStreamObjectResponse,
  InferStreamTextResponse,
  PublicGenerateOptions,
} from "../agent/types";

import type { Agent } from "../agent";

export function createStep(agent: Agent<any>) {
  // TODO: Implement
  return null as unknown as VoltWorkflowStep;
}

export function createWorkflow(options: VoltWorkflowOptions<any, any>): VoltWorkflow<any, any> {
  // TODO: Implement
  return null as unknown as VoltWorkflow<any, any>;
}

export interface VoltWorkflowStep {
  name: string;
  description: string;
  agent: Agent<any>;
  // Add retry configuration
  retries?: number;
  timeout?: number;
  // Pipeline-specific configurations
  inputTransform?: (previousOutput: any, workflowInput: any) => any;
  outputTransform?: (output: any) => any;
  // Define what this step expects as input and produces as output
  inputSchema?: z.ZodType<any>;
  outputSchema?: z.ZodType<any>;
}

export interface VoltWorkflowContext {
  // Store intermediate results from each step
  stepResults: Map<string, any>;
  // Store the original workflow input
  input: any;
  // Current step being executed
  currentStep?: string;
  // Execution metadata
  startTime: Date;
  status: "running" | "paused" | "completed" | "failed" | "cancelled";
}

export abstract class VoltWorkflowExecution {
  protected input: string | BaseMessage[];

  constructor(input: string | BaseMessage[]) {
    this.input = input;
  }

  /**
   * Stream messages through the entire workflow pipeline
   * Each step processes the messages and streams the result to the next step
   * Returns a stream of BaseMessage objects piece by piece
   * @param input - Initial messages for the pipeline
   * @param options - Generation options applied to all steps
   */
  abstract stream(options?: PublicGenerateOptions): AsyncIterable<BaseMessage>;

  /**
   * Generate final result through the entire workflow pipeline
   * Each step processes the input and passes result to next step
   * Returns the final generated result (object, string, whatever the workflow produces)
   * @param input - Initial input for the pipeline
   * @param options - Generation options applied to all steps
   */
  abstract generate<RESULT>(options?: PublicGenerateOptions): Promise<RESULT>;

  // /**
  //  * Resume the workflow
  //  */
  // abstract resume(): Promise<void>;

  // /**
  //  * Pause the workflow
  //  */
  // abstract pause(): Promise<void>;

  // /**
  //  * Cancel the workflow
  //  */
  // abstract cancel(): Promise<void>;

  /**
   * Get the current status
   */
  getStatus(): VoltWorkflowContext["status"] {
    return this.context.status;
  }
}

/**
 * Pipeline operation types for mixed workflows
 */
export type PipelineOperation<T> =
  | { type: "streamText"; options?: PublicGenerateOptions }
  | { type: "generateText"; options?: PublicGenerateOptions }
  | { type: "streamObject"; schema: z.ZodType<T>; options?: PublicGenerateOptions }
  | { type: "generateObject"; schema: z.ZodType<T>; options?: PublicGenerateOptions }
  | { type: "transform"; fn: (input: any) => any };

export interface VoltWorkflowOptions<TParameters, TResult> {
  /**
   * The id of the workflow
   */
  id: string;

  /**
   * The name of the workflow
   */
  name: string;

  /**
   * A description of the workflow
   */
  description?: string;

  /**
   * The parameters schema for the workflow
   */
  parameters: z.ZodSchema<TParameters>;

  /**
   * The result schema of the workflow
   */
  result: z.ZodSchema<TResult>;

  /**
   * Global timeout for the entire workflow (in milliseconds)
   */
  timeout?: number;

  /**
   * Error handling strategy
   */
  onError?: (
    error: Error,
    step: VoltWorkflowStep,
    context: VoltWorkflowContext,
  ) => "retry" | "skip" | "abort";
}

// Internal workflow node types
interface WorkflowNode {
  type: "step" | "condition" | "parallel";
  id: string;
}

interface StepNode extends WorkflowNode {
  type: "step";
  step: VoltWorkflowStep;
}

interface ConditionNode extends WorkflowNode {
  type: "condition";
  condition: (input: any, context: VoltWorkflowContext) => boolean;
  trueBranch: WorkflowNode[];
  falseBranch?: WorkflowNode[];
}

interface ParallelNode extends WorkflowNode {
  type: "parallel";
  steps: VoltWorkflowStep[];
}

export abstract class VoltWorkflow<TParameters, TResult> {
  protected options: VoltWorkflowOptions<TParameters, TResult>;
  protected nodes: WorkflowNode[] = [];
  protected committed = false;

  constructor(options: VoltWorkflowOptions<TParameters, TResult>) {
    this.options = options;
  }

  /**
   * Define a condition for the workflow
   */
  when(
    condition: (
      input: z.infer<typeof this.options.parameters>,
      context: VoltWorkflowContext,
    ) => boolean,
    step: VoltWorkflowStep,
  ): this {
    if (this.committed) {
      throw new Error("Cannot modify workflow after commit");
    }

    const conditionNode: ConditionNode = {
      type: "condition",
      id: `condition_${this.nodes.length}`,
      condition,
      trueBranch: [
        {
          type: "step",
          id: `step_${step.name}`,
          step,
        },
      ],
    };

    this.nodes.push(conditionNode);
    return this;
  }

  /**
   * Define an else branch for the last condition
   */
  otherwise(step: VoltWorkflowStep): this {
    if (this.committed) {
      throw new Error("Cannot modify workflow after commit");
    }

    const lastNode = this.nodes[this.nodes.length - 1];
    if (!lastNode || lastNode.type !== "condition") {
      throw new Error("otherwise() can only be called after when()");
    }

    (lastNode as ConditionNode).falseBranch = [
      {
        type: "step",
        id: `step_${step.name}`,
        step,
      },
    ];

    return this;
  }

  /**
   * Define a next step in the workflow
   */
  andThen(step: VoltWorkflowStep): this {
    if (this.committed) {
      throw new Error("Cannot modify workflow after commit");
    }

    const stepNode: StepNode = {
      type: "step",
      id: `step_${step.name}`,
      step,
    };

    this.nodes.push(stepNode);
    return this;
  }

  /**
   * Define a set of parallel steps in the workflow
   */
  parallel(steps: VoltWorkflowStep[]): this {
    if (this.committed) {
      throw new Error("Cannot modify workflow after commit");
    }

    const parallelNode: ParallelNode = {
      type: "parallel",
      id: `parallel_${this.nodes.length}`,
      steps,
    };

    this.nodes.push(parallelNode);
    return this;
  }

  /**
   * Add a loop construct
   */
  loop(
    condition: (input: any, context: VoltWorkflowContext) => boolean,
    steps: VoltWorkflowStep[],
    maxIterations = 10,
  ): this {
    if (this.committed) {
      throw new Error("Cannot modify workflow after commit");
    }

    // Implementation would create a special loop node
    // For now, just add as sequential steps with condition checking
    steps.forEach((step) => this.andThen(step));
    return this;
  }

  /**
   * Validate the workflow definition
   */
  protected validate(): void {
    if (this.nodes.length === 0) {
      throw new Error("Workflow must have at least one step");
    }

    // Check for duplicate step names
    const stepNames = new Set<string>();
    const validateNode = (node: WorkflowNode) => {
      if (node.type === "step") {
        if (stepNames.has(node.step.name)) {
          throw new Error(`Duplicate step name: ${node.step.name}`);
        }
        stepNames.add(node.step.name);
      } else if (node.type === "condition") {
        node.trueBranch.forEach(validateNode);
        node.falseBranch?.forEach(validateNode);
      } else if (node.type === "parallel") {
        node.steps.forEach((step) => {
          if (stepNames.has(step.name)) {
            throw new Error(`Duplicate step name: ${step.name}`);
          }
          stepNames.add(step.name);
        });
      }
    };

    this.nodes.forEach(validateNode);
  }

  /**
   * Commit the workflow - makes it ready to run
   */
  commit(): this {
    if (this.committed) {
      throw new Error("Workflow already committed");
    }

    this.validate();
    this.committed = true;
    return this;
  }

  /**
   * Check if workflow is committed
   */
  isCommitted(): boolean {
    return this.committed;
  }

  /**
   * Get workflow metadata
   */
  getMetadata() {
    return {
      id: this.options.id,
      name: this.options.name,
      description: this.options.description,
      committed: this.committed,
      stepCount: this.countSteps(),
    };
  }

  /**
   * Count total steps in the workflow
   */
  private countSteps(): number {
    let count = 0;
    const countNode = (node: WorkflowNode) => {
      if (node.type === "step") {
        count++;
      } else if (node.type === "condition") {
        node.trueBranch.forEach(countNode);
        node.falseBranch?.forEach(countNode);
      } else if (node.type === "parallel") {
        count += node.steps.length;
      }
    };

    this.nodes.forEach(countNode);
    return count;
  }

  /**
   * Run the workflow
   */
  abstract run(input: z.infer<typeof this.options.parameters>): VoltWorkflowExecution;

  /**
   * Create a workflow builder
   */
  static create<TParams, TResult>(
    options: VoltWorkflowOptions<TParams, TResult>,
  ): VoltWorkflow<TParams, TResult> {
    // This would return a concrete implementation
    throw new Error("Must be implemented by concrete class");
  }
}
