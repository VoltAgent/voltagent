import type { Span } from "@opentelemetry/api";
import { P, match } from "ts-pattern";
import type { z } from "zod";
import { AgentEventEmitter } from "../events";
import type { EventStatus } from "../events";
import type { StandardEventData } from "../events/types";
import type {
  AgentErrorEvent,
  AgentStartEvent,
  AgentSuccessEvent,
  RetrieverErrorEvent,
  RetrieverStartEvent,
  RetrieverSuccessEvent,
  ToolErrorEvent,
  ToolStartEvent,
  ToolSuccessEvent,
} from "../events/types";
import {
  buildAgentLogMessage,
  buildToolLogMessage,
  buildRetrieverLogMessage,
  ActionType,
  buildLogContext,
  ResourceType,
} from "../logger/message-builder";
import { MemoryManager } from "../memory";
import type { BaseRetriever } from "../retriever/retriever";
import { AgentRegistry } from "../server/registry";
import type { VoltAgentExporter } from "../telemetry/exporter";
import type { Tool, Toolkit } from "../tool";
import { ToolManager } from "../tool";
import { zodSchemaToJsonUI } from "../utils/toolParser";
import type { ReasoningToolExecuteOptions } from "../tool/reasoning/types";
import { NodeType, createNodeId } from "../utils/node-utils";
import {
  type StreamEvent,
  streamEventForwarder,
  transformStreamEventToStreamPart,
} from "../utils/streams";
import type { Voice } from "../voice";
import { VoltOpsClient as VoltOpsClientClass } from "../voltops/client";
import type { VoltOpsClient } from "../voltops/client";
import type { PromptContent } from "../voltops/types";
import { type AgentHistoryEntry, HistoryManager } from "./history";
import { type AgentHooks, createHooks } from "./hooks";
import { endOperationSpan, endToolSpan, startOperationSpan, startToolSpan } from "./open-telemetry";
import type {
  BaseMessage,
  BaseTool,
  LLMProvider,
  StepWithContent,
  ToolExecuteOptions,
} from "./providers";
import { SubAgentManager } from "./subagent";
import type { SubAgentConfig } from "./subagent/types";
import type {
  AgentOptions,
  AgentStatus,
  CommonGenerateOptions,
  DynamicValue,
  DynamicValueOptions,
  GenerateObjectResponse,
  GenerateTextResponse,
  InternalGenerateOptions,
  ModelDynamicValue,
  ModelType,
  OperationContext,
  ProviderInstance,
  PublicGenerateOptions,
  StreamObjectFinishResult,
  StreamObjectOnFinishCallback,
  StreamObjectResponse,
  StreamOnErrorCallback,
  StreamTextFinishResult,
  StreamTextOnFinishCallback,
  StreamTextResponse,
  SupervisorConfig,
  SystemMessageResponse,
  ToolExecutionContext,
  VoltAgentError,
} from "./types";
import type { Logger } from "@voltagent/internal";
import { LogEvents, LoggerProxy, ensureBufferedLogger } from "../logger";

/**
 * Agent class for interacting with AI models
 */
export class Agent<TProvider extends { llm: LLMProvider<unknown> }> {
  /**
   * Unique identifier for the agent
   */
  readonly id: string;

  /**
   * Agent name
   */
  readonly name: string;

  /**
   * (sub)agent purpose. This is the purpose of a (sub)agent, that will be used to generate the system message for the supervisor agent, if not provided, the agent will use the `instructions` field to generate the system message.
   *
   * @example 'An agent for customer support'
   */
  readonly purpose?: string;

  /**
   * @deprecated Use `instructions` instead. Will be removed in a future version.
   */
  readonly description: string;

  /**
   * Agent instructions. This is the preferred field over `description`.
   */
  readonly instructions: string;

  /**
   * Dynamic instructions value (internal)
   */
  private readonly dynamicInstructions?: DynamicValue<string>;

  /**
   * Dynamic model value (internal)
   */
  private readonly dynamicModel?: DynamicValue<ModelType<TProvider>>;

  /**
   * Dynamic tools value (internal)
   */
  private readonly dynamicTools?: DynamicValue<(Tool<any> | Toolkit)[]>;

  /**
   * The LLM provider to use
   */
  readonly llm: ProviderInstance<TProvider>;

  /**
   * The AI model to use
   */
  readonly model: ModelType<TProvider>;

  /**
   * Hooks for agent lifecycle events
   */
  public hooks: AgentHooks;

  /**
   * Voice provider for the agent
   */
  readonly voice?: Voice;

  /**
   * Indicates if the agent should format responses using Markdown.
   */
  readonly markdown: boolean;

  /**
   * Maximum number of steps the agent can take before stopping
   */
  readonly maxSteps?: number;

  /**
   * Memory manager for the agent
   */
  protected memoryManager: MemoryManager;

  /**
   * Tool manager for the agent
   */
  protected toolManager: ToolManager;

  /**
   * Sub-agent manager for the agent
   */
  protected subAgentManager: SubAgentManager;

  /**
   * History manager for the agent
   */
  protected historyManager: HistoryManager;

  /**
   * Retriever for automatic RAG
   */
  private retriever?: BaseRetriever;

  /**
   * VoltOps client for this specific agent (optional)
   * Takes priority over global VoltOpsClient for prompt management
   */
  private readonly voltOpsClient?: VoltOpsClient;

  /**
   * Supervisor configuration for agents with subagents
   */
  private readonly supervisorConfig?: SupervisorConfig;

  /**
   * User-defined context passed at agent creation
   * Can be overridden during execution
   */
  private readonly defaultUserContext?: Map<string | symbol, unknown>;

  /**
   * Logger instance for this agent
   */
  readonly logger: Logger;

  /**
   * Create a new agent
   */
  constructor(
    options: AgentOptions &
      TProvider & {
        model: ModelDynamicValue<ModelType<TProvider>>;
        subAgents?: SubAgentConfig[]; // Updated to support new configuration
        maxHistoryEntries?: number;
        hooks?: AgentHooks;
        retriever?: BaseRetriever;
        voice?: Voice;
        markdown?: boolean;
        voltOpsClient?: VoltOpsClient;
      },
  ) {
    this.id = options.id || options.name;
    this.name = options.name;
    this.purpose = options.purpose;

    // Store dynamic values separately from resolved values
    this.dynamicInstructions =
      typeof options.instructions === "function"
        ? (options.instructions as DynamicValue<string>)
        : undefined;
    this.dynamicModel =
      typeof options.model === "function"
        ? (options.model as DynamicValue<ModelType<TProvider>>)
        : undefined;
    this.dynamicTools =
      typeof options.tools === "function"
        ? (options.tools as DynamicValue<(Tool<any> | Toolkit)[]>)
        : undefined;

    // Set default static values for backwards compatibility
    this.instructions =
      typeof options.instructions === "string" ? options.instructions : (options.description ?? "");
    this.description = this.instructions;
    this.llm = options.llm as ProviderInstance<TProvider>;
    this.model =
      typeof options.model === "function"
        ? ({} as ModelType<TProvider>) // Temporary placeholder, will be resolved dynamically
        : options.model;
    this.retriever = options.retriever;
    this.voice = options.voice;
    this.markdown = options.markdown ?? false;
    this.maxSteps = options.maxSteps;

    // Store VoltOps client for agent-specific prompt management
    this.voltOpsClient = options.voltOpsClient;

    // Store supervisor configuration if provided
    this.supervisorConfig = options.supervisorConfig;

    // Store user context if provided
    this.defaultUserContext = options.userContext;

    // Initialize logger - use provided logger or fall back to LoggerProxy
    if (options.logger) {
      // Wrap the provided logger to ensure it syncs to global buffer
      this.logger = ensureBufferedLogger(options.logger, {
        component: "agent",
        agentId: this.id,
        modelName: this.getModelName(),
      });
    } else {
      // Fall back to LoggerProxy for lazy evaluation
      this.logger = new LoggerProxy({
        component: "agent",
        agentId: this.id,
        modelName: this.getModelName(),
      });
    }

    // Log agent creation
    this.logger.debug(`Agent created: ${this.name}`, {
      event: LogEvents.AGENT_CREATED,
      agentId: this.id,
      model: this.getModelName(),
      hasTools: !!options.tools,
      hasMemory: options.memory !== false,
      hasSubAgents: !!(options.subAgents && options.subAgents.length > 0),
    });

    // Initialize hooks
    if (options.hooks) {
      this.hooks = options.hooks;
    } else {
      this.hooks = createHooks();
    }

    // Initialize memory manager
    this.memoryManager = new MemoryManager(
      this.id,
      options.memory,
      options.memoryOptions || {},
      options.historyMemory,
      this.logger,
    );

    // Initialize tool manager with empty array if dynamic, will be resolved later
    const staticTools = typeof options.tools === "function" ? [] : options.tools || [];
    this.toolManager = new ToolManager(staticTools, this.logger);

    // Initialize sub-agent manager
    this.subAgentManager = new SubAgentManager(this.name, options.subAgents || []);

    // Initialize history manager with VoltOpsClient or legacy telemetryExporter support
    let chosenExporter: VoltAgentExporter | undefined;

    // NEW: Handle unified VoltOps client
    if (options.voltOpsClient) {
      if (options.voltOpsClient.observability) {
        chosenExporter = options.voltOpsClient.observability;
        this.logger.debug("VoltOpsClient initialized with observability and prompt management");
      }
    }
    // DEPRECATED: Handle old telemetryExporter (for backward compatibility)
    else if (options.telemetryExporter) {
      this.logger.warn(
        `⚠️  DEPRECATION WARNING: 'telemetryExporter' parameter is deprecated!
   
   🔄 MIGRATION REQUIRED:
   ❌ OLD: telemetryExporter: new VoltAgentExporter({ ... })
   ✅ NEW: voltOpsClient: new VoltOpsClient({ publicKey: "...", secretKey: "..." })
   
   📖 Complete migration guide:
   ${options.voltOpsClient ? "" : "http://localhost:3000/docs/observability/developer-console/#migration-guide-from-telemetryexporter-to-voltopsclient"}
   
   ✨ Benefits of VoltOpsClient:
   • Unified observability + prompt management  
   • Dynamic prompts from console
   `,
      );
      chosenExporter = options.telemetryExporter;
    }
    // Fallback to global exporter
    else {
      chosenExporter = AgentRegistry.getInstance().getGlobalVoltAgentExporter();
    }

    this.historyManager = new HistoryManager(
      this.id,
      this.memoryManager,
      options.maxHistoryEntries || 0,
      chosenExporter,
      this.logger,
    );
  }

  /**
   * Resolve dynamic instructions based on user context
   */
  private async resolveInstructions(
    options: DynamicValueOptions,
    operationContext?: OperationContext,
  ): Promise<string | PromptContent> {
    if (!this.dynamicInstructions) return this.instructions;
    if (typeof this.dynamicInstructions === "function") {
      const logger = operationContext?.logger || this.logger;

      // Always provide prompts helper - user can choose to use it or not
      const promptHelper = VoltOpsClientClass.createPromptHelperWithFallback(
        this.id,
        this.name,
        this.instructions,
        this.voltOpsClient,
      );
      const enhancedOptions = { ...options, prompts: promptHelper };
      const result = await this.dynamicInstructions(enhancedOptions);

      // If result is a PromptContent object from VoltOps, return it as-is
      if (typeof result === "object" && result !== null && "type" in result) {
        const promptContent = result as PromptContent;
        logger.debug(
          buildAgentLogMessage(
            this.name,
            "dynamic-instructions-complete",
            "resolved VoltOps prompt",
          ),
          {
            agentId: this.id,
            prompt: promptContent,
          },
        );
        return promptContent;
      }

      logger.debug(
        buildAgentLogMessage(
          this.name,
          "dynamic-instructions-complete",
          "resolved dynamic instructions",
        ),
        {
          prompt: result,
        },
      );
      return result;
    }
    return this.dynamicInstructions;
  }

  /**
   * Resolve dynamic model based on user context
   */
  private async resolveModel(options: DynamicValueOptions): Promise<ModelType<TProvider>> {
    if (!this.dynamicModel) return this.model;
    if (typeof this.dynamicModel === "function") {
      return await (
        this.dynamicModel as (
          options: DynamicValueOptions,
        ) => Promise<ModelType<TProvider>> | ModelType<TProvider>
      )(options);
    }
    return this.dynamicModel;
  }

  /**
   * Resolve dynamic tools based on user context
   */
  private async resolveTools(options: DynamicValueOptions): Promise<(Tool<any> | Toolkit)[]> {
    if (!this.dynamicTools) return [];
    if (typeof this.dynamicTools === "function") {
      return await this.dynamicTools(options);
    }
    return this.dynamicTools;
  }

  /**
   * Generate a human-readable description for a stream step
   */
  private getStepDescription(step: StepWithContent, stepData: { text: string }): string {
    switch (step.type) {
      case "text":
        return `Text generation completed (${stepData.text.length} chars)`;
      case "tool_call":
        return `Tool call initiated: ${step.name}`;
      case "tool_result":
        return `Tool result received: ${step.name}`;
      default:
        return "Processing stream step";
    }
  }

  /**
   * Get the system message for the agent
   */
  protected async getSystemMessage({
    input,
    historyEntryId,
    contextMessages,
    operationContext,
  }: {
    input?: string | BaseMessage[];
    historyEntryId: string;
    contextMessages: BaseMessage[];
    operationContext?: OperationContext;
  }): Promise<SystemMessageResponse> {
    // Resolve dynamic instructions based on user context
    const promptHelper = VoltOpsClientClass.createPromptHelperWithFallback(
      this.id,
      this.name,
      this.instructions,
      this.voltOpsClient,
    );
    const dynamicValueOptions: DynamicValueOptions = {
      userContext: operationContext?.userContext || new Map(),
      prompts: promptHelper,
    };
    const resolvedInstructions = await this.resolveInstructions(
      dynamicValueOptions,
      operationContext,
    );

    // Get retriever context if available (needed for both chat and text types)
    let retrieverContext: string | null = null;
    if (this.retriever && input && historyEntryId) {
      retrieverContext = await this.getRetrieverContext(input, historyEntryId, operationContext);
    }

    // Handle chat type prompts first - these return BaseMessage[]
    if (typeof resolvedInstructions === "object" && resolvedInstructions.type === "chat") {
      if (!resolvedInstructions.messages || resolvedInstructions.messages.length === 0) {
        // Fallback to default instructions if chat messages are empty
        let fallbackContent = `You are ${this.name}. ${this.instructions}`;

        // Add retriever context to fallback
        if (retrieverContext) {
          fallbackContent = `${fallbackContent}\n\nRelevant Context:\n${retrieverContext}`;
        }

        return {
          systemMessages: {
            role: "system",
            content: fallbackContent,
          },
          promptMetadata: resolvedInstructions.metadata,
          isDynamicInstructions: typeof this.dynamicInstructions === "function",
        };
      }

      // For chat type with messages, add retriever context to the last system message or create a new one
      const messagesWithContext = [...resolvedInstructions.messages];

      if (retrieverContext) {
        // Find the last system message and append context, or create a new system message
        const lastSystemIndex = messagesWithContext
          .map((m, i) => ({ message: m, index: i }))
          .filter(({ message }) => message.role === "system")
          .pop()?.index;

        if (lastSystemIndex !== undefined) {
          // Append to the last system message
          const lastSystemMessage = messagesWithContext[lastSystemIndex];
          messagesWithContext[lastSystemIndex] = {
            ...lastSystemMessage,
            content: `${lastSystemMessage.content}\n\nRelevant Context:\n${retrieverContext}`,
          };
        } else {
          // No system message exists, add a new one with context
          messagesWithContext.push({
            role: "system",
            content: `Relevant Context:\n${retrieverContext}`,
          });
        }
      }

      return {
        systemMessages: messagesWithContext,
        promptMetadata: resolvedInstructions.metadata,
        isDynamicInstructions: typeof this.dynamicInstructions === "function",
      };
    }

    // Handle text type (either string or PromptContent with text)
    let baseInstructions = "";
    let promptMetadata: any = null;

    if (typeof resolvedInstructions === "string") {
      baseInstructions = resolvedInstructions || "";
    } else if (typeof resolvedInstructions === "object" && resolvedInstructions.type === "text") {
      baseInstructions = resolvedInstructions.text || "";
      // ✅ Capture metadata from PromptContent
      promptMetadata = resolvedInstructions.metadata;
    } else {
      // Fallback to default instructions
      baseInstructions = this.instructions || "";
    }

    // --- Add Instructions from Toolkits --- (Simplified Logic)
    let toolInstructions = "";
    // Get only the toolkits
    const toolkits = this.toolManager.getToolkits();
    for (const toolkit of toolkits) {
      // Check if the toolkit wants its instructions added
      if (toolkit.addInstructions && toolkit.instructions) {
        // Append toolkit instructions
        // Using a simple newline separation for now.
        toolInstructions += `\n\n${toolkit.instructions}`;
      }
    }
    if (toolInstructions) {
      baseInstructions = `${baseInstructions}${toolInstructions}`;
    }
    // --- End Add Instructions from Toolkits ---

    // Add Markdown Instruction if Enabled
    if (this.markdown) {
      baseInstructions = `${baseInstructions}\n\nUse markdown to format your answers.`;
    }

    let finalInstructions = baseInstructions;

    // Add retriever context for text type prompts
    if (retrieverContext) {
      finalInstructions = `${finalInstructions}\n\nRelevant Context:\n${retrieverContext}`;
    }

    // If the agent has sub-agents, generate supervisor system message
    if (this.subAgentManager.hasSubAgents()) {
      // Fetch recent agent history for the sub-agents
      const agentsMemory = await this.prepareAgentsMemory(contextMessages);

      // Generate the supervisor message with the agents memory inserted
      finalInstructions = this.subAgentManager.generateSupervisorSystemMessage(
        finalInstructions,
        agentsMemory,
        this.supervisorConfig,
      );

      return {
        systemMessages: {
          role: "system",
          content: finalInstructions,
        },
        promptMetadata,
        isDynamicInstructions: typeof this.dynamicInstructions === "function",
      };
    }

    return {
      systemMessages: {
        role: "system",
        content: `You are ${this.name}. ${finalInstructions}`,
      },
      promptMetadata,
      isDynamicInstructions: typeof this.dynamicInstructions === "function",
    };
  }

  /**
   * Prepare agents memory for the supervisor system message
   * This fetches and formats recent interactions with sub-agents
   */
  private async prepareAgentsMemory(contextMessages: BaseMessage[]): Promise<string> {
    try {
      // Get all sub-agents
      const subAgents = this.subAgentManager.getSubAgents();
      if (subAgents.length === 0) return "";

      // Format the agent histories into a readable format
      const formattedMemory = contextMessages
        .filter((p) => p.role !== "system")
        .filter((p) => p.role === "assistant" && !p.content.toString().includes("toolCallId"))
        .map((message) => {
          return `${message.role}: ${message.content}`;
        })
        .join("\n\n");

      return formattedMemory || "No previous agent interactions found.";
    } catch (error) {
      this.logger.warn("Error preparing agents memory", { error });
      return "Error retrieving agent history.";
    }
  }

  /**
   * Add input to messages array based on type
   */
  private async formatInputMessages(
    messages: BaseMessage[],
    input: string | BaseMessage[],
  ): Promise<BaseMessage[]> {
    if (typeof input === "string") {
      // Add user message to the messages array
      return [
        ...messages,
        {
          role: "user",
          content: input,
        },
      ];
    }
    // Add all message objects directly
    return [...messages, ...input];
  }

  /**
   * Calculate maximum number of steps based on sub-agents
   */
  private calculateMaxSteps(): number {
    return this.subAgentManager.calculateMaxSteps(this.maxSteps);
  }

  /**
   * Prepare common options for text generation
   */
  private async prepareTextOptions(
    options: CommonGenerateOptions & {
      internalStreamForwarder?: (event: StreamEvent) => Promise<void>;
      logger?: Logger;
    } = {},
  ): Promise<{
    tools: BaseTool[];
    maxSteps: number;
  }> {
    const {
      tools: dynamicTools,
      maxSteps: optionsMaxSteps,
      historyEntryId,
      operationContext,
      internalStreamForwarder,
      logger,
    } = options;

    // Resolve dynamic tools if available
    let resolvedTools: (Tool<any> | Toolkit)[] = [];
    if (operationContext) {
      const promptHelper = VoltOpsClientClass.createPromptHelperWithFallback(
        this.id,
        this.name,
        this.instructions,
        this.voltOpsClient,
      );
      const dynamicValueOptions: DynamicValueOptions = {
        userContext: operationContext.userContext || new Map(),
        prompts: promptHelper,
      };
      resolvedTools = await this.resolveTools(dynamicValueOptions);
    }

    // Merge resolved tools with any provided dynamic tools
    const allTools = [...resolvedTools, ...(dynamicTools || [])];
    const baseTools = this.toolManager.prepareToolsForGeneration(
      allTools.length > 0 ? allTools : undefined,
    );

    // Emit tools update event if we have dynamic tools
    if (this.dynamicTools && resolvedTools.length > 0) {
      // Convert baseTools to API format
      const allToolsForUpdate = baseTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters ? zodSchemaToJsonUI(tool.parameters) : undefined,
      }));

      // Update history entry metadata with the new agent state that includes resolved tools
      if (historyEntryId && this.historyManager) {
        const updatedAgentSnapshot = this.getFullState();
        this.historyManager.updateEntry(historyEntryId, {
          metadata: {
            agentSnapshot: {
              ...updatedAgentSnapshot,
              tools: allToolsForUpdate, // Include resolved tools in the snapshot
            },
          },
        });
      }
    }

    // Ensure operationContext exists before proceeding
    if (!operationContext) {
      this.logger.warn(
        "Missing operationContext in prepareTextOptions. Tool execution context might be incomplete.",
        { agentId: this.id },
      );
      // Potentially handle this case more gracefully, e.g., throw an error or create a default context
    }

    // Create the ToolExecutionContext
    const toolExecutionContext: ToolExecutionContext = {
      operationContext: operationContext, // Pass the extracted context
      agentId: this.id,
      historyEntryId: historyEntryId || "unknown", // Fallback for historyEntryId
    };

    // Wrap ALL tools to inject ToolExecutionContext
    const toolsToUse = baseTools.map((tool) => {
      const originalExecute = tool.execute;
      return {
        ...tool,
        execute: async (args: unknown, execOptions?: ToolExecuteOptions): Promise<unknown> => {
          // Merge the base toolExecutionContext with any specific execOptions
          // execOptions provided by the LLM provider might override parts of the context
          // if needed, but typically we want to ensure our core context is passed.
          const finalExecOptions: ToolExecuteOptions = {
            ...toolExecutionContext, // Inject the context here
            ...execOptions, // Allow provider-specific options to be included
          };

          // Tool execution will be logged in Stream Step Change, no need for separate log

          try {
            // Specifically handle Reasoning Tools if needed (though context is now injected for all)
            if (tool.name === "think" || tool.name === "analyze") {
              // Reasoning tools expect ReasoningToolExecuteOptions, which includes agentId and historyEntryId
              // These are already present in finalExecOptions via toolExecutionContext
              const reasoningOptions: ReasoningToolExecuteOptions =
                finalExecOptions as ReasoningToolExecuteOptions; // Cast should be safe here

              if (
                !reasoningOptions.historyEntryId ||
                reasoningOptions.historyEntryId === "unknown"
              ) {
                this.logger.warn(
                  `Executing reasoning tool '${tool.name}' without a known historyEntryId within the operation context.`,
                  { toolName: tool.name, agentId: this.id },
                );
              }
              // Pass the correctly typed options
              const result = await originalExecute(args, reasoningOptions);

              // Tool execution already logged in Stream Step Change

              return result;
            }

            // Execute regular tools with the injected context
            const result = await originalExecute(args, finalExecOptions);

            // Tool execution already logged in Stream Step Change

            return result;
          } catch (error) {
            const errorLogger = logger || this.logger;
            errorLogger.error(
              buildToolLogMessage(
                tool.name,
                ActionType.TOOL_ERROR,
                `Execution failed: ${error instanceof Error ? error.message : String(error)}`,
              ),
              {
                event: LogEvents.TOOL_EXECUTION_FAILED,
                toolName: tool.name,
                agentId: this.id,
                modelName: this.getModelName(),
                error: error instanceof Error ? error.message : error,
              },
            );
            throw error;
          }
        },
      };
    });

    // If this agent has sub-agents, always create a new delegate tool with current historyEntryId
    if (this.subAgentManager.hasSubAgents()) {
      // Create a real-time event forwarder for SubAgent events
      const forwardEvent = async (event: StreamEvent) => {
        // Don't log sub-agent events here - they are handled separately

        // Use the utility function to forward events for timeline
        if (internalStreamForwarder) {
          await streamEventForwarder(event, {
            forwarder: internalStreamForwarder,
            types: ["tool-call", "tool-result"],
            addSubAgentPrefix: true,
          });
        }
      };

      // Always create a delegate tool with the current operationContext
      const delegateTool = this.subAgentManager.createDelegateTool({
        sourceAgent: this,
        currentHistoryEntryId: historyEntryId,
        operationContext: options.operationContext,
        forwardEvent, // Pass the real-time event forwarder for timeline events
        // Pass effective maxSteps (options override or agent default)
        maxSteps: optionsMaxSteps ?? this.calculateMaxSteps(),
        ...options,
      });

      // Replace existing delegate tool if any
      const delegateIndex = toolsToUse.findIndex((tool) => tool.name === "delegate_task");
      if (delegateIndex >= 0) {
        toolsToUse[delegateIndex] = delegateTool;
      } else {
        toolsToUse.push(delegateTool);

        // Add the delegate tool to the tool manager only if it doesn't exist yet
        // This logic might need refinement if delegate tool should always be added/replaced
        // For now, assume adding if not present is correct.
        // this.toolManager.addTools([delegateTool]); // Re-consider if this is needed or handled by prepareToolsForGeneration
      }
    }

    return {
      tools: toolsToUse,
      maxSteps: optionsMaxSteps ?? this.calculateMaxSteps(),
    };
  }

  /**
   * Get logger with parent context if available
   */
  protected getContextualLogger(parentAgentId?: string, parentHistoryEntryId?: string): Logger {
    if (parentAgentId) {
      const parentAgent = AgentRegistry.getInstance().getAgent(parentAgentId);
      if (parentAgent) {
        // Create child logger with parent context and parentExecutionId
        const childLogger = this.logger.child({
          parentAgentId,
          isSubAgent: true,
          delegationDepth: this.calculateDelegationDepth(parentAgentId),
          // Add parentExecutionId directly to sub-agent's logger
          ...(parentHistoryEntryId && {
            parentExecutionId: parentHistoryEntryId,
          }),
        });

        // Return the child logger directly without forwarding
        // This ensures all sub-agent logs have parentExecutionId
        return childLogger;
      }
    }
    return this.logger;
  }

  /**
   * Calculate delegation depth by traversing parent chain
   */
  private calculateDelegationDepth(parentAgentId: string | undefined): number {
    if (!parentAgentId) return 0;

    let depth = 1;
    let currentParentId = parentAgentId;
    const visited = new Set<string>();

    while (currentParentId) {
      if (visited.has(currentParentId)) break; // Prevent infinite loops
      visited.add(currentParentId);

      const parentIds = AgentRegistry.getInstance().getParentAgentIds(currentParentId);
      if (parentIds.length > 0) {
        depth++;
        currentParentId = parentIds[0]; // Follow first parent
      } else {
        break;
      }
    }

    return depth;
  }

  /**
   * Initialize a new history entry
   * @param input User input
   * @param initialStatus Initial status
   * @param options Options including parent context
   * @returns Created operation context
   */
  private async initializeHistory(
    input: string | BaseMessage[],
    initialStatus: AgentStatus = "working",
    options: {
      parentAgentId?: string;
      parentHistoryEntryId?: string;
      operationName: string;
      userContext?: Map<string | symbol, unknown>;
      userId?: string;
      conversationId?: string;
      parentOperationContext?: OperationContext;
      signal?: AbortSignal;
    } = {
      operationName: "unknown",
    },
  ): Promise<OperationContext> {
    const otelSpan = startOperationSpan({
      agentId: this.id,
      agentName: this.name,
      operationName: options.operationName,
      parentAgentId: options.parentAgentId,
      parentHistoryEntryId: options.parentHistoryEntryId,
      modelName: this.getModelName(),
    });

    const historyEntry = await this.historyManager.addEntry({
      input,
      output: "",
      status: initialStatus,
      steps: [],
      options: {
        metadata: {
          agentSnapshot: this.getFullState(),
        },
      },
      userId: options.userId,
      conversationId: options.conversationId,
      model: this.getModelName(),
    });

    // Create contextual logger for this operation
    const contextualLogger = this.getContextualLogger(
      options.parentAgentId,
      options.parentHistoryEntryId,
    );
    const methodLogger = contextualLogger.child({
      userId: options.userId,
      conversationId: options.conversationId,
      executionId: historyEntry.id,
      operationName: options.operationName,
      // Preserve parent execution ID if present in contextual logger
      ...(options.parentHistoryEntryId && {
        parentExecutionId: options.parentHistoryEntryId,
      }),
    });

    const opContext: OperationContext = {
      operationId: historyEntry.id,
      userContext:
        (options.parentOperationContext?.userContext ||
          options.userContext ||
          this.defaultUserContext) ??
        new Map<string | symbol, unknown>(),
      historyEntry,
      isActive: true,
      parentAgentId: options.parentAgentId,
      parentHistoryEntryId: options.parentHistoryEntryId,
      otelSpan: otelSpan,
      logger: methodLogger,
      // Use parent's conversationSteps if available (for SubAgents), otherwise create new array
      conversationSteps: options.parentOperationContext?.conversationSteps || [],
      // Inherit signal from parent context or use provided signal
      signal: options.parentOperationContext?.signal || options.signal,
    };

    return opContext;
  }

  /**
   * Get full agent state including tools status
   */
  public getFullState() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      instructions:
        typeof this.dynamicInstructions === "function" ? "Dynamic instructions" : this.instructions,
      status: "idle",
      model: this.getModelName(),
      // Create a node representing this agent
      node_id: createNodeId(NodeType.AGENT, this.id),

      tools: this.toolManager.getTools().map((tool) => ({
        ...tool,
        node_id: createNodeId(NodeType.TOOL, tool.name, this.id),
      })),

      // Add node_id to SubAgents
      subAgents: this.subAgentManager.getSubAgentDetails().map((subAgent) => ({
        ...subAgent,
        node_id: createNodeId(NodeType.SUBAGENT, subAgent.id),
      })),

      memory: {
        ...this.memoryManager.getMemoryState(),
        node_id: createNodeId(NodeType.MEMORY, this.id),
      },

      retriever: this.retriever
        ? {
            name: this.retriever.tool.name,
            description: this.retriever.tool.description,
            status: "idle", // Default status
            node_id: createNodeId(NodeType.RETRIEVER, this.retriever.tool.name, this.id),
          }
        : null,
    };
  }

  /**
   * Get agent's history
   */
  public async getHistory(): Promise<AgentHistoryEntry[]> {
    return await this.historyManager.getEntries();
  }

  /**
   * Add step to history immediately and to conversation steps
   */
  private addStepToHistory(step: StepWithContent, context: OperationContext): void {
    this.historyManager.addStepsToEntry(context.historyEntry.id, [step]);

    // Also track in conversation steps for hook messages
    if (!context.conversationSteps) {
      context.conversationSteps = [];
    }

    const finalStep = {
      ...step,
      ...match(context)
        .with({ parentAgentId: P.not(P.nullish) }, () => ({
          subAgentId: this.id,
          subAgentName: this.name,
        }))
        .otherwise(() => ({})),
    };

    context.conversationSteps.push(finalStep);
  }

  /**
   * Update history entry
   */
  private updateHistoryEntry(context: OperationContext, updates: Partial<AgentHistoryEntry>): void {
    this.historyManager.updateEntry(context.historyEntry.id, updates);
  }

  /**
   * Fix delete operator usage for better performance
   */
  private addToolEvent(
    context: OperationContext,
    toolName: string,
    status: EventStatus,
    data: Partial<StandardEventData> & Record<string, unknown> = {},
  ): void {
    // Ensure the toolSpans map exists on the context
    if (!context.toolSpans) {
      context.toolSpans = new Map<string, Span>();
    }

    const toolCallId = data.toolId?.toString();

    if (toolCallId && status === "working") {
      if (context.toolSpans.has(toolCallId)) {
        this.logger.warn(`OTEL tool span already exists for toolCallId: ${toolCallId}`, {
          toolCallId,
          toolName,
          agentId: this.id,
        });
      } else {
        // Call the helper function
        const toolSpan = startToolSpan({
          toolName,
          toolCallId,
          toolInput: data.input,
          agentId: this.id,
          parentSpan: context.otelSpan, // Pass the parent operation span
        });
        // Store the active tool span
        context.toolSpans.set(toolCallId, toolSpan);
      }
    }
  }

  /**
   * Agent event creator (update)
   */
  private addAgentEvent(
    context: OperationContext,
    eventName: string,
    status: AgentStatus,
    data: Partial<StandardEventData> & Record<string, unknown> = {},
  ): void {
    // Retrieve the OpenTelemetry span from the context
    const otelSpan = context.otelSpan;

    if (otelSpan) {
      endOperationSpan(
        {
          span: otelSpan,
          status: status as "completed" | "error",
          data,
        },
        this.logger,
      );
    } else {
      this.logger.warn(
        `OpenTelemetry span not found in OperationContext for agent event ${eventName} (Operation ID: ${context.operationId})`,
        { eventName, operationId: context.operationId, agentId: this.id },
      );
    }
  }

  /**
   * Helper method to enrich and end an OpenTelemetry span associated with a tool call.
   */
  private _endOtelToolSpan(
    context: OperationContext,
    toolCallId: string,
    toolName: string,
    resultData: { result?: any; content?: any; error?: any },
  ): void {
    const toolSpan = context.toolSpans?.get(toolCallId);

    if (toolSpan) {
      endToolSpan({ span: toolSpan, resultData }, this.logger);
      context.toolSpans?.delete(toolCallId); // Remove from map after ending
    } else {
      this.logger.warn(
        `OTEL tool span not found for toolCallId: ${toolCallId} in _endOtelToolSpan (Tool: ${toolName})`,
        { toolCallId, toolName, agentId: this.id },
      );
    }
  }

  private publishTimelineEvent(
    operationContext: OperationContext | undefined,
    event: any,
    skipPropagation = false,
  ): void {
    if (!operationContext) return;

    AgentEventEmitter.getInstance().publishTimelineEventAsync({
      agentId: this.id,
      historyId: operationContext.historyEntry.id,
      event,
      skipPropagation,
      parentHistoryEntryId: operationContext.parentHistoryEntryId,
    });
  }

  /**
   * Sets up abort signal listener for cancellation handling
   */
  private setupAbortSignalListener(
    signal: AbortSignal | undefined,
    operationContext: OperationContext,
    finalConversationId: string | undefined,
    agentStartEvent: { id: string; startTime: string },
    hooks?: AgentHooks,
  ): void {
    if (!signal) return;

    signal.addEventListener("abort", async () => {
      // Update history with cancelled status
      this.updateHistoryEntry(operationContext, {
        status: "cancelled",
        endTime: new Date(),
      });

      // Mark operation as inactive
      operationContext.isActive = false;

      // Create cancellation error
      const cancellationError = new Error("Operation cancelled by user");
      cancellationError.name = "AbortError";

      // Create agent:completed event with cancelled status
      const agentCancelledEvent = {
        id: crypto.randomUUID(),
        name: "agent:cancel",
        type: "agent",
        startTime: agentStartEvent.startTime,
        endTime: new Date().toISOString(),
        level: "INFO",
        input: null,
        statusMessage: {
          message: cancellationError.message,
          code: "USER_CANCELLED",
          stage: "cancelled",
        },
        status: "cancelled",
        metadata: {
          displayName: this.name,
          id: this.id,
          userContext: Object.fromEntries(operationContext.userContext.entries()) as Record<
            string,
            unknown
          >,
        },
        traceId: operationContext.historyEntry.id,
        parentEventId: agentStartEvent.id,
      };

      this.publishTimelineEvent(operationContext, agentCancelledEvent);

      // Call onEnd hook with cancellation error if conversationId is available
      await this.getMergedHooks({ hooks }).onEnd?.({
        agent: this,
        output: undefined,
        error: cancellationError,
        conversationId: finalConversationId || "",
        context: operationContext,
      });
    });
  }

  /**
   * Create an enhanced fullStream with real-time SubAgent event injection
   */
  private createEnhancedFullStream(
    originalStream: AsyncIterable<any>,
    streamController: { current: ReadableStreamDefaultController<any> | null },
    subAgentStatus: Map<string, { isActive: boolean; isCompleted: boolean }>,
  ): AsyncIterable<any> {
    const logger = this.logger; // Capture logger reference
    return {
      async *[Symbol.asyncIterator]() {
        // Create a merged stream using ReadableStream for real-time injection
        const mergedStream = new ReadableStream({
          start(controller) {
            // Set the controller reference for real-time injection
            streamController.current = controller;

            // Start processing original stream
            (async () => {
              try {
                for await (const chunk of originalStream) {
                  controller.enqueue(chunk);
                }

                // Wait a bit for any remaining SubAgent events
                await new Promise((resolve) => setTimeout(resolve, 100));

                // Mark all active SubAgents as completed
                for (const [subAgentId, status] of subAgentStatus.entries()) {
                  if (status.isActive && !status.isCompleted) {
                    status.isCompleted = true;
                    logger.debug(`[Enhanced Stream] SubAgent ${subAgentId} marked as completed`, {
                      subAgentId,
                    });
                  }
                }

                controller.close();
              } catch (error) {
                controller.error(error);
              } finally {
                // Clear controller reference
                streamController.current = null;
              }
            })();
          },
        });

        // Convert ReadableStream to async iterable and yield chunks
        const reader = mergedStream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            yield value;
          }
        } finally {
          reader.releaseLock();
        }
      },
    };
  }

  /**
   * Generate a text response without streaming
   */
  public async generateText(
    input: string | BaseMessage[],
    options: PublicGenerateOptions = {},
  ): Promise<GenerateTextResponse<TProvider>> {
    const startTime = Date.now();

    const internalOptions: InternalGenerateOptions = options as InternalGenerateOptions;
    const {
      userId,
      conversationId: initialConversationId,
      parentAgentId,
      parentHistoryEntryId,
      parentOperationContext,
      contextLimit = 10,
      userContext,
      signal,
    } = internalOptions;

    const operationContext = await this.initializeHistory(input, "working", {
      parentAgentId,
      parentHistoryEntryId,
      operationName: "generateText",
      userContext,
      userId,
      conversationId: initialConversationId,
      parentOperationContext,
      signal,
    });

    const { messages: contextMessages, conversationId: finalConversationId } =
      await this.memoryManager.prepareConversationContext(
        operationContext,
        input,
        userId,
        initialConversationId,
        contextLimit,
      );

    // Use logger from operationContext
    const methodLogger = operationContext.logger;

    const modelName = this.getModelName();

    // Log generation start with only event-specific context
    methodLogger.debug(
      buildAgentLogMessage(
        this.name,
        ActionType.GENERATION_START,
        `Starting text generation with ${modelName}`,
      ),
      {
        event: LogEvents.AGENT_GENERATION_STARTED,
        operationType: "text",
        contextLimit,
        memoryEnabled: !!this.memoryManager.getMemory(),
        model: modelName,
        messageCount: contextMessages?.length || 0,
        input,
      },
    );

    if (operationContext.otelSpan) {
      if (userId) operationContext.otelSpan.setAttribute("enduser.id", userId);
      if (finalConversationId)
        operationContext.otelSpan.setAttribute("session.id", finalConversationId);
    }

    let messages: BaseMessage[] = [];
    try {
      await this.getMergedHooks(internalOptions).onStart?.({
        agent: this,
        context: operationContext,
      });

      const systemMessageResponse = await this.getSystemMessage({
        input,
        historyEntryId: operationContext.historyEntry.id,
        contextMessages,
        operationContext,
      });

      // Handle both single message and array of messages from getSystemMessage
      const systemMessages = Array.isArray(systemMessageResponse.systemMessages)
        ? systemMessageResponse.systemMessages
        : [systemMessageResponse.systemMessages];
      messages = [...systemMessages, ...contextMessages];
      messages = await this.formatInputMessages(messages, input);

      // [NEW EVENT SYSTEM] Create an agent:start event
      const agentStartTime = new Date().toISOString(); // Capture agent start time once
      const agentStartEvent: AgentStartEvent = {
        id: crypto.randomUUID(),
        name: "agent:start",
        type: "agent",
        startTime: agentStartTime, // Use captured time
        status: "running",
        input: { input },
        output: null,
        metadata: {
          displayName: this.name,
          id: this.id,
          userContext: Object.fromEntries(operationContext.userContext.entries()) as Record<
            string,
            unknown
          >,
          systemPrompt: systemMessages,
          messages,
          promptMetadata: systemMessageResponse.promptMetadata,
          isDynamicInstructions: systemMessageResponse.isDynamicInstructions,
          modelParameters: {
            model: this.getModelName(),
            maxTokens: internalOptions.provider?.maxTokens,
            temperature: internalOptions.provider?.temperature,
            topP: internalOptions.provider?.topP,
            frequencyPenalty: internalOptions.provider?.frequencyPenalty,
            presencePenalty: internalOptions.provider?.presencePenalty,
            maxSteps: internalOptions.maxSteps,
          },
        },
        traceId: operationContext.historyEntry.id,
      };

      // Store agent start time in the operation context for later reference
      operationContext.userContext.set("agent_start_time", agentStartTime);
      operationContext.userContext.set("agent_start_event_id", agentStartEvent.id);

      // Publish the new event through AgentEventEmitter
      this.publishTimelineEvent(operationContext, agentStartEvent);

      // Setup abort signal listener (after finalConversationId and agentStartEvent are available)
      this.setupAbortSignalListener(signal, operationContext, finalConversationId, {
        id: agentStartEvent.id,
        startTime: agentStartTime,
      });

      const onStepFinish = this.memoryManager.createStepFinishHandler(
        operationContext,
        userId,
        finalConversationId,
      );
      const { tools, maxSteps } = await this.prepareTextOptions({
        ...internalOptions,
        conversationId: finalConversationId,
        historyEntryId: operationContext.historyEntry.id,
        operationContext: operationContext,
      });

      // Resolve dynamic model based on user context
      const promptHelper = VoltOpsClientClass.createPromptHelperWithFallback(
        this.id,
        this.name,
        this.instructions,
        this.voltOpsClient,
      );
      const dynamicValueOptions: DynamicValueOptions = {
        userContext: operationContext.userContext || new Map(),
        prompts: promptHelper,
      };
      const resolvedModel = await this.resolveModel(dynamicValueOptions);

      methodLogger.debug("Starting agent llm call");

      methodLogger.debug("[LLM] - Generating text", {
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        maxSteps,
        tools: tools?.map((t) => t.name) || [],
      });

      const response = await this.llm.generateText({
        messages,
        model: resolvedModel,
        maxSteps,
        tools,
        provider: internalOptions.provider,
        signal: internalOptions.signal,
        toolExecutionContext: {
          operationContext: operationContext,
          agentId: this.id,
          historyEntryId: operationContext.historyEntry.id,
        } as ToolExecutionContext,
        onStepFinish: async (step) => {
          this.addStepToHistory(step, operationContext);

          const stepData: any = {
            text: "",
            toolCalls: [],
            toolResults: [],
            finishReason: step.type === "text" ? "stop" : "tool-calls",
            usage: step.usage,
          };

          if (step.type === "text") {
            stepData.text = step.content;
            stepData.finishReason = "stop";
          } else if (step.type === "tool_call") {
            stepData.toolCalls = [
              {
                type: "tool-call",
                toolCallId: step.id,
                toolName: step.name,
                args: step.arguments,
              },
            ];
            stepData.finishReason = "tool-calls";
          } else if (step.type === "tool_result") {
            stepData.toolResults = [
              {
                type: "tool-result",
                toolCallId: step.id,
                toolName: step.name,
                args: {},
                result: step.result,
              },
            ];
          }

          const description = this.getStepDescription(step, stepData);

          methodLogger.debug(
            buildAgentLogMessage(
              this.name,
              ActionType.STREAM_STEP,
              `${description} [${stepData.finishReason || "in-progress"}]`,
            ),
            stepData,
          );

          // Keep existing step logging for INFO level
          if (step.type === "text") {
            const textPreview = step.content;
            methodLogger.debug("Step: Text generated", {
              event: LogEvents.AGENT_STEP_TEXT,
              textPreview,
              length: step.content.length,
            });
          }

          if (step.type === "tool_call") {
            // Log tool call step
            methodLogger.debug(`Step: Calling tool '${step.name}'`, {
              event: LogEvents.AGENT_STEP_TOOL_CALL,
              toolName: step.name,
              toolCallId: step.id,
              arguments: step.arguments,
            });

            // Tool execution started
            methodLogger.debug(
              buildAgentLogMessage(this.name, ActionType.TOOL_CALL, `Executing ${step.name}`),
              {
                event: LogEvents.TOOL_EXECUTION_STARTED,
                toolName: step.name,
                toolCallId: step.id,
                args: step.arguments,
              },
            );

            if (step.name && step.id) {
              const tool = this.toolManager.getToolByName(step.name);

              // [NEW EVENT SYSTEM] Create a tool:start event
              const toolStartTime = new Date().toISOString(); // Capture start time once
              const toolStartEvent: ToolStartEvent = {
                id: crypto.randomUUID(),
                name: "tool:start",
                type: "tool",
                startTime: toolStartTime, // Use captured time
                status: "running",
                input: step.arguments || {},
                output: null,
                metadata: {
                  displayName: step.name,
                  id: step.name,
                  agentId: this.id,
                },
                traceId: operationContext.historyEntry.id,
                parentEventId: agentStartEvent.id, // Link to the agent:start event
              };

              // Store tool ID and start time in user context for later reference
              operationContext.userContext.set(`tool_${step.id}`, {
                eventId: toolStartEvent.id,
                startTime: toolStartTime, // Store the start time for later
              });

              // Publish the tool:start event (background)
              this.publishTimelineEvent(operationContext, toolStartEvent);

              await this.addToolEvent(operationContext, step.name, "working", {
                toolId: step.id,
                input: step.arguments || {},
              });

              if (tool) {
                await this.getMergedHooks(internalOptions).onToolStart?.({
                  agent: this,
                  tool,
                  context: operationContext,
                });
              }
            }
          } else if (step.type === "tool_result") {
            // Log tool result step
            const resultPreview = step.result || step.content;

            methodLogger.debug(`Step: Tool '${step.name}' completed`, {
              event: LogEvents.AGENT_STEP_TOOL_RESULT,
              toolName: step.name,
              toolCallId: step.id,
              result: resultPreview,
              hasError: Boolean(step.result?.error),
            });

            if (step.name && step.id) {
              const toolCallId = step.id;
              const toolName = step.name;
              const isError = Boolean(step.result?.error);

              // [NEW EVENT SYSTEM] Create either tool:success or tool:error event
              // Get the associated tool:start event ID and time from context
              const toolStartInfo = (operationContext.userContext.get(`tool_${toolCallId}`) as {
                eventId: string;
                startTime: string;
              }) || { eventId: undefined, startTime: new Date().toISOString() };

              if (isError) {
                // Create tool:error event
                const toolErrorEvent: ToolErrorEvent = {
                  id: crypto.randomUUID(),
                  name: "tool:error",
                  type: "tool",
                  startTime: toolStartInfo.startTime, // Use the original start time
                  endTime: new Date().toISOString(), // Current time as end time
                  status: "error",
                  level: "ERROR",
                  input: null,
                  output: null,
                  statusMessage: step.result?.error || {
                    message: "Unknown tool error",
                  },
                  metadata: {
                    displayName: toolName,
                    id: toolName,
                    agentId: this.id,
                  },
                  traceId: operationContext.historyEntry.id,
                  parentEventId: toolStartInfo.eventId, // Link to the tool:start event
                };

                // Publish the tool:error event (background)
                this.publishTimelineEvent(operationContext, toolErrorEvent);
              } else {
                // Create tool:success event
                const toolSuccessEvent: ToolSuccessEvent = {
                  id: crypto.randomUUID(),
                  name: "tool:success",
                  type: "tool",
                  startTime: toolStartInfo.startTime, // Use the original start time
                  endTime: new Date().toISOString(), // Current time as end time
                  status: "completed",
                  input: null,
                  output: step.result ?? step.content,
                  metadata: {
                    displayName: toolName,
                    id: toolName,
                    agentId: this.id,
                  },
                  traceId: operationContext.historyEntry.id,
                  parentEventId: toolStartInfo.eventId, // Link to the tool:start event
                };

                // Publish the tool:success event (background)
                this.publishTimelineEvent(operationContext, toolSuccessEvent);
              }

              this._endOtelToolSpan(operationContext, toolCallId, toolName, {
                result: step.result,
                content: step.content,
                error: step.result?.error,
              });
              const tool = this.toolManager.getToolByName(toolName);
              if (tool) {
                await this.getMergedHooks(internalOptions).onToolEnd?.({
                  agent: this,
                  tool,
                  output: step.result ?? step.content,
                  error: step.result?.error,
                  context: operationContext,
                });
              }
            }
          }
          await onStepFinish(step);
        },
      });

      // [NEW EVENT SYSTEM] Create an agent:success event
      const agentStartInfo = {
        startTime:
          (operationContext.userContext.get("agent_start_time") as string) || agentStartTime,
        eventId:
          (operationContext.userContext.get("agent_start_event_id") as string) ||
          agentStartEvent.id,
      };

      const agentSuccessEvent: AgentSuccessEvent = {
        id: crypto.randomUUID(),
        name: "agent:success",
        type: "agent",
        startTime: agentStartInfo.startTime, // Use the original start time
        endTime: new Date().toISOString(), // Current time as end time
        status: "completed",
        input: null,
        output: { text: response.text },
        metadata: {
          displayName: this.name,
          id: this.id,
          usage: response.usage,
          userContext: Object.fromEntries(operationContext.userContext.entries()) as Record<
            string,
            unknown
          >,
          modelParameters: {
            model: this.getModelName(),
            maxTokens: internalOptions.provider?.maxTokens,
            temperature: internalOptions.provider?.temperature,
            topP: internalOptions.provider?.topP,
            frequencyPenalty: internalOptions.provider?.frequencyPenalty,
            presencePenalty: internalOptions.provider?.presencePenalty,
            maxSteps: internalOptions.maxSteps,
          },
        },

        traceId: operationContext.historyEntry.id,
        parentEventId: agentStartInfo.eventId, // Link to the agent:start event
      };

      // Publish the agent:success event (background)
      this.publishTimelineEvent(operationContext, agentSuccessEvent);

      // Original agent completion event for backward compatibility
      this.addAgentEvent(operationContext, "finished", "completed", {
        input: messages,
        output: response.text,
        usage: response.usage,
        status: "completed",
      });

      operationContext.isActive = false;

      // Create initial response for onEnd hook
      const initialResponse: GenerateTextResponse<TProvider> = {
        ...response,
        userContext: new Map(operationContext.userContext),
      };

      await this.getMergedHooks(internalOptions).onEnd?.({
        conversationId: finalConversationId,
        agent: this,
        output: initialResponse,
        error: undefined,
        context: operationContext,
      });

      // Extend the original response with userContext AFTER onEnd hook
      const extendedResponse: GenerateTextResponse<TProvider> = {
        ...response,
        userContext: new Map(operationContext.userContext),
      };

      this.updateHistoryEntry(operationContext, {
        output: response.text,
        usage: response.usage,
        endTime: new Date(),
        status: "completed",
      });

      methodLogger.debug(
        buildAgentLogMessage(this.name, ActionType.STREAM_COMPLETE, "Stream generation completed"),
        {
          text: response.text,
          toolCalls: [],
          toolResults: [],
          finishReason: response.finishReason || "stop",
          usage: response.usage,
        },
      );

      // Log successful completion with usage details
      const usage = response.usage;
      const tokenInfo = usage ? `${usage.totalTokens} tokens` : "no usage data";

      methodLogger.debug(
        buildAgentLogMessage(
          this.name,
          ActionType.GENERATION_COMPLETE,
          `Text generation completed (${tokenInfo})`,
        ),
        {
          event: LogEvents.AGENT_GENERATION_COMPLETED,
          duration: Date.now() - startTime,
          finishReason: response.finishReason,
          usage: response.usage,
          toolCalls: response.toolCalls?.length || 0,
          text: response.text,
        },
      );

      return extendedResponse;
    } catch (error) {
      const voltagentError = error as VoltAgentError;

      // [NEW EVENT SYSTEM] Create an agent:error event
      const agentErrorStartInfo = {
        startTime:
          (operationContext.userContext.get("agent_start_time") as string) ||
          new Date().toISOString(),
        eventId: operationContext.userContext.get("agent_start_event_id") as string,
      };

      const agentErrorEvent: AgentErrorEvent = {
        id: crypto.randomUUID(),
        name: "agent:error",
        type: "agent",
        startTime: agentErrorStartInfo.startTime, // Use the original start time
        endTime: new Date().toISOString(), // Current time as end time
        status: "error",
        level: "ERROR",
        input: null,
        output: null,
        statusMessage: {
          message: voltagentError.message,
          code: voltagentError.code,
          stage: voltagentError.stage,
          ...(voltagentError.originalError
            ? { originalError: String(voltagentError.originalError) }
            : {}),
        },
        metadata: {
          displayName: this.name,
          id: this.id,
          userContext: Object.fromEntries(operationContext.userContext.entries()) as Record<
            string,
            unknown
          >,
        },
        traceId: operationContext.historyEntry.id,
        parentEventId: agentErrorStartInfo.eventId, // Link to the agent:start event
      };

      // Publish the agent:error event (background)
      this.publishTimelineEvent(operationContext, agentErrorEvent);

      // Original error event for backward compatibility
      this.addAgentEvent(operationContext, "finished", "error", {
        input: messages,
        error: voltagentError,
        errorMessage: voltagentError.message,
        status: "error",
        metadata: {
          code: voltagentError.code,
          originalError: voltagentError.originalError,
          stage: voltagentError.stage,
          toolError: voltagentError.toolError,
          ...voltagentError.metadata,
        },
      });

      operationContext.isActive = false;

      await this.getMergedHooks(internalOptions).onEnd?.({
        agent: this,
        output: undefined,
        error: voltagentError,
        conversationId: finalConversationId,
        context: operationContext,
      });

      this.updateHistoryEntry(operationContext, {
        status: "error",
        endTime: new Date(),
      });

      // Log error
      methodLogger.error("Generation failed", {
        event: LogEvents.AGENT_GENERATION_FAILED,
        duration: Date.now() - startTime,
        error: {
          message: voltagentError.message,
          code: voltagentError.code,
          stage: voltagentError.stage,
        },
      });

      throw voltagentError;
    }
  }

  /**
   * Stream a text response
   */
  public async streamText(
    input: string | BaseMessage[],
    options: PublicGenerateOptions = {},
  ): Promise<StreamTextResponse<TProvider>> {
    const internalOptions: InternalGenerateOptions = options as InternalGenerateOptions;
    const {
      userId,
      conversationId: initialConversationId,
      parentAgentId,
      parentHistoryEntryId,
      parentOperationContext,
      contextLimit = 10,
      userContext,
      signal,
    } = internalOptions;

    const operationContext = await this.initializeHistory(input, "working", {
      parentAgentId,
      parentHistoryEntryId,
      operationName: "streamText",
      userContext,
      userId,
      conversationId: initialConversationId,
      parentOperationContext,
      signal,
    });

    const { messages: contextMessages, conversationId: finalConversationId } =
      await this.memoryManager.prepareConversationContext(
        operationContext,
        input,
        userId,
        initialConversationId,
        contextLimit,
      );

    // Use logger from operationContext
    const methodLogger = operationContext.logger;

    const modelName = this.getModelName();

    // Log stream generation start with only event-specific context
    methodLogger.debug(
      buildAgentLogMessage(
        this.name,
        ActionType.STREAM_START,
        `Starting text generation with ${modelName}`,
      ),
      {
        event: LogEvents.AGENT_STREAM_STARTED,
        operationType: "stream",
        inputType: typeof input === "string" ? "string" : "messages",
        contextLimit,
        memoryEnabled: !!this.memoryManager.getMemory(),
        model: modelName,
        input,
      },
    );

    if (operationContext.otelSpan) {
      if (userId) operationContext.otelSpan.setAttribute("enduser.id", userId);
      if (finalConversationId)
        operationContext.otelSpan.setAttribute("session.id", finalConversationId);
    }

    await this.getMergedHooks(internalOptions).onStart?.({
      agent: this,
      context: operationContext,
    });

    const systemMessageResponse = await this.getSystemMessage({
      input,
      historyEntryId: operationContext.historyEntry.id,
      contextMessages,
      operationContext,
    });

    // Handle both single message and array of messages from getSystemMessage
    const systemMessages = Array.isArray(systemMessageResponse.systemMessages)
      ? systemMessageResponse.systemMessages
      : [systemMessageResponse.systemMessages];
    let messages = [...systemMessages, ...contextMessages];
    messages = await this.formatInputMessages(messages, input);

    // [NEW EVENT SYSTEM] Create an agent:start event
    const agentStartTime = new Date().toISOString(); // Capture agent start time once
    const agentStartEvent: AgentStartEvent = {
      id: crypto.randomUUID(),
      name: "agent:start",
      type: "agent",
      startTime: agentStartTime, // Use captured time
      status: "running",
      input: { input },
      output: null,
      metadata: {
        displayName: this.name,
        id: this.id,
        userContext: Object.fromEntries(operationContext.userContext.entries()) as Record<
          string,
          unknown
        >,
        systemPrompt: systemMessages,
        messages,
        promptMetadata: systemMessageResponse.promptMetadata,
        isDynamicInstructions: systemMessageResponse.isDynamicInstructions,
        modelParameters: {
          model: this.getModelName(),
          maxTokens: internalOptions.provider?.maxTokens,
          temperature: internalOptions.provider?.temperature,
          topP: internalOptions.provider?.topP,
          frequencyPenalty: internalOptions.provider?.frequencyPenalty,
          presencePenalty: internalOptions.provider?.presencePenalty,
          maxSteps: internalOptions.maxSteps,
        },
      },
      traceId: operationContext.historyEntry.id,
    };

    // Store agent start time in the operation context for later reference
    operationContext.userContext.set("agent_start_time", agentStartTime);
    operationContext.userContext.set("agent_start_event_id", agentStartEvent.id);

    // Publish the new event through AgentEventEmitter
    this.publishTimelineEvent(operationContext, agentStartEvent);

    // Setup abort signal listener (after finalConversationId and agentStartEvent are available)
    this.setupAbortSignalListener(signal, operationContext, finalConversationId, {
      id: agentStartEvent.id,
      startTime: agentStartTime,
    });

    const onStepFinish = this.memoryManager.createStepFinishHandler(
      operationContext,
      userId,
      finalConversationId,
    );

    // Create real-time SubAgent event tracking
    const subAgentStatus = new Map<string, { isActive: boolean; isCompleted: boolean }>();
    const streamController: { current: ReadableStreamDefaultController<any> | null } = {
      current: null,
    };

    const internalStreamEventForwarder = async (event: StreamEvent) => {
      // Update SubAgent status
      if (!subAgentStatus.has(event.subAgentId)) {
        subAgentStatus.set(event.subAgentId, { isActive: true, isCompleted: false });
      }

      // Immediately inject into stream if controller is available
      if (streamController.current) {
        try {
          const formattedStreamPart = transformStreamEventToStreamPart(event);
          streamController.current.enqueue(formattedStreamPart);
        } catch (error) {
          methodLogger.error("[Real-time Stream] Failed to inject event", {
            error,
          });
        }
      }
    };

    const { tools, maxSteps } = await this.prepareTextOptions({
      ...internalOptions,
      conversationId: finalConversationId,
      historyEntryId: operationContext.historyEntry.id,
      operationContext: operationContext,
      // Pass the internal forwarder to tools
      internalStreamForwarder: internalStreamEventForwarder,
    });

    // Resolve dynamic model based on user context
    const promptHelper = VoltOpsClientClass.createPromptHelperWithFallback(
      this.id,
      this.name,
      this.instructions,
      this.voltOpsClient,
    );
    const dynamicValueOptions: DynamicValueOptions = {
      userContext: operationContext.userContext || new Map(),
      prompts: promptHelper,
    };
    const resolvedModel = await this.resolveModel(dynamicValueOptions);

    methodLogger.debug(
      buildAgentLogMessage(this.name, ActionType.STREAMING, "Processing LLM response"),
      {
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        maxSteps,
        tools: tools?.map((t) => t.name) || [],
      },
    );

    const response = await this.llm.streamText({
      messages,
      model: resolvedModel,
      maxSteps,
      tools,
      signal: internalOptions.signal,
      provider: internalOptions.provider,
      toolExecutionContext: {
        operationContext: operationContext,
        agentId: this.id,
        historyEntryId: operationContext.historyEntry.id,
      } as ToolExecutionContext,
      onChunk: async (chunk: StepWithContent) => {
        if (chunk.type === "tool_call") {
          if (chunk.name && chunk.id) {
            const tool = this.toolManager.getToolByName(chunk.name);

            // [NEW EVENT SYSTEM] Create a tool:start event
            const toolStartTime = new Date().toISOString(); // Capture start time once
            const toolStartEvent: ToolStartEvent = {
              id: crypto.randomUUID(),
              name: "tool:start",
              type: "tool",
              startTime: toolStartTime, // Use captured time
              status: "running",
              input: chunk.arguments || {},
              output: null,
              metadata: {
                displayName: chunk.name,
                id: chunk.name,
                agentId: this.id,
              },
              traceId: operationContext.historyEntry.id,
              parentEventId: agentStartEvent.id, // Link to the agent:start event
            };

            // Store tool ID and start time in user context for later reference
            operationContext.userContext.set(`tool_${chunk.id}`, {
              eventId: toolStartEvent.id,
              startTime: toolStartTime, // Store the start time for later
            });

            // Publish the tool:start event (background)
            this.publishTimelineEvent(operationContext, toolStartEvent);

            // Original tool event for backward compatibility
            this.addToolEvent(operationContext, chunk.name, "working", {
              toolId: chunk.id,
              input: chunk.arguments || {},
            });
            if (tool) {
              await this.getMergedHooks(internalOptions).onToolStart?.({
                agent: this,
                tool,
                context: operationContext,
              });
            }
          }
        } else if (chunk.type === "tool_result") {
          if (chunk.name && chunk.id) {
            const toolCallId = chunk.id;
            const toolName = chunk.name;
            const isError = Boolean(chunk.result?.error);

            // [NEW EVENT SYSTEM] Create either tool:success or tool:error event
            // Get the associated tool:start event ID and time from context
            const toolStartInfo = (operationContext.userContext.get(`tool_${toolCallId}`) as {
              eventId: string;
              startTime: string;
            }) || { eventId: undefined, startTime: new Date().toISOString() };

            if (isError) {
              // Create tool:error event
              const toolErrorEvent: ToolErrorEvent = {
                id: crypto.randomUUID(),
                name: "tool:error",
                type: "tool",
                startTime: toolStartInfo.startTime, // Use the original start time
                endTime: new Date().toISOString(), // Current time as end time
                status: "error",
                level: "ERROR",
                input: null,
                output: null,
                statusMessage: chunk.result?.error || { message: "Unknown tool error" },
                metadata: {
                  displayName: toolName,
                  id: toolName,
                  agentId: this.id,
                },
                traceId: operationContext.historyEntry.id,
                parentEventId: toolStartInfo.eventId, // Link to the tool:start event
              };

              // Publish the tool:error event (background)
              this.publishTimelineEvent(operationContext, toolErrorEvent);
            } else {
              // Create tool:success event
              const toolSuccessEvent: ToolSuccessEvent = {
                id: crypto.randomUUID(),
                name: "tool:success",
                type: "tool",
                startTime: toolStartInfo.startTime, // Use the original start time
                endTime: new Date().toISOString(), // Current time as end time
                status: "completed",
                input: null,
                output: chunk.result ?? chunk.content,
                metadata: {
                  displayName: toolName,
                  id: toolName,
                  agentId: this.id,
                },
                traceId: operationContext.historyEntry.id,
                parentEventId: toolStartInfo.eventId, // Link to the tool:start event
              };

              // Publish the tool:success event (background)
              this.publishTimelineEvent(operationContext, toolSuccessEvent);
            }

            this._endOtelToolSpan(operationContext, toolCallId, toolName, {
              result: chunk.result,
              content: chunk.content,
              error: chunk.result?.error,
            });
            const tool = this.toolManager.getToolByName(toolName);
            if (tool) {
              await this.getMergedHooks(internalOptions).onToolEnd?.({
                agent: this,
                tool,
                output: chunk.result ?? chunk.content,
                error: chunk.result?.error,
                context: operationContext,
              });
            }
          }
        }
      },
      onStepFinish: async (step: StepWithContent) => {
        const stepData: any = {
          text: "",
          toolCalls: [],
          toolResults: [],
          finishReason: step.type === "text" ? "stop" : "tool-calls",
          usage: step.usage,
        };

        if (step.type === "text") {
          stepData.text = step.content;
          stepData.finishReason = "stop";
        } else if (step.type === "tool_call") {
          stepData.toolCalls = [
            {
              type: "tool-call",
              toolCallId: step.id,
              toolName: step.name,
              args: step.arguments,
            },
          ];
          stepData.finishReason = "tool-calls";

          // Tool execution started
          methodLogger.debug(
            buildAgentLogMessage(this.name, ActionType.TOOL_CALL, `Executing ${step.name}`),
            {
              event: LogEvents.TOOL_EXECUTION_STARTED,
              toolName: step.name,
              toolCallId: step.id,
              args: step.arguments,
            },
          );
        } else if (step.type === "tool_result") {
          stepData.toolResults = [
            {
              type: "tool-result",
              toolCallId: step.id,
              toolName: step.name,
              args: {},
              result: step.result,
            },
          ];
        }

        const description = this.getStepDescription(step, stepData);

        methodLogger.debug(
          buildAgentLogMessage(
            this.name,
            ActionType.STREAM_STEP,
            `${description} [${stepData.finishReason || "in-progress"}]`,
          ),
          stepData,
        );

        await onStepFinish(step);
        if (internalOptions.provider?.onStepFinish) {
          await (internalOptions.provider.onStepFinish as (step: StepWithContent) => Promise<void>)(
            step,
          );
        }
        this.addStepToHistory(step, operationContext);
      },
      onFinish: async (result: StreamTextFinishResult) => {
        if (!operationContext.isActive) {
          return;
        }

        // [NEW EVENT SYSTEM] Create an agent:success event
        const agentStartInfo = {
          startTime:
            (operationContext.userContext.get("agent_start_time") as string) || agentStartTime,
          eventId:
            (operationContext.userContext.get("agent_start_event_id") as string) ||
            agentStartEvent.id,
        };

        this.updateHistoryEntry(operationContext, {
          output: result.text,
          usage: result.usage,
          endTime: new Date(),
          status: "completed",
        });

        methodLogger.debug(
          buildAgentLogMessage(
            this.name,
            ActionType.STREAM_COMPLETE,
            "Stream generation completed",
          ),
          {
            text: result.text || "",
            toolCalls: [],
            toolResults: [],
            finishReason: result.finishReason || "stop",
            usage: result.usage,
          },
        );

        const agentSuccessEvent: AgentSuccessEvent = {
          id: crypto.randomUUID(),
          name: "agent:success",
          type: "agent",
          startTime: agentStartInfo.startTime, // Use the original start time
          endTime: new Date().toISOString(), // Current time as end time
          status: "completed",
          input: null,
          output: { text: result.text },
          metadata: {
            displayName: this.name,
            id: this.id,
            usage: result.usage,
            userContext: Object.fromEntries(operationContext.userContext.entries()) as Record<
              string,
              unknown
            >,
            modelParameters: {
              model: this.getModelName(),
              maxTokens: internalOptions.provider?.maxTokens,
              temperature: internalOptions.provider?.temperature,
              topP: internalOptions.provider?.topP,
              frequencyPenalty: internalOptions.provider?.frequencyPenalty,
              presencePenalty: internalOptions.provider?.presencePenalty,
              maxSteps: internalOptions.maxSteps,
            },
          },
          traceId: operationContext.historyEntry.id,
          parentEventId: agentStartInfo.eventId, // Link to the agent:start event
        };

        // Publish the agent:success event (background)
        this.publishTimelineEvent(operationContext, agentSuccessEvent);

        // Original agent completion event for backward compatibility
        this.addAgentEvent(operationContext, "finished", "completed", {
          input: messages,
          output: result.text,
          usage: result.usage,
          status: "completed",
          metadata: {
            finishReason: result.finishReason,
            warnings: result.warnings,
            providerResponse: result.providerResponse,
          },
        });
        operationContext.isActive = false;

        // Create initial result for onEnd hook
        const initialResult = {
          ...result,
          userContext: new Map(operationContext.userContext),
        };

        await this.getMergedHooks(internalOptions).onEnd?.({
          agent: this,
          output: initialResult,
          error: undefined,
          conversationId: finalConversationId,
          context: operationContext,
        });

        // Add userContext to result AFTER onEnd hook
        const resultWithContext = {
          ...result,
          userContext: new Map(operationContext.userContext),
        };

        if (internalOptions.provider?.onFinish) {
          await (internalOptions.provider.onFinish as StreamTextOnFinishCallback)(
            resultWithContext,
          );
        }
      },
      onError: async (error: VoltAgentError) => {
        if (error.toolError) {
          const { toolCallId, toolName } = error.toolError;
          try {
            // [NEW EVENT SYSTEM] Create a tool:error event for tool error during streaming
            const toolStartInfo = (operationContext.userContext.get(`tool_${toolCallId}`) as {
              eventId: string;
              startTime: string;
            }) || { eventId: undefined, startTime: new Date().toISOString() };

            const toolErrorEvent: ToolErrorEvent = {
              id: crypto.randomUUID(),
              name: "tool:error",
              type: "tool",
              startTime: toolStartInfo.startTime,
              endTime: new Date().toISOString(),
              status: "error",
              level: "ERROR",
              input: null,
              output: null,
              statusMessage: {
                message: error.message,
                code: error.code,
                ...(error.toolError && { toolError: error.toolError }),
              },
              metadata: {
                displayName: toolName,
                id: toolName,
                agentId: this.id,
              },
              traceId: operationContext.historyEntry.id,
              parentEventId: toolStartInfo.eventId,
            };

            // Publish the tool:error event (background)
            this.publishTimelineEvent(operationContext, toolErrorEvent);
          } catch (updateError) {
            methodLogger.error(
              `Failed to update tool event to error status for ${toolName} (${toolCallId})`,
              {
                toolName,
                toolCallId,
                error: updateError,
              },
            );
          }
          const tool = this.toolManager.getToolByName(toolName);
          if (tool) {
            await this.getMergedHooks(internalOptions).onToolEnd?.({
              agent: this,
              tool,
              output: undefined,
              error: error,
              context: operationContext,
            });
          }
        }

        // [NEW EVENT SYSTEM] Create an agent:error event
        const agentErrorStartInfo = {
          startTime:
            (operationContext.userContext.get("agent_start_time") as string) ||
            new Date().toISOString(),
          eventId: operationContext.userContext.get("agent_start_event_id") as string,
        };

        this.updateHistoryEntry(operationContext, {
          status: "error",
          endTime: new Date(),
        });

        const agentErrorEvent: AgentErrorEvent = {
          id: crypto.randomUUID(),
          name: "agent:error",
          type: "agent",
          startTime: agentErrorStartInfo.startTime, // Use the original start time
          endTime: new Date().toISOString(), // Current time as end time
          status: "error",
          level: "ERROR",
          input: null,
          output: null,
          statusMessage: {
            message: error.message,
            code: error.code,
            stage: error.stage,
            ...(error.originalError ? { originalError: String(error.originalError) } : {}),
          },
          metadata: {
            displayName: this.name,
            id: this.id,
            userContext: Object.fromEntries(operationContext.userContext.entries()) as Record<
              string,
              unknown
            >,
          },
          traceId: operationContext.historyEntry.id,
          parentEventId: agentErrorStartInfo.eventId, // Link to the agent:start event
        };

        // Publish the agent:error event (background)
        this.publishTimelineEvent(operationContext, agentErrorEvent);

        // Original error event for backward compatibility
        this.addAgentEvent(operationContext, "finished", "error", {
          input: messages,
          error: error,
          errorMessage: error.message,
          status: "error",
          metadata: {
            code: error.code,
            originalError: error.originalError,
            stage: error.stage,
            toolError: error.toolError,
            ...error.metadata,
          },
        });

        operationContext.isActive = false;

        // Log error
        methodLogger.error(
          buildAgentLogMessage(this.name, ActionType.ERROR, "Stream generation failed"),
          {
            event: LogEvents.AGENT_STREAM_FAILED,
            error: {
              message: error.message,
              code: error.code,
              stage: error.stage,
            },
          },
        );

        if (internalOptions.provider?.onError) {
          await (internalOptions.provider.onError as StreamOnErrorCallback)(error);
        }

        await this.getMergedHooks(internalOptions).onEnd?.({
          agent: this,
          output: undefined,
          error: error,
          conversationId: finalConversationId,
          context: operationContext,
        });
      },
    });

    // Create enhanced stream with real-time SubAgent event injection and add userContext
    const wrappedResponse: StreamTextResponse<TProvider> = {
      ...response,
      fullStream: response.fullStream
        ? this.createEnhancedFullStream(response.fullStream, streamController, subAgentStatus)
        : undefined,
      userContext: new Map(operationContext.userContext),
    };

    return wrappedResponse;
  }

  /**
   * Generate a structured object response
   */
  public async generateObject<TSchema extends z.ZodType>(
    input: string | BaseMessage[],
    schema: TSchema,
    options: PublicGenerateOptions = {},
  ): Promise<GenerateObjectResponse<TProvider, TSchema>> {
    const internalOptions: InternalGenerateOptions = options as InternalGenerateOptions;
    const {
      userId,
      conversationId: initialConversationId,
      parentAgentId,
      parentHistoryEntryId,
      parentOperationContext,
      contextLimit = 10,
      userContext,
      signal,
    } = internalOptions;

    // Always create new operation context, but share conversationSteps with parent if provided
    const operationContext = await this.initializeHistory(input, "working", {
      parentAgentId,
      parentHistoryEntryId,
      operationName: "generateObject",
      userContext,
      userId,
      conversationId: initialConversationId,
      parentOperationContext,
      signal,
    });

    const { messages: contextMessages, conversationId: finalConversationId } =
      await this.memoryManager.prepareConversationContext(
        operationContext,
        input,
        userId,
        initialConversationId,
        contextLimit,
      );

    // Use logger from operationContext
    const methodLogger = operationContext.logger;

    const modelName = this.getModelName();

    // Log object generation start with only event-specific context
    methodLogger.debug(
      buildAgentLogMessage(
        this.name,
        ActionType.OBJECT_GENERATION_START,
        `Starting object generation with ${modelName}`,
      ),
      {
        event: LogEvents.AGENT_OBJECT_STARTED,
        operationType: "object",
        inputType: typeof input === "string" ? "string" : "messages",
        contextLimit,
        memoryEnabled: !!this.memoryManager.getMemory(),
        model: modelName,
      },
    );

    if (operationContext.otelSpan) {
      if (userId) operationContext.otelSpan.setAttribute("enduser.id", userId);
      if (finalConversationId)
        operationContext.otelSpan.setAttribute("session.id", finalConversationId);
    }

    let messages: BaseMessage[] = [];
    try {
      await this.getMergedHooks(internalOptions).onStart?.({
        agent: this,
        context: operationContext,
      });

      const systemMessageResponse = await this.getSystemMessage({
        input,
        historyEntryId: operationContext.historyEntry.id,
        contextMessages,
        operationContext,
      });

      // Handle both single message and array of messages from getSystemMessage
      const systemMessages = Array.isArray(systemMessageResponse.systemMessages)
        ? systemMessageResponse.systemMessages
        : [systemMessageResponse.systemMessages];
      messages = [...systemMessages, ...contextMessages];
      messages = await this.formatInputMessages(messages, input);

      // [NEW EVENT SYSTEM] Create an agent:start event
      const agentStartTime = new Date().toISOString(); // Capture agent start time once
      const agentStartEvent: AgentStartEvent = {
        id: crypto.randomUUID(),
        name: "agent:start",
        type: "agent",
        startTime: agentStartTime, // Use captured time
        status: "running",
        input: { input },
        output: null,
        metadata: {
          displayName: this.name,
          id: this.id,
          userContext: Object.fromEntries(operationContext.userContext.entries()) as Record<
            string,
            unknown
          >,
          systemPrompt: systemMessages,
          messages,
          promptMetadata: systemMessageResponse.promptMetadata,
          isDynamicInstructions: systemMessageResponse.isDynamicInstructions,
          modelParameters: {
            model: this.getModelName(),
            maxTokens: internalOptions.provider?.maxTokens,
            temperature: internalOptions.provider?.temperature,
            topP: internalOptions.provider?.topP,
            frequencyPenalty: internalOptions.provider?.frequencyPenalty,
            presencePenalty: internalOptions.provider?.presencePenalty,
            maxSteps: internalOptions.maxSteps,
          },
        },
        traceId: operationContext.historyEntry.id,
      };

      // Store agent start time in the operation context for later reference
      operationContext.userContext.set("agent_start_time", agentStartTime);
      operationContext.userContext.set("agent_start_event_id", agentStartEvent.id);

      // Publish the new event through AgentEventEmitter
      this.publishTimelineEvent(operationContext, agentStartEvent);

      // Setup abort signal listener (after finalConversationId and agentStartEvent are available)
      this.setupAbortSignalListener(signal, operationContext, finalConversationId, {
        id: agentStartEvent.id,
        startTime: agentStartTime,
      });

      const onStepFinish = this.memoryManager.createStepFinishHandler(
        operationContext,
        userId,
        finalConversationId,
      );

      // Resolve dynamic model based on user context
      const promptHelper = VoltOpsClientClass.createPromptHelperWithFallback(
        this.id,
        this.name,
        this.instructions,
        this.voltOpsClient,
      );
      const dynamicValueOptions: DynamicValueOptions = {
        userContext: operationContext.userContext || new Map(),
        prompts: promptHelper,
      };
      const resolvedModel = await this.resolveModel(dynamicValueOptions);

      const response = await this.llm.generateObject({
        messages,
        model: resolvedModel,
        schema,
        signal: internalOptions.signal,
        provider: internalOptions.provider,
        toolExecutionContext: {
          operationContext: operationContext,
          agentId: this.id,
          historyEntryId: operationContext.historyEntry.id,
        } as ToolExecutionContext,
        onStepFinish: async (step) => {
          this.addStepToHistory(step, operationContext);
          await onStepFinish(step);
          if (internalOptions.provider?.onStepFinish) {
            await (
              internalOptions.provider.onStepFinish as (step: StepWithContent) => Promise<void>
            )(step);
          }
        },
      });

      // [NEW EVENT SYSTEM] Create an agent:success event
      const agentStartInfo = {
        startTime:
          (operationContext.userContext.get("agent_start_time") as string) || agentStartTime,
        eventId:
          (operationContext.userContext.get("agent_start_event_id") as string) ||
          agentStartEvent.id,
      };

      const agentSuccessEvent: AgentSuccessEvent = {
        id: crypto.randomUUID(),
        name: "agent:success",
        type: "agent",
        startTime: agentStartInfo.startTime, // Use the original start time
        endTime: new Date().toISOString(), // Current time as end time
        status: "completed",
        input: null,
        output: { object: response.object },
        metadata: {
          displayName: this.name,
          id: this.id,
          usage: response.usage,
          userContext: Object.fromEntries(operationContext.userContext.entries()) as Record<
            string,
            unknown
          >,
          modelParameters: {
            model: this.getModelName(),
            maxTokens: internalOptions.provider?.maxTokens,
            temperature: internalOptions.provider?.temperature,
            topP: internalOptions.provider?.topP,
            frequencyPenalty: internalOptions.provider?.frequencyPenalty,
            presencePenalty: internalOptions.provider?.presencePenalty,
            maxSteps: internalOptions.maxSteps,
          },
        },
        traceId: operationContext.historyEntry.id,
        parentEventId: agentStartInfo.eventId, // Link to the agent:start event
      };

      // Publish the agent:success event (background)
      this.publishTimelineEvent(operationContext, agentSuccessEvent);

      const responseStr = JSON.stringify(response.object);
      this.addAgentEvent(operationContext, "finished", "completed", {
        output: responseStr,
        usage: response.usage,
        status: "completed",
        input: messages,
      });
      operationContext.isActive = false;

      this.updateHistoryEntry(operationContext, {
        output: responseStr,
        usage: response.usage,
        endTime: new Date(),
        status: "completed",
      });

      // Create initial response for onEnd hook
      const initialResponse: GenerateObjectResponse<TProvider, TSchema> = {
        ...response,
        userContext: new Map(operationContext.userContext),
      };

      await this.getMergedHooks(internalOptions).onEnd?.({
        agent: this,
        output: initialResponse,
        error: undefined,
        conversationId: finalConversationId,
        context: operationContext,
      });

      // Extend the original response with userContext AFTER onEnd hook
      const extendedResponse: GenerateObjectResponse<TProvider, TSchema> = {
        ...response,
        userContext: new Map(operationContext.userContext),
      };

      // Log successful completion
      const usage = response.usage;
      const tokenInfo = usage ? `${usage.totalTokens} tokens` : "no usage data";

      methodLogger.debug(
        buildAgentLogMessage(
          this.name,
          ActionType.OBJECT_GENERATION_COMPLETE,
          `Object generation completed (${tokenInfo})`,
        ),
        {
          event: LogEvents.AGENT_OBJECT_COMPLETED,
          usage: response.usage,
          object: response.object,
        },
      );

      return extendedResponse;
    } catch (error) {
      const voltagentError = error as VoltAgentError;

      // [NEW EVENT SYSTEM] Create an agent:error event
      const agentErrorStartInfo = {
        startTime:
          (operationContext.userContext.get("agent_start_time") as string) ||
          new Date().toISOString(),
        eventId: operationContext.userContext.get("agent_start_event_id") as string,
      };

      const agentErrorEvent: AgentErrorEvent = {
        id: crypto.randomUUID(),
        name: "agent:error",
        type: "agent",
        startTime: agentErrorStartInfo.startTime, // Use the original start time
        endTime: new Date().toISOString(), // Current time as end time
        status: "error",
        level: "ERROR",
        input: null,
        output: null,
        statusMessage: {
          message: voltagentError.message,
          code: voltagentError.code,
          stage: voltagentError.stage,
          ...(voltagentError.originalError
            ? { originalError: String(voltagentError.originalError) }
            : {}),
        },
        metadata: {
          displayName: this.name,
          id: this.id,
          userContext: Object.fromEntries(operationContext.userContext.entries()) as Record<
            string,
            unknown
          >,
        },
        traceId: operationContext.historyEntry.id,
        parentEventId: agentErrorStartInfo.eventId, // Link to the agent:start event
      };

      // Publish the agent:error event (background)
      this.publishTimelineEvent(operationContext, agentErrorEvent);

      this.addAgentEvent(operationContext, "finished", "error", {
        input: messages,
        error: voltagentError,
        errorMessage: voltagentError.message,
        status: "error",
        metadata: {
          code: voltagentError.code,
          originalError: voltagentError.originalError,
          stage: voltagentError.stage,
          toolError: voltagentError.toolError,
          ...voltagentError.metadata,
        },
      });
      operationContext.isActive = false;

      this.updateHistoryEntry(operationContext, {
        status: "error",
        endTime: new Date(),
      });

      // Log error
      methodLogger.error(
        buildAgentLogMessage(this.name, ActionType.ERROR, "Object generation failed"),
        {
          event: LogEvents.AGENT_OBJECT_FAILED,
          error: {
            message: voltagentError.message,
            code: voltagentError.code,
            stage: voltagentError.stage,
          },
        },
      );

      await this.getMergedHooks(internalOptions).onEnd?.({
        agent: this,
        output: undefined,
        error: voltagentError,
        conversationId: finalConversationId,
        context: operationContext,
      });

      throw voltagentError;
    }
  }

  /**
   * Stream a structured object response
   */
  public async streamObject<TSchema extends z.ZodType>(
    input: string | BaseMessage[],
    schema: TSchema,
    options: PublicGenerateOptions = {},
  ): Promise<StreamObjectResponse<TProvider, TSchema>> {
    const internalOptions: InternalGenerateOptions = options as InternalGenerateOptions;
    const {
      userId,
      conversationId: initialConversationId,
      parentAgentId,
      parentHistoryEntryId,
      parentOperationContext,
      provider,
      contextLimit = 10,
      userContext,
      signal,
    } = internalOptions;

    const operationContext = await this.initializeHistory(input, "working", {
      parentAgentId,
      parentHistoryEntryId,
      operationName: "streamObject",
      userContext,
      userId,
      conversationId: initialConversationId,
      parentOperationContext,
      signal,
    });

    const { messages: contextMessages, conversationId: finalConversationId } =
      await this.memoryManager.prepareConversationContext(
        operationContext,
        input,
        userId,
        initialConversationId,
        contextLimit,
      );

    // Use logger from operationContext
    const methodLogger = operationContext.logger;

    const modelName = this.getModelName();

    // Log stream object generation start with only event-specific context
    methodLogger.debug(
      buildAgentLogMessage(
        this.name,
        ActionType.STREAM_OBJECT_START,
        `Starting stream object generation with ${modelName}`,
      ),
      {
        event: LogEvents.AGENT_STREAM_OBJECT_STARTED,
        operationType: "streamObject",
        model: modelName,
        inputType: typeof input === "string" ? "string" : "messages",
        contextLimit,
        memoryEnabled: !!this.memoryManager.getMemory(),
      },
    );

    if (operationContext.otelSpan) {
      if (userId) operationContext.otelSpan.setAttribute("enduser.id", userId);
      if (finalConversationId)
        operationContext.otelSpan.setAttribute("session.id", finalConversationId);
    }

    await this.getMergedHooks(internalOptions).onStart?.({
      agent: this,
      context: operationContext,
    });

    const systemMessageResponse = await this.getSystemMessage({
      input,
      historyEntryId: operationContext.historyEntry.id,
      contextMessages,
      operationContext,
    });

    // Handle both single message and array of messages from getSystemMessage
    const systemMessages = Array.isArray(systemMessageResponse.systemMessages)
      ? systemMessageResponse.systemMessages
      : [systemMessageResponse.systemMessages];
    let messages = [...systemMessages, ...contextMessages];
    messages = await this.formatInputMessages(messages, input);

    // [NEW EVENT SYSTEM] Create an agent:start event
    const agentStartTime = new Date().toISOString(); // Capture agent start time once
    const agentStartEvent: AgentStartEvent = {
      id: crypto.randomUUID(),
      name: "agent:start",
      type: "agent",
      startTime: agentStartTime, // Use captured time
      status: "running",
      input: { input },
      output: null,
      metadata: {
        displayName: this.name,
        id: this.id,
        userContext: Object.fromEntries(operationContext.userContext.entries()) as Record<
          string,
          unknown
        >,
        systemPrompt: systemMessages,
        messages,
        promptMetadata: systemMessageResponse.promptMetadata,
        isDynamicInstructions: systemMessageResponse.isDynamicInstructions,
        modelParameters: {
          model: this.getModelName(),
          maxTokens: internalOptions.provider?.maxTokens,
          temperature: internalOptions.provider?.temperature,
          topP: internalOptions.provider?.topP,
          frequencyPenalty: internalOptions.provider?.frequencyPenalty,
          presencePenalty: internalOptions.provider?.presencePenalty,
          maxSteps: internalOptions.maxSteps,
        },
      },
      traceId: operationContext.historyEntry.id,
    };

    // Store agent start time in the operation context for later reference
    operationContext.userContext.set("agent_start_time", agentStartTime);
    operationContext.userContext.set("agent_start_event_id", agentStartEvent.id);

    // Publish the new event through AgentEventEmitter
    this.publishTimelineEvent(operationContext, agentStartEvent);

    // Setup abort signal listener (after finalConversationId and agentStartEvent are available)
    this.setupAbortSignalListener(signal, operationContext, finalConversationId, {
      id: agentStartEvent.id,
      startTime: agentStartTime,
    });

    const onStepFinish = this.memoryManager.createStepFinishHandler(
      operationContext,
      userId,
      finalConversationId,
    );

    // Resolve dynamic model based on user context
    const promptHelper = VoltOpsClientClass.createPromptHelperWithFallback(
      this.id,
      this.name,
      this.instructions,
      this.voltOpsClient,
    );
    const dynamicValueOptions: DynamicValueOptions = {
      userContext: operationContext.userContext || new Map(),
      prompts: promptHelper,
    };
    const resolvedModel = await this.resolveModel(dynamicValueOptions);

    const response = await this.llm.streamObject({
      messages,
      model: resolvedModel,
      schema,
      provider,
      signal: internalOptions.signal,
      toolExecutionContext: {
        operationContext: operationContext,
        agentId: this.id,
        historyEntryId: operationContext.historyEntry.id,
      } as ToolExecutionContext,
      onStepFinish: async (step) => {
        this.addStepToHistory(step, operationContext);
        await onStepFinish(step);
        if (provider?.onStepFinish) {
          await (provider.onStepFinish as (step: StepWithContent) => Promise<void>)(step);
        }
      },
      onFinish: async (result: StreamObjectFinishResult<z.infer<TSchema>>) => {
        if (!operationContext.isActive) {
          return;
        }

        // [NEW EVENT SYSTEM] Create an agent:success event
        const agentStartInfo = {
          startTime:
            (operationContext.userContext.get("agent_start_time") as string) || agentStartTime,
          eventId:
            (operationContext.userContext.get("agent_start_event_id") as string) ||
            agentStartEvent.id,
        };

        const agentSuccessEvent: AgentSuccessEvent = {
          id: crypto.randomUUID(),
          name: "agent:success",
          type: "agent",
          startTime: agentStartInfo.startTime, // Use the original start time
          endTime: new Date().toISOString(), // Current time as end time
          status: "completed",
          input: null,
          output: { object: result.object },
          metadata: {
            displayName: this.name,
            id: this.id,
            usage: result.usage,
            userContext: Object.fromEntries(operationContext.userContext.entries()) as Record<
              string,
              unknown
            >,
            modelParameters: {
              model: this.getModelName(),
              maxTokens: internalOptions.provider?.maxTokens,
              temperature: internalOptions.provider?.temperature,
              topP: internalOptions.provider?.topP,
              frequencyPenalty: internalOptions.provider?.frequencyPenalty,
              presencePenalty: internalOptions.provider?.presencePenalty,
              maxSteps: internalOptions.maxSteps,
            },
          },
          traceId: operationContext.historyEntry.id,
          parentEventId: agentStartInfo.eventId, // Link to the agent:start event
        };

        // Publish the agent:success event (background)
        this.publishTimelineEvent(operationContext, agentSuccessEvent);

        const responseStr = JSON.stringify(result.object);
        this.addAgentEvent(operationContext, "finished", "completed", {
          input: messages,
          output: responseStr,
          usage: result.usage,
          status: "completed",
          metadata: {
            finishReason: result.finishReason,
            warnings: result.warnings,
            providerResponse: result.providerResponse,
          },
        });

        this.updateHistoryEntry(operationContext, {
          output: responseStr,
          usage: result.usage,
          status: "completed",
        });

        operationContext.isActive = false;

        // Create initial result for onEnd hook
        const initialResult = {
          ...result,
          userContext: new Map(operationContext.userContext),
        };

        await this.getMergedHooks(internalOptions).onEnd?.({
          agent: this,
          output: initialResult,
          error: undefined,
          conversationId: finalConversationId,
          context: operationContext,
        });

        // Add userContext to result AFTER onEnd hook
        const resultWithContext = {
          ...result,
          userContext: new Map(operationContext.userContext),
        };

        // Log successful completion
        const usage = result.usage;
        const tokenInfo = usage ? `${usage.totalTokens} tokens` : "no usage data";

        methodLogger.debug(
          buildAgentLogMessage(
            this.name,
            ActionType.STREAM_OBJECT_COMPLETE,
            `Stream object generation completed (${tokenInfo})`,
          ),
          {
            event: LogEvents.AGENT_STREAM_OBJECT_COMPLETED,
            usage: result.usage,
            object: result.object,
            finishReason: result.finishReason,
          },
        );

        if (provider?.onFinish) {
          await (provider.onFinish as StreamObjectOnFinishCallback<z.infer<TSchema>>)(
            resultWithContext,
          );
        }
      },
      onError: async (error: VoltAgentError) => {
        if (error.toolError) {
          const { toolName } = error.toolError;
          const tool = this.toolManager.getToolByName(toolName);
          if (tool) {
            await this.getMergedHooks(internalOptions).onToolEnd?.({
              agent: this,
              tool,
              output: undefined,
              error: error,
              context: operationContext,
            });
          }
        }

        // [NEW EVENT SYSTEM] Create an agent:error event
        const agentErrorStartInfo = {
          startTime:
            (operationContext.userContext.get("agent_start_time") as string) ||
            new Date().toISOString(),
          eventId: operationContext.userContext.get("agent_start_event_id") as string,
        };

        const agentErrorEvent: AgentErrorEvent = {
          id: crypto.randomUUID(),
          name: "agent:error",
          type: "agent",
          startTime: agentErrorStartInfo.startTime, // Use the original start time
          endTime: new Date().toISOString(), // Current time as end time
          status: "error",
          level: "ERROR",
          input: null,
          output: null,
          statusMessage: {
            message: error.message,
            code: error.code,
            stage: error.stage,
            ...(error.originalError ? { originalError: String(error.originalError) } : {}),
          },
          metadata: {
            displayName: this.name,
            id: this.id,
            userContext: Object.fromEntries(operationContext.userContext.entries()) as Record<
              string,
              unknown
            >,
          },
          traceId: operationContext.historyEntry.id,
          parentEventId: agentErrorStartInfo.eventId, // Link to the agent:start event
        };

        // Publish the agent:error event (background)
        this.publishTimelineEvent(operationContext, agentErrorEvent);

        this.addAgentEvent(operationContext, "finished", "error", {
          input: messages,
          error: error,
          errorMessage: error.message,
          status: "error",
          metadata: {
            code: error.code,
            originalError: error.originalError,
            stage: error.stage,
            toolError: error.toolError,
            ...error.metadata,
          },
        });

        this.updateHistoryEntry(operationContext, {
          status: "error",
        });

        operationContext.isActive = false;

        // Log error
        methodLogger.error(
          buildAgentLogMessage(this.name, ActionType.ERROR, "Stream object generation failed"),
          {
            event: LogEvents.AGENT_STREAM_OBJECT_FAILED,
            error: {
              message: error.message,
              code: error.code,
              stage: error.stage,
            },
          },
        );

        if (provider?.onError) {
          await (provider.onError as StreamOnErrorCallback)(error);
        }

        await this.getMergedHooks(internalOptions).onEnd?.({
          agent: this,
          output: undefined,
          error: error,
          conversationId: finalConversationId,
          context: operationContext,
        });
      },
    });

    // Add userContext to the response for backward compatibility
    const extendedResponse: StreamObjectResponse<TProvider, TSchema> = {
      ...response,
      userContext: new Map(operationContext.userContext),
    };

    return extendedResponse;
  }

  /**
   * Add a sub-agent that this agent can delegate tasks to
   */
  public addSubAgent(agentConfig: SubAgentConfig): void {
    this.subAgentManager.addSubAgent(agentConfig);

    // Add delegate tool if this is the first sub-agent
    if (this.subAgentManager.getSubAgents().length === 1) {
      const delegateTool = this.subAgentManager.createDelegateTool({
        sourceAgent: this,
      });
      this.toolManager.addTool(delegateTool);
    }
  }

  /**
   * Remove a sub-agent
   */
  public removeSubAgent(agentId: string): void {
    this.subAgentManager.removeSubAgent(agentId);

    // Remove delegate tool if no sub-agents left
    if (this.subAgentManager.getSubAgents().length === 0) {
      this.toolManager.removeTool("delegate_task");
    }
  }

  /**
   * Get agent's tools for API exposure
   */
  public getToolsForApi() {
    // Delegate to tool manager
    return this.toolManager.getToolsForApi();
  }

  /**
   * Get all tools
   */
  public getTools(): BaseTool[] {
    // Delegate to tool manager
    return this.toolManager.getTools();
  }

  /**
   * Get agent's model name for API exposure
   */
  public getModelName(): string {
    // Delegate to the provider's standardized method
    return this.llm.getModelIdentifier(this.model);
  }

  /**
   * Get all sub-agents
   */
  public getSubAgents(): SubAgentConfig[] {
    return this.subAgentManager.getSubAgents();
  }

  /**
   * Unregister this agent
   */
  public unregister(): void {
    // Notify event system about agent unregistration
    AgentEventEmitter.getInstance().emitAgentUnregistered(this.id);
  }

  /**
   * Get agent's history manager
   * This provides access to the history manager for direct event handling
   * @returns The history manager instance
   */
  public getHistoryManager(): HistoryManager {
    return this.historyManager;
  }

  /**
   * Checks if telemetry (VoltAgentExporter) is configured for this agent.
   * @returns True if telemetry is configured, false otherwise.
   */
  public isTelemetryConfigured(): boolean {
    return this.historyManager.isExporterConfigured();
  }

  /**
   * Add one or more tools or toolkits to the agent.
   * Delegates to ToolManager's addItems method.
   * @returns Object containing added items (difficult to track precisely here, maybe simplify return)
   */
  public addItems(items: (Tool<any> | Toolkit)[]): { added: (Tool<any> | Toolkit)[] } {
    // ToolManager handles the logic of adding tools vs toolkits and checking conflicts
    this.toolManager.addItems(items);

    // Returning the original list as 'added' might be misleading if conflicts occurred.
    // A simpler approach might be to return void or let ToolManager handle logging.
    // For now, returning the input list for basic feedback.
    return {
      added: items,
    };
  }

  /**
   * @internal
   * Internal method to set the VoltAgentExporter on the agent's HistoryManager.
   * This is typically called by the main VoltAgent instance after it has initialized its exporter.
   */
  public _INTERNAL_setVoltAgentExporter(exporter: VoltAgentExporter): void {
    if (this.historyManager) {
      this.historyManager.setExporter(exporter);
    }
  }

  /**
   * Helper method to merge the agent's hooks with the ones passed in the options
   * @param options - The options passed to the generate method
   * @returns The merged hooks
   */
  private getMergedHooks(options: Pick<InternalGenerateOptions, "hooks">): AgentHooks {
    if (!options.hooks) {
      return this.hooks;
    }
    return {
      onStart: async (...args) => {
        await options.hooks?.onStart?.(...args);
        await this.hooks.onStart?.(...args);
      },
      onEnd: async (...args) => {
        await options.hooks?.onEnd?.(...args);
        await this.hooks.onEnd?.(...args);
      },
      onHandoff: async (...args) => {
        await options.hooks?.onHandoff?.(...args);
        await this.hooks.onHandoff?.(...args);
      },
      onToolStart: async (...args) => {
        await options.hooks?.onToolStart?.(...args);
        await this.hooks.onToolStart?.(...args);
      },
      onToolEnd: async (...args) => {
        await options.hooks?.onToolEnd?.(...args);
        await this.hooks.onToolEnd?.(...args);
      },
    };
  }

  /**
   * Helper method to get retriever context with event handling
   */
  private async getRetrieverContext(
    input: string | BaseMessage[],
    historyEntryId: string,
    operationContext?: OperationContext,
  ): Promise<string | null> {
    if (!this.retriever) return null;

    // [NEW EVENT SYSTEM] Create a retriever:start event
    const retrieverStartTime = new Date().toISOString(); // Capture start time
    const retrieverStartEvent: RetrieverStartEvent = {
      id: crypto.randomUUID(),
      name: "retriever:start",
      type: "retriever",
      startTime: retrieverStartTime,
      status: "running",
      input: { query: input },
      output: null,
      metadata: {
        displayName: this.retriever?.tool.name || "Retriever",
        id: this.retriever?.tool.name,
        agentId: this.id,
      },
      traceId: historyEntryId,
    };

    // Publish the retriever:start event (background) with parent context
    this.publishTimelineEvent(operationContext, retrieverStartEvent);

    const retrieverLogger = operationContext?.logger || this.logger;

    // Log retriever search started
    const retrieverName = this.retriever.tool.name || "search_knowledge";
    retrieverLogger.debug(
      buildRetrieverLogMessage(retrieverName, ActionType.START, "search started"),
      buildLogContext(ResourceType.RETRIEVER, retrieverName, ActionType.START, {
        event: LogEvents.RETRIEVER_SEARCH_STARTED,
        query: typeof input === "string" ? input : "BaseMessage[]",
      }),
    );

    try {
      const context = await this.retriever.retrieve(input, {
        userContext: operationContext?.userContext,
        logger: retrieverLogger,
      });

      if (context?.trim()) {
        // Log retriever search completed
        retrieverLogger.debug(
          buildRetrieverLogMessage(retrieverName, ActionType.COMPLETE, "search completed"),
          buildLogContext(ResourceType.RETRIEVER, retrieverName, ActionType.COMPLETE, {
            event: LogEvents.RETRIEVER_SEARCH_COMPLETED,
            result: context,
          }),
        );

        // [NEW EVENT SYSTEM] Create a retriever:success event
        const retrieverSuccessEvent: RetrieverSuccessEvent = {
          id: crypto.randomUUID(),
          name: "retriever:success",
          type: "retriever",
          startTime: new Date().toISOString(), // Use the original start time
          endTime: new Date().toISOString(), // Current time as end time
          status: "completed",
          input: null,
          output: { context },
          metadata: {
            displayName: this.retriever.tool.name || "Retriever",
            id: this.retriever.tool.name,
            agentId: this.id,
          },
          traceId: historyEntryId,
          parentEventId: retrieverStartEvent.id, // Link to the retriever:start event
        };

        // Publish the retriever:success event (background) with parent context
        this.publishTimelineEvent(operationContext, retrieverSuccessEvent);
        return context;
      }

      // If there was no context returned, log it and still create a success event
      // but with a note that no context was found
      retrieverLogger.debug(
        buildRetrieverLogMessage(
          retrieverName,
          ActionType.COMPLETE,
          "search completed - no relevant context found",
        ),
        buildLogContext(ResourceType.RETRIEVER, retrieverName, ActionType.COMPLETE, {
          event: LogEvents.RETRIEVER_SEARCH_COMPLETED,
          result: "No relevant context found",
        }),
      );

      const retrieverSuccessEvent: RetrieverSuccessEvent = {
        id: crypto.randomUUID(),
        name: "retriever:success",
        type: "retriever",
        startTime: new Date().toISOString(), // Use the original start time
        endTime: new Date().toISOString(), // Current time as end time
        status: "completed",
        input: null,
        output: { context: "No relevant context found" },
        metadata: {
          displayName: this.retriever.tool.name || "Retriever",
          id: this.retriever.tool.name,
          agentId: this.id,
        },
        traceId: historyEntryId,
        parentEventId: retrieverStartEvent.id, // Link to the retriever:start event
      };

      // Publish the retriever:success event (empty result, background) with parent context
      this.publishTimelineEvent(operationContext, retrieverSuccessEvent);
      return null;
    } catch (error) {
      // Log retriever search failed
      retrieverLogger.error(
        buildRetrieverLogMessage(retrieverName, ActionType.ERROR, "search failed"),
        buildLogContext(ResourceType.RETRIEVER, retrieverName, ActionType.ERROR, {
          event: LogEvents.RETRIEVER_SEARCH_FAILED,
          query: typeof input === "string" ? input : "BaseMessage[]",
          error,
        }),
      );

      // [NEW EVENT SYSTEM] Create a retriever:error event
      const retrieverErrorEvent: RetrieverErrorEvent = {
        id: crypto.randomUUID(),
        name: "retriever:error",
        type: "retriever",
        startTime: new Date().toISOString(), // Use the original start time
        endTime: new Date().toISOString(), // Current time as end time
        status: "error",
        level: "ERROR",
        input: null,
        output: null,
        statusMessage: {
          message: error instanceof Error ? error.message : "Unknown retriever error",
          ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
        },
        metadata: {
          displayName: this.retriever.tool.name || "Retriever",
          id: this.retriever.tool.name,
          agentId: this.id,
        },
        traceId: historyEntryId,
        parentEventId: retrieverStartEvent.id, // Link to the retriever:start event
      };

      // Publish the retriever:error event (background) with parent context
      this.publishTimelineEvent(operationContext, retrieverErrorEvent);

      this.logger.warn("Failed to retrieve context", { error, agentId: this.id });
      return null;
    }
  }
}
