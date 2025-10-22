import type { ToolSchema } from "../agent/providers/base/types";
import { LoggerProxy } from "../logger";
import type { Tool, VercelTool } from "./index";

/**
 * Represents a collection of related tools with optional shared instructions.
 */
export type Toolkit = {
  /**
   * Unique identifier name for the toolkit. Used for management and potentially logging.
   */
  name: string;

  /**
   * A brief description of what the toolkit does or what tools it contains.
   * Optional.
   */
  description?: string;

  /**
   * Shared instructions for the LLM on how to use the tools within this toolkit.
   * These instructions are intended to be added to the system prompt if `addInstructions` is true.
   * Optional.
   */
  instructions?: string;

  /**
   * Whether to automatically add the toolkit's `instructions` to the agent's system prompt.
   * If true, the instructions from individual tools within this toolkit might be ignored
   * by the Agent's system message generation logic to avoid redundancy.
   * Defaults to false.
   */
  addInstructions?: boolean;

  /**
   * An array of Tool instances that belong to this toolkit.
   */
  tools: (Tool<ToolSchema> | VercelTool)[];
};

/**
 * Helper function for creating a new toolkit.
 * Provides default values and ensures the basic structure is met.
 *
 * @param options - The configuration options for the toolkit.
 * @returns A Toolkit object.
 */
export const createToolkit = (options: Toolkit): Toolkit => {
  if (!options.name) {
    throw new Error("Toolkit name is required");
  }
  if (!options.tools || options.tools.length === 0) {
    const logger = new LoggerProxy({ component: "toolkit" });
    logger.warn(`Toolkit '${options.name}' created without any tools`);
  }

  return {
    name: options.name,
    description: options.description || "", // Default empty description
    instructions: options.instructions,
    addInstructions: options.addInstructions || false, // Default to false
    tools: options.tools || [], // Default to empty array if not provided (though warned above)
  };
};
