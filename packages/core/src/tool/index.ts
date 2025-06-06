import { v4 as uuidv4 } from "uuid";
import type { z } from "zod";
import type { BaseTool, ToolExecuteOptions, ToolSchema } from "../agent/providers/base/types";
import devLogger from "../internal/dev-logger";

// Export ToolManager and related types
export { ToolManager, ToolStatus, ToolStatusInfo } from "./manager";
// Export Toolkit type and createToolkit function
export { type Toolkit, createToolkit } from "./toolkit";

/**
 * Tool definition compatible with Vercel AI SDK
 */
export type AgentTool = BaseTool;

/**
 * Tool options for creating a new tool
 */
export type ToolOptions<T extends ToolSchema = ToolSchema> = {
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
   * Function to execute when the tool is called
   */
  execute: (args: z.infer<T>, options?: ToolExecuteOptions) => Promise<unknown>;
};

/**
 * Tool class for defining tools that agents can use
 */
export class Tool<T extends ToolSchema = ToolSchema> /* implements BaseTool<z.infer<T>> */ {
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
   * Function to execute when the tool is called
   */
  readonly execute: (args: z.infer<T>, options?: ToolExecuteOptions) => Promise<unknown>;

  /**
   * Create a new tool
   */
  constructor(options: ToolOptions<T>) {
    if (!options.name) {
      throw new Error("Tool name is required");
    }
    if (!options.description) {
      devLogger.warn(`Tool '${options.name}' created without a description.`);
    }
    if (!options.parameters) {
      throw new Error(`Tool '${options.name}' parameters schema is required`);
    }
    if (!options.execute) {
      throw new Error(`Tool '${options.name}' execute function is required`);
    }

    this.id = options.id || uuidv4();
    this.name = options.name;
    this.description = options.description || "";
    this.parameters = options.parameters;
    this.execute = options.execute;
  }
}

/**
 * Helper function for creating a new tool
 */
export const createTool = <T extends ToolSchema>(options: ToolOptions<T>): Tool<T> => {
  return new Tool<T>(options);
};

/**
 * Alias for createTool function
 */
export const tool = createTool;
