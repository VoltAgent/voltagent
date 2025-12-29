import type { Logger } from "@voltagent/internal";
import type { BaseTool } from "../../agent/providers/base/types";
import { getGlobalLogger } from "../../logger";
import type { AgentTool, ProviderTool, VercelTool } from "../index";
import type { Tool } from "../index";
import type { Toolkit } from "../toolkit";

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
  return "tools" in item && Array.isArray((item as any).tools);
}

export abstract class BaseToolManager<
  TItems extends AgentTool | VercelTool | Toolkit = AgentTool | VercelTool | Toolkit,
  TToolkitManager extends BaseToolManager<TItems, never> | never = BaseToolManager<TItems, never>,
> {
  /**
   * User tools managed by this manager.
   * Includes server-side and client-side tools (no server execute) managed separately from server-executable tools.
   */
  protected baseTools: Map<string, BaseTool> = new Map();
  /**
   * Provider-defined tools managed by providers
   */
  protected providerTools: Map<string, ProviderTool> = new Map();

  /**
   * Toolkits managed by this manager.
   */
  protected toolkits: Map<string, TToolkitManager> = new Map();
  /**
   * Logger instance
   */
  protected logger: Logger;

  /**
   * Creates a new ToolManager.
   * Accepts individual tools, provider-defined tools, and toolkits.
   */
  protected constructor(items: TItems[] = [], logger?: Logger) {
    this.logger = logger || getGlobalLogger().child({ component: "tool-manager" });
    this.addItems(items);
  }

  // ------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------

  /** Not all inheritances of BaseToolManager support toolkits - thus this is abstract */
  abstract addToolkit(toolkit: Toolkit): boolean;

  /**
   * Add multiple tools or toolkits to the manager.
   */
  addItems(items: TItems[]): void {
    for (const item of items) {
      if (!("name" in item)) {
        this.logger.warn("Skipping invalid item in addItems:", item);
        continue;
      }

      if (isToolkit(item)) {
        this.addToolkit(item);
        continue;
      }

      this.addStandaloneTool(item);
    }
  }

  addStandaloneTool(tool: AgentTool | VercelTool): boolean {
    if (!("name" in tool)) {
      this.logger.warn(
        "[ToolManager] Tool name is missing. Skipping invalid tool in addStandaloneTool:",
        tool,
      );
      return false;
    }

    if (this.hasToolInAny(tool.name)) {
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
    this.logger.error("Skipping unsupported tool type in addStandaloneTool:", tool);

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
   * Get all toolkits managed by this manager.
   */
  getToolkits(): TToolkitManager[] {
    return [...this.toolkits.values()]; // Return a copy
  }

  /**
   * Get standalone tools and standalone tools within toolkits as a flattened list.
   */
  getAllBaseTools(): BaseTool[] {
    return [
      ...this.baseTools.values(),
      ...this.getToolkits().flatMap((toolkit) => toolkit.getAllBaseTools()),
    ];
  }

  /**
   * Get provider-defined tools managed externally by providers.
   */
  getAllProviderTools(): ProviderTool[] {
    return [
      ...this.providerTools.values(),
      ...this.getToolkits().flatMap((toolkit) => toolkit.getAllProviderTools()),
    ];
  }

  /**
   * Get all kinds of tools, owned by this manager and inside toolkits as a flattened list.
   * */
  getAllTools(): (BaseTool | ProviderTool)[] {
    return [
      ...this.getStandaloneTools(),
      ...this.getToolkits().flatMap((toolkit) => toolkit.getAllTools()),
    ];
  }

  /**
   * Get names of all tools (standalone and inside toolkits), deduplicated.
   */
  getAllToolNames(): string[] {
    const names = [
      ...this.getStandaloneTools().map((tool) => tool.name),
      ...this.getToolkits().flatMap((toolkit) => toolkit.getAllToolNames()),
    ];

    return names;
  }

  // ------------------------------------------------------------
  // Helpers (protected/internal)
  // ------------------------------------------------------------

  /**
   * Returns tools owned directly by this manager (standalone tools), excluding tools inside toolkits.
   */
  protected getStandaloneTools(): (BaseTool | ProviderTool)[] {
    return [...this.baseTools.values(), ...this.providerTools.values()];
  }

  /**
   * Check if any tool with the given name exists in this manager or nested toolkits.
   */
  hasToolInAny(toolName: string): boolean {
    return (
      this.baseTools.has(toolName) ||
      this.providerTools.has(toolName) ||
      this.getToolkits().some((toolkit) => toolkit.hasToolInAny(toolName))
    );
  }
}
