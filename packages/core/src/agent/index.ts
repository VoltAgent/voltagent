import type { z } from "zod";
import { AgentEventEmitter } from "../events";
import type { EventStatus, EventUpdater } from "../events";
import { MemoryManager } from "../memory";
import type { AgentTool } from "../tool";
import { ToolManager } from "../tool";
import { type AgentHistoryEntry, HistoryManager } from "./history";
import { type AgentHooks, createHooks } from "./hooks";
import type { BaseMessage, BaseTool, LLMProvider, StepWithContent } from "./providers";
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
  OperationContext,
  ProviderInstance,
  PublicGenerateOptions,
} from "./types";
import type { BaseRetriever } from "../retriever/retriever";
import { NodeType, createNodeId } from "../utils/node-utils";
import type { StandardEventData } from "../events/types";
import type { Voice } from "../voice";

/**
 * Agent class for interacting with AI models
 */
export class Agent<TProvider extends { llm: LLMProvider<any> }> {
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
        subAgents?: Agent<any>[];
        maxHistoryEntries?: number;
        hooks?: AgentHooks;
        retriever?: BaseRetriever;
        voice?: Voice;
      },
  ) {
    this.id = options.id || options.name;
    this.name = options.name;
    this.description = options.description || "A helpful AI assistant";
    this.llm = options.llm as ProviderInstance<TProvider>;
    this.model = options.model;
    this.retriever = options.retriever;
    this.voice = options.voice;

    // Initialize hooks - support both AgentHooks instance and plain object
    if (options.hooks) {
      this.hooks = options.hooks;
    } else {
      this.hooks = createHooks();
    }

    // Initialize memory manager
    this.memoryManager = new MemoryManager(this.id, options.memory, options.memoryOptions || {});

    // Initialize tool manager
    this.toolManager = new ToolManager(options.tools || []);

    // Initialize sub-agent manager
    this.subAgentManager = new SubAgentManager(this.name, options.subAgents || []);

    // Initialize history manager with agent ID
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
    let description = this.description;

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
    const { tools: dynamicTools } = options;

    // Get tools from tool manager
    const toolsToUse = this.toolManager.prepareToolsForGeneration(dynamicTools);

    // If this agent has sub-agents, always create a new delegate tool with current historyEntryId
    if (this.subAgentManager.hasSubAgents()) {
      // Always create a delegate tool with the current historyEntryId
      const delegateTool = this.subAgentManager.createDelegateTool({
        sourceAgent: this,
        currentHistoryEntryId: options.historyEntryId,
        ...options,
      });

      // Replace existing delegate tool if any
      const delegateIndex = toolsToUse.findIndex((tool) => tool.name === "delegate_task");
      if (delegateIndex >= 0) {
        toolsToUse[delegateIndex] = delegateTool;
      } else {
        toolsToUse.push(delegateTool);

        // Add the delegate tool to the tool manager only if it doesn't exist yet
        this.toolManager.addTools([delegateTool]);
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
        input: input, // We now always use the input field (instead of message)
      },
      "agent",
      context,
    );

    // Standardized agent event
    this.createStandardTimelineEvent(
      context.historyEntry.id,
      "start",
      initialStatus as EventStatus,
      NodeType.AGENT,
      this.id,
      {},
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

    // Create the event data
    const eventData = {
      affectedNodeId,
      status,
      timestamp: new Date().toISOString(),
      sourceAgentId: this.id,
      ...data,
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
    data: Partial<StandardEventData> & Record<string, any> = {},
  ): Promise<EventUpdater> => {
    const toolNodeId = createNodeId(NodeType.TOOL, toolName, this.id);

    // Move custom fields to metadata
    const metadata: Record<string, any> = {
      toolName,
      ...(data.metadata || {}),
    };

    // Extract data fields to use while avoiding parameter reassignment
    const { toolId, input, output, error, errorMessage } = data;

    if (toolId) {
      metadata.toolId = toolId;
    }

    const eventData: Partial<StandardEventData> = {
      affectedNodeId: toolNodeId,
      status: status as any,
      timestamp: new Date().toISOString(),
      input,
      output,
      error,
      errorMessage,
      metadata,
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
        data: eventData, // Same data with original affectedNodeId
        type: "tool",
      });
    }

    // Return a combined updater that updates both events and maintains the return type
    return async (update: {
      status?: AgentStatus;
      data?: Record<string, any>;
    }): Promise<AgentHistoryEntry | undefined> => {
      // Update current agent's event
      const result = await eventUpdater(update);

      // Update parent agent's event if it exists
      if (parentUpdater) {
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
    data: Partial<StandardEventData> & Record<string, any> = {},
  ): void => {
    // Move non-standard fields to metadata
    const metadata: Record<string, any> = {
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
    const context = await this.initializeHistory(input, "working", {
      parentAgentId: internalOptions.parentAgentId,
      parentHistoryEntryId: internalOptions.parentHistoryEntryId,
    });

    try {
      // Call onStart hook
      await this.hooks.onStart?.(this);

      const { userId, conversationId, contextLimit = 10, provider, signal } = internalOptions;

      // Use memory manager to prepare messages and context
      const { messages: contextMessages, conversationId: finalConversationId } =
        await this.memoryManager.prepareConversationContext(
          context,
          input,
          userId,
          conversationId,
          contextLimit,
        );

      // Get system message with input for RAG
      const systemMessage = await this.getSystemMessage({
        input,
        historyEntryId: context.historyEntry.id,
        contextMessages,
      });

      // Combine messages
      let messages = [systemMessage, ...contextMessages];
      messages = await this.formatInputMessages(messages, input);

      // Create step finish handler for tracking generation steps
      const onStepFinish = this.memoryManager.createStepFinishHandler(
        context,
        userId,
        finalConversationId,
      );
      const { tools, maxSteps } = this.prepareTextOptions({
        ...internalOptions,
        conversationId: finalConversationId,
        historyEntryId: context.historyEntry.id,
      });

      const response = await this.llm.generateText({
        messages,
        model: this.model,
        maxSteps,
        tools,
        provider,
        signal,
        onStepFinish: async (step) => {
          // Add step to history immediately
          this.addStepToHistory(step, context);

          if (step.type === "tool_call") {
            // Update tool status to working when tool is called
            if (step.name && step.id) {
              // Get the tool if it exists
              const tool = this.toolManager.getToolByName(step.name);

              // Create a tracked event for this tool call
              const eventUpdater = await this.addToolEvent(
                context,
                "tool_working",
                step.name,
                "working",
                {
                  toolId: step.id,
                  input: step.arguments || {},
                },
              );

              // Store the updater with the tool call ID
              context.eventUpdaters.set(step.id, eventUpdater);

              // Call onToolStart hook if a tool exists
              if (tool) {
                await this.hooks.onToolStart?.(this, tool);
              }
            }
          } else if (step.type === "tool_result") {
            // Handle tool completion with the result when tool returns
            if (step.name && step.id) {
              // Get the updater for this tool call
              const eventUpdater = context.eventUpdaters.get(step.id);

              if (eventUpdater) {
                // Create a unique node ID for the tool
                const toolNodeId = `tool_${step.name}_${this.id}`;

                // Update the tracked event with completion status
                eventUpdater({
                  data: {
                    // New format
                    affectedNodeId: toolNodeId,
                    status: "completed",
                    updatedAt: new Date().toISOString(),
                    result: step.content,
                    output: step.result,
                  },
                });

                // Remove the updater from the map
                context.eventUpdaters.delete(step.id);

                // Call onToolEnd hook if a tool with this name exists
                const tool = this.toolManager.getToolByName(step.name);
                if (tool) {
                  await this.hooks.onToolEnd?.(this, tool, step.content);
                }
              }
            }
          }

          await onStepFinish(step);
        },
      });

      // Clear the updaters map
      context.eventUpdaters.clear();

      // Update the history entry with final output
      this.updateHistoryEntry(context, {
        output: response.text,
        usage: response.usage,
        status: "completed",
      });

      // Add "completed" timeline event
      this.addAgentEvent(context, "finished", "completed", {
        output: response.text,
        usage: response.usage,
        affectedNodeId: `agent_${this.id}`,
        status: "completed",
      });

      // Mark operation as inactive
      context.isActive = false;

      // Call onEnd hook
      await this.hooks.onEnd?.(this, response);

      // Ensure proper typing with an explicit cast
      const typedResponse = response as InferGenerateTextResponse<TProvider>;
      return typedResponse;
    } catch (error) {
      // Clear the updaters map
      context.eventUpdaters.clear();

      // Add "error" timeline event
      this.addAgentEvent(context, "finished", "error", {
        error,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        affectedNodeId: `agent_${this.id}`,
        status: "error",
      });

      // Update the history entry with error message
      this.updateHistoryEntry(context, {
        output: error instanceof Error ? error.message : "Unknown error",
        status: "error",
      });

      // Mark operation as inactive
      context.isActive = false;

      throw error;
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
    const context = await this.initializeHistory(input, "working", {
      parentAgentId: internalOptions.parentAgentId,
      parentHistoryEntryId: internalOptions.parentHistoryEntryId,
    });

    try {
      await this.hooks.onStart?.(this);

      const { userId, conversationId, contextLimit = 10, provider, signal } = internalOptions;

      // Use memory manager to prepare messages and context
      const { messages: contextMessages, conversationId: finalConversationId } =
        await this.memoryManager.prepareConversationContext(
          context,
          input,
          userId,
          conversationId,
          contextLimit,
        );

      // Get system message with input for RAG
      const systemMessage = await this.getSystemMessage({
        input,
        historyEntryId: context.historyEntry.id,
        contextMessages,
      });

      // Combine messages
      let messages = [systemMessage, ...contextMessages];
      messages = await this.formatInputMessages(messages, input);

      // Create step finish handler for tracking generation steps
      const onStepFinish = this.memoryManager.createStepFinishHandler(
        context,
        userId,
        finalConversationId,
      );
      const { tools, maxSteps } = this.prepareTextOptions({
        ...internalOptions,
        conversationId: finalConversationId,
        historyEntryId: context.historyEntry.id, // Pass history ID for delegate_task
      });

      const response = await this.llm.streamText({
        messages,
        model: this.model,
        maxSteps,
        tools,
        signal,
        ...provider,
        onChunk: async (chunk: StepWithContent) => {
          if (chunk.type === "tool_call") {
            // Update tool status to working when tool is called
            if (chunk.name && chunk.id) {
              // Get the tool if it exists
              const tool = this.toolManager.getToolByName(chunk.name);

              // Create a tracked event for this tool call
              const eventUpdater = await this.addToolEvent(
                context,
                "tool_working",
                chunk.name,
                "working",
                {
                  toolId: chunk.id,
                  input: chunk.arguments || {},
                },
              );

              // Store the updater with the tool call ID
              context.eventUpdaters.set(chunk.id, eventUpdater);

              // Call onToolStart hook if a tool exists
              if (tool) {
                await this.hooks.onToolStart?.(this, tool);
              }
            }
          } else if (chunk.type === "tool_result") {
            // Handle tool completion with the result when tool returns
            if (chunk.name && chunk.id) {
              // Get the updater for this tool call
              const eventUpdater = context.eventUpdaters.get(chunk.id);

              if (eventUpdater) {
                // Create a unique node ID for the tool
                const toolNodeId = `tool_${chunk.name}_${this.id}`;

                // Update the tracked event with completion status
                eventUpdater({
                  data: {
                    affectedNodeId: toolNodeId,
                    status: "completed",
                    updatedAt: new Date().toISOString(),
                    result: chunk.content,
                    output: chunk.result,
                  },
                });

                // Remove the updater from the map
                context.eventUpdaters.delete(chunk.id);

                // Call onToolEnd hook if a tool with this name exists
                const tool = this.toolManager.getToolByName(chunk.name);
                if (tool) {
                  await this.hooks.onToolEnd?.(this, tool, chunk.content);
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
          this.addStepToHistory(step, context);
        },
        onFinish: async (result: any) => {
          // Handle agent's internal status and history

          // Extract text from result based on provider's format
          const text = result?.text || result?.choices?.[0]?.message?.content || "";

          // Clear the updaters map
          context.eventUpdaters.clear();

          // Update the history entry with final output
          this.updateHistoryEntry(context, {
            output: text,
            usage: result?.usage,
            status: "completed",
          });

          // Add "completed" timeline event
          this.addAgentEvent(context, "finished", "completed", {
            output: result?.text || result?.choices?.[0]?.message?.content || "",
            usage: result?.usage,
            affectedNodeId: `agent_${this.id}`,
            status: "completed",
          });

          // Mark operation as inactive
          context.isActive = false;

          // Call onEnd hook
          await this.hooks.onEnd?.(this, result);

          // Call user's onFinish if provided with the entire result
          if (provider?.onFinish) {
            await (provider.onFinish as (result: any) => Promise<void>)(result);
          }
        },
        onError: async (error) => {
          // Clear the updaters map
          context.eventUpdaters.clear();

          // Add "error" timeline event
          this.addAgentEvent(context, "finished", "error", {
            error,
            errorMessage: error instanceof Error ? error.message : "Unknown error",
            affectedNodeId: `agent_${this.id}`,
            status: "error",
          });

          // Update the history entry with error message
          this.updateHistoryEntry(context, {
            output: error instanceof Error ? error.message : "Unknown error",
            status: "error",
          });

          // Mark operation as inactive
          context.isActive = false;

          if (provider?.onError) {
            await (provider.onError as (error: any) => Promise<void>)(error);
          }
        },
      });

      // Ensure proper typing with an explicit cast
      const typedResponse = response as InferStreamTextResponse<TProvider>;
      return typedResponse;
    } catch (error) {
      // Handle error cases
      throw error;
    }
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
    const context = await this.initializeHistory(input, "working", {
      parentAgentId: internalOptions.parentAgentId,
      parentHistoryEntryId: internalOptions.parentHistoryEntryId,
    });

    try {
      // Call onStart hook
      await this.hooks.onStart?.(this);

      const { userId, conversationId, contextLimit = 10, provider, signal } = internalOptions;

      // Use memory manager to prepare messages and context
      const { messages: contextMessages, conversationId: finalConversationId } =
        await this.memoryManager.prepareConversationContext(
          context,
          input,
          userId,
          conversationId,
          contextLimit,
        );

      // Get system message with input for RAG
      const systemMessage = await this.getSystemMessage({
        input,
        historyEntryId: context.historyEntry.id,
        contextMessages,
      });

      // Combine messages
      let messages = [systemMessage, ...contextMessages];
      messages = await this.formatInputMessages(messages, input);

      // Create step finish handler for tracking generation steps
      const onStepFinish = this.memoryManager.createStepFinishHandler(
        context,
        userId,
        finalConversationId,
      );

      const response = await this.llm.generateObject({
        messages,
        model: this.model,
        schema,
        signal,
        ...internalOptions.provider,
        onStepFinish: async (step) => {
          // Add step to history immediately
          this.addStepToHistory(step, context);

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
      this.addAgentEvent(context, "finished", "completed", {
        output: responseStr,
        usage: response.usage,
        affectedNodeId: `agent_${this.id}`,
        status: "completed",
      });

      // Update the history entry with final output
      this.updateHistoryEntry(context, {
        output: responseStr,
        usage: response.usage,
        status: "completed",
      });

      // Mark operation as inactive
      context.isActive = false;

      // Call onEnd hook
      await this.hooks.onEnd?.(this, response);

      // Ensure proper typing with an explicit cast
      const typedResponse = response as InferGenerateObjectResponse<TProvider>;
      return typedResponse;
    } catch (error) {
      // Add "error" timeline event
      this.addAgentEvent(context, "finished", "error", {
        error,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        affectedNodeId: `agent_${this.id}`,
        status: "error",
      });

      // Update the history entry with error message
      this.updateHistoryEntry(context, {
        output: error instanceof Error ? error.message : "Unknown error",
        status: "error",
      });

      // Mark operation as inactive
      context.isActive = false;

      // Handle error cases
      throw error;
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

    // Create an initial context with "working" status
    const context = await this.initializeHistory(input, "working", {
      parentAgentId: internalOptions.parentAgentId,
      parentHistoryEntryId: internalOptions.parentHistoryEntryId,
    });

    try {
      // Call onStart hook
      await this.hooks.onStart?.(this);

      const { userId, conversationId, contextLimit = 10, provider, signal } = internalOptions;

      // Use memory manager to prepare messages and context
      const { messages: contextMessages, conversationId: finalConversationId } =
        await this.memoryManager.prepareConversationContext(
          context,
          input,
          userId,
          conversationId,
          contextLimit,
        );

      // Get system message with input for RAG
      const systemMessage = await this.getSystemMessage({
        input,
        historyEntryId: context.historyEntry.id,
        contextMessages,
      });

      // Combine messages
      let messages = [systemMessage, ...contextMessages];
      messages = await this.formatInputMessages(messages, input);

      // Create step finish handler for tracking generation steps
      const onStepFinish = this.memoryManager.createStepFinishHandler(
        context,
        userId,
        finalConversationId,
      );

      const response = await this.llm.streamObject({
        messages,
        model: this.model,
        schema,
        signal,
        ...internalOptions.provider,
        onStepFinish: async (step) => {
          // Add step to history immediately
          this.addStepToHistory(step, context);

          await onStepFinish(step);

          // Call user's onStepFinish if provided
          if (provider?.onStepFinish) {
            await (provider.onStepFinish as (step: StepWithContent) => Promise<void>)(step);
          }
        },
        onFinish: async (result: any) => {
          // Handle agent's internal status and history
          // Convert response to string for history
          const responseStr = typeof result === "string" ? result : JSON.stringify(result.object);

          // Add "completed" timeline event
          this.addAgentEvent(context, "finished", "completed", {
            output: responseStr,
            usage: result?.usage,
            affectedNodeId: `agent_${this.id}`,
            status: "completed",
          });

          // Update the history entry with final output
          this.updateHistoryEntry(context, {
            output: responseStr,
            usage: result?.usage,
            status: "completed",
          });

          // Mark operation as inactive
          context.isActive = false;

          // Call onEnd hook
          await this.hooks.onEnd?.(this, result);

          // Call user's onFinish if provided
          if (provider?.onFinish) {
            await (provider.onFinish as (result: any) => Promise<void>)(result);
          }
        },
        onError: async (error) => {
          // Add "error" timeline event
          this.addAgentEvent(context, "finished", "error", {
            error,
            errorMessage: error instanceof Error ? error.message : "Unknown error",
            affectedNodeId: `agent_${this.id}`,
            status: "error",
          });

          // Update the history entry with error message
          this.updateHistoryEntry(context, {
            output: error instanceof Error ? error.message : "Unknown error",
            status: "error",
          });

          // Mark operation as inactive
          context.isActive = false;

          if (provider?.onError) {
            await (provider.onError as (error: any) => Promise<void>)(error);
          }
        },
      });

      // Ensure proper typing with an explicit cast
      const typedResponse = response as InferStreamObjectResponse<TProvider>;
      return typedResponse;
    } catch (error) {
      // Add "error" timeline event
      this.addAgentEvent(context, "finished", "error", {
        error,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        affectedNodeId: `agent_${this.id}`,
        status: "error",
      });

      // Update the history entry with error message
      this.updateHistoryEntry(context, {
        output: error instanceof Error ? error.message : "Unknown error",
        status: "error",
      });

      // Mark operation as inactive
      context.isActive = false;

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
      this.toolManager.addTools([delegateTool]);
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
   * Add one or more tools to the agent
   * If a tool with the same name already exists, it will be replaced
   * @returns Object containing added tools
   */
  addTools(tools: AgentTool[]): { added: AgentTool[] } {
    const result = {
      added: [] as AgentTool[],
    };

    for (const tool of tools) {
      try {
        this.toolManager.addTool(tool);
        result.added.push(tool);
      } catch (error) {}
    }

    return result;
  }
}
