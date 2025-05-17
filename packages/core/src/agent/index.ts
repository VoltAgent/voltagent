import type { z } from "zod";
import { AgentEventEmitter } from "../events";
import type { EventStatus, EventUpdater } from "../events";
import { MemoryManager } from "../memory";
import type { Tool, Toolkit } from "../tool";
import { ToolManager } from "../tool";
import type { ReasoningToolExecuteOptions } from "../tool/reasoning/types";
import { type AgentHistoryEntry, HistoryManager } from "./history";
import { type AgentHooks, createHooks } from "./hooks";
import type {
  BaseMessage,
  BaseTool,
  LLMProvider,
  StepWithContent,
  ToolExecuteOptions,
} from "./providers";
import { SubAgentManager } from "./subagent";
import type {
  AgentOptions,
  AgentStatus,
  CommonGenerateOptions,
  InferGenerateObjectResponse,
  InferGenerateTextResponse,
  InferStreamObjectResponse,
  InferStreamTextResponse,
  InternalGenerateOptions,
  ModelType,
  ProviderInstance,
  PublicGenerateOptions,
  OperationContext,
  ToolExecutionContext,
  VoltAgentError,
  StreamOnErrorCallback,
  StreamTextFinishResult,
  StreamTextOnFinishCallback,
  StreamObjectFinishResult,
  StreamObjectOnFinishCallback,
  StandardizedTextResult,
  StandardizedObjectResult,
} from "./types";
import type { BaseRetriever } from "../retriever/retriever";
import { NodeType, createNodeId } from "../utils/node-utils";
import type { StandardEventData } from "../events/types";
import type { Voice } from "../voice";
import { serializeValueForDebug } from "../utils/serialization";
import { AgentRegistry } from "../server/registry";
import type { VoltAgentExporter } from "../telemetry/exporter";

import { startOperationSpan, endOperationSpan, startToolSpan, endToolSpan } from "./open-telemetry";
import type { Span } from "@opentelemetry/api";

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
   * @deprecated Use `instructions` instead. Will be removed in a future version.
   */
  readonly description: string;

  /**
   * Agent instructions. This is the preferred field over `description`.
   */
  readonly instructions: string;

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
   * Create a new agent
   */
  constructor(
    options: AgentOptions &
      TProvider & {
        model: ModelType<TProvider>;
        subAgents?: Agent<any>[]; // Reverted to Agent<any>[] temporarily
        maxHistoryEntries?: number;
        hooks?: AgentHooks;
        retriever?: BaseRetriever;
        voice?: Voice;
        markdown?: boolean;
        telemetryExporter?: VoltAgentExporter;
      },
  ) {
    this.id = options.id || options.name;
    this.name = options.name;
    this.instructions = options.instructions ?? options.description ?? "A helpful AI assistant";
    this.description = this.instructions;
    this.llm = options.llm as ProviderInstance<TProvider>;
    this.model = options.model;
    this.retriever = options.retriever;
    this.voice = options.voice;
    this.markdown = options.markdown ?? false;

    // Initialize hooks
    if (options.hooks) {
      this.hooks = options.hooks;
    } else {
      this.hooks = createHooks();
    }

    // Initialize memory manager
    this.memoryManager = new MemoryManager(this.id, options.memory, options.memoryOptions || {});

    // Initialize tool manager (tools are now passed directly)
    this.toolManager = new ToolManager(options.tools || []);

    // Initialize sub-agent manager
    this.subAgentManager = new SubAgentManager(this.name, options.subAgents || []);

    // Initialize history manager
    const chosenExporter =
      options.telemetryExporter || AgentRegistry.getInstance().getGlobalVoltAgentExporter();
    this.historyManager = new HistoryManager(
      this.id,
      this.memoryManager,
      options.maxHistoryEntries || 0,
      chosenExporter,
    );
  }

  /**
   * Get the system message for the agent
   */
  protected async getSystemMessage({
    input,
    historyEntryId,
    contextMessages,
  }: {
    input?: string | BaseMessage[];
    historyEntryId: string;
    contextMessages: BaseMessage[];
  }): Promise<BaseMessage> {
    let baseInstructions = this.instructions || ""; // Ensure baseInstructions is a string

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

    // If retriever exists and we have input, get context
    if (this.retriever && input && historyEntryId) {
      // Create retriever node ID
      const retrieverNodeId = createNodeId(NodeType.RETRIEVER, this.retriever.tool.name, this.id);

      // Create tracked event
      const eventEmitter = AgentEventEmitter.getInstance();
      const eventUpdater = await eventEmitter.createTrackedEvent({
        agentId: this.id,
        historyId: historyEntryId,
        name: "retriever:working",
        status: "working" as AgentStatus,
        data: {
          affectedNodeId: retrieverNodeId,
          status: "working" as EventStatus,
          timestamp: new Date().toISOString(),
          input: input,
        },
        type: "retriever",
      });

      try {
        const context = await this.retriever.retrieve(input);
        if (context?.trim()) {
          finalInstructions = `${finalInstructions}\n\nRelevant Context:\n${context}`;

          // Update the event
          eventUpdater({
            data: {
              status: "completed" as EventStatus,
              output: context,
            },
          });
        }
      } catch (error) {
        // Update the event as error
        eventUpdater({
          status: "error" as AgentStatus,
          data: {
            status: "error" as EventStatus,
            error: error,
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          },
        });
        console.warn("Failed to retrieve context:", error);
      }
    }

    // If the agent has sub-agents, generate supervisor system message
    if (this.subAgentManager.hasSubAgents()) {
      // Fetch recent agent history for the sub-agents
      const agentsMemory = await this.prepareAgentsMemory(contextMessages);

      // Generate the supervisor message with the agents memory inserted
      finalInstructions = this.subAgentManager.generateSupervisorSystemMessage(
        finalInstructions,
        agentsMemory,
      );

      return {
        role: "system",
        content: finalInstructions,
      };
    }

    return {
      role: "system",
      content: `You are ${this.name}. ${finalInstructions}`,
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
      console.warn("Error preparing agents memory:", error);
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
    return this.subAgentManager.calculateMaxSteps();
  }

  /**
   * Prepare common options for text generation
   */
  private prepareTextOptions(options: CommonGenerateOptions = {}): {
    tools: BaseTool[];
    maxSteps: number;
  } {
    const { tools: dynamicTools, historyEntryId, operationContext } = options;
    const baseTools = this.toolManager.prepareToolsForGeneration(dynamicTools);

    // Ensure operationContext exists before proceeding
    if (!operationContext) {
      console.warn(
        `[Agent ${this.id}] Missing operationContext in prepareTextOptions. Tool execution context might be incomplete.`,
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

          // Specifically handle Reasoning Tools if needed (though context is now injected for all)
          if (tool.name === "think" || tool.name === "analyze") {
            // Reasoning tools expect ReasoningToolExecuteOptions, which includes agentId and historyEntryId
            // These are already present in finalExecOptions via toolExecutionContext
            const reasoningOptions: ReasoningToolExecuteOptions =
              finalExecOptions as ReasoningToolExecuteOptions; // Cast should be safe here

            if (!reasoningOptions.historyEntryId || reasoningOptions.historyEntryId === "unknown") {
              console.warn(
                `Executing reasoning tool '${tool.name}' without a known historyEntryId within the operation context.`,
              );
            }
            // Pass the correctly typed options
            return originalExecute(args, reasoningOptions);
          }

          // Execute regular tools with the injected context
          return originalExecute(args, finalExecOptions);
        },
      };
    });

    // If this agent has sub-agents, always create a new delegate tool with current historyEntryId
    if (this.subAgentManager.hasSubAgents()) {
      // Always create a delegate tool with the current operationContext
      const delegateTool = this.subAgentManager.createDelegateTool({
        sourceAgent: this,
        currentHistoryEntryId: historyEntryId,
        operationContext: options.operationContext,
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
      maxSteps: this.calculateMaxSteps(),
    };
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

    const historyEntry = await this.historyManager.addEntry(
      input,
      "",
      initialStatus,
      [],
      {
        events: [],
      },
      this.getFullState(),
      options.userId,
      options.conversationId,
    );

    const opContext: OperationContext = {
      operationId: historyEntry.id,
      userContext: options.userContext
        ? new Map(options.userContext)
        : new Map<string | symbol, unknown>(),
      historyEntry,
      eventUpdaters: new Map<string, EventUpdater>(),
      isActive: true,
      parentAgentId: options.parentAgentId,
      parentHistoryEntryId: options.parentHistoryEntryId,
      otelSpan: otelSpan,
    };

    // Standardized message event
    this.createStandardTimelineEvent(
      opContext.historyEntry.id,
      "start",
      "idle" as EventStatus,
      NodeType.MESSAGE,
      this.id,
      {
        input: input,
      },
      "agent",
      opContext,
    );

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
      instructions: this.instructions,
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
   * Add step to history immediately
   */
  private addStepToHistory(step: StepWithContent, context: OperationContext): void {
    this.historyManager.addStepsToEntry(context.historyEntry.id, [step]);
  }

  /**
   * Update history entry
   */
  private updateHistoryEntry(context: OperationContext, updates: Partial<AgentHistoryEntry>): void {
    this.historyManager.updateEntry(context.historyEntry.id, updates);
  }

  /**
   * Standard timeline event creator
   */
  private createStandardTimelineEvent = (
    historyId: string,
    eventName: string,
    status: EventStatus,
    nodeType: NodeType,
    nodeName: string,
    data: Partial<StandardEventData> = {},
    type: "memory" | "tool" | "agent" | "retriever" = "agent",
    context?: OperationContext,
  ): void => {
    if (!historyId) return;

    const affectedNodeId = createNodeId(nodeType, nodeName, this.id);

    // Serialize userContext if context is available and userContext has entries
    let userContextData: Record<string, unknown> | undefined = undefined;
    if (context?.userContext && context.userContext.size > 0) {
      try {
        // Use the custom serialization helper
        userContextData = {};
        for (const [key, value] of context.userContext.entries()) {
          const stringKey = typeof key === "symbol" ? key.toString() : String(key);
          userContextData[stringKey] = serializeValueForDebug(value);
        }
      } catch (error) {
        console.warn("Failed to serialize userContext:", error);
        userContextData = { serialization_error: true };
      }
    }

    // Create the event data, including the serialized userContext
    const eventData: Partial<StandardEventData> & {
      userContext?: Record<string, unknown>;
    } = {
      affectedNodeId,
      status: status as any,
      timestamp: new Date().toISOString(),
      sourceAgentId: this.id,
      ...data,
      ...(userContextData && { userContext: userContextData }),
    };

    // Create the event payload
    const eventPayload = {
      agentId: this.id,
      historyId,
      eventName,
      status: status as any,
      additionalData: eventData,
      type,
    };

    // Use central event emitter
    AgentEventEmitter.getInstance().addHistoryEvent(eventPayload);

    // If context exists and has parent information, propagate the event to parent
    if (context?.parentAgentId && context?.parentHistoryEntryId) {
      // Create a parent event payload
      const parentEventPayload = {
        ...eventPayload,
        agentId: context.parentAgentId,
        historyId: context.parentHistoryEntryId,
        // Keep the same additionalData with original affectedNodeId
      };

      // Add event to parent agent's history
      AgentEventEmitter.getInstance().addHistoryEvent(parentEventPayload);
    }
  };

  /**
   * Fix delete operator usage for better performance
   */
  private addToolEvent = async (
    context: OperationContext,
    eventName: string,
    toolName: string,
    status: EventStatus,
    data: Partial<StandardEventData> & Record<string, unknown> = {},
  ): Promise<EventUpdater> => {
    // Ensure the toolSpans map exists on the context
    if (!context.toolSpans) {
      context.toolSpans = new Map<string, Span>();
    }

    const toolNodeId = createNodeId(NodeType.TOOL, toolName, this.id);
    const toolCallId = data.toolId?.toString();

    if (toolCallId && status === "working") {
      if (context.toolSpans.has(toolCallId)) {
        console.warn(`[VoltAgentCore] OTEL tool span already exists for toolCallId: ${toolCallId}`);
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

    const metadata: Record<string, unknown> = {
      ...(data.metadata || {}),
    };
    const { input, output, error, errorMessage, ...standardData } = data;
    let userContextData: Record<string, unknown> | undefined = undefined;
    if (context?.userContext && context.userContext.size > 0) {
      try {
        userContextData = {};
        for (const [key, value] of context.userContext.entries()) {
          const stringKey = typeof key === "symbol" ? key.toString() : String(key);
          userContextData[stringKey] = serializeValueForDebug(value);
        }
      } catch (err) {
        console.warn("Failed to serialize userContext for tool event:", err);
        userContextData = { serialization_error: true };
      }
    }
    const internalEventData: Partial<StandardEventData> & {
      userContext?: Record<string, unknown>;
      toolId?: string;
    } = {
      affectedNodeId: toolNodeId,
      status: status as any,
      timestamp: new Date().toISOString(),
      input: data.input,
      output: data.output,
      error: data.error,
      errorMessage: data.errorMessage,
      metadata,
      toolId: toolCallId,
      ...standardData,
      ...(userContextData && { userContext: userContextData }),
    };
    internalEventData.metadata = {
      ...internalEventData.metadata,
      sourceAgentId: this.id,
      toolName: toolName,
    };
    const eventEmitter = AgentEventEmitter.getInstance();
    const eventUpdater = await eventEmitter.createTrackedEvent({
      agentId: this.id,
      historyId: context.historyEntry.id,
      name: eventName,
      status: status as any,
      data: internalEventData,
      type: "tool",
    });
    let parentUpdater: EventUpdater | null = null;
    if (context.parentAgentId && context.parentHistoryEntryId) {
      parentUpdater = await eventEmitter.createTrackedEvent({
        agentId: context.parentAgentId,
        historyId: context.parentHistoryEntryId,
        name: eventName,
        status: status as any,
        data: { ...internalEventData, sourceAgentId: this.id },
        type: "tool",
      });
    }
    return async (update: {
      status?: AgentStatus;
      data?: Record<string, unknown>;
    }): Promise<AgentHistoryEntry | undefined> => {
      const result = await eventUpdater(update);
      if (parentUpdater) {
        await parentUpdater(update);
      }
      return result;
    };
  };

  /**
   * Agent event creator (update)
   */
  private addAgentEvent = (
    context: OperationContext,
    eventName: string,
    status: AgentStatus,
    data: Partial<StandardEventData> & Record<string, unknown> = {},
  ): void => {
    // Retrieve the OpenTelemetry span from the context
    const otelSpan = context.otelSpan;

    if (otelSpan) {
      endOperationSpan({
        span: otelSpan,
        status: status as any,
        data,
      });
    } else {
      console.warn(
        `[VoltAgentCore] OpenTelemetry span not found in OperationContext for agent event ${eventName} (Operation ID: ${context.operationId})`,
      );
    }

    // Move non-standard fields to metadata
    const metadata: Record<string, unknown> = {
      ...(data.metadata || {}),
    };

    // Extract data fields to use while avoiding parameter reassignment
    const { usage, ...standardData } = data;

    if (usage) {
      metadata.usage = usage;
    }

    // Create new data with metadata
    const eventData: Partial<StandardEventData> = {
      ...standardData,
      metadata,
    };

    this.createStandardTimelineEvent(
      context.historyEntry.id,
      eventName,
      status,
      NodeType.AGENT,
      this.id,
      eventData,
      "agent",
      context,
    );
  };

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
      endToolSpan({ span: toolSpan, resultData });
      context.toolSpans?.delete(toolCallId); // Remove from map after ending
    } else {
      console.warn(
        `[VoltAgentCore] OTEL tool span not found for toolCallId: ${toolCallId} in _endOtelToolSpan (Tool: ${toolName})`,
      );
    }
  }

  /**
   * Generate a text response without streaming
   */
  async generateText(
    input: string | BaseMessage[],
    options: PublicGenerateOptions = {},
  ): Promise<InferGenerateTextResponse<TProvider>> {
    const internalOptions: InternalGenerateOptions = options as InternalGenerateOptions;
    const {
      userId,
      conversationId: initialConversationId,
      parentAgentId,
      parentHistoryEntryId,
      contextLimit = 10,
      userContext,
    } = internalOptions;

    const operationContext = await this.initializeHistory(input, "working", {
      parentAgentId,
      parentHistoryEntryId,
      operationName: "generateText",
      userContext,
      userId,
      conversationId: initialConversationId,
    });

    const { messages: contextMessages, conversationId: finalConversationId } =
      await this.memoryManager.prepareConversationContext(
        operationContext,
        input,
        userId,
        initialConversationId,
        contextLimit,
      );

    if (operationContext.otelSpan) {
      if (userId) operationContext.otelSpan.setAttribute("enduser.id", userId);
      if (finalConversationId)
        operationContext.otelSpan.setAttribute("session.id", finalConversationId);
    }

    let messages: BaseMessage[] = [];
    try {
      await this.hooks.onStart?.({ agent: this, context: operationContext });

      const systemMessage = await this.getSystemMessage({
        input,
        historyEntryId: operationContext.historyEntry.id,
        contextMessages,
      });

      messages = [systemMessage, ...contextMessages];
      messages = await this.formatInputMessages(messages, input);

      this.createStandardTimelineEvent(
        operationContext.historyEntry.id,
        "start",
        "working",
        NodeType.AGENT,
        this.id,
        { input: messages },
        "agent",
        operationContext,
      );

      const onStepFinish = this.memoryManager.createStepFinishHandler(
        operationContext,
        userId,
        finalConversationId,
      );
      const { tools, maxSteps } = this.prepareTextOptions({
        ...internalOptions,
        conversationId: finalConversationId,
        historyEntryId: operationContext.historyEntry.id,
        operationContext: operationContext,
      });

      const response = await this.llm.generateText({
        messages,
        model: this.model,
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
          if (step.type === "tool_call") {
            if (step.name && step.id) {
              const tool = this.toolManager.getToolByName(step.name);
              const eventUpdater = await this.addToolEvent(
                operationContext,
                "tool_working",
                step.name,
                "working",
                { toolId: step.id, input: step.arguments || {} },
              );
              operationContext.eventUpdaters.set(step.id, eventUpdater);
              if (tool) {
                await this.hooks.onToolStart?.({
                  agent: this,
                  tool,
                  context: operationContext,
                });
              }
            }
          } else if (step.type === "tool_result") {
            if (step.name && step.id) {
              const toolCallId = step.id;
              const toolName = step.name;
              const eventUpdater = operationContext.eventUpdaters.get(toolCallId);
              if (eventUpdater) {
                const isError = Boolean(step.result?.error);
                const statusForEvent: any = isError ? "error" : "completed";
                await eventUpdater({
                  data: {
                    error: step.result?.error,
                    errorMessage: step.result?.error?.message,
                    status: statusForEvent,
                    updatedAt: new Date().toISOString(),
                    output: step.result ?? step.content,
                  },
                });
                operationContext.eventUpdaters.delete(toolCallId);
              } else {
                console.warn(
                  `[VoltAgentCore] EventUpdater not found for toolCallId: ${toolCallId} in generateText`,
                );
              }
              this._endOtelToolSpan(operationContext, toolCallId, toolName, {
                result: step.result,
                content: step.content,
                error: step.result?.error,
              });
              const tool = this.toolManager.getToolByName(toolName);
              if (tool) {
                await this.hooks.onToolEnd?.({
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

      operationContext.eventUpdaters.clear();
      this.updateHistoryEntry(operationContext, {
        output: response.text,
        usage: response.usage,
        status: "completed" as any,
      });
      this.addAgentEvent(operationContext, "finished", "completed" as any, {
        input: messages,
        output: response.text,
        usage: response.usage,
        affectedNodeId: `agent_${this.id}`,
        status: "completed" as any,
      });
      operationContext.isActive = false;
      const standardizedOutput: StandardizedTextResult = {
        text: response.text,
        usage: response.usage,
        finishReason: response.finishReason,
        providerResponse: response,
      };
      await this.hooks.onEnd?.({
        agent: this,
        output: standardizedOutput,
        error: undefined,
        context: operationContext,
      });
      const typedResponse = response as InferGenerateTextResponse<TProvider>;
      return typedResponse;
    } catch (error) {
      const voltagentError = error as VoltAgentError;
      operationContext.eventUpdaters.clear();
      this.addAgentEvent(operationContext, "finished", "error" as any, {
        input: messages,
        error: voltagentError,
        errorMessage: voltagentError.message,
        affectedNodeId: `agent_${this.id}`,
        status: "error" as any,
        metadata: {
          code: voltagentError.code,
          originalError: voltagentError.originalError,
          stage: voltagentError.stage,
          toolError: voltagentError.toolError,
          ...voltagentError.metadata,
        },
      });
      this.updateHistoryEntry(operationContext, {
        output: voltagentError.message,
        status: "error" as any,
      });
      operationContext.isActive = false;
      await this.hooks.onEnd?.({
        agent: this,
        output: undefined,
        error: voltagentError,
        context: operationContext,
      });
      throw voltagentError;
    }
  }

  /**
   * Stream a text response
   */
  async streamText(
    input: string | BaseMessage[],
    options: PublicGenerateOptions = {},
  ): Promise<InferStreamTextResponse<TProvider>> {
    const internalOptions: InternalGenerateOptions = options as InternalGenerateOptions;
    const {
      userId,
      conversationId: initialConversationId,
      parentAgentId,
      parentHistoryEntryId,
      contextLimit = 10,
      userContext,
    } = internalOptions;

    const operationContext = await this.initializeHistory(input, "working", {
      parentAgentId,
      parentHistoryEntryId,
      operationName: "streamText",
      userContext,
      userId,
      conversationId: initialConversationId,
    });

    const { messages: contextMessages, conversationId: finalConversationId } =
      await this.memoryManager.prepareConversationContext(
        operationContext,
        input,
        userId,
        initialConversationId,
        contextLimit,
      );

    if (operationContext.otelSpan) {
      if (userId) operationContext.otelSpan.setAttribute("enduser.id", userId);
      if (finalConversationId)
        operationContext.otelSpan.setAttribute("session.id", finalConversationId);
    }

    await this.hooks.onStart?.({ agent: this, context: operationContext });

    const systemMessage = await this.getSystemMessage({
      input,
      historyEntryId: operationContext.historyEntry.id,
      contextMessages,
    });
    let messages = [systemMessage, ...contextMessages];
    messages = await this.formatInputMessages(messages, input);

    this.createStandardTimelineEvent(
      operationContext.historyEntry.id,
      "start",
      "working",
      NodeType.AGENT,
      this.id,
      { input: messages },
      "agent",
      operationContext,
    );

    const onStepFinish = this.memoryManager.createStepFinishHandler(
      operationContext,
      userId,
      finalConversationId,
    );
    const { tools, maxSteps } = this.prepareTextOptions({
      ...internalOptions,
      conversationId: finalConversationId,
      historyEntryId: operationContext.historyEntry.id,
      operationContext: operationContext,
    });

    const response = await this.llm.streamText({
      messages,
      model: this.model,
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
            const eventUpdater = await this.addToolEvent(
              operationContext,
              "tool_working",
              chunk.name,
              "working",
              { toolId: chunk.id, input: chunk.arguments || {} },
            );
            operationContext.eventUpdaters.set(chunk.id, eventUpdater);
            if (tool) {
              await this.hooks.onToolStart?.({
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
            const eventUpdater = operationContext.eventUpdaters.get(toolCallId);
            if (eventUpdater) {
              const isError = Boolean(chunk.result?.error);
              const statusForEvent: any = isError ? "error" : "completed";
              await eventUpdater({
                data: {
                  error: chunk.result?.error,
                  errorMessage: chunk.result?.error?.message,
                  status: statusForEvent,
                  updatedAt: new Date().toISOString(),
                  output: chunk.result ?? chunk.content,
                },
              });
              operationContext.eventUpdaters.delete(toolCallId);
            } else {
              console.warn(
                `[VoltAgentCore] EventUpdater not found for toolCallId: ${toolCallId} in streamText`,
              );
            }
            this._endOtelToolSpan(operationContext, toolCallId, toolName, {
              result: chunk.result,
              content: chunk.content,
              error: chunk.result?.error,
            });
            const tool = this.toolManager.getToolByName(toolName);
            if (tool) {
              await this.hooks.onToolEnd?.({
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
        operationContext.eventUpdaters.clear();
        this.updateHistoryEntry(operationContext, {
          output: result.text,
          usage: result.usage,
          status: "completed" as any,
        });
        this.addAgentEvent(operationContext, "finished", "completed" as any, {
          input: messages,
          output: result.text,
          usage: result.usage,
          affectedNodeId: `agent_${this.id}`,
          status: "completed" as any,
          metadata: {
            finishReason: result.finishReason,
            warnings: result.warnings,
            providerResponse: result.providerResponse,
          },
        });
        operationContext.isActive = false;
        await this.hooks.onEnd?.({
          agent: this,
          output: result,
          error: undefined,
          context: operationContext,
        });
        if (internalOptions.provider?.onFinish) {
          await (internalOptions.provider.onFinish as StreamTextOnFinishCallback)(result);
        }
      },
      onError: async (error: VoltAgentError) => {
        if (error.toolError) {
          const { toolCallId, toolName } = error.toolError;
          const eventUpdater = operationContext.eventUpdaters.get(toolCallId);
          if (eventUpdater) {
            try {
              const toolNodeId = createNodeId(NodeType.TOOL, toolName, this.id);
              await eventUpdater({
                data: {
                  affectedNodeId: toolNodeId,
                  error: error.message,
                  errorMessage: error.message,
                  status: "error" as any,
                  updatedAt: new Date().toISOString(),
                  output: error.message,
                },
              });
              operationContext.eventUpdaters.delete(toolCallId);
            } catch (updateError) {
              console.error(
                `[Agent ${this.id}] Failed to update tool event to error status for ${toolName} (${toolCallId}):`,
                updateError,
              );
            }
            const tool = this.toolManager.getToolByName(toolName);
            if (tool) {
              await this.hooks.onToolEnd?.({
                agent: this,
                tool,
                output: undefined,
                error: error,
                context: operationContext,
              });
            }
          }
        }
        operationContext.eventUpdaters.clear();
        this.addAgentEvent(operationContext, "finished", "error" as any, {
          input: messages,
          error: error,
          errorMessage: error.message,
          affectedNodeId: `agent_${this.id}`,
          status: "error" as any,
          metadata: {
            code: error.code,
            originalError: error.originalError,
            stage: error.stage,
            toolError: error.toolError,
            ...error.metadata,
          },
        });
        this.updateHistoryEntry(operationContext, {
          output: error.message,
          status: "error" as any,
        });
        operationContext.isActive = false;
        if (internalOptions.provider?.onError) {
          await (internalOptions.provider.onError as StreamOnErrorCallback)(error);
        }
        await this.hooks.onEnd?.({
          agent: this,
          output: undefined,
          error: error,
          context: operationContext,
        });
      },
    });
    const typedResponse = response as InferStreamTextResponse<TProvider>;
    return typedResponse;
  }

  /**
   * Generate a structured object response
   */
  async generateObject<T extends z.ZodType>(
    input: string | BaseMessage[],
    schema: T,
    options: PublicGenerateOptions = {},
  ): Promise<InferGenerateObjectResponse<TProvider>> {
    const internalOptions: InternalGenerateOptions = options as InternalGenerateOptions;
    const {
      userId,
      conversationId: initialConversationId,
      parentAgentId,
      parentHistoryEntryId,
      contextLimit = 10,
      userContext,
    } = internalOptions;

    const operationContext = await this.initializeHistory(input, "working", {
      parentAgentId,
      parentHistoryEntryId,
      operationName: "generateObject",
      userContext,
      userId,
      conversationId: initialConversationId,
    });

    const { messages: contextMessages, conversationId: finalConversationId } =
      await this.memoryManager.prepareConversationContext(
        operationContext,
        input,
        userId,
        initialConversationId,
        contextLimit,
      );

    if (operationContext.otelSpan) {
      if (userId) operationContext.otelSpan.setAttribute("enduser.id", userId);
      if (finalConversationId)
        operationContext.otelSpan.setAttribute("session.id", finalConversationId);
    }

    let messages: BaseMessage[] = [];
    try {
      await this.hooks.onStart?.({ agent: this, context: operationContext });

      const systemMessage = await this.getSystemMessage({
        input,
        historyEntryId: operationContext.historyEntry.id,
        contextMessages,
      });
      messages = [systemMessage, ...contextMessages];
      messages = await this.formatInputMessages(messages, input);

      this.createStandardTimelineEvent(
        operationContext.historyEntry.id,
        "start",
        "working",
        NodeType.AGENT,
        this.id,
        { input: messages },
        "agent",
        operationContext,
      );

      const onStepFinish = this.memoryManager.createStepFinishHandler(
        operationContext,
        userId,
        finalConversationId,
      );

      const response = await this.llm.generateObject({
        messages,
        model: this.model,
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

      const responseStr =
        typeof response === "string" ? response : JSON.stringify(response?.object);
      this.addAgentEvent(operationContext, "finished", "completed" as any, {
        output: responseStr,
        usage: response.usage,
        affectedNodeId: `agent_${this.id}`,
        status: "completed" as any,
        input: messages,
      });
      this.updateHistoryEntry(operationContext, {
        output: responseStr,
        usage: response.usage,
        status: "completed" as any,
      });
      operationContext.isActive = false;
      const standardizedOutput: StandardizedObjectResult<z.infer<T>> = {
        object: response.object,
        usage: response.usage,
        finishReason: response.finishReason,
        providerResponse: response,
      };
      await this.hooks.onEnd?.({
        agent: this,
        output: standardizedOutput,
        error: undefined,
        context: operationContext,
      });
      const typedResponse = response as InferGenerateObjectResponse<TProvider>;
      return typedResponse;
    } catch (error) {
      const voltagentError = error as VoltAgentError;
      this.addAgentEvent(operationContext, "finished", "error" as any, {
        input: messages,
        error: voltagentError,
        errorMessage: voltagentError.message,
        affectedNodeId: `agent_${this.id}`,
        status: "error" as any,
        metadata: {
          code: voltagentError.code,
          originalError: voltagentError.originalError,
          stage: voltagentError.stage,
          toolError: voltagentError.toolError,
          ...voltagentError.metadata,
        },
      });
      this.updateHistoryEntry(operationContext, {
        output: voltagentError.message,
        status: "error" as any,
      });
      operationContext.isActive = false;
      await this.hooks.onEnd?.({
        agent: this,
        output: undefined,
        error: voltagentError,
        context: operationContext,
      });
      throw voltagentError;
    }
  }

  /**
   * Stream a structured object response
   */
  async streamObject<T extends z.ZodType>(
    input: string | BaseMessage[],
    schema: T,
    options: PublicGenerateOptions = {},
  ): Promise<InferStreamObjectResponse<TProvider>> {
    const internalOptions: InternalGenerateOptions = options as InternalGenerateOptions;
    const {
      userId,
      conversationId: initialConversationId,
      parentAgentId,
      parentHistoryEntryId,
      provider,
      contextLimit = 10,
      userContext,
    } = internalOptions;

    const operationContext = await this.initializeHistory(input, "working", {
      parentAgentId,
      parentHistoryEntryId,
      operationName: "streamObject",
      userContext,
      userId,
      conversationId: initialConversationId,
    });

    const { messages: contextMessages, conversationId: finalConversationId } =
      await this.memoryManager.prepareConversationContext(
        operationContext,
        input,
        userId,
        initialConversationId,
        contextLimit,
      );

    if (operationContext.otelSpan) {
      if (userId) operationContext.otelSpan.setAttribute("enduser.id", userId);
      if (finalConversationId)
        operationContext.otelSpan.setAttribute("session.id", finalConversationId);
    }

    let messages: BaseMessage[] = [];
    try {
      await this.hooks.onStart?.({ agent: this, context: operationContext });

      const systemMessage = await this.getSystemMessage({
        input,
        historyEntryId: operationContext.historyEntry.id,
        contextMessages,
      });
      messages = [systemMessage, ...contextMessages];
      messages = await this.formatInputMessages(messages, input);

      this.createStandardTimelineEvent(
        operationContext.historyEntry.id,
        "start",
        "working",
        NodeType.AGENT,
        this.id,
        { input: messages },
        "agent",
        operationContext,
      );

      const onStepFinish = this.memoryManager.createStepFinishHandler(
        operationContext,
        userId,
        finalConversationId,
      );

      const response = await this.llm.streamObject({
        messages,
        model: this.model,
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
        onFinish: async (result: StreamObjectFinishResult<z.infer<T>>) => {
          if (!operationContext.isActive) {
            return;
          }
          const responseStr = JSON.stringify(result.object);
          this.addAgentEvent(operationContext, "finished", "completed" as any, {
            input: messages,
            output: responseStr,
            usage: result.usage,
            affectedNodeId: `agent_${this.id}`,
            status: "completed" as any,
            metadata: {
              finishReason: result.finishReason,
              warnings: result.warnings,
              providerResponse: result.providerResponse,
            },
          });
          this.updateHistoryEntry(operationContext, {
            output: responseStr,
            usage: result.usage,
            status: "completed" as any,
          });
          operationContext.isActive = false;
          await this.hooks.onEnd?.({
            agent: this,
            output: result,
            error: undefined,
            context: operationContext,
          });
          if (provider?.onFinish) {
            await (provider.onFinish as StreamObjectOnFinishCallback<z.infer<T>>)(result);
          }
        },
        onError: async (error: VoltAgentError) => {
          if (error.toolError) {
            const { toolCallId, toolName } = error.toolError;
            const eventUpdater = operationContext.eventUpdaters.get(toolCallId);
            if (eventUpdater) {
              try {
                const toolNodeId = createNodeId(NodeType.TOOL, toolName, this.id);
                await eventUpdater({
                  data: {
                    affectedNodeId: toolNodeId,
                    error: error.message,
                    errorMessage: error.message,
                    status: "error" as any,
                    updatedAt: new Date().toISOString(),
                    output: error.message,
                  },
                });
                operationContext.eventUpdaters.delete(toolCallId);
              } catch (updateError) {
                console.error(
                  `[Agent ${this.id}] Failed to update tool event to error status for ${toolName} (${toolCallId}):`,
                  updateError,
                );
              }
              const tool = this.toolManager.getToolByName(toolName);
              if (tool) {
                await this.hooks.onToolEnd?.({
                  agent: this,
                  tool,
                  output: undefined,
                  error: error,
                  context: operationContext,
                });
              }
            }
          }
          operationContext.eventUpdaters.clear();
          this.addAgentEvent(operationContext, "finished", "error" as any, {
            input: messages,
            error: error,
            errorMessage: error.message,
            affectedNodeId: `agent_${this.id}`,
            status: "error" as any,
            metadata: {
              code: error.code,
              originalError: error.originalError,
              stage: error.stage,
              toolError: error.toolError,
              ...error.metadata,
            },
          });
          this.updateHistoryEntry(operationContext, {
            output: error.message,
            status: "error" as any,
          });
          operationContext.isActive = false;
          if (provider?.onError) {
            await (provider.onError as StreamOnErrorCallback)(error);
          }
          await this.hooks.onEnd?.({
            agent: this,
            output: undefined,
            error: error,
            context: operationContext,
          });
        },
      });
      const typedResponse = response as InferStreamObjectResponse<TProvider>;
      return typedResponse;
    } catch (error) {
      this.addAgentEvent(operationContext, "finished", "error" as any, {
        input: messages,
        error,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        affectedNodeId: `agent_${this.id}`,
        status: "error" as any,
      });
      this.updateHistoryEntry(operationContext, {
        output: error instanceof Error ? error.message : "Unknown error",
        status: "error" as any,
      });
      operationContext.isActive = false;
      await this.hooks.onEnd?.({
        agent: this,
        output: undefined,
        error: error as VoltAgentError,
        context: operationContext,
      });
      throw error;
    }
  }

  /**
   * Add a sub-agent that this agent can delegate tasks to
   */
  public addSubAgent(agent: Agent<any>): void {
    this.subAgentManager.addSubAgent(agent);

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
  public getSubAgents(): Agent<any>[] {
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
  addItems(items: (Tool<any> | Toolkit)[]): { added: (Tool<any> | Toolkit)[] } {
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
}
