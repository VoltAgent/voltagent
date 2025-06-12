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
import { MemoryManager } from "../memory";
import type { BaseRetriever } from "../retriever/retriever";
import { AgentRegistry } from "../server/registry";
import type { VoltAgentExporter } from "../telemetry/exporter";
import type { Tool, Toolkit } from "../tool";
import { ToolManager } from "../tool";
import type { ReasoningToolExecuteOptions } from "../tool/reasoning/types";
import devLogger from "../utils/internal/dev-logger";
import { NodeType, createNodeId } from "../utils/node-utils";
import type { Voice } from "../voice";
import { type AgentHistoryEntry, HistoryManager } from "./history";
import { type AgentHooks, createHooks } from "./hooks";
import type {
  BaseMessage,
  BaseTool,
  LLMProvider,
  StepWithContent,
  ToolExecuteOptions,
  MessageRole,
} from "./providers";
import { SubAgentManager } from "./subagent";
import type {
  AgentOptions,
  AgentStatus,
  CommonGenerateOptions,
  InferGenerateObjectResponseFromProvider,
  InferGenerateTextResponseFromProvider,
  InferStreamObjectResponseFromProvider,
  InferStreamTextResponseFromProvider,
  InternalGenerateOptions,
  ModelType,
  OperationContext,
  ProviderInstance,
  PublicGenerateOptions,
  StandardizedObjectResult,
  StandardizedTextResult,
  StreamObjectFinishResult,
  StreamObjectOnFinishCallback,
  StreamOnErrorCallback,
  StreamTextFinishResult,
  StreamTextOnFinishCallback,
  ToolExecutionContext,
  VoltAgentError,
} from "./types";

import type { Span } from "@opentelemetry/api";
import { endOperationSpan, endToolSpan, startOperationSpan, startToolSpan } from "./open-telemetry";

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
    this.purpose = options.purpose;
    this.instructions = options.instructions ?? options.description ?? "";
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
    operationContext,
  }: {
    input?: string | BaseMessage[];
    historyEntryId: string;
    contextMessages: BaseMessage[];
    operationContext?: OperationContext;
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

      // Publish the retriever:start event
      await AgentEventEmitter.getInstance().publishTimelineEvent({
        agentId: this.id,
        historyId: historyEntryId,
        event: retrieverStartEvent,
      });

      try {
        const context = await this.retriever.retrieve(input, {
          userContext: operationContext?.userContext,
        });
        if (context?.trim()) {
          finalInstructions = `${finalInstructions}\n\nRelevant Context:\n${context}`;

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

          // Publish the retriever:success event
          await AgentEventEmitter.getInstance().publishTimelineEvent({
            agentId: this.id,
            historyId: historyEntryId,
            event: retrieverSuccessEvent,
          });
        } else {
          // If there was no context returned, still create a success event
          // but with a note that no context was found
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

          // Publish the retriever:success event (empty result)
          await AgentEventEmitter.getInstance().publishTimelineEvent({
            agentId: this.id,
            historyId: historyEntryId,
            event: retrieverSuccessEvent,
          });
        }
      } catch (error) {
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

        // Publish the retriever:error event
        await AgentEventEmitter.getInstance().publishTimelineEvent({
          agentId: this.id,
          historyId: historyEntryId,
          event: retrieverErrorEvent,
        });

        devLogger.warn("Failed to retrieve context:", error);
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

      // Check if this is a Gemini model and running as a subagent
      const isGeminiModel = this.getModelName().toLowerCase().includes("gemini");
      const isSubagent = Boolean(operationContext?.parentAgentId);
      let role: MessageRole = "system";

      // For Gemini models we always must have a message with "user" role
      // only system messages will be rejected by Gemini API
      if (isGeminiModel && isSubagent) {
        role = "user";
      }

      return {
        role,
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
      devLogger.warn("Error preparing agents memory:", error);
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
    let result: BaseMessage[];
    if (typeof input === "string") {
      // Add user message to the messages array
      result = [
        ...messages,
        {
          role: "user",
          content: input,
        },
      ];
    } else {
      // Add all message objects directly
      result = [...messages, ...input];
    }

    // Ensure that a message with system role never happens after index 0
    // Otherwise gemini will throw an error like this:
    // {
    //   message: "'system messages are only supported at the beginning of the conversation' functionality not supported."
    //   stage: "llm_generate"
    //   originalError: "AI_UnsupportedFunctionalityError: 'system messages are only supported at the beginning of the conversation' functionality not supported."
    // }
    return result.map((msg, idx) => {
      if (idx > 0 && msg.role === "system") {
        return { ...msg, role: "assistant" };
      }
      return msg;
    });
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
      devLogger.warn(
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
              devLogger.warn(
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

    const opContext: OperationContext = {
      operationId: historyEntry.id,
      userContext: options.userContext
        ? new Map(options.userContext)
        : new Map<string | symbol, unknown>(),
      historyEntry,
      isActive: true,
      parentAgentId: options.parentAgentId,
      parentHistoryEntryId: options.parentHistoryEntryId,
      otelSpan: otelSpan,
      conversationSteps: [],
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
   * Add step to history immediately and to conversation steps
   */
  private addStepToHistory(step: StepWithContent, context: OperationContext): void {
    this.historyManager.addStepsToEntry(context.historyEntry.id, [step]);

    // Also track in conversation steps for hook messages
    if (!context.conversationSteps) {
      context.conversationSteps = [];
    }
    context.conversationSteps.push(step);
  }

  /**
   * Update history entry
   */
  private async updateHistoryEntry(
    context: OperationContext,
    updates: Partial<AgentHistoryEntry>,
  ): Promise<void> {
    await this.historyManager.updateEntry(context.historyEntry.id, updates);
  }

  /**
   * Fix delete operator usage for better performance
   */
  private addToolEvent = (
    context: OperationContext,
    toolName: string,
    status: EventStatus,
    data: Partial<StandardEventData> & Record<string, unknown> = {},
  ): void => {
    // Ensure the toolSpans map exists on the context
    if (!context.toolSpans) {
      context.toolSpans = new Map<string, Span>();
    }

    const toolCallId = data.toolId?.toString();

    if (toolCallId && status === "working") {
      if (context.toolSpans.has(toolCallId)) {
        devLogger.warn(`OTEL tool span already exists for toolCallId: ${toolCallId}`);
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
      devLogger.warn(
        `OpenTelemetry span not found in OperationContext for agent event ${eventName} (Operation ID: ${context.operationId})`,
      );
    }
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
      devLogger.warn(
        `OTEL tool span not found for toolCallId: ${toolCallId} in _endOtelToolSpan (Tool: ${toolName})`,
      );
    }
  }

  /**
   * Generate a text response without streaming
   */
  async generateText(
    input: string | BaseMessage[],
    options: PublicGenerateOptions = {},
  ): Promise<InferGenerateTextResponseFromProvider<TProvider>> {
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
        operationContext,
      });

      messages = [systemMessage, ...contextMessages];
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
          instructions: this.instructions,
          userContext: Object.fromEntries(operationContext.userContext.entries()) as Record<
            string,
            unknown
          >,
          systemPrompt: systemMessage,
          messages,
          modelParameters: {
            model: this.getModelName(),
            maxTokens: internalOptions.provider?.maxTokens,
            temperature: internalOptions.provider?.temperature,
            topP: internalOptions.provider?.topP,
            frequencyPenalty: internalOptions.provider?.frequencyPenalty,
            presencePenalty: internalOptions.provider?.presencePenalty,
          },
        },
        traceId: operationContext.historyEntry.id,
      };

      // Store agent start time in the operation context for later reference
      operationContext.userContext.set("agent_start_time", agentStartTime);
      operationContext.userContext.set("agent_start_event_id", agentStartEvent.id);

      // Publish the new event through AgentEventEmitter
      await AgentEventEmitter.getInstance().publishTimelineEvent({
        agentId: this.id,
        historyId: operationContext.historyEntry.id,
        event: agentStartEvent,
      });

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

              // Publish the tool:start event
              await AgentEventEmitter.getInstance().publishTimelineEvent({
                agentId: this.id,
                historyId: operationContext.historyEntry.id,
                event: toolStartEvent,
              });

              await this.addToolEvent(operationContext, step.name, "working", {
                toolId: step.id,
                input: step.arguments || {},
              });

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

                // Publish the tool:error event
                await AgentEventEmitter.getInstance().publishTimelineEvent({
                  agentId: this.id,
                  historyId: operationContext.historyEntry.id,
                  event: toolErrorEvent,
                });
              } else {
                // Create tool:success event
                const toolSuccessEvent: ToolSuccessEvent = {
                  id: crypto.randomUUID(),
                  name: "tool:success",
                  type: "tool",
                  startTime: new Date().toISOString(), // Use the original start time
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

                // Publish the tool:success event
                await AgentEventEmitter.getInstance().publishTimelineEvent({
                  agentId: this.id,
                  historyId: operationContext.historyEntry.id,
                  event: toolSuccessEvent,
                });
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
        startTime: new Date().toISOString(), // Use the original start time
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
          },
        },

        traceId: operationContext.historyEntry.id,
        parentEventId: agentStartInfo.eventId, // Link to the agent:start event
      };

      // Publish the agent:success event
      await AgentEventEmitter.getInstance().publishTimelineEvent({
        agentId: this.id,
        historyId: operationContext.historyEntry.id,
        event: agentSuccessEvent,
      });

      // Original agent completion event for backward compatibility
      this.addAgentEvent(operationContext, "finished", "completed" as any, {
        input: messages,
        output: response.text,
        usage: response.usage,
        status: "completed" as any,
      });

      operationContext.isActive = false;
      const standardizedOutput: StandardizedTextResult = {
        text: response.text,
        usage: response.usage,
        finishReason: response.finishReason,
        providerResponse: response,
        userContext: new Map(operationContext.userContext),
      };

      await this.hooks.onEnd?.({
        conversationId: finalConversationId,
        agent: this,
        output: standardizedOutput,
        error: undefined,
        context: operationContext,
      });

      await this.updateHistoryEntry(operationContext, {
        output: response.text,
        usage: response.usage,
        endTime: new Date(),
        status: "completed" as any,
      });

      return response;
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
        startTime: new Date().toISOString(), // Use the original start time
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

      // Publish the agent:error event
      await AgentEventEmitter.getInstance().publishTimelineEvent({
        agentId: this.id,
        historyId: operationContext.historyEntry.id,
        event: agentErrorEvent,
      });

      // Original error event for backward compatibility
      this.addAgentEvent(operationContext, "finished", "error" as any, {
        input: messages,
        error: voltagentError,
        errorMessage: voltagentError.message,
        status: "error" as any,
        metadata: {
          code: voltagentError.code,
          originalError: voltagentError.originalError,
          stage: voltagentError.stage,
          toolError: voltagentError.toolError,
          ...voltagentError.metadata,
        },
      });

      operationContext.isActive = false;

      await this.hooks.onEnd?.({
        agent: this,
        output: undefined,
        error: voltagentError,
        conversationId: finalConversationId,
        context: operationContext,
      });

      await this.updateHistoryEntry(operationContext, {
        status: "error",
        endTime: new Date(),
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
  ): Promise<InferStreamTextResponseFromProvider<TProvider>> {
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
      operationContext,
    });
    let messages = [systemMessage, ...contextMessages];
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
        instructions: this.instructions,
        userContext: Object.fromEntries(operationContext.userContext.entries()) as Record<
          string,
          unknown
        >,
        systemPrompt: systemMessage,
        messages,
        modelParameters: {
          model: this.getModelName(),
          maxTokens: internalOptions.provider?.maxTokens,
          temperature: internalOptions.provider?.temperature,
          topP: internalOptions.provider?.topP,
          frequencyPenalty: internalOptions.provider?.frequencyPenalty,
          presencePenalty: internalOptions.provider?.presencePenalty,
        },
      },
      traceId: operationContext.historyEntry.id,
    };

    // Store agent start time in the operation context for later reference
    operationContext.userContext.set("agent_start_time", agentStartTime);
    operationContext.userContext.set("agent_start_event_id", agentStartEvent.id);

    // Publish the new event through AgentEventEmitter
    await AgentEventEmitter.getInstance().publishTimelineEvent({
      agentId: this.id,
      historyId: operationContext.historyEntry.id,
      event: agentStartEvent,
    });

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

            // Publish the tool:start event
            await AgentEventEmitter.getInstance().publishTimelineEvent({
              agentId: this.id,
              historyId: operationContext.historyEntry.id,
              event: toolStartEvent,
            });

            // Original tool event for backward compatibility
            this.addToolEvent(operationContext, chunk.name, "working", {
              toolId: chunk.id,
              input: chunk.arguments || {},
            });
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
                startTime: new Date().toISOString(), // Use the original start time
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

              // Publish the tool:error event
              await AgentEventEmitter.getInstance().publishTimelineEvent({
                agentId: this.id,
                historyId: operationContext.historyEntry.id,
                event: toolErrorEvent,
              });
            } else {
              // Create tool:success event
              const toolSuccessEvent: ToolSuccessEvent = {
                id: crypto.randomUUID(),
                name: "tool:success",
                type: "tool",
                startTime: new Date().toISOString(), // Use the original start time
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

              // Publish the tool:success event
              await AgentEventEmitter.getInstance().publishTimelineEvent({
                agentId: this.id,
                historyId: operationContext.historyEntry.id,
                event: toolSuccessEvent,
              });
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

        // [NEW EVENT SYSTEM] Create an agent:success event
        const agentStartInfo = {
          startTime:
            (operationContext.userContext.get("agent_start_time") as string) || agentStartTime,
          eventId:
            (operationContext.userContext.get("agent_start_event_id") as string) ||
            agentStartEvent.id,
        };

        await this.updateHistoryEntry(operationContext, {
          output: result.text,
          usage: result.usage,
          endTime: new Date(),
          status: "completed" as any,
        });

        const agentSuccessEvent: AgentSuccessEvent = {
          id: crypto.randomUUID(),
          name: "agent:success",
          type: "agent",
          startTime: new Date().toISOString(), // Use the original start time
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
            },
          },
          traceId: operationContext.historyEntry.id,
          parentEventId: agentStartInfo.eventId, // Link to the agent:start event
        };

        // Publish the agent:success event
        await AgentEventEmitter.getInstance().publishTimelineEvent({
          agentId: this.id,
          historyId: operationContext.historyEntry.id,
          event: agentSuccessEvent,
        });

        // Original agent completion event for backward compatibility
        this.addAgentEvent(operationContext, "finished", "completed" as any, {
          input: messages,
          output: result.text,
          usage: result.usage,
          status: "completed" as any,
          metadata: {
            finishReason: result.finishReason,
            warnings: result.warnings,
            providerResponse: result.providerResponse,
          },
        });
        operationContext.isActive = false;

        // Add userContext to result
        const resultWithContext = {
          ...result,
          userContext: new Map(operationContext.userContext),
        };

        await this.hooks.onEnd?.({
          agent: this,
          output: resultWithContext,
          error: undefined,
          conversationId: finalConversationId,
          context: operationContext,
        });
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
              startTime: new Date().toISOString(),
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

            // Publish the tool:error event
            await AgentEventEmitter.getInstance().publishTimelineEvent({
              agentId: this.id,
              historyId: operationContext.historyEntry.id,
              event: toolErrorEvent,
            });
          } catch (updateError) {
            devLogger.error(
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

        // [NEW EVENT SYSTEM] Create an agent:error event
        const agentErrorStartInfo = {
          startTime:
            (operationContext.userContext.get("agent_start_time") as string) ||
            new Date().toISOString(),
          eventId: operationContext.userContext.get("agent_start_event_id") as string,
        };

        await this.updateHistoryEntry(operationContext, {
          status: "error",
          endTime: new Date(),
        });

        const agentErrorEvent: AgentErrorEvent = {
          id: crypto.randomUUID(),
          name: "agent:error",
          type: "agent",
          startTime: new Date().toISOString(), // Use the original start time
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

        // Publish the agent:error event
        await AgentEventEmitter.getInstance().publishTimelineEvent({
          agentId: this.id,
          historyId: operationContext.historyEntry.id,
          event: agentErrorEvent,
        });

        // Original error event for backward compatibility
        this.addAgentEvent(operationContext, "finished", "error" as any, {
          input: messages,
          error: error,
          errorMessage: error.message,
          status: "error" as any,
          metadata: {
            code: error.code,
            originalError: error.originalError,
            stage: error.stage,
            toolError: error.toolError,
            ...error.metadata,
          },
        });

        operationContext.isActive = false;
        if (internalOptions.provider?.onError) {
          await (internalOptions.provider.onError as StreamOnErrorCallback)(error);
        }

        await this.hooks.onEnd?.({
          agent: this,
          output: undefined,
          error: error,
          conversationId: finalConversationId,
          context: operationContext,
        });
      },
    });
    return response;
  }

  /**
   * Generate a structured object response
   */
  async generateObject<TSchema extends z.ZodType>(
    input: string | BaseMessage[],
    schema: TSchema,
    options: PublicGenerateOptions = {},
  ): Promise<InferGenerateObjectResponseFromProvider<TProvider, TSchema>> {
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
        operationContext,
      });
      messages = [systemMessage, ...contextMessages];
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
          instructions: this.instructions,
          userContext: Object.fromEntries(operationContext.userContext.entries()) as Record<
            string,
            unknown
          >,
          systemPrompt: systemMessage,
          messages,
          modelParameters: {
            model: this.getModelName(),
            maxTokens: internalOptions.provider?.maxTokens,
            temperature: internalOptions.provider?.temperature,
            topP: internalOptions.provider?.topP,
            frequencyPenalty: internalOptions.provider?.frequencyPenalty,
            presencePenalty: internalOptions.provider?.presencePenalty,
          },
        },
        traceId: operationContext.historyEntry.id,
      };

      // Store agent start time in the operation context for later reference
      operationContext.userContext.set("agent_start_time", agentStartTime);
      operationContext.userContext.set("agent_start_event_id", agentStartEvent.id);

      // Publish the new event through AgentEventEmitter
      await AgentEventEmitter.getInstance().publishTimelineEvent({
        agentId: this.id,
        historyId: operationContext.historyEntry.id,
        event: agentStartEvent,
      });

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
        startTime: new Date().toISOString(), // Use the original start time
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
          },
        },
        traceId: operationContext.historyEntry.id,
        parentEventId: agentStartInfo.eventId, // Link to the agent:start event
      };

      // Publish the agent:success event
      await AgentEventEmitter.getInstance().publishTimelineEvent({
        agentId: this.id,
        historyId: operationContext.historyEntry.id,
        event: agentSuccessEvent,
      });

      const responseStr = JSON.stringify(response.object);
      this.addAgentEvent(operationContext, "finished", "completed" as any, {
        output: responseStr,
        usage: response.usage,
        status: "completed" as any,
        input: messages,
      });
      operationContext.isActive = false;

      await this.updateHistoryEntry(operationContext, {
        output: responseStr,
        usage: response.usage,
        endTime: new Date(),
        status: "completed" as any,
      });

      const standardizedOutput: StandardizedObjectResult<z.infer<TSchema>> = {
        object: response.object,
        usage: response.usage,
        finishReason: response.finishReason,
        providerResponse: response,
        userContext: new Map(operationContext.userContext),
      };

      await this.hooks.onEnd?.({
        agent: this,
        output: standardizedOutput,
        error: undefined,
        conversationId: finalConversationId,
        context: operationContext,
      });
      return response;
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
        startTime: new Date().toISOString(), // Use the original start time
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

      // Publish the agent:error event
      await AgentEventEmitter.getInstance().publishTimelineEvent({
        agentId: this.id,
        historyId: operationContext.historyEntry.id,
        event: agentErrorEvent,
      });

      this.addAgentEvent(operationContext, "finished", "error" as any, {
        input: messages,
        error: voltagentError,
        errorMessage: voltagentError.message,
        status: "error" as any,
        metadata: {
          code: voltagentError.code,
          originalError: voltagentError.originalError,
          stage: voltagentError.stage,
          toolError: voltagentError.toolError,
          ...voltagentError.metadata,
        },
      });
      operationContext.isActive = false;

      await this.updateHistoryEntry(operationContext, {
        status: "error",
        endTime: new Date(),
      });

      await this.hooks.onEnd?.({
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
  async streamObject<TSchema extends z.ZodType>(
    input: string | BaseMessage[],
    schema: TSchema,
    options: PublicGenerateOptions = {},
  ): Promise<InferStreamObjectResponseFromProvider<TProvider, TSchema>> {
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

    await this.hooks.onStart?.({ agent: this, context: operationContext });

    const systemMessage = await this.getSystemMessage({
      input,
      historyEntryId: operationContext.historyEntry.id,
      contextMessages,
      operationContext,
    });
    let messages = [systemMessage, ...contextMessages];
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
        instructions: this.instructions,
        userContext: Object.fromEntries(operationContext.userContext.entries()) as Record<
          string,
          unknown
        >,
        systemPrompt: systemMessage,
        messages,
        modelParameters: {
          model: this.getModelName(),
          maxTokens: internalOptions.provider?.maxTokens,
          temperature: internalOptions.provider?.temperature,
          topP: internalOptions.provider?.topP,
          frequencyPenalty: internalOptions.provider?.frequencyPenalty,
          presencePenalty: internalOptions.provider?.presencePenalty,
        },
      },
      traceId: operationContext.historyEntry.id,
    };

    // Store agent start time in the operation context for later reference
    operationContext.userContext.set("agent_start_time", agentStartTime);
    operationContext.userContext.set("agent_start_event_id", agentStartEvent.id);

    // Publish the new event through AgentEventEmitter
    await AgentEventEmitter.getInstance().publishTimelineEvent({
      agentId: this.id,
      historyId: operationContext.historyEntry.id,
      event: agentStartEvent,
    });

    const onStepFinish = this.memoryManager.createStepFinishHandler(
      operationContext,
      userId,
      finalConversationId,
    );

    try {
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
            startTime: new Date().toISOString(), // Use the original start time
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
              },
            },
            traceId: operationContext.historyEntry.id,
            parentEventId: agentStartInfo.eventId, // Link to the agent:start event
          };

          // Publish the agent:success event
          await AgentEventEmitter.getInstance().publishTimelineEvent({
            agentId: this.id,
            historyId: operationContext.historyEntry.id,
            event: agentSuccessEvent,
          });

          const responseStr = JSON.stringify(result.object);
          this.addAgentEvent(operationContext, "finished", "completed" as any, {
            input: messages,
            output: responseStr,
            usage: result.usage,
            status: "completed" as any,
            metadata: {
              finishReason: result.finishReason,
              warnings: result.warnings,
              providerResponse: result.providerResponse,
            },
          });

          await this.updateHistoryEntry(operationContext, {
            output: responseStr,
            usage: result.usage,
            status: "completed" as any,
          });

          operationContext.isActive = false;

          // Add userContext to result
          const resultWithContext = {
            ...result,
            userContext: new Map(operationContext.userContext),
          };

          await this.hooks.onEnd?.({
            agent: this,
            output: resultWithContext,
            error: undefined,
            conversationId: finalConversationId,
            context: operationContext,
          });
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
              await this.hooks.onToolEnd?.({
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
            startTime: new Date().toISOString(), // Use the original start time
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

          // Publish the agent:error event
          await AgentEventEmitter.getInstance().publishTimelineEvent({
            agentId: this.id,
            historyId: operationContext.historyEntry.id,
            event: agentErrorEvent,
          });

          this.addAgentEvent(operationContext, "finished", "error" as any, {
            input: messages,
            error: error,
            errorMessage: error.message,
            status: "error" as any,
            metadata: {
              code: error.code,
              originalError: error.originalError,
              stage: error.stage,
              toolError: error.toolError,
              ...error.metadata,
            },
          });

          await this.updateHistoryEntry(operationContext, {
            status: "error",
          });

          operationContext.isActive = false;
          if (provider?.onError) {
            await (provider.onError as StreamOnErrorCallback)(error);
          }

          await this.hooks.onEnd?.({
            agent: this,
            output: undefined,
            error: error,
            conversationId: finalConversationId,
            context: operationContext,
          });
        },
      });
      return response;
    } catch (error) {
      operationContext.isActive = false;
      await this.hooks.onEnd?.({
        agent: this,
        output: undefined,
        error: error as VoltAgentError,
        conversationId: finalConversationId,
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
