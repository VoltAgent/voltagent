import type { Logger } from "@voltagent/internal";
import type { BaseTool, ToolExecuteOptions } from "../../agent/providers/base/types";
import type { ApiToolInfo } from "../../agent/types";
import { ActionType, LogEvents, buildToolLogMessage, getGlobalLogger } from "../../logger";
import { getEnvVar } from "../../utils/runtime";
import { zodSchemaToJsonUI } from "../../utils/toolParser";
import { type AgentTool, createTool } from "../index";
import type { Toolkit } from "../toolkit";

/**
 * Status of a tool at any given time
 */
export type ToolStatus = "idle" | "working" | "error" | "completed";

/**
 * Tool status information
 */
export type ToolStatusInfo = {
  name: string;
  status: ToolStatus;
  result?: any;
  error?: any;
  input?: any;
  output?: any;
  timestamp: Date;
  parameters?: any; // Tool parameter schema
};

/**
 * Type guard to check if an object is a Toolkit
 */
function isToolkit(item: AgentTool | Toolkit): item is Toolkit {
  // Check for the 'tools' array property which is specific to Toolkit
  return (item as Toolkit).tools !== undefined && Array.isArray((item as Toolkit).tools);
}

/**
 * Manager class to handle all tool-related operations, including Toolkits.
 */
export class ToolManager {
  /**
   * Standalone tools managed by this manager.
   */
  private tools: BaseTool[] = [];
  /**
   * Toolkits managed by this manager.
   */
  private toolkits: Toolkit[] = [];
  /**
   * Logger instance
   */
  private logger: Logger;

  /**
   * Creates a new ToolManager.
   * Accepts both individual tools and toolkits.
   */
  constructor(items: (AgentTool | Toolkit)[] = [], logger?: Logger) {
    this.logger = logger || getGlobalLogger().child({ component: "tool-manager" });
    this.addItems(items);
  }

  /**
   * Get all individual tools and tools within toolkits as a flattened list.
   */
  getTools(): BaseTool[] {
    const allTools = [...this.tools]; // Start with standalone tools
    for (const toolkit of this.toolkits) {
      // Add tools from the toolkit, converting them to BaseTool if necessary
      // Assuming Toolkit.tools are AgentTool or compatible (like Tool<T>)
      allTools.push(
        ...toolkit.tools.map(
          (tool) =>
            ({
              name: tool.name,
              description: tool.description || tool.name,
              parameters: tool.parameters,
              execute: tool.execute,
              outputSchema: tool.outputSchema,
            }) as BaseTool,
        ),
      ); // Explicit cast can help ensure compatibility
    }
    return allTools;
  }

  /**
   * Get all toolkits managed by this manager.
   */
  getToolkits(): Toolkit[] {
    return [...this.toolkits]; // Return a copy
  }

  /**
   * Add an individual tool to the manager.
   * If a standalone tool with the same name already exists, it will be replaced.
   * A warning is issued if the name conflicts with a tool inside a toolkit, but the standalone tool is still added/replaced.
   * @returns true if the tool was successfully added or replaced.
   */
  addTool(tool: AgentTool): boolean {
    if (!tool || !tool.name) {
      throw new Error("Cannot add an invalid or unnamed tool.");
    }

    // Check for conflict with tools *inside* toolkits and issue a warning
    const conflictsWithToolkitTool = this.toolkits.some((toolkit) =>
      toolkit.tools.some((t) => t.name === tool.name),
    );
    if (conflictsWithToolkitTool) {
      this.logger.warn(
        `[ToolManager] Warning: Standalone tool name '${tool.name}' conflicts with a tool inside an existing toolkit.`,
      );
    }

    // Convert AgentTool to BaseTool
    const baseTool = createTool({
      id: tool.id,
      name: tool.name,
      description: tool.description || tool.name,
      parameters: tool.parameters,
      execute: tool.execute,
      outputSchema: tool.outputSchema,
    });

    // Check if tool exists in the standalone list and replace or add
    const existingIndex = this.tools.findIndex((t) => t.name === tool.name);
    if (existingIndex !== -1) {
      // Replace the existing tool
      this.tools[existingIndex] = baseTool;
    } else {
      // Add the new tool
      this.tools.push(baseTool);
    }
    return true; // Always returns true on success (add or replace)
  }

  /**
   * Add a toolkit to the manager.
   * If a toolkit with the same name already exists, it will be replaced.
   * Also checks if any tool within the toolkit conflicts with existing standalone tools or tools in other toolkits.
   * @returns true if the toolkit was successfully added or replaced.
   */
  addToolkit(toolkit: Toolkit): boolean {
    if (!toolkit || !toolkit.name) {
      throw new Error("Toolkit must have a name.");
    }
    if (!toolkit.tools || !Array.isArray(toolkit.tools)) {
      throw new Error(`Toolkit '${toolkit.name}' must have a 'tools' array.`);
    }

    // Check for name conflicts with standalone tools or tools in *other* toolkits
    for (const tool of toolkit.tools) {
      if (!tool || !tool.name) {
        throw new Error(`Toolkit '${toolkit.name}' contains an invalid or unnamed tool.`);
      }
      if (!tool.execute || typeof tool.execute !== "function") {
        throw new Error(
          `Tool '${tool.name}' in toolkit '${toolkit.name}' must have an execute function`,
        );
      }
      // Check conflict only against standalone tools and tools in OTHER toolkits
      if (
        this.tools.some((t) => t.name === tool.name) ||
        this.toolkits
          .filter((tk) => tk.name !== toolkit.name)
          .some((tk) => tk.tools.some((t) => t.name === tool.name))
      ) {
        this.logger.warn(
          `[ToolManager] Warning: Tool '${tool.name}' in toolkit '${toolkit.name}' conflicts with an existing tool. Toolkit not added/replaced.`,
        );
        return false;
      }
    }

    const existingIndex = this.toolkits.findIndex((tk) => tk.name === toolkit.name);
    if (existingIndex !== -1) {
      // Before replacing, ensure no name conflicts are introduced by the *new* toolkit's tools
      // (This check is already done above, but double-checking can be safer depending on logic complexity)
      this.toolkits[existingIndex] = toolkit;
      this.logger.debug(`Replaced toolkit: ${toolkit.name}`);
    } else {
      this.toolkits.push(toolkit);
      this.logger.debug(`Added toolkit: ${toolkit.name}`);
    }
    return true;
  }

  /**
   * Add multiple tools or toolkits to the manager.
   */
  addItems(items: (AgentTool | Toolkit)[]): void {
    if (!items) return; // Handle null or undefined input
    for (const item of items) {
      // Basic validation of item
      if (!item || !("name" in item)) {
        this.logger.warn("Skipping invalid item in addItems:", item);
        continue;
      }

      if (isToolkit(item)) {
        // Ensure toolkit structure is valid before adding
        if (item.tools && Array.isArray(item.tools)) {
          this.addToolkit(item);
        } else {
          this.logger.warn(
            `[ToolManager] Skipping toolkit '${item.name}' due to missing or invalid 'tools' array.`,
          );
        }
      } else {
        this.addTool(item);
      }
    }
  }

  /**
   * Remove a standalone tool by name. Does not remove tools from toolkits.
   * @returns true if the tool was removed, false if it wasn't found.
   */
  removeTool(toolName: string): boolean {
    const initialLength = this.tools.length;
    this.tools = this.tools.filter((t) => t.name !== toolName);
    const removed = this.tools.length < initialLength;
    if (removed) {
      this.logger.debug(`Removed standalone tool: ${toolName}`);
    }
    return removed;
  }

  /**
   * Remove a toolkit by name.
   * @returns true if the toolkit was removed, false if it wasn't found.
   */
  removeToolkit(toolkitName: string): boolean {
    const initialLength = this.toolkits.length;
    this.toolkits = this.toolkits.filter((tk) => tk.name !== toolkitName);
    const removed = this.toolkits.length < initialLength;
    if (removed) {
      this.logger.debug(`Removed toolkit: ${toolkitName}`);
    }
    return removed;
  }

  /**
   * Prepare tools for text generation (includes tools from toolkits).
   */
  prepareToolsForGeneration(dynamicTools?: (BaseTool | Toolkit)[]): BaseTool[] {
    // Start with existing tools
    let toolsToUse = this.getTools();

    if (dynamicTools?.length) {
      // Create a temporary manager to process dynamic items using the same logic as static items
      const tempManager = new ToolManager([], this.logger);
      tempManager.addItems(dynamicTools);

      // Get all tools from the temp manager (handles both tools and toolkits)
      const dynamicToolsList = tempManager.getTools();

      // Combine with existing tools
      toolsToUse = [...toolsToUse, ...dynamicToolsList];
    }

    return toolsToUse;
  }

  /**
   * Get agent's tools (including those in toolkits) for API exposure.
   */
  getToolsForApi(): ApiToolInfo[] {
    // Map the flattened list of tools for the API
    return this.getTools().map((tool) => ({
      name: tool.name,
      description: tool.description,
      // Use optional chaining for cleaner syntax
      parameters: tool.parameters ? zodSchemaToJsonUI(tool.parameters) : undefined,
    }));
  }

  /**
   * Check if a tool with the given name exists (either standalone or in a toolkit).
   */
  hasTool(toolName: string): boolean {
    if (!toolName) return false;
    // Check standalone tools first
    if (this.tools.some((tool) => tool.name === toolName)) {
      return true;
    }
    // Check tools within toolkits
    return this.toolkits.some((toolkit) => toolkit.tools.some((tool) => tool.name === toolName));
  }

  /**
   * Get a tool by name (searches standalone tools and tools within toolkits).
   * @param toolName The name of the tool to get
   * @returns The tool (as BaseTool) or undefined if not found
   */
  getToolByName(toolName: string): BaseTool | undefined {
    if (!toolName) return undefined;
    // Find in standalone tools
    const standaloneTool = this.tools.find((tool) => tool.name === toolName);
    if (standaloneTool) {
      return standaloneTool;
    }
    // Find in toolkits
    for (const toolkit of this.toolkits) {
      const toolInToolkit = toolkit.tools.find((tool) => tool.name === toolName);
      if (toolInToolkit) {
        // Convert AgentTool/Tool<T> from toolkit to BaseTool format if needed
        // (Assuming the structure is compatible or already BaseTool-like)
        return {
          name: toolInToolkit.name,
          description: toolInToolkit.description || toolInToolkit.name,
          parameters: toolInToolkit.parameters,
          execute: toolInToolkit.execute,
          outputSchema: toolInToolkit.outputSchema,
        } as BaseTool;
      }
    }
    return undefined; // Not found
  }

  /**
   * Execute a tool by name
   * @param toolName The name of the tool to execute
   * @param args The arguments to pass to the tool
   * @param options Optional execution options like signal
   * @returns The result of the tool execution
   * @throws Error if the tool doesn't exist or fails to execute
   */
  async executeTool(
    toolName: string,
    args: unknown,
    options?: ToolExecuteOptions,
  ): Promise<unknown> {
    const tool = this.getToolByName(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    // Ensure the execute function exists on the found object
    if (typeof tool.execute !== "function") {
      throw new Error(`Tool '${toolName}' found but has no executable function.`);
    }

    // Create tool-specific logger
    const executionId = options?.toolCallId || crypto.randomUUID();
    const toolLogger = this.logger.child({
      component: `Tool:${toolName}`,
      toolName,
      executionId,
      agentId: options?.agentId,
      conversationId: options?.conversationId,
      userId: options?.userId,
    });

    const startTime = Date.now();

    // Log tool execution start
    toolLogger.trace(buildToolLogMessage(toolName, ActionType.START, "Starting execution"), {
      event: LogEvents.TOOL_EXECUTION_STARTED,
      toolName,
      executionId,
      agentId: options?.agentId,
      conversationId: options?.conversationId,
      userId: options?.userId,
      input: args,
    });

    try {
      // We assume the tool object retrieved by getToolByName has the correct execute signature
      const oc = options?.operationContext;
      const result = await tool.execute(args, oc);

      const duration = Date.now() - startTime;

      // Log successful execution
      toolLogger.trace(
        buildToolLogMessage(toolName, ActionType.COMPLETE, `Completed in ${duration}ms`),
        {
          event: LogEvents.TOOL_EXECUTION_COMPLETED,
          toolName,
          executionId,
          agentId: options?.agentId,
          conversationId: options?.conversationId,
          userId: options?.userId,
          duration,
          success: true,
          output: result,
        },
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log the specific error for better debugging
      toolLogger.error(
        buildToolLogMessage(
          toolName,
          ActionType.ERROR,
          error instanceof Error ? error.message : "Unknown error",
        ),
        {
          event: LogEvents.TOOL_EXECUTION_FAILED,
          toolName,
          executionId,
          userId: options?.userId,
          conversationId: options?.conversationId,
          agentId: options?.agentId,
          duration,
          success: false,
          error:
            error instanceof Error
              ? {
                  message: error.message,
                  type: error.constructor?.name || "Error",
                  // Include stack trace only in development
                  ...(getEnvVar("NODE_ENV") !== "production" && { stack: error.stack }),
                }
              : "Unknown error",
        },
      );

      // Re-throw a more informative error
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to execute tool ${toolName}: ${errorMessage}`);
    }
  }
}
