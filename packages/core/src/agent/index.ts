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
   * Agent description
   */
  readonly description: string;

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
    options: Omit<AgentOptions, "provider" | "model"> &
      TProvider & {
        model: ModelType<TProvider>;
        subAgents?: Agent<any>[]; // Keep any for now
        maxHistoryEntries?: number;
        hooks?: AgentHooks;
        retriever?: BaseRetriever;
        voice?: Voice;
        markdown?: boolean;
      },
  ) {
    this.id = options.id || options.name;
    this.name = options.name;
    this.description = options.description || "A helpful AI assistant";
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
    this.historyManager = new HistoryManager(
      options.maxHistoryEntries || 0,
      this.id,
      this.memoryManager,
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
    let baseDescription = this.description || ""; // Ensure baseDescription is a string

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
      baseDescription = `${baseDescription}${toolInstructions}`;
    }
    // --- End Add Instructions from Toolkits ---

    // Add Markdown Instruction if Enabled
    if (this.markdown) {
      baseDescription = `${baseDescription}\n\nUse markdown to format your answers.`;
    }

    let description = baseDescription;

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
          description = `${description}\n\nRelevant Context:\n${context}`;

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
      description = this.subAgentManager.generateSupervisorSystemMessage(description, agentsMemory);

      return {
        role: "system",
        content: description,
      };
    }

    return {
      role: "system",
      content: `You are ${this.name}. ${description}`,
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
   * @returns Created operation context
   */
  private async initializeHistory(
    input: string | BaseMessage[],
    initialStatus: AgentStatus = "working",
    options: { parentAgentId?: string; parentHistoryEntryId?: string } = {},
  ): Promise<OperationContext> {
    // Create a new history entry (without events initially)
    const historyEntry = await this.historyManager.addEntry(
      input,
      "", // Empty output initially
      initialStatus,
      [], // Empty steps initially
      { events: [] }, // Start with empty events array
    );

    // Create operation context, including parent context if provided
    const context: OperationContext = {
      operationId: historyEntry.id,
      userContext: new Map<string | symbol, unknown>(),
      historyEntry,
      eventUpdaters: new Map<string, EventUpdater>(),
      isActive: true,
      parentAgentId: options.parentAgentId,
      parentHistoryEntryId: options.parentHistoryEntryId,
    };

    // Standardized message event
    this.createStandardTimelineEvent(
      context.historyEntry.id,
      "start",
      "idle" as EventStatus,
      NodeType.MESSAGE,
      this.id,
      {
        input: input,
      },
      "agent",
      context,
    );

    return context;
  }

  /**
   * Get full agent state including tools status
   */
  public getFullState() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
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
      ...(userContextData && { userContext: userContextData }), // Add userContext if available
    };

    // Create the event payload
    const eventPayload = {
      agentId: this.id,
      historyId,
      eventName,
      status: status as AgentStatus,
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
    const toolNodeId = createNodeId(NodeType.TOOL, toolName, this.id);

    // Move custom fields to metadata
    const metadata: Record<string, unknown> = {
      toolName,
      ...(data.metadata || {}),
    };

    // Extract data fields to use while avoiding parameter reassignment
    const { toolId, input, output, error, errorMessage } = data;

    if (toolId) {
      metadata.toolId = toolId;
    }

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
        console.warn("Failed to serialize userContext for tool event:", error);
        userContextData = { serialization_error: true };
      }
    }

    const eventData: Partial<StandardEventData> & {
      userContext?: Record<string, unknown>;
    } = {
      affectedNodeId: toolNodeId,
      status: status as any,
      timestamp: new Date().toISOString(),
      input,
      output,
      error,
      errorMessage,
      metadata,
      ...(userContextData && { userContext: userContextData }), // Add userContext if available
    };

    // Add source agent ID to metadata instead
    metadata.sourceAgentId = this.id;

    const eventEmitter = AgentEventEmitter.getInstance();

    // Create tracked event for the current agent
    const eventUpdater = await eventEmitter.createTrackedEvent({
      agentId: this.id,
      historyId: context.historyEntry.id,
      name: eventName,
      status: status as AgentStatus,
      data: eventData,
      type: "tool",
    });

    // If we have parent context, create a tracked event for the parent too
    let parentUpdater: EventUpdater | null = null;

    if (context.parentAgentId && context.parentHistoryEntryId) {
      parentUpdater = await eventEmitter.createTrackedEvent({
        agentId: context.parentAgentId,
        historyId: context.parentHistoryEntryId,
        name: eventName,
        status: status as AgentStatus,
        data: { ...eventData, sourceAgentId: this.id },
        type: "tool",
      });
    }

    // Return a combined updater that updates both events and maintains the return type
    // The input 'update' object should expect AgentStatus for its status field
    return async (update: {
      status?: AgentStatus; // Changed EventStatus to AgentStatus
      data?: Record<string, unknown>;
    }): Promise<AgentHistoryEntry | undefined> => {
      // Update current agent's event
      // The eventUpdater from createTrackedEvent expects AgentStatus
      const result = await eventUpdater(update);

      // Update parent agent's event if it exists
      if (parentUpdater) {
        // parentUpdater also expects AgentStatus
        await parentUpdater(update);
      }

      // Return the result from the current agent's update
      return result;
    };
  };

  /**
   * Agent event creator (update)
   */
  private addAgentEvent = (
    context: OperationContext,
    eventName: string,
    status: EventStatus,
    data: Partial<StandardEventData> & Record<string, unknown> = {},
  ): void => {
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
   * Generate a text response without streaming
   */
  async generateText(
    input: string | BaseMessage[],
    options: PublicGenerateOptions = {},
  ): Promise<InferGenerateTextResponse<TProvider>> {
    // Create internal options structure by casting
    // This is safe because PublicGenerateOptions is a subset of InternalGenerateOptions
    const internalOptions: InternalGenerateOptions = options as InternalGenerateOptions;

    // Create an initial context with "working" status
    const operationContext = await this.initializeHistory(input, "working", {
      parentAgentId: internalOptions.parentAgentId,
      parentHistoryEntryId: internalOptions.parentHistoryEntryId,
    });
    let messages: BaseMessage[] = [];
    try {
      // Call onStart hook
      await this.hooks.onStart?.({ agent: this, context: operationContext });

      const { userId, conversationId, contextLimit = 10, provider, signal } = internalOptions;

      // Use memory manager to prepare messages and context
      const { messages: contextMessages, conversationId: finalConversationId } =
        await this.memoryManager.prepareConversationContext(
          operationContext,
          input,
          userId,
          conversationId,
          contextLimit,
        );

      // Get system message with input for RAG
      const systemMessage = await this.getSystemMessage({
        input,
        historyEntryId: operationContext.historyEntry.id,
        contextMessages,
      });

      // Combine messages
      messages = [systemMessage, ...contextMessages];
      messages = await this.formatInputMessages(messages, input);

      this.createStandardTimelineEvent(
        operationContext.historyEntry.id,
        "start",
        "working",
        NodeType.AGENT,
        this.id,
        {
          input: messages,
        },
        "agent",
        operationContext,
      );

      // Create step finish handler for tracking generation steps
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
        provider,
        signal,
        toolExecutionContext: {
          operationContext: operationContext,
          agentId: this.id,
          historyEntryId: operationContext.historyEntry.id,
        } as ToolExecutionContext,
        onStepFinish: async (step) => {
          // Add step to history immediately
          this.addStepToHistory(step, operationContext);

          if (step.type === "tool_call") {
            // Update tool status to working when tool is called
            if (step.name && step.id) {
              // Get the tool if it exists
              const tool = this.toolManager.getToolByName(step.name);

              // Create a tracked event for this tool call
              const eventUpdater = await this.addToolEvent(
                operationContext,
                "tool_working",
                step.name,
                "working",
                {
                  toolId: step.id,
                  input: step.arguments || {},
                },
              );
              // Store the updater with the tool call ID
              operationContext.eventUpdaters.set(step.id, eventUpdater);
              // --- End re-added logic ---

              // Call onToolStart hook
              if (tool) {
                await this.hooks.onToolStart?.({
                  agent: this,
                  tool,
                  context: operationContext,
                });
              }
            }
          } else if (step.type === "tool_result") {
            // Handle tool completion with the result when tool returns
            if (step.name && step.id) {
              // Get the updater for this tool call
              const eventUpdater = operationContext.eventUpdaters.get(step.id);

              if (eventUpdater) {
                // Create a unique node ID for the tool
                const toolNodeId = `tool_${step.name}_${this.id}`;

                // Update the tracked event with completion status
                eventUpdater({
                  data: {
                    affectedNodeId: toolNodeId,
                    status: "completed",
                    updatedAt: new Date().toISOString(),
                    output: step.result ?? step.content,
                  },
                });

                // Remove the updater from the map
                operationContext.eventUpdaters.delete(step.id);

                // Call onToolEnd hook
                const tool = this.toolManager.getToolByName(step.name);
                if (tool) {
                  await this.hooks.onToolEnd?.({
                    agent: this,
                    tool,
                    output: step.result ?? step.content,
                    error: undefined, // Success case
                    context: operationContext,
                  });
                }
              }
            }
          }

          await onStepFinish(step);
        },
      });

      // Clear the updaters map
      operationContext.eventUpdaters.clear();

      // Update the history entry with final output from provider response
      this.updateHistoryEntry(operationContext, {
        output: response.text, // Use original provider response field
        usage: response.usage, // Use original provider response field
        status: "completed",
      });

      // Add "completed" timeline event using original provider response fields
      this.addAgentEvent(operationContext, "finished", "completed", {
        input: messages,
        output: response.text,
        usage: response.usage,
        affectedNodeId: `agent_${this.id}`,
        status: "completed",
        // Optionally add original provider metadata here if needed later
        // metadata: { providerResponse: response }
      });

      // Mark operation as inactive
      operationContext.isActive = false;

      // --- Create Standardized Output for Hook ---
      const standardizedOutput: StandardizedTextResult = {
        text: response.text,
        usage: response.usage,
        finishReason: response.finishReason,
        // warnings: response.warnings, // Assuming ProviderTextResponse might have warnings
        providerResponse: response, // Include the original provider response
      };

      // Call onEnd hook
      await this.hooks.onEnd?.({
        agent: this,
        output: standardizedOutput,
        error: undefined,
        context: operationContext,
      });

      // Ensure proper typing with an explicit cast for the return value
      // Return the ORIGINAL provider response
      const typedResponse = response as InferGenerateTextResponse<TProvider>;
      return typedResponse;
    } catch (error) {
      // Assume the error is VoltAgentError based on provider contract
      const voltagentError = error as VoltAgentError;

      // Clear any remaining updaters (important if the error was not tool-specific)
      operationContext.eventUpdaters.clear();

      // Add "error" timeline event using structured info (already handles voltagentError)
      this.addAgentEvent(operationContext, "finished", "error", {
        input: messages,
        error: voltagentError,
        errorMessage: voltagentError.message,
        affectedNodeId: `agent_${this.id}`,
        status: "error",
        metadata: {
          code: voltagentError.code,
          originalError: voltagentError.originalError,
          stage: voltagentError.stage,
          toolError: voltagentError.toolError,
          ...voltagentError.metadata,
        },
      });

      // Update the history entry with the standardized error message (already handles voltagentError)
      this.updateHistoryEntry(operationContext, {
        output: voltagentError.message,
        status: "error",
      });

      // Mark operation as inactive
      operationContext.isActive = false;

      // Call onEnd hook
      await this.hooks.onEnd?.({
        agent: this,
        output: undefined,
        error: voltagentError,
        context: operationContext,
      });

      throw voltagentError; // Re-throw the VoltAgentError
    }
  }

  /**
   * Stream a text response
   */
  async streamText(
    input: string | BaseMessage[],
    options: PublicGenerateOptions = {},
  ): Promise<InferStreamTextResponse<TProvider>> {
    // Create internal options structure by casting
    const internalOptions: InternalGenerateOptions = options as InternalGenerateOptions;

    // Create an initial context with "working" status
    const operationContext = await this.initializeHistory(input, "working", {
      parentAgentId: internalOptions.parentAgentId,
      parentHistoryEntryId: internalOptions.parentHistoryEntryId,
    });

    // No try...catch here, let errors propagate up after potentially being handled by onError callbacks

    // Call onStart hook
    await this.hooks.onStart?.({ agent: this, context: operationContext });

    const { userId, conversationId, contextLimit = 10, provider, signal } = internalOptions;

    // Use memory manager to prepare messages and context
    const { messages: contextMessages, conversationId: finalConversationId } =
      await this.memoryManager.prepareConversationContext(
        operationContext,
        input,
        userId,
        conversationId,
        contextLimit,
      );

    // Get system message with input for RAG
    const systemMessage = await this.getSystemMessage({
      input,
      historyEntryId: operationContext.historyEntry.id,
      contextMessages,
    });

    // Standardized agent event

    // Combine messages
    let messages = [systemMessage, ...contextMessages];
    messages = await this.formatInputMessages(messages, input);

    this.createStandardTimelineEvent(
      operationContext.historyEntry.id,
      "start",
      "working",
      NodeType.AGENT,
      this.id,
      {
        input: messages,
      },
      "agent",
      operationContext,
    );

    // Create step finish handler for tracking generation steps
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
      signal,
      provider,
      toolExecutionContext: {
        operationContext: operationContext,
        agentId: this.id,
        historyEntryId: operationContext.historyEntry.id,
      } as ToolExecutionContext,
      onChunk: async (chunk: StepWithContent) => {
        if (chunk.type === "tool_call") {
          // Update tool status to working when tool is called
          if (chunk.name && chunk.id) {
            // Get the tool if it exists
            const tool = this.toolManager.getToolByName(chunk.name);

            // Create a tracked event for this tool call
            const eventUpdater = await this.addToolEvent(
              operationContext,
              "tool_working",
              chunk.name,
              "working",
              {
                toolId: chunk.id,
                input: chunk.arguments || {},
              },
            );
            // Store the updater with the tool call ID
            operationContext.eventUpdaters.set(chunk.id, eventUpdater);

            // Call onToolStart hook
            if (tool) {
              await this.hooks.onToolStart?.({
                agent: this,
                tool,
                context: operationContext,
              });
            }
          }
        } else if (chunk.type === "tool_result") {
          // Handle tool completion with the result when tool returns
          if (chunk.name && chunk.id) {
            // Get the updater for this tool call
            const eventUpdater = operationContext.eventUpdaters.get(chunk.id);

            if (eventUpdater) {
              // Create a unique node ID for the tool
              const toolNodeId = `tool_${chunk.name}_${this.id}`;

              // Update the tracked event with completion status
              eventUpdater({
                data: {
                  affectedNodeId: toolNodeId,
                  error: chunk.result?.error,
                  errorMessage: chunk.result?.error?.message,
                  status: chunk.result?.error ? "errored" : "completed",
                  updatedAt: new Date().toISOString(),
                  output: chunk.result ?? chunk.content,
                },
              });

              // Remove the updater from the map
              operationContext.eventUpdaters.delete(chunk.id);

              // Call onToolEnd hook
              const tool = this.toolManager.getToolByName(chunk.name);
              if (tool) {
                await this.hooks.onToolEnd?.({
                  agent: this,
                  tool,
                  output: chunk.result ?? chunk.content,
                  error: undefined,
                  context: operationContext,
                });
              }
            }
          }
        }
      },
      onStepFinish: async (step: StepWithContent) => {
        // Call agent's internal onStepFinish
        await onStepFinish(step);

        // Call user's onStepFinish if provided
        if (provider?.onStepFinish) {
          await (provider.onStepFinish as (step: StepWithContent) => Promise<void>)(step);
        }

        // Add step to history immediately
        this.addStepToHistory(step, operationContext);
      },
      onFinish: async (result: StreamTextFinishResult) => {
        if (!operationContext.isActive) {
          // Agent is not active, so we don't need to update the history or add a timeline event
          return;
        }
        // Handle agent's internal status and history using standardized result
        // Remove the previous loose extraction
        // const text = result?.text || result?.choices?.[0]?.message?.content || "";

        // Clear the updaters map
        operationContext.eventUpdaters.clear();

        // Update the history entry with final output from standardized result
        this.updateHistoryEntry(operationContext, {
          output: result.text, // Use result.text directly
          usage: result.usage, // Use result.usage directly
          status: "completed",
        });

        // Add "completed" timeline event using standardized result
        this.addAgentEvent(operationContext, "finished", "completed", {
          input: messages,
          output: result.text,
          usage: result.usage,
          affectedNodeId: `agent_${this.id}`,
          status: "completed",
          metadata: {
            // Include additional info from the result
            finishReason: result.finishReason,
            warnings: result.warnings,
            providerResponse: result.providerResponse,
          },
        });

        // Mark operation as inactive
        operationContext.isActive = false;

        // Call onEnd hook
        await this.hooks.onEnd?.({
          agent: this,
          output: result,
          error: undefined,
          context: operationContext,
        });

        // Call user's onFinish if provided, passing the standardized result
        if (provider?.onFinish) {
          await (provider.onFinish as StreamTextOnFinishCallback)(result);
        }
      },
      onError: async (error: VoltAgentError) => {
        // Check if it's a tool execution error using the dedicated field
        if (error.toolError) {
          const { toolCallId, toolName } = error.toolError;
          const eventUpdater = operationContext.eventUpdaters.get(toolCallId);

          if (eventUpdater) {
            // Create a unique node ID for the tool
            const toolNodeId = `tool_${toolName}_${this.id}`;

            // Update the tracked event with completion status using VoltAgentError fields
            eventUpdater({
              data: {
                affectedNodeId: toolNodeId,
                error: error.message, // Use the main error message
                errorMessage: error.message,
                status: "error", // Explicitly set status to error
                updatedAt: new Date().toISOString(),
                output: error.message, // Output is the error message
              },
            });

            // Remove the updater from the map
            operationContext.eventUpdaters.delete(toolCallId);

            // Call onToolEnd hook
            const tool = this.toolManager.getToolByName(toolName);
            if (tool) {
              // Pass the VoltAgentError as the error argument
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

        // Clear the updaters map regardless of error type
        operationContext.eventUpdaters.clear();

        // Add "error" timeline event using VoltAgentError fields
        this.addAgentEvent(operationContext, "finished", "error", {
          error: error, // Pass the whole VoltAgentError object
          errorMessage: error.message, // Use the main message
          affectedNodeId: `agent_${this.id}`,
          input: messages,
          status: "error",
          metadata: {
            // Include metadata if available
            code: error.code,
            originalError: error.originalError,
            stage: error.stage,
            toolError: error.toolError, // Include toolError details if present
            ...error.metadata,
          },
        });

        // Update the history entry with the main error message
        this.updateHistoryEntry(operationContext, {
          output: error.message, // Use the main message
          status: "error",
        });

        // Mark operation as inactive
        operationContext.isActive = false;

        // Call user's onError if provided, passing the VoltAgentError
        if (provider?.onError) {
          await (provider.onError as StreamOnErrorCallback)(error);
        }

        // Call onEnd hook for cleanup opportunity, even on error
        await this.hooks.onEnd?.({
          agent: this,
          output: undefined,
          error: error,
          context: operationContext,
        });
      },
    });

    // Ensure proper typing with an explicit cast
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
    // Create internal options structure by casting
    const internalOptions: InternalGenerateOptions = options as InternalGenerateOptions;

    // Create an initial context with "working" status
    const operationContext = await this.initializeHistory(input, "working", {
      parentAgentId: internalOptions.parentAgentId,
      parentHistoryEntryId: internalOptions.parentHistoryEntryId,
    });
    let messages: BaseMessage[] = [];
    try {
      // Call onStart hook
      await this.hooks.onStart?.({ agent: this, context: operationContext });

      const { userId, conversationId, contextLimit = 10, provider, signal } = internalOptions;

      // Use memory manager to prepare messages and context
      const { messages: contextMessages, conversationId: finalConversationId } =
        await this.memoryManager.prepareConversationContext(
          operationContext,
          input,
          userId,
          conversationId,
          contextLimit,
        );

      // Get system message with input for RAG
      const systemMessage = await this.getSystemMessage({
        input,
        historyEntryId: operationContext.historyEntry.id,
        contextMessages,
      });

      // Combine messages
      messages = [systemMessage, ...contextMessages];
      messages = await this.formatInputMessages(messages, input);

      this.createStandardTimelineEvent(
        operationContext.historyEntry.id,
        "start",
        "working",
        NodeType.AGENT,
        this.id,
        {
          input: messages,
        },
        "agent",
        operationContext,
      );

      // Create step finish handler for tracking generation steps
      const onStepFinish = this.memoryManager.createStepFinishHandler(
        operationContext,
        userId,
        finalConversationId,
      );

      const response = await this.llm.generateObject({
        messages,
        model: this.model,
        schema,
        signal,
        provider,
        toolExecutionContext: {
          operationContext: operationContext,
          agentId: this.id,
          historyEntryId: operationContext.historyEntry.id,
        } as ToolExecutionContext,
        onStepFinish: async (step) => {
          // Add step to history immediately
          this.addStepToHistory(step, operationContext);

          await onStepFinish(step);
          // Call user's onStepFinish if provided
          if (provider?.onStepFinish) {
            await (provider.onStepFinish as (step: StepWithContent) => Promise<void>)(step);
          }
        },
      });

      // Convert response to string for history
      const responseStr =
        typeof response === "string" ? response : JSON.stringify(response?.object);

      // Add "completed" timeline event
      this.addAgentEvent(operationContext, "finished", "completed", {
        output: responseStr,
        usage: response.usage,
        affectedNodeId: `agent_${this.id}`,
        status: "completed",
        input: messages,
      });

      // Update the history entry with final output
      this.updateHistoryEntry(operationContext, {
        output: responseStr,
        usage: response.usage,
        status: "completed",
      });

      // Mark operation as inactive
      operationContext.isActive = false;

      // --- Create Standardized Output for Hook ---
      const standardizedOutput: StandardizedObjectResult<z.infer<T>> = {
        object: response.object,
        usage: response.usage,
        finishReason: response.finishReason,
        // warnings: response.warnings,
        providerResponse: response,
      };
      // Call onEnd hook
      await this.hooks.onEnd?.({
        agent: this,
        output: standardizedOutput,
        error: undefined,
        context: operationContext,
      });
      // Return original response
      const typedResponse = response as InferGenerateObjectResponse<TProvider>;
      return typedResponse;
    } catch (error) {
      // --- Updated Error Handling ---
      // Assume the error is VoltAgentError based on provider contract
      const voltagentError = error as VoltAgentError;

      // Add "error" timeline event using structured info
      this.addAgentEvent(operationContext, "finished", "error", {
        error: voltagentError, // Keep the original VoltAgentError object
        errorMessage: voltagentError.message, // Use the standardized message
        affectedNodeId: `agent_${this.id}`,
        status: "error",
        input: messages,
        metadata: {
          // Include detailed metadata from VoltAgentError
          code: voltagentError.code,
          originalError: voltagentError.originalError,
          stage: voltagentError.stage,
          toolError: voltagentError.toolError, // Include toolError (less likely here, but for consistency)
          ...voltagentError.metadata,
        },
      });

      // Update the history entry with the standardized error message
      this.updateHistoryEntry(operationContext, {
        output: voltagentError.message,
        status: "error",
      });
      // --- End Updated Error Handling ---

      // Mark operation as inactive
      operationContext.isActive = false;

      // Call onEnd hook for cleanup opportunity, even on error
      await this.hooks.onEnd?.({
        agent: this,
        output: undefined,
        error: voltagentError,
        context: operationContext,
      });

      // Handle error cases
      throw voltagentError; // Re-throw the VoltAgentError
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
    // Create internal options structure by casting
    const internalOptions: InternalGenerateOptions = options as InternalGenerateOptions;
    const { provider } = internalOptions; // Extract provider for onFinish usage
    const operationContext = await this.initializeHistory(input, "working", {
      parentAgentId: internalOptions.parentAgentId,
      parentHistoryEntryId: internalOptions.parentHistoryEntryId,
    });
    let messages: BaseMessage[] = [];
    try {
      // Call onStart hook
      await this.hooks.onStart?.({ agent: this, context: operationContext });

      const { userId, conversationId, contextLimit = 10, signal } = internalOptions;

      // Use memory manager to prepare messages and context
      const { messages: contextMessages, conversationId: finalConversationId } =
        await this.memoryManager.prepareConversationContext(
          operationContext,
          input,
          userId,
          conversationId,
          contextLimit,
        );

      // Get system message with input for RAG
      const systemMessage = await this.getSystemMessage({
        input,
        historyEntryId: operationContext.historyEntry.id,
        contextMessages,
      });

      // Combine messages
      messages = [systemMessage, ...contextMessages];
      messages = await this.formatInputMessages(messages, input);

      this.createStandardTimelineEvent(
        operationContext.historyEntry.id,
        "start",
        "working",
        NodeType.AGENT,
        this.id,
        {
          input: messages,
        },
        "agent",
        operationContext,
      );

      // Create step finish handler for tracking generation steps
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
        signal,
        toolExecutionContext: {
          operationContext: operationContext,
          agentId: this.id,
          historyEntryId: operationContext.historyEntry.id,
        } as ToolExecutionContext,
        onStepFinish: async (step) => {
          // Add step to history immediately
          this.addStepToHistory(step, operationContext);

          await onStepFinish(step);

          // Call user's onStepFinish if provided
          if (provider?.onStepFinish) {
            await (provider.onStepFinish as (step: StepWithContent) => Promise<void>)(step);
          }
        },
        onFinish: async (result: StreamObjectFinishResult<z.infer<T>>) => {
          if (!operationContext.isActive) {
            // Agent is not active, so we don't need to update the history or add a timeline event
            return;
          }
          // Handle agent's internal status and history using standardized result
          const responseStr = JSON.stringify(result.object); // Stringify the object from standardized result

          // Add "completed" timeline event using standardized result
          this.addAgentEvent(operationContext, "finished", "completed", {
            input: messages,
            output: responseStr,
            usage: result.usage,
            affectedNodeId: `agent_${this.id}`,
            status: "completed",
            metadata: {
              // Include additional info from the result
              finishReason: result.finishReason,
              warnings: result.warnings,
              providerResponse: result.providerResponse,
            },
          });

          // Update the history entry with final output using standardized result
          this.updateHistoryEntry(operationContext, {
            output: responseStr,
            usage: result.usage,
            status: "completed",
          });

          // Mark operation as inactive
          operationContext.isActive = false;

          // Call onEnd hook
          await this.hooks.onEnd?.({
            agent: this,
            output: result,
            error: undefined,
            context: operationContext,
          });

          // Call user's onFinish if provided, passing the standardized result
          if (provider?.onFinish) {
            await (provider.onFinish as StreamObjectOnFinishCallback<z.infer<T>>)(result);
          }
        },
        onError: async (error: VoltAgentError) => {
          // --- Handle potential tool error event update ---
          // Check if it's a tool execution error using the dedicated field
          // (less common for streamObject but check for consistency)
          if (error.toolError) {
            const { toolCallId, toolName } = error.toolError;
            const eventUpdater = operationContext.eventUpdaters.get(toolCallId);
            if (eventUpdater) {
              try {
                const toolNodeId = createNodeId(NodeType.TOOL, toolName, this.id);
                await eventUpdater({
                  status: "error" as AgentStatus,
                  data: {
                    affectedNodeId: toolNodeId,
                    error: error.message,
                    errorMessage: error.message,
                    status: "error" as EventStatus,
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
              // Call onToolEnd hook
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
          // --- End handle potential tool error event update ---

          // Clear any remaining updaters (important if the error was not tool-specific)
          operationContext.eventUpdaters.clear();

          // Add "error" timeline event using VoltAgentError fields (already correct)
          this.addAgentEvent(operationContext, "finished", "error", {
            input: messages,
            error: error,
            errorMessage: error.message,
            affectedNodeId: `agent_${this.id}`,
            status: "error",
            metadata: {
              code: error.code,
              originalError: error.originalError,
              stage: error.stage,
              toolError: error.toolError,
              ...error.metadata,
            },
          });

          // Update the history entry with the main error message (already correct)
          this.updateHistoryEntry(operationContext, {
            output: error.message,
            status: "error",
          });

          // Mark operation as inactive (already correct)
          operationContext.isActive = false;

          // Call user's onError if provided, passing the VoltAgentError (already correct)
          if (provider?.onError) {
            await (provider.onError as StreamOnErrorCallback)(error);
          }

          // Call onEnd hook for cleanup opportunity, even on error (already correct)
          await this.hooks.onEnd?.({
            agent: this,
            output: undefined,
            error: error,
            context: operationContext,
          });
        },
      });

      // Ensure proper typing with an explicit cast
      const typedResponse = response as InferStreamObjectResponse<TProvider>;
      return typedResponse;
    } catch (error) {
      // Add "error" timeline event
      this.addAgentEvent(operationContext, "finished", "error", {
        input: messages,
        error,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        affectedNodeId: `agent_${this.id}`,
        status: "error",
      });

      // Update the history entry with error message
      this.updateHistoryEntry(operationContext, {
        output: error instanceof Error ? error.message : "Unknown error",
        status: "error",
      });

      // Mark operation as inactive
      operationContext.isActive = false;

      // Call onEnd hook for cleanup opportunity, even on error
      await this.hooks.onEnd?.({
        agent: this,
        output: undefined,
        error: error as VoltAgentError,
        context: operationContext,
      });

      // Handle error cases
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
}
