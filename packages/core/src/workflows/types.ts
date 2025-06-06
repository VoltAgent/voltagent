import type { z } from "zod";
import type { Agent } from "../agent";
// import type { BaseMessage, InferGenerateObjectResponse } from "../agent/providers";
// import type {
//   InferStreamObjectResponse,
//   InferStreamTextResponse,
//   PublicGenerateOptions,
// } from "../agent/types";

export interface VoltWorkflowStep {
  name: string;
  description: string;
  agent: Agent<any>;
}

export abstract class VoltWorkflowExecution {
  /**
   * Resume the workflow
   */
  abstract resume(): Promise<void>;

  /**
   * Cancel the workflow
   */
  abstract cancel(): Promise<void>;
}

export interface VoltWorkflowOptions<SCHEMA> {
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
   * The parameters for the workflow
   */
  parameters: z.ZodSchema<any>;

  /**
   * The result of the workflow
   */
  result: z.ZodSchema<SCHEMA>;

  // TODO: should we allow steps?
  // steps?: VoltWorkflowStep[];
}

// execute in order
export abstract class VoltWorkflow<SCHEMA extends z.ZodType<any, any, any>> {
  /**
   * Define a condition for the workflow
   * @param condition - The condition for the workflow
   * @param step - The step to add to the workflow
   * @returns The workflow instance
   */
  abstract when(condition: (input: z.infer<SCHEMA>) => boolean, step: VoltWorkflowStep): this;

  /**
   * Define a next step in the workflow
   * @param step - The step to add to the workflow
   * @returns The workflow instance
   */
  abstract andThen(step: VoltWorkflowStep): this;

  /**
   * Define a set of parallel step in the workflow
   * @param steps - The steps to add to the workflow
   * @returns The workflow instance
   */
  abstract parallel(steps: VoltWorkflowStep[]): this;

  /**
   * Commit the workflow aka its read to "run" it cannot RUN until this is called and will error
   * @returns The workflow instance
   */
  abstract commit(): this;

  /**
   * Run the workflow
   * @param input - The input for the workflow
   * @returns A workflow execution
   */
  abstract run(input: z.infer<SCHEMA>): VoltWorkflowExecution;
}

// interface Base {
//   /**
//    * Stream an object
//    */
//   streamObject<TSchema extends z.ZodType>(
//     input: string | BaseMessage[],
//     schema: TSchema,
//     options?: PublicGenerateOptions,
//   ): Promise<InferStreamObjectResponse<any>>;

//   /**
//    * Stream a text
//    */
//   streamText(
//     input: string | BaseMessage[],
//     options?: PublicGenerateOptions,
//   ): Promise<InferStreamTextResponse<any>>;

//   /**
//    * Generate an object
//    */
//   generateObject<TSchema extends z.ZodType>(
//     input: string | BaseMessage[],
//     schema: TSchema,
//     options?: PublicGenerateOptions,
//   ): Promise<InferGenerateObjectResponse<any>>;
// }
