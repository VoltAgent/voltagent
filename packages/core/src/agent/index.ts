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
import type { UsageInfo } from "./providers/base/types";
import type { BaseRetriever } from "../retriever/retriever";
import { NodeType, createNodeId } from "../utils/node-utils";
import type { StandardEventData } from "../events/types";
import type { Voice } from "../voice";
import { serializeValueForDebug } from "../utils/serialization";

// --- OpenTelemetry Imports ---
import {
  trace,
  type Span,
  SpanKind,
  SpanStatusCode,
  type Attributes,
  context as apiContext,
} from "@opentelemetry/api";

// Get a tracer instance for this library
const tracer = trace.getTracer("voltagent-core", "0.1.0"); // Use your package name and version
// -----------------------------

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
   * @param options Options including parent context
   * @returns Created operation context
   */
  private async initializeHistory(
    input: string | BaseMessage[],
    initialStatus: AgentStatus = "working",
    options: { parentAgentId?: string; parentHistoryEntryId?: string; operationName: string } = {
      operationName: "unknown",
    },
  ): Promise<OperationContext> {
    const operationName = options.operationName;
    const parentContext = apiContext.active(); // Get current active context if any

    // Start the main span for this operation (WITHOUT user/session initially)
    const otelSpan = tracer.startSpan(
      operationName,
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          "voltagent.agent.id": this.id,
          "voltagent.agent.name": this.name,
          ...(options.parentAgentId && {
            "voltagent.parent.agent.id": options.parentAgentId,
          }),
          ...(options.parentHistoryEntryId && {
            "voltagent.parent.history.id": options.parentHistoryEntryId,
          }),
        },
      },
      parentContext,
    );

    // Create a new history entry (without events initially)
    const historyEntry = await this.historyManager.addEntry(
      input,
      "", // Empty output initially
      initialStatus,
      [], // Empty steps initially
      { events: [] }, // Start with empty events array
      // Do NOT pass otelSpan etc. to addEntry, they belong in OperationContext below
    );

    // Create operation context, including parent context if provided
    const opContext: OperationContext = {
      operationId: historyEntry.id,
      userContext: new Map<string | symbol, unknown>(),
      historyEntry,
      eventUpdaters: new Map<string, EventUpdater>(),
      isActive: true,
      parentAgentId: options.parentAgentId,
      parentHistoryEntryId: options.parentHistoryEntryId,
      // Assign the created OpenTelemetry span to the context
      otelSpan: otelSpan,
    };

    // Standardized message event (Pass the created opContext here)
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
      opContext, // Pass the context with the otelSpan
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
    // Ensure the toolSpans map exists on the context
    if (!context.toolSpans) {
      context.toolSpans = new Map<string, Span>();
    }

    const toolNodeId = createNodeId(NodeType.TOOL, toolName, this.id);
    const toolCallId = data.toolId?.toString(); // Get toolCallId

    // --- OpenTelemetry Tool Span START Handling ---
    // Only start span if status is 'working' and we have an ID
    if (toolCallId && status === "working") {
      // Check if a span for this ID already exists (should not happen ideally)
      if (context.toolSpans.has(toolCallId)) {
        console.warn(`[VoltAgentCore] OTEL tool span already exists for toolCallId: ${toolCallId}`);
      } else {
        const parentOtelContext = context.otelSpan
          ? trace.setSpan(apiContext.active(), context.otelSpan)
          : apiContext.active();
        const toolSpan = tracer.startSpan(
          `tool.execution: ${toolName}`,
          {
            kind: SpanKind.CLIENT,
            attributes: {
              "tool.call.id": toolCallId,
              "tool.name": toolName,
              "tool.arguments": data.input ? JSON.stringify(data.input) : undefined,
              "voltagent.agent.id": this.id,
            },
          },
          parentOtelContext,
        );
        // Store the active tool span
        context.toolSpans.set(toolCallId, toolSpan);
        console.log(
          "[Agent.addToolEvent] Tool Span started:",
          toolSpan.spanContext().spanId,
          "for tool:",
          toolName,
        ); // Debug Log
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
        // Use different variable name
        console.warn("Failed to serialize userContext for tool event:", err);
        userContextData = { serialization_error: true };
      }
    }
    const internalEventData: Partial<StandardEventData> & {
      userContext?: Record<string, unknown>;
      toolId?: string;
    } = {
      affectedNodeId: toolNodeId,
      status: status as any, // Keep cast for internal system
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
    };
    const eventEmitter = AgentEventEmitter.getInstance();
    const eventUpdater = await eventEmitter.createTrackedEvent({
      agentId: this.id,
      historyId: context.historyEntry.id,
      name: eventName,
      status: status as AgentStatus,
      data: internalEventData,
      type: "tool",
    });
    let parentUpdater: EventUpdater | null = null;
    if (context.parentAgentId && context.parentHistoryEntryId) {
      parentUpdater = await eventEmitter.createTrackedEvent({
        agentId: context.parentAgentId,
        historyId: context.parentHistoryEntryId,
        name: eventName,
        status: status as AgentStatus,
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
    status: EventStatus,
    data: Partial<StandardEventData> & Record<string, unknown> = {},
  ): void => {
    // Retrieve the OpenTelemetry span from the context
    const otelSpan = context.otelSpan;

    if (otelSpan) {
      try {
        const attributes: Attributes = {};
        if (data.input) {
          // Input might be complex, stringify unless exporter handles objects
          attributes["ai.prompt.messages"] =
            typeof data.input === "string" ? data.input : JSON.stringify(data.input);
        }
        if (data.output) {
          // Output might be complex, stringify unless exporter handles objects
          attributes["ai.response.text"] =
            typeof data.output === "string" ? data.output : JSON.stringify(data.output);
        }
        if (data.usage && typeof data.usage === "object") {
          // Use UsageInfo type assertion if imported correctly
          const usageInfo = data.usage as UsageInfo;
          if (usageInfo.promptTokens != null)
            attributes["gen_ai.usage.prompt_tokens"] = usageInfo.promptTokens;
          if (usageInfo.completionTokens != null)
            attributes["gen_ai.usage.completion_tokens"] = usageInfo.completionTokens;
          if (usageInfo.totalTokens != null) attributes["ai.usage.tokens"] = usageInfo.totalTokens;
        }
        if (data.metadata && typeof data.metadata === "object") {
          for (const [key, value] of Object.entries(data.metadata)) {
            if (
              ![
                "usage",
                "finishReason",
                "input",
                "output",
                "error",
                "errorMessage",
                "affectedNodeId",
                "status",
                "timestamp",
              ].includes(key) &&
              value != null
            ) {
              // Stringify non-primitive metadata values for OTEL attributes
              const attributeValue =
                typeof value === "string" || typeof value === "number" || typeof value === "boolean"
                  ? value
                  : JSON.stringify(value);
              attributes[`ai.telemetry.metadata.${key}`] = attributeValue;
            }
          }
        }

        otelSpan.setAttributes(attributes);

        if (status === "completed") {
          otelSpan.setStatus({ code: SpanStatusCode.OK });
        } else if (status === "error") {
          otelSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message: String(data.errorMessage || "Agent operation failed"),
          });
          if (data.error) {
            const errorObj =
              data.error instanceof Error ? data.error : new Error(String(data.error));
            otelSpan.recordException(errorObj);
          } else if (data.errorMessage) {
            otelSpan.recordException(new Error(String(data.errorMessage)));
          }
        }
      } catch (e) {
        otelSpan.setAttribute("otel.enrichment.error", true);
        otelSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: "Span enrichment failed",
        });
      } finally {
        // Always end the span when the agent event indicates completion/error
        otelSpan.end();
      }
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
    // Use a generic structure for the result data from step/chunk
    resultData: { result?: any; content?: any; error?: any },
  ): void {
    const toolSpan = context.toolSpans?.get(toolCallId);
    if (toolSpan) {
      console.log(
        `[Agent._endOtelToolSpan] Ending Tool Span: ${toolSpan.spanContext().spanId} for tool: ${toolName}`,
      ); // Debug Log
      try {
        // Prefer result if available, otherwise use content
        const toolResultContent = resultData.result ?? resultData.content;
        // Check for error within result or directly on resultData
        const toolError = resultData.result?.error ?? resultData.error;
        const isError = Boolean(toolError);

        // Set attributes
        toolSpan.setAttribute("tool.result", JSON.stringify(toolResultContent));
        if (isError) {
          const errorMessage = toolError?.message || String(toolError || "Unknown tool error");
          toolSpan.setAttribute("tool.error.message", errorMessage);
          const errorObj = toolError instanceof Error ? toolError : new Error(errorMessage);
          toolSpan.recordException(errorObj);
          toolSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message: errorObj.message,
          });
        } else {
          toolSpan.setStatus({ code: SpanStatusCode.OK });
        }
      } catch (e) {
        console.error("[VoltAgentCore] Error enriching OTEL tool span in _endOtelToolSpan:", e);
        if (toolSpan.isRecording()) {
          toolSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message: "Tool span enrichment failed",
          });
        }
      } finally {
        if (toolSpan.isRecording()) toolSpan.end();
        context.toolSpans?.delete(toolCallId); // Remove from map
      }
    } else {
      console.warn(
        `[VoltAgentCore] OTEL tool span not found for toolCallId: ${toolCallId} in _endOtelToolSpan`,
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
    } = internalOptions; // Extract IDs and contextLimit

    // Create an initial context first
    const operationContext = await this.initializeHistory(
      input,
      "working",
      { parentAgentId, parentHistoryEntryId, operationName: "generateText" },
      // No IDs passed here yet
    );

    // Now prepare context using the created operationContext
    const { messages: contextMessages, conversationId: finalConversationId } =
      await this.memoryManager.prepareConversationContext(
        operationContext, // Pass the created context
        input,
        userId,
        initialConversationId, // Use the one from options initially
        contextLimit,
      );

    if (operationContext.otelSpan) {
      if (userId) operationContext.otelSpan.setAttribute("enduser.id", userId);
      if (finalConversationId)
        operationContext.otelSpan.setAttribute("session.id", finalConversationId);
    }

    let messages: BaseMessage[] = [];
    try {
      // Call onStart hook
      await this.hooks.onStart?.({ agent: this, context: operationContext });

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
        provider: internalOptions.provider,
        signal: internalOptions.signal,
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
              const toolCallId = step.id;
              const toolName = step.name;

              const eventUpdater = operationContext.eventUpdaters.get(toolCallId);
              if (eventUpdater) {
                const isError = Boolean(step.result?.error);
                const statusForEvent: EventStatus = isError ? "error" : "completed";

                // Update the internal tracked event first
                await eventUpdater({
                  status: statusForEvent as AgentStatus,
                  data: {
                    error: step.result?.error,
                    errorMessage: step.result?.error?.message,
                    status: statusForEvent,
                    updatedAt: new Date().toISOString(),
                    output: step.result ?? step.content,
                  },
                });
                // Remove the updater
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
      });

      // Mark operation as inactive
      operationContext.isActive = false;

      const standardizedOutput: StandardizedTextResult = {
        text: response.text,
        usage: response.usage,
        finishReason: response.finishReason,
        providerResponse: response, // Include the original provider response
      };

      // Call onEnd hook
      await this.hooks.onEnd?.({
        agent: this,
        output: standardizedOutput,
        error: undefined,
        context: operationContext,
      });

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
    const internalOptions: InternalGenerateOptions = options as InternalGenerateOptions;
    const {
      userId,
      conversationId: initialConversationId,
      parentAgentId,
      parentHistoryEntryId,
      contextLimit = 10,
    } = internalOptions; // Extract IDs and contextLimit

    // Create an initial context first
    const operationContext = await this.initializeHistory(input, "working", {
      parentAgentId,
      parentHistoryEntryId,
      operationName: "streamText",
    });

    // Now prepare context using the created operationContext
    const { messages: contextMessages, conversationId: finalConversationId } =
      await this.memoryManager.prepareConversationContext(
        operationContext, // Pass the created context
        input,
        userId,
        initialConversationId, // Use the one from options initially
        contextLimit,
      );

    if (operationContext.otelSpan) {
      if (userId) operationContext.otelSpan.setAttribute("enduser.id", userId);
      if (finalConversationId)
        operationContext.otelSpan.setAttribute("session.id", finalConversationId);
    }

    // Call onStart hook
    await this.hooks.onStart?.({ agent: this, context: operationContext });

    // Get system message with input for RAG
    const systemMessage = await this.getSystemMessage({
      input,
      historyEntryId: operationContext.historyEntry.id,
      contextMessages,
    });

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
      signal: internalOptions.signal,
      provider: internalOptions.provider,
      toolExecutionContext: {
        operationContext: operationContext,
        agentId: this.id,
        historyEntryId: operationContext.historyEntry.id,
      } as ToolExecutionContext,
      onChunk: async (chunk: StepWithContent) => {
        if (chunk.type === "tool_call") {
          // Update tool status to working when tool is called
          if (chunk.name && chunk.id) {
            const tool = this.toolManager.getToolByName(chunk.name);
            // Create a tracked event for this tool call (Starts OTEL span)
            const eventUpdater = await this.addToolEvent(
              operationContext,
              "tool_working",
              chunk.name,
              "working",
              { toolId: chunk.id, input: chunk.arguments || {} },
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
            const toolCallId = chunk.id;
            const toolName = chunk.name;

            const eventUpdater = operationContext.eventUpdaters.get(toolCallId);
            if (eventUpdater) {
              const isError = Boolean(chunk.result?.error);
              const statusForEvent: EventStatus = isError ? "error" : "completed";

              // Update the internal tracked event first
              await eventUpdater({
                status: statusForEvent as AgentStatus,
                data: {
                  error: chunk.result?.error,
                  errorMessage: chunk.result?.error?.message,
                  status: statusForEvent,
                  updatedAt: new Date().toISOString(),
                  output: chunk.result ?? chunk.content,
                },
              });
              // Remove the updater
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
        // Call agent's internal onStepFinish
        await onStepFinish(step);

        // Call user's onStepFinish if provided
        if (internalOptions.provider?.onStepFinish) {
          await (internalOptions.provider.onStepFinish as (step: StepWithContent) => Promise<void>)(
            step,
          );
        }

        // Add step to history immediately
        this.addStepToHistory(step, operationContext);
      },
      onFinish: async (result: StreamTextFinishResult) => {
        if (!operationContext.isActive) {
          // Agent is not active, so we don't need to update the history or add a timeline event
          return;
        }

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
        if (internalOptions.provider?.onFinish) {
          await (internalOptions.provider.onFinish as StreamTextOnFinishCallback)(result);
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
          input: messages,
          error: error, // Pass the whole VoltAgentError object
          errorMessage: error.message, // Use the main message
          affectedNodeId: `agent_${this.id}`,
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
        if (internalOptions.provider?.onError) {
          await (internalOptions.provider.onError as StreamOnErrorCallback)(error);
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
    const internalOptions: InternalGenerateOptions = options as InternalGenerateOptions;
    const {
      userId,
      conversationId: initialConversationId,
      parentAgentId,
      parentHistoryEntryId,
      contextLimit = 10,
    } = internalOptions; // Extract IDs and contextLimit

    // Create an initial context first
    const operationContext = await this.initializeHistory(
      input,
      "working",
      { parentAgentId, parentHistoryEntryId, operationName: "generateObject" },
      // No IDs passed here yet
    );

    // Now prepare context using the created operationContext
    const { messages: contextMessages, conversationId: finalConversationId } =
      await this.memoryManager.prepareConversationContext(
        operationContext, // Pass the created context
        input,
        userId,
        initialConversationId, // Use the one from options initially
        contextLimit,
      );

    // Now update the OTEL span with the IDs
    if (operationContext.otelSpan) {
      if (userId) operationContext.otelSpan.setAttribute("enduser.id", userId);
      if (finalConversationId)
        operationContext.otelSpan.setAttribute("session.id", finalConversationId);
    }

    let messages: BaseMessage[] = [];
    try {
      // Call onStart hook
      await this.hooks.onStart?.({ agent: this, context: operationContext });

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
        signal: internalOptions.signal,
        provider: internalOptions.provider,
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
          if (internalOptions.provider?.onStepFinish) {
            await (
              internalOptions.provider.onStepFinish as (step: StepWithContent) => Promise<void>
            )(step);
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

      const standardizedOutput: StandardizedObjectResult<z.infer<T>> = {
        object: response.object,
        usage: response.usage,
        finishReason: response.finishReason,
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
    const internalOptions: InternalGenerateOptions = options as InternalGenerateOptions;
    const {
      userId,
      conversationId: initialConversationId,
      parentAgentId,
      parentHistoryEntryId,
      provider,
      contextLimit = 10,
    } = internalOptions; // Extract IDs, provider, contextLimit

    // Create an initial context first
    const operationContext = await this.initializeHistory(input, "working", {
      parentAgentId,
      parentHistoryEntryId,
      operationName: "streamObject",
    });

    // Now prepare context using the created operationContext
    const { messages: contextMessages, conversationId: finalConversationId } =
      await this.memoryManager.prepareConversationContext(
        operationContext, // Pass the created context
        input,
        userId,
        initialConversationId, // Use the one from options initially
        contextLimit,
      );

    if (operationContext.otelSpan) {
      if (userId) operationContext.otelSpan.setAttribute("enduser.id", userId);
      if (finalConversationId)
        operationContext.otelSpan.setAttribute("session.id", finalConversationId);
    }

    let messages: BaseMessage[] = [];
    try {
      // Call onStart hook
      await this.hooks.onStart?.({ agent: this, context: operationContext });

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
        signal: internalOptions.signal,
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
