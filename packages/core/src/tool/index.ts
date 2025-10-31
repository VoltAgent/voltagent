import type { ToolCallOptions, Tool as VercelTool } from "ai";
import { v4 as uuidv4 } from "uuid";
import type { z } from "zod";
import type { BaseTool, ToolSchema } from "../agent/providers/base/types";
import type { OperationContext } from "../agent/types";
import { LoggerProxy } from "../logger";
export type { Tool as VercelTool } from "ai";

// Export ToolManager and related types
export { ToolManager, ToolStatus, ToolStatusInfo } from "./manager";
// Export Toolkit type and createToolkit function
export { type Toolkit, createToolkit } from "./toolkit";

/**
 * Tool definition compatible with Vercel AI SDK
 */
export type AgentTool = BaseTool;

/**
 * Block access to user-defined and dynamic tools by requiring provider-defined type
 * */
export type ProviderTool = Extract<VercelTool, { type: "provider-defined" }>;

/**
 * Tool options for creating a new tool
 */
export type ToolOptions<
  T extends ToolSchema = ToolSchema,
  O extends ToolSchema | undefined = undefined,
> = {
  /**
   * Unique identifier for the tool
   */
  id?: string;

  /**
   * Name of the tool
   */
  name: string;

  /**
   * Description of the tool
   */
  description: string;

  /**
   * Tool parameter schema
   */
  parameters: T;

  /**
   * Tool output schema (optional)
   */
  outputSchema?: O;

  /**
   * Function to execute when the tool is called
   */
  execute?: (
    args: z.infer<T>,
    context?: OperationContext,
  ) => Promise<O extends ToolSchema ? z.infer<O> : unknown>;
};

/**
 * Tool class for defining tools that agents can use
 */
export class Tool<T extends ToolSchema = ToolSchema, O extends ToolSchema | undefined = undefined> {
  /* implements BaseTool<z.infer<T>> */
  /**
   * Unique identifier for the tool
   */
  readonly id: string;

  /**
   * Name of the tool
   */
  readonly name: string;

  /**
   * Description of the tool
   */
  readonly description: string;

  /**
   * Tool parameter schema
   */
  readonly parameters: T;

  /**
   * Tool output schema
   */
  readonly outputSchema?: O;

  /**
   * Internal discriminator to make runtime/type checks simpler across module boundaries.
   * Marking our Tool instances with a stable string avoids instanceof issues.
   */
  readonly type = "user-defined" as const;

  /**
   * Function to execute when the tool is called
   */
  readonly execute?: (
    args: z.infer<T>,
    context?: OperationContext,
    options?: ToolCallOptions,
  ) => Promise<O extends ToolSchema ? z.infer<O> : unknown>;

  /**
   * Whether this tool should be executed on the client side.
   * Returns true when no server-side execute handler is provided.
   */
  readonly isClientSide = (): boolean => {
    return typeof this.execute !== "function";
  };

  /**
   * Create a new tool
   */
  constructor(options: ToolOptions<T, O>) {
    if (!options.name) {
      throw new Error("Tool name is required");
    }
    if (!options.description) {
      const logger = new LoggerProxy({ component: "tool" });
      logger.warn(`Tool '${options.name}' created without a description`);
    }
    if (!options.parameters) {
      throw new Error(`Tool '${options.name}' parameters schema is required`);
    }

    this.id = options.id || uuidv4();
    this.name = options.name;
    this.description = options.description || "";
    this.parameters = options.parameters;
    this.outputSchema = options.outputSchema;
    this.execute = options.execute;
  }
}

/**
 * Helper function for creating a new tool
 */
export function createTool<T extends ToolSchema>(
  options: ToolOptions<T, undefined>,
): Tool<T, undefined>;
export function createTool<T extends ToolSchema, O extends ToolSchema>(
  options: ToolOptions<T, O>,
): Tool<T, O>;
export function createTool<T extends ToolSchema, O extends ToolSchema | undefined = undefined>(
  options: ToolOptions<T, O>,
): Tool<T, O> {
  return new Tool<T, O>(options);
}

/**
 * Alias for createTool function
 */
export const tool = createTool;
