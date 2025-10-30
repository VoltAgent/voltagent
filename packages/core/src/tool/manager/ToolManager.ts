import type { Logger } from "@voltagent/internal";
import type { ApiToolInfo } from "../../agent/types";
import { zodSchemaToJsonUI } from "../../utils/toolParser";
import type { AgentTool, ProviderTool, VercelTool } from "../index";
import type { Toolkit } from "../toolkit";
import { BaseToolManager } from "./BaseToolManager";
import { ToolkitManager } from "./ToolkitManager";

export class ToolManager extends BaseToolManager<AgentTool | VercelTool | Toolkit, ToolkitManager> {
  /**
   * Creates a new ToolManager.
   * Accepts individual tools, provider-defined tools, and toolkits.
   */
  constructor(items: (AgentTool | VercelTool | Toolkit)[] = [], logger?: Logger) {
    super(items, logger);
  }

  /**
   * Add a toolkit to the manager.
   * If a toolkit with the same name already exists, it will be replaced.
   * Also checks if any tool within the toolkit conflicts with existing standalone tools or tools in other toolkits.
   * @returns true if the toolkit was successfully added or replaced.
   */
  addToolkit(toolkit: Toolkit): boolean {
    const newToolkit = new ToolkitManager(
      toolkit.name,
      toolkit.tools,
      toolkit.description,
      toolkit.instructions,
      toolkit.addInstructions,
      this.logger,
    );
    if (this.toolkits.has(toolkit.name)) {
      this.logger.warn(`Toolkit with name '${toolkit.name}' already exists. Replacing it.`);
    }
    if (newToolkit.getAllToolNames().some((toolName) => this.hasToolInAny(toolName))) {
      this.logger.warn(
        `Toolkit '${toolkit.name}' contains tools that conflict with existing tools. Skipping addition.`,
      );
      return false;
    }
    this.toolkits.set(toolkit.name, newToolkit);

    return true;
  }

  public prepareToolsForExecution(
    createToolExecuteFunction: (tool: AgentTool) => (args: any) => Promise<any>,
  ): Record<string, any> {
    const tools: Record<
      string,
      | {
          description: string;
          inputSchema: any;
          execute?: (args: any) => Promise<any>;
        }
      | ProviderTool
    > = {};

    for (const tool of this.getAllBaseTools()) {
      tools[tool.name] = {
        description: tool.description,
        inputSchema: tool.parameters, // AI SDK will convert this to JSON Schema internally
      };

      // client side tools don't have execute function
      if (tool.isClientSide()) {
        continue;
      }

      tools[tool.name] = {
        ...tools[tool.name],
        execute: createToolExecuteFunction(tool), // End of execute function
      };
    }

    // Pass through the provider tools untouched as they are
    const providerTools = this.getAllProviderTools();
    for (const tool of providerTools) {
      tools[tool.name] = tool;
    }

    return tools;
  }

  /**
   * Get agent's tools (including those in toolkits) for API exposure.
   */
  getToolsForApi(): ApiToolInfo[] {
    return this.getAllTools().map((tool: AgentTool | ProviderTool) => ({
      name: tool.name,
      description: tool.description || "",
      // Use optional chaining for cleaner syntax
      parameters:
        "parameters" in tool && (tool as any).parameters
          ? zodSchemaToJsonUI((tool as any).parameters)
          : undefined,
    }));
  }
}
