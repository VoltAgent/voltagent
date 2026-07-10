import type { ToolExecutionOptions } from "@ai-sdk/provider-utils";
import type { Logger } from "@voltagent/internal";
import type { Tool as AITool, ToolSet } from "ai";
import type { ApiToolInfo } from "../../agent/types";
import { zodSchemaToJsonUI } from "../../utils/toolParser";
import {
  type NamedAiSdkTool,
  type VoltAgentToolMetadata,
  createNamedAiSdkTool,
  getRawAiSdkTool,
  getVoltAgentToolMetadata,
  isNamedAiSdkTool,
} from "../ai-sdk-tool";
import type { AgentTool, ProviderTool, ToolExecutionResult, VercelTool } from "../index";
import type { Toolkit } from "../toolkit";
import { BaseToolManager } from "./BaseToolManager";
import { ToolkitManager } from "./ToolkitManager";

function getStringMetadataValue(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getStringArrayMetadataValue(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return normalized.length > 0 ? normalized : undefined;
}

function getExistingVoltAgentToolMetadata(tool: unknown): Record<string, unknown> {
  const existingMetadata =
    tool && typeof tool === "object"
      ? (tool as { metadata?: { voltagent?: unknown } }).metadata
      : undefined;
  const existingVoltAgentMetadata = existingMetadata?.voltagent;
  return existingVoltAgentMetadata && typeof existingVoltAgentMetadata === "object"
    ? (existingVoltAgentMetadata as Record<string, unknown>)
    : {};
}

function createVoltAgentToolMetadataPayload(
  metadata: VoltAgentToolMetadata | undefined,
  existingVoltAgentMetadata: Record<string, unknown> = {},
): Record<string, unknown> | undefined {
  const name = getStringMetadataValue(metadata?.name);
  const purpose = getStringMetadataValue(metadata?.purpose);
  const tags = getStringArrayMetadataValue(metadata?.tags);
  const userMetadata =
    metadata?.metadata && typeof metadata.metadata === "object" ? metadata.metadata : undefined;
  const api = metadata?.api && typeof metadata.api === "object" ? metadata.api : undefined;

  const payload: Record<string, unknown> = {
    ...existingVoltAgentMetadata,
    ...(name ? { name } : {}),
    ...(purpose ? { purpose } : {}),
    ...(tags ? { tags } : {}),
    ...(userMetadata ? { metadata: userMetadata } : {}),
    ...(api ? { api } : {}),
  };

  return Object.keys(payload).length > 0 ? payload : undefined;
}

function getToolTags(tool: unknown, metadata?: VoltAgentToolMetadata): string[] | undefined {
  return (
    getStringArrayMetadataValue(metadata?.tags) ??
    getStringArrayMetadataValue((tool as { tags?: unknown } | undefined)?.tags)
  );
}

export class ToolManager extends BaseToolManager<
  AgentTool | VercelTool | NamedAiSdkTool | Toolkit,
  ToolkitManager
> {
  private readonly aiSdkTools: Map<string, AITool<any, any, any>> = new Map();

  /**
   * Creates a new ToolManager.
   * Accepts individual tools, provider-defined tools, and toolkits.
   */
  constructor(items: (AgentTool | VercelTool | NamedAiSdkTool | Toolkit)[] = [], logger?: Logger) {
    super([], logger);
    this.addItems(items);
  }

  override addStandaloneTool(tool: AgentTool | VercelTool | NamedAiSdkTool): boolean {
    if (isNamedAiSdkTool(tool)) {
      return this.addAiSdkTool(tool.name, getRawAiSdkTool(tool));
    }

    return super.addStandaloneTool(tool);
  }

  override removeTool(toolName: string): boolean {
    const removedAiSdkTool = this.aiSdkTools.delete(toolName);
    const removed = super.removeTool(toolName) || removedAiSdkTool;
    if (removedAiSdkTool) {
      this.logger.debug(`Removed AI SDK tool: ${toolName}`);
    }
    return removed;
  }

  override getAllTools(): (AgentTool | ProviderTool | NamedAiSdkTool)[] {
    return [
      ...super.getAllTools(),
      ...Array.from(this.aiSdkTools.entries()).map(([name, tool]) =>
        createNamedAiSdkTool(name, tool),
      ),
    ];
  }

  override getToolByName(toolName: string): AgentTool | ProviderTool | NamedAiSdkTool | undefined {
    const tool = super.getToolByName(toolName);
    if (tool) {
      return tool;
    }
    const aiSdkTool = this.aiSdkTools.get(toolName);
    return aiSdkTool ? createNamedAiSdkTool(toolName, aiSdkTool) : undefined;
  }

  override getAllToolNames(): string[] {
    return Array.from(new Set([...super.getAllToolNames(), ...this.aiSdkTools.keys()]));
  }

  override hasToolInAny(toolName: string): boolean {
    return super.hasToolInAny(toolName) || this.aiSdkTools.has(toolName);
  }

  addToolSet(toolSet: ToolSet | undefined): void {
    if (!toolSet) {
      return;
    }

    for (const [name, tool] of Object.entries(toolSet)) {
      this.addAiSdkTool(name, tool as AITool<any, any, any>);
    }
  }

  private addAiSdkTool(name: string, tool: AITool<any, any, any>): boolean {
    if (!name) {
      this.logger.warn("[ToolManager] AI SDK tool name is missing. Skipping invalid tool.");
      return false;
    }

    if (this.hasToolInAny(name)) {
      this.logger.warn(
        `[ToolManager] Warning: AI SDK tool name '${name}' conflicts with an existing tool.`,
      );
    }

    this.aiSdkTools.set(name, tool);
    return true;
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
    createToolExecuteFunction: (
      tool: AgentTool,
    ) => (args: any, options?: ToolExecutionOptions<any>) => ToolExecutionResult<any>,
    createAiSdkToolExecuteFunction?: (
      name: string,
      tool: AITool<any, any, any>,
      metadata?: VoltAgentToolMetadata,
    ) => (args: any, options?: ToolExecutionOptions<any>) => ToolExecutionResult<any>,
  ): Record<string, any> {
    type ManagedTool = {
      description: string;
      inputSchema: AgentTool["parameters"];
      execute?: (args: any, options?: ToolExecutionOptions<any>) => ToolExecutionResult<any>;
      needsApproval?: AgentTool["needsApproval"];
      providerOptions?: AgentTool["providerOptions"];
      toModelOutput?: AgentTool["toModelOutput"];
      outputSchema?: AgentTool["outputSchema"];
    };

    const tools: Record<string, any> = {};

    for (const tool of this.getAllBaseTools()) {
      tools[tool.name] = {
        description: tool.description,
        inputSchema: tool.parameters, // AI SDK will convert this to JSON Schema internally
        needsApproval: tool.needsApproval,
        providerOptions: tool.providerOptions, // Pass provider-specific options to AI SDK
        toModelOutput: tool.toModelOutput, // Pass multi-modal output converter to AI SDK
        outputSchema: tool.outputSchema,
      };

      // client side tools don't have execute function
      if (tool.isClientSide()) {
        continue;
      }

      const managedTool = tools[tool.name] as ManagedTool;
      tools[tool.name] = {
        ...managedTool,
        description: tool.description,
        execute: createToolExecuteFunction(tool), // End of execute function
      };
    }

    // Pass through the provider tools untouched as they are
    const providerTools = this.getAllProviderTools();
    for (const tool of providerTools) {
      tools[tool.name] = tool;
    }

    for (const [name, tool] of this.aiSdkTools.entries()) {
      const metadata = getVoltAgentToolMetadata(tool);
      const preparedTool: Record<string, any> = { ...tool };
      const needsApproval =
        metadata?.needsApproval ?? (tool as { needsApproval?: unknown }).needsApproval;
      if (needsApproval !== undefined) {
        preparedTool.needsApproval = needsApproval;
      }
      const voltAgentMetadata = createVoltAgentToolMetadataPayload(
        metadata,
        getExistingVoltAgentToolMetadata(tool),
      );
      if (voltAgentMetadata) {
        preparedTool.metadata = {
          ...((tool as { metadata?: Record<string, unknown> }).metadata ?? {}),
          voltagent: voltAgentMetadata,
        };
      }
      if (
        typeof (tool as { execute?: unknown }).execute === "function" &&
        createAiSdkToolExecuteFunction
      ) {
        preparedTool.execute = createAiSdkToolExecuteFunction(name, tool, metadata);
      }
      tools[name] = preparedTool;
    }

    return tools;
  }

  /**
   * Get agent's tools (including those in toolkits) for API exposure.
   */
  getToolsForApi(): ApiToolInfo[] {
    return this.getAllTools().map((tool: AgentTool | ProviderTool | NamedAiSdkTool) => {
      const metadata = getVoltAgentToolMetadata(tool);
      const displayName = getStringMetadataValue(metadata?.name);
      const purpose = getStringMetadataValue(metadata?.purpose);
      const tags = getToolTags(tool, metadata);
      const voltagentMetadata = createVoltAgentToolMetadataPayload(
        metadata,
        getExistingVoltAgentToolMetadata(tool),
      );

      const apiTool: ApiToolInfo = {
        name: tool.name,
        description: tool.description || "",
        // Use optional chaining for cleaner syntax
        parameters:
          "parameters" in tool && (tool as any).parameters
            ? zodSchemaToJsonUI((tool as any).parameters)
            : undefined,
      };

      if (displayName) {
        apiTool.displayName = displayName;
      }
      if (purpose) {
        apiTool.purpose = purpose;
      }
      if (tags) {
        apiTool.tags = tags;
      }
      if (voltagentMetadata) {
        apiTool.metadata = {
          ...((tool as { metadata?: Record<string, unknown> }).metadata ?? {}),
          voltagent: voltagentMetadata,
        };
      }

      return apiTool;
    });
  }
}
