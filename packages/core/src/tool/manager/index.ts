import type { Logger } from "@voltagent/internal";
import type { BaseTool } from "../../agent/providers/base/types";
import type { ApiToolInfo } from "../../agent/types";
import { getGlobalLogger } from "../../logger";
import { zodSchemaToJsonUI } from "../../utils/toolParser";
import type { AgentTool, ProviderTool, VercelTool } from "../index";
import type { Tool } from "../index";
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
 * ToDO add provider tools into toolkits
 */

export type ToolResult = {
  status: ToolStatus;
  result?: any;
  error?: any;
  input?: any;
};
/**
 * Type guard to check if an object is a VoltAgent Tool instance
 * to reliably distinguish our Tool instances from externally defined tools.
 */
function isBaseTool(tool: AgentTool | VercelTool): tool is Tool<any, any> {
  return "type" in tool && tool.type === "user-defined";
}

/**
 * Type guard for provider-defined tools
 * */
export function isProviderTool(tool: AgentTool | Toolkit | VercelTool): tool is ProviderTool {
  return "type" in tool && tool.type === "provider-defined";
}

/**
 * Type guard to check if an object is a Toolkit
 */
function isToolkit(item: AgentTool | Toolkit | VercelTool): item is Toolkit {
  // Check for the 'tools' array property which is specific to Toolkit
  return (item as Toolkit).tools !== undefined && Array.isArray((item as Toolkit).tools);
}

/**
 * Manager class to handle all tool-related operations, including Toolkits.
 */
export class ToolManager {
  /**
   * User tools managed by this manager.
   * Includes server-side and client-side tools (no server execute) managed separately from server-executable tools.
   */
  private baseTools: Map<string, BaseTool> = new Map();
  /**
   * Provider-defined tools managed by providers
   */
  private providerTools: Map<string, ProviderTool> = new Map();

  /**
   * Toolkits managed by this manager.
   */
  private toolkits: Map<string, Toolkit> = new Map();
  /**
   * Logger instance
   */
  private logger: Logger;

  /**
   * Creates a new ToolManager.
   * Accepts individual tools, provider-defined tools, and toolkits.
   */
  constructor(items: (AgentTool | VercelTool | Toolkit)[] = [], logger?: Logger) {
    this.logger = logger || getGlobalLogger().child({ component: "tool-manager" });
    this.addItems(items);
  }

  /**
   * Get all toolkits managed by this manager.
   */
  getToolkits(): Toolkit[] {
    return [...this.toolkits.values()]; // Return a copy
  }

  /**
   * Get provider-defined tools managed externally by providers.
   */
  getProviderTools(): ProviderTool[] {
    const results: ProviderTool[] = [...this.providerTools.values()];

    for (const toolkit of this.getToolkits()) {
      for (const tool of toolkit.tools) {
        if (isProviderTool(tool)) {
          results.push(tool);
        }
      }
    }

    return results;
  }

  addTool(tool: AgentTool | VercelTool): boolean {
    if (!("name" in tool)) {
      this.logger.warn(
        "[ToolManager] Tool name is missing. Skipping invalid tool in addTool:",
        tool,
      );
      return false;
    }

    if (this.findInToolkits(tool.name)) {
      this.logger.warn(
        `[ToolManager] Warning: Standalone tool name '${tool.name}' conflicts with a tool inside an existing toolkit.`,
      );
    }

    // existing tools with the same name will be overwritten
    if (isBaseTool(tool)) {
      this.baseTools.set(tool.name, tool);

      return true;
    }

    if (isProviderTool(tool)) {
      this.providerTools.set(tool.name, tool);

      return true;
    }

    // Other types of Vercel tools are not supported
    this.logger.error("Skipping unsupported tool type in addTool:", tool);

    return false;
  }

  hasTool(toolName: string): boolean {
    return this.baseTools.has(toolName) || this.providerTools.has(toolName);
  }

  /**
   * Add multiple tools or toolkits to the manager.
   */
  addItems(items: (AgentTool | VercelTool | Toolkit)[]): void {
    for (const item of items) {
      if (!("name" in item)) {
        this.logger.warn("Skipping invalid item in addItems:", item);
        continue;
      }

      if (isToolkit(item)) {
        this.addToolkit(item);
        continue;
      }

      this.addTool(item);
    }
  }

  /**
   * Get all individual tools and tools within toolkits as a flattened list.
   */
  getTools(): BaseTool[] {
    const allTools: BaseTool[] = [];
    for (const toolkit of this.getToolkits()) {
      allTools.push(...(toolkit.tools.filter((t) => !isProviderTool(t)) as BaseTool[]));
    }

    return [...allTools, ...this.baseTools.values()];
  }

  /**
   * Add a toolkit to the manager.
   * If a toolkit with the same name already exists, it will be replaced.
   * Also checks if any tool within the toolkit conflicts with existing standalone tools or tools in other toolkits.
   * @returns true if the toolkit was successfully added or replaced.
   */
  addToolkit(toolkit: Toolkit): boolean {
    // Check for name conflicts with standalone tools or tools in *other* toolkits
    for (const tool of toolkit.tools) {
      if (!("name" in tool) || !tool.name) {
        throw new Error(`Toolkit '${toolkit.name}' contains an invalid or unnamed tool.`);
      }

      // Skip provider-defined tools — providers manage them on their side
      if (!isProviderTool(tool) && !isBaseTool(tool)) {
        throw new Error(`Toolkit '${toolkit.name}' contains an unsupported tool.`);
      }

      // Check conflict only against standalone tools and tools in OTHER toolkits
      if (
        this.findInToolkits(tool.name) ||
        this.baseTools.has(tool.name) ||
        this.providerTools.has(tool.name)
      ) {
        this.logger.warn(
          `[ToolManager] Warning: Tool '${tool.name}' in toolkit '${toolkit.name}' conflicts with an existing tool. Toolkit not added/replaced.`,
        );
        return false;
      }
    }

    if (this.toolkits.has(toolkit.name)) {
      // Before replacing, ensure no name conflicts are introduced by the *new* toolkit's tools
      this.logger.debug(`Replaced toolkit: ${toolkit.name}`);
    } else {
      this.logger.debug(`Added toolkit: ${toolkit.name}`);
    }
    this.toolkits.set(toolkit.name, toolkit);

    return true;
  }

  findInToolkits(toolName: string): Tool | ProviderTool | false {
    for (const toolkit of this.toolkits.values()) {
      const tool = toolkit.tools.find((t) => (t as Tool).name === toolName);
      if (tool) {
        return tool as Tool | ProviderTool;
      }
    }

    return false;
  }
  /**
   * Remove a standalone tool by name. Does not remove tools from toolkits.
   * @returns true if the tool was removed, false if it wasn't found.
   */
  removeTool(toolName: string): boolean {
    const removedBaseTool = this.baseTools.delete(toolName);
    const removedProviderTool = this.providerTools.delete(toolName);
    const removed = removedBaseTool || removedProviderTool;
    if (removed) {
      this.logger.debug(`Removed tool: ${toolName}`);
    }
    return removed;
  }

  /**
   * Remove a toolkit by name.
   * @returns true if the toolkit was removed, false if it wasn't found.
   */
  removeToolkit(toolkitName: string): boolean {
    const removed = this.toolkits.delete(toolkitName);
    if (removed) {
      this.logger.debug(`Removed toolkit: ${toolkitName}`);
    }
    return removed;
  }

  /**
   * Combine static base tools with runtime tools (includes tools from toolkits).
   */
  combineStaticAndRuntimeBaseTools(runtimeTools?: (BaseTool | Toolkit)[]): BaseTool[] {
    // Start with existing tools
    let toolsToUse = this.getTools();

    if (runtimeTools?.length) {
      // Create a temporary manager to process dynamic items using the same logic as static items
      const tempManager = new ToolManager([], this.logger);
      tempManager.addItems(runtimeTools);

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
    /** Do we need to return all types of tools combined?
     * Including provider-defined tools which doesn't have even parameters?
     * */
    // Map the flattened list of tools for the API
    return this.getTools().map((tool) => ({
      name: tool.name,
      description: tool.description,
      // Use optional chaining for cleaner syntax
      parameters: tool.parameters ? zodSchemaToJsonUI(tool.parameters) : undefined,
    }));
  }
}
