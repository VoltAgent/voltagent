import type { Logger } from "@voltagent/internal";
import type { AgentTool, VercelTool } from "../index";
import type { Toolkit } from "../toolkit";
import { BaseToolManager } from "./BaseToolManager";

export class ToolkitManager extends BaseToolManager<AgentTool | VercelTool, never> {
  /**
   * Constructor does not accept toolkits - only tools
   * */
  constructor(
    readonly name: string,
    items: (AgentTool | VercelTool)[] = [],
    /**
     * A brief description of what the toolkit does or what tools it contains.
     * Optional.
     */
    readonly description?: string,
    /**
     * Shared instructions for the LLM on how to use the tools within this toolkit.
     * These instructions are intended to be added to the system prompt if `addInstructions` is true.
     * Optional.
     */
    readonly instructions?: string,
    /**
     * Whether to automatically add the toolkit's `instructions` to the agent's system prompt.
     * If true, the instructions from individual tools within this toolkit might be ignored
     * by the Agent's system message generation logic to avoid redundancy.
     * Defaults to false.
     */
    readonly addInstructions: boolean = false,
    logger?: Logger,
  ) {
    super(items, logger);
  }

  /**
   * Toolkits are not supported inside a ToolkitManager (toolkits contain tools only).
   * Keep the same signature as BaseToolManager.addToolkit to preserve type compatibility,
   * but implement as a no-op (or warn) so callers won't crash.
   */
  addToolkit(toolkit: Toolkit): boolean {
    // No-op: toolkit management (nested toolkits) is not supported inside a toolkit.
    this.logger.warn(
      `addToolkit() called on ToolkitManager '${this.name}' - nested toolkits are not supported. Skipping '${toolkit?.name}'.`,
    );
    return false;
  }
}
