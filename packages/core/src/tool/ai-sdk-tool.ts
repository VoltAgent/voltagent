import type { Context, ToolNeedsApprovalFunction } from "@ai-sdk/provider-utils";
import { tool as aiTool } from "ai";
import type { Tool as VercelTool } from "ai";
import type { ToolHooks } from "./index";

const VOLTAGENT_TOOL_METADATA_SYMBOL = Symbol.for("@voltagent/core.tool.metadata");
const VOLTAGENT_NAMED_AI_SDK_TOOL_SYMBOL = Symbol.for("@voltagent/core.tool.named-ai-sdk");
const VOLTAGENT_RAW_AI_SDK_TOOL_SYMBOL = Symbol.for("@voltagent/core.tool.raw-ai-sdk");

const metadataStore = new WeakMap<object, VoltAgentToolMetadata>();

export type VoltAgentToolMetadata<INPUT = unknown, OUTPUT = unknown> = {
  /**
   * Optional VoltAgent-facing tool name for display or metadata consumers.
   *
   * When the tool is registered in an AI SDK ToolSet, the object key remains
   * the execution name used by the model and tool calls.
   */
  name?: string;
  /**
   * Optional VoltAgent-facing purpose for display or metadata consumers.
   */
  purpose?: string;
  /**
   * Optional user-defined tags for organizing or routing tools.
   */
  tags?: string[];
  /**
   * Whether the tool requires approval before execution.
   */
  needsApproval?: boolean | ToolNeedsApprovalFunction<INPUT, any>;
  /**
   * Optional tool-specific hooks for lifecycle events.
   */
  hooks?: ToolHooks;
  /**
   * Free-form VoltAgent-only metadata. This is not sent to the model provider.
   */
  metadata?: Record<string, unknown>;
  /**
   * Reserved namespace for future API exposure customizations.
   */
  api?: Record<string, unknown>;
} & Record<never, OUTPUT>;

type VoltAgentBlockedAiSdkToolOption =
  | "contextSchema"
  | "runtimeContext"
  | "toolsContext"
  | "telemetry"
  | "experimental_telemetry";

export type VoltAgentToolDefinition<T extends VercelTool<any, any, any>> = Omit<
  T,
  VoltAgentBlockedAiSdkToolOption
> & {
  contextSchema?: never;
  runtimeContext?: never;
  toolsContext?: never;
  telemetry?: never;
  experimental_telemetry?: never;
  voltagent?: VoltAgentToolMetadata;
};

export type NamedAiSdkTool = {
  [VOLTAGENT_NAMED_AI_SDK_TOOL_SYMBOL]: true;
  name: string;
  displayName?: string;
  purpose?: string;
  description: string;
  parameters: unknown;
  inputSchema?: unknown;
  outputSchema?: unknown;
  tags?: string[];
  needsApproval?: boolean | ToolNeedsApprovalFunction<any, any>;
  providerOptions?: unknown;
  toModelOutput?: unknown;
  hooks?: ToolHooks;
  metadata?: Record<string, unknown>;
  execute?: unknown;
  isClientSide: () => boolean;
  type: "ai-sdk" | "provider";
  id?: string;
  args?: Record<string, unknown>;
  isProviderExecuted?: boolean;
  supportsDeferredResults?: boolean;
};

function setVoltAgentToolMetadata(target: object, metadata: VoltAgentToolMetadata): void {
  metadataStore.set(target, metadata);
  Object.defineProperty(target, VOLTAGENT_TOOL_METADATA_SYMBOL, {
    value: metadata,
    enumerable: false,
    configurable: false,
  });
}

export function getVoltAgentToolMetadata(tool: unknown): VoltAgentToolMetadata | undefined {
  if (!tool || typeof tool !== "object") {
    return undefined;
  }

  const stored = metadataStore.get(tool);
  if (stored) {
    return stored;
  }

  const symbolMetadata = (tool as { [VOLTAGENT_TOOL_METADATA_SYMBOL]?: VoltAgentToolMetadata })[
    VOLTAGENT_TOOL_METADATA_SYMBOL
  ];
  if (symbolMetadata) {
    return symbolMetadata;
  }

  const inlineMetadata = (tool as { voltagent?: VoltAgentToolMetadata }).voltagent;
  return inlineMetadata && typeof inlineMetadata === "object" ? inlineMetadata : undefined;
}

function getToolDescription(tool: VercelTool<any, any, any>): string {
  const description = (tool as { description?: unknown }).description;
  return typeof description === "string" ? description : "";
}

export function createNamedAiSdkTool(
  name: string,
  rawTool: VercelTool<any, any, any>,
): NamedAiSdkTool {
  const metadata = getVoltAgentToolMetadata(rawTool);
  const rawMetadata = (rawTool as { metadata?: unknown }).metadata;
  const providerType = (rawTool as { type?: unknown }).type === "provider";
  const descriptor: NamedAiSdkTool = {
    [VOLTAGENT_NAMED_AI_SDK_TOOL_SYMBOL]: true,
    name,
    displayName: metadata?.name,
    purpose: metadata?.purpose,
    description: getToolDescription(rawTool),
    parameters: (rawTool as { inputSchema?: unknown; args?: unknown }).inputSchema
      ? (rawTool as { inputSchema?: unknown }).inputSchema
      : (rawTool as { args?: unknown }).args,
    inputSchema: (rawTool as { inputSchema?: unknown }).inputSchema,
    outputSchema: (rawTool as { outputSchema?: unknown }).outputSchema,
    tags: metadata?.tags,
    needsApproval:
      metadata?.needsApproval ??
      (rawTool as { needsApproval?: NamedAiSdkTool["needsApproval"] }).needsApproval,
    providerOptions: (rawTool as { providerOptions?: unknown }).providerOptions,
    toModelOutput: (rawTool as { toModelOutput?: unknown }).toModelOutput,
    hooks: metadata?.hooks,
    metadata:
      rawMetadata && typeof rawMetadata === "object"
        ? (rawMetadata as Record<string, unknown>)
        : undefined,
    execute: (rawTool as { execute?: unknown }).execute,
    isClientSide: () => typeof (rawTool as { execute?: unknown }).execute !== "function",
    type: providerType ? "provider" : "ai-sdk",
    id:
      typeof (rawTool as { id?: unknown }).id === "string"
        ? (rawTool as { id: string }).id
        : undefined,
    args:
      (rawTool as { args?: unknown }).args &&
      typeof (rawTool as { args?: unknown }).args === "object"
        ? (rawTool as { args: Record<string, unknown> }).args
        : undefined,
    isProviderExecuted:
      typeof (rawTool as { isProviderExecuted?: unknown }).isProviderExecuted === "boolean"
        ? (rawTool as { isProviderExecuted: boolean }).isProviderExecuted
        : undefined,
    supportsDeferredResults:
      typeof (rawTool as { supportsDeferredResults?: unknown }).supportsDeferredResults ===
      "boolean"
        ? (rawTool as { supportsDeferredResults: boolean }).supportsDeferredResults
        : undefined,
  };

  Object.defineProperty(descriptor, VOLTAGENT_RAW_AI_SDK_TOOL_SYMBOL, {
    value: rawTool,
    enumerable: false,
    configurable: false,
  });

  if (metadata) {
    setVoltAgentToolMetadata(descriptor, metadata);
  }

  return descriptor;
}

export function isNamedAiSdkTool(value: unknown): value is NamedAiSdkTool {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as { [VOLTAGENT_NAMED_AI_SDK_TOOL_SYMBOL]?: boolean })[
        VOLTAGENT_NAMED_AI_SDK_TOOL_SYMBOL
      ],
  );
}

export function getRawAiSdkTool(tool: NamedAiSdkTool): VercelTool<any, any, any> {
  return (tool as unknown as { [VOLTAGENT_RAW_AI_SDK_TOOL_SYMBOL]: VercelTool<any, any, any> })[
    VOLTAGENT_RAW_AI_SDK_TOOL_SYMBOL
  ];
}

/**
 * AI SDK-compatible tool helper with a VoltAgent metadata namespace.
 *
 * The returned object is a regular AI SDK tool. VoltAgent metadata is stored
 * out-of-band so it is not sent to the model provider.
 */
export function tool<T extends VercelTool<any, any, Context>>(
  definition: VoltAgentToolDefinition<T>,
): T {
  const {
    voltagent,
    contextSchema: _contextSchema,
    runtimeContext: _runtimeContext,
    toolsContext: _toolsContext,
    telemetry: _telemetry,
    experimental_telemetry: _experimentalTelemetry,
    ...toolDefinition
  } = definition as VoltAgentToolDefinition<T> & {
    voltagent?: VoltAgentToolMetadata;
    contextSchema?: unknown;
    runtimeContext?: unknown;
    toolsContext?: unknown;
    telemetry?: unknown;
    experimental_telemetry?: unknown;
  };
  const createdTool = aiTool(toolDefinition as T) as T;
  if (voltagent) {
    setVoltAgentToolMetadata(createdTool as object, voltagent);
  }
  return createdTool;
}
