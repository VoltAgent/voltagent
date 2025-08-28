/**
 * Agent - Direct AI SDK integration without provider abstraction
 * Refactored with better architecture and type safety
 */

import type {
  AssistantModelMessage,
  SystemModelMessage,
  ToolModelMessage,
} from "@ai-sdk/provider-utils";
import type { Span } from "@opentelemetry/api";
import type { Logger } from "@voltagent/internal";
import { safeStringify } from "@voltagent/internal/utils";
import type {
  StreamTextResult as AIStreamTextResult,
  CallSettings,
  GenerateObjectResult,
  GenerateTextResult,
  LanguageModel,
  StepResult,
  ToolSet,
  UIMessage,
} from "ai";
import {
  type AsyncIterableStream,
  type CallWarning,
  type FinishReason,
  type LanguageModelUsage,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateObject,
  generateText,
  stepCountIs,
  streamObject,
  streamText,
} from "ai";
import type { z } from "zod";
import { AgentEventEmitter } from "../events";
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
import { LogEvents, LoggerProxy, ensureBufferedLogger } from "../logger";
import { ActionType, buildAgentLogMessage } from "../logger/message-builder";
import type { InternalMemory } from "../memory";
import { MemoryManager } from "../memory/manager";
import type { Memory } from "../memory/types";
import { AgentRegistry } from "../registries/agent-registry";
import type { BaseRetriever } from "../retriever/retriever";
import type { VoltAgentExporter } from "../telemetry/exporter";
import type { Tool, Toolkit } from "../tool";
import { ToolManager } from "../tool/manager";
import type { ReasoningToolExecuteOptions } from "../tool/reasoning/types";
import { convertResponseMessagesToUIMessages } from "../utils/message-converter";
import { NodeType, createNodeId } from "../utils/node-utils";
import { convertUsage } from "../utils/usage-converter";
import type { Voice } from "../voice";
import { VoltOpsClient as VoltOpsClientClass } from "../voltops/client";
import type { VoltOpsClient } from "../voltops/client";
import type { PromptContent, PromptHelper } from "../voltops/types";
import { type AgentHistoryEntry, HistoryManager } from "./history";
import { endOperationSpan, endToolSpan, startOperationSpan, startToolSpan } from "./open-telemetry";
import type { BaseMessage, StepWithContent } from "./providers/base/types";
import { SubAgentManager } from "./subagent";
import type { SubAgentConfig } from "./subagent/types";
import type { VoltAgentTextStreamPart } from "./subagent/types";
import type {
  AbortError,
  AgentFullState,
  DynamicValue,
  DynamicValueOptions,
  OperationContext,
  SupervisorConfig,
  ToolExecutionContext,
  VoltAgentError,
} from "./types";

// ============================================================================
// Types
// ============================================================================

/**
 * Context input type that accepts both Map and plain object
 */
export type ContextInput = Map<string | symbol, unknown> | Record<string | symbol, unknown>;

/**
 * Converts context input to Map
 */
function toContextMap(context?: ContextInput): Map<string | symbol, unknown> | undefined {
  if (!context) return undefined;
  return context instanceof Map ? context : new Map(Object.entries(context));
}

/**
 * Agent context with comprehensive tracking
 */
export interface AgentContext {
  // User-provided context
  context: Map<string | symbol, unknown>;

  // Operation metadata
  operation: {
    id: string;
    userId?: string;
    conversationId?: string;
    parentAgentId?: string;
    parentHistoryId?: string;
  };

  // System internals
  system: {
    logger: Logger;
    signal?: AbortSignal;
    abortController?: AbortController;
    startTime: string;
    agentStartEventId?: string;
  };

  // OpenTelemetry tracking
  otelSpan?: Span;
  toolSpans?: Map<string, Span>;

  // Cancellation support
  cancellationError?: AbortError;

  // Conversation tracking
  conversationSteps?: StepWithContent[];

  // Internal operation context for compatibility
  operationContext?: OperationContext;
}

/**
 * Agent hooks for lifecycle events
 */
export interface AgentHooks {
  onStart?: (context: AgentContext) => Promise<void> | void;
  onEnd?: (context: AgentContext, result: any, error?: Error) => Promise<void> | void;
  onError?: (context: AgentContext, error: Error) => Promise<void> | void;
  onStepFinish?: (step: any) => Promise<void> | void;
  onPrepareMessages?: (
    messages: UIMessage[],
    context: AgentContext,
  ) => Promise<{ messages: UIMessage[] }> | { messages: UIMessage[] };
  onHandoff?: (context: AgentContext) => Promise<void> | void;
  onToolStart?: (context: AgentContext, tool: Tool) => Promise<void> | void;
  onToolEnd?: (context: AgentContext, tool: Tool, output: any, error?: any) => Promise<void> | void;
}

/**
 * Extended StreamTextResult that includes context
 */
export interface StreamTextResultWithContext<
  TOOLS extends ToolSet = Record<string, any>,
  PARTIAL_OUTPUT = any,
> {
  // All methods from AIStreamTextResult
  readonly text: AIStreamTextResult<TOOLS, PARTIAL_OUTPUT>["text"];
  readonly textStream: AIStreamTextResult<TOOLS, PARTIAL_OUTPUT>["textStream"];
  readonly fullStream: AsyncIterable<VoltAgentTextStreamPart<TOOLS>>;
  readonly usage: AIStreamTextResult<TOOLS, PARTIAL_OUTPUT>["usage"];
  readonly finishReason: AIStreamTextResult<TOOLS, PARTIAL_OUTPUT>["finishReason"];
  readonly experimental_partialOutputStream?: AIStreamTextResult<
    TOOLS,
    PARTIAL_OUTPUT
  >["experimental_partialOutputStream"];
  toUIMessageStream: AIStreamTextResult<TOOLS, PARTIAL_OUTPUT>["toUIMessageStream"];
  toUIMessageStreamResponse: AIStreamTextResult<TOOLS, PARTIAL_OUTPUT>["toUIMessageStreamResponse"];
  pipeUIMessageStreamToResponse: AIStreamTextResult<
    TOOLS,
    PARTIAL_OUTPUT
  >["pipeUIMessageStreamToResponse"];
  pipeTextStreamToResponse: AIStreamTextResult<TOOLS, PARTIAL_OUTPUT>["pipeTextStreamToResponse"];
  toTextStreamResponse: AIStreamTextResult<TOOLS, PARTIAL_OUTPUT>["toTextStreamResponse"];
  // Additional context field
  context: Map<string | symbol, unknown>;
}

/**
 * Extended StreamObjectResult that includes context
 */
export interface StreamObjectResultWithContext<T> {
  // Delegate to original streamObject result properties
  readonly object: Promise<T>;
  readonly partialObjectStream: ReadableStream<Partial<T>>;
  readonly textStream: AsyncIterableStream<string>;
  readonly warnings: Promise<CallWarning[] | undefined>;
  readonly usage: Promise<LanguageModelUsage>;
  readonly finishReason: Promise<FinishReason>;
  // Response conversion methods
  pipeTextStreamToResponse(response: any, init?: ResponseInit): void;
  toTextStreamResponse(init?: ResponseInit): Response;
  // Additional context field
  context: Map<string | symbol, unknown>;
}

/**
 * Extended GenerateTextResult that includes context
 */
export interface GenerateTextResultWithContext<
  TOOLS extends ToolSet = Record<string, any>,
  OUTPUT = any,
> extends GenerateTextResult<TOOLS, OUTPUT> {
  // Additional context field
  context: Map<string | symbol, unknown>;
}

/**
 * Extended GenerateObjectResult that includes context
 */
export interface GenerateObjectResultWithContext<T> extends GenerateObjectResult<T> {
  // Additional context field
  context: Map<string | symbol, unknown>;
}

/**
 * Agent constructor options
 */
export interface AgentOptions {
  // Identity
  id?: string;
  name: string;
  purpose?: string;

  // Core AI
  model: LanguageModel | DynamicValue<LanguageModel>;
  instructions: string | DynamicValue<string>;

  // Tools & Memory
  tools?: (Tool<any, any> | Toolkit)[] | DynamicValue<(Tool<any, any> | Toolkit)[]>;
  toolkits?: Toolkit[];
  memory?: Memory | false;
  memoryOptions?: any;
  historyMemory?: Memory;

  // Retriever/RAG
  retriever?: BaseRetriever;

  // SubAgents
  subAgents?: SubAgentConfig[];
  supervisorConfig?: SupervisorConfig;
  maxHistoryEntries?: number;

  // Hooks
  hooks?: AgentHooks;

  // Configuration
  temperature?: number;
  maxOutputTokens?: number;
  maxSteps?: number;
  markdown?: boolean;

  // Voice
  voice?: Voice;

  // System
  logger?: Logger;
  historyManager?: HistoryManager;
  voltOpsClient?: VoltOpsClient;
  telemetryExporter?: VoltAgentExporter; // Deprecated

  // User context
  context?: ContextInput;
}

/**
 * Base options for all generation methods
 * Extends AI SDK's CallSettings for full compatibility
 */
export interface BaseGenerationOptions extends Partial<CallSettings> {
  // === VoltAgent Specific ===
  // Context
  userId?: string;
  conversationId?: string;
  context?: ContextInput;

  // Parent tracking
  parentAgentId?: string;
  parentHistoryEntryId?: string;
  parentOperationContext?: OperationContext;

  // Memory
  contextLimit?: number;

  // Steps control
  maxSteps?: number;

  // Hooks (can override agent hooks)
  hooks?: AgentHooks;

  // === Inherited from AI SDK CallSettings ===
  // maxOutputTokens, temperature, topP, topK,
  // presencePenalty, frequencyPenalty, stopSequences,
  // seed, maxRetries, abortSignal, headers
}

export type GenerateTextOptions = BaseGenerationOptions;
export type StreamTextOptions = BaseGenerationOptions & {
  onFinish?: (result: any) => void | Promise<void>;
};
export type GenerateObjectOptions = BaseGenerationOptions;
export type StreamObjectOptions = BaseGenerationOptions & {
  onFinish?: (result: any) => void | Promise<void>;
};

// ============================================================================
// Agent Implementation
// ============================================================================

export class Agent {
  readonly id: string;
  readonly name: string;
  readonly purpose?: string;
  readonly instructions: string | DynamicValue<string>;
  readonly model: LanguageModel | DynamicValue<LanguageModel>;
  readonly tools: (Tool<any, any> | Toolkit)[] | DynamicValue<(Tool<any, any> | Toolkit)[]>;
  readonly hooks: AgentHooks;
  readonly temperature?: number;
  readonly maxOutputTokens?: number;
  readonly maxSteps: number;
  readonly markdown: boolean;
  readonly voice?: Voice;
  readonly retriever?: BaseRetriever;
  readonly supervisorConfig?: SupervisorConfig;
  private readonly context?: Map<string | symbol, unknown>;

  private readonly logger: Logger;
  private readonly memoryManager: MemoryManager;
  private readonly toolManager: ToolManager;
  private readonly historyManager: HistoryManager;
  private readonly subAgentManager: SubAgentManager;
  private readonly voltOpsClient?: VoltOpsClient;
  private readonly prompts?: PromptHelper;

  constructor(options: AgentOptions) {
    this.id = options.id || options.name;
    this.name = options.name;
    this.purpose = options.purpose;
    this.instructions = options.instructions;
    this.model = options.model;
    this.tools = options.tools || [];
    this.hooks = options.hooks || {};
    this.temperature = options.temperature;
    this.maxOutputTokens = options.maxOutputTokens;
    this.maxSteps = options.maxSteps || 5;
    this.markdown = options.markdown ?? false;
    this.voice = options.voice;
    this.retriever = options.retriever;
    this.supervisorConfig = options.supervisorConfig;
    this.context = toContextMap(options.context);
    this.voltOpsClient = options.voltOpsClient;

    // Initialize prompts helper if VoltOpsClient is available
    if (this.voltOpsClient) {
      this.prompts = this.voltOpsClient.createPromptHelper(this.id);
    }

    // Initialize logger - use provided logger or fall back to LoggerProxy
    if (options.logger) {
      this.logger = ensureBufferedLogger(options.logger, {
        component: "agent-v2",
        agentId: this.id,
        modelName: this.getModelName(),
      });
    } else {
      this.logger = new LoggerProxy({
        component: "agent-v2",
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

    // Initialize managers
    // Cast to InternalMemory since InMemoryStorage implements it
    this.memoryManager = new MemoryManager(
      this.id,
      options.memory as any as InternalMemory | false | undefined,
      options.memoryOptions || {},
      options.historyMemory as any as InternalMemory | undefined,
      this.logger,
    );

    // Initialize tool manager with static tools
    const staticTools = typeof this.tools === "function" ? [] : this.tools || [];
    this.toolManager = new ToolManager(staticTools, this.logger);
    if (options.toolkits) {
      this.toolManager.addItems(options.toolkits);
    }

    // Initialize sub-agent manager
    this.subAgentManager = new SubAgentManager(
      this.name,
      options.subAgents || [],
      this.supervisorConfig,
    );

    // Initialize history manager with VoltOpsClient or legacy telemetryExporter support
    let chosenExporter: VoltAgentExporter | undefined;

    if (options.voltOpsClient?.observability) {
      chosenExporter = options.voltOpsClient.observability;
      this.logger.debug("VoltOpsClient initialized with observability and prompt management");
    } else if (options.telemetryExporter) {
      this.logger.warn(
        `⚠️  DEPRECATION WARNING: 'telemetryExporter' parameter is deprecated!
   
   🔄 MIGRATION REQUIRED:
   ❌ OLD: telemetryExporter: new VoltAgentExporter({ ... })
   ✅ NEW: voltOpsClient: new VoltOpsClient({ publicKey: "...", secretKey: "..." })
   `,
      );
      chosenExporter = options.telemetryExporter;
    } else {
      chosenExporter = AgentRegistry.getInstance().getGlobalVoltAgentExporter();
    }

    this.historyManager =
      options.historyManager ||
      new HistoryManager(
        this.id,
        this.memoryManager,
        options.maxHistoryEntries || 0,
        chosenExporter,
        this.logger,
      );
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Get conversation messages in AI SDK UIMessage format
   * @param userId - User ID to filter messages
   * @param conversationId - Conversation ID to filter messages
   * @param limit - Maximum number of messages to return
   * @returns Array of UIMessages for the conversation
   */
  async getUIMessages(
    userId: string,
    conversationId: string,
    limit?: number,
  ): Promise<import("ai").UIMessage[]> {
    const memory = this.memoryManager.getMemory();
    if (!memory) {
      return [];
    }

    return memory.getMessages(userId, conversationId, { limit });
  }

  /**
   * Generate text response
   */
  async generateText(
    input: string | UIMessage[],
    options?: GenerateTextOptions,
  ): Promise<GenerateTextResultWithContext> {
    const startTime = Date.now();
    const context = await this.createContext(input, options);
    const methodLogger = context.system.logger; // Extract logger with executionId

    const { messages, model, tools, maxSteps } = await this.prepareExecution(
      input,
      context,
      options,
    );

    const modelName = this.getModelName();
    const contextLimit = options?.contextLimit;

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
        messageCount: messages?.length || 0,
        input,
      },
    );

    try {
      // Call hooks
      await this.getMergedHooks(options).onStart?.(context);

      // Publish agent:start event
      const agentStartEvent = this.createAgentStartEvent(
        context,
        input,
        messages,
        maxSteps,
        options,
      );
      this.publishTimelineEvent(context, agentStartEvent);

      // Setup abort signal listener
      this.setupAbortSignalListener(
        context.system.abortController?.signal || context.system.signal,
        context,
        agentStartEvent,
      );

      methodLogger.debug("Starting agent llm call");

      methodLogger.debug("[LLM] - Generating text", {
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        maxSteps,
        tools: tools ? Object.keys(tools) : [],
      });

      // Extract VoltAgent-specific options
      const {
        userId,
        conversationId,
        parentAgentId,
        parentHistoryEntryId,
        parentOperationContext,
        contextLimit,
        hooks,
        maxSteps: userMaxSteps,
        ...aiSDKOptions
      } = options || {};

      const result = await generateText({
        model,
        messages,
        tools,
        // Default values
        temperature: this.temperature,
        maxOutputTokens: this.maxOutputTokens,
        maxRetries: 3,
        stopWhen: stepCountIs(maxSteps),
        // User overrides from AI SDK options
        ...aiSDKOptions,
        // VoltAgent controlled (these should not be overridden)
        abortSignal: context.system.signal,
        onStepFinish: this.createStepHandler(context, options),
      });

      // Save response messages to memory
      await this.saveResponseMessagesToMemory(context, result.response?.messages);

      // Update history
      this.updateHistoryEntry(context, {
        output: result.text,
        usage: convertUsage(result.usage),
        endTime: new Date(),
        status: "completed",
      });

      // Publish agent:success event
      const agentSuccessEvent = this.createAgentSuccessEvent(context, result);
      this.publishTimelineEvent(context, agentSuccessEvent);

      // Call hooks
      await this.getMergedHooks(options).onEnd?.(context, result);

      // Log stream complete
      methodLogger.debug(
        buildAgentLogMessage(this.name, ActionType.STREAM_COMPLETE, "Stream generation completed"),
        {
          text: result.text,
          toolCalls: [],
          toolResults: [],
          finishReason: result.finishReason || "stop",
          usage: result.usage,
        },
      );

      // Log successful completion with usage details
      const usage = result.usage;
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
          finishReason: result.finishReason,
          usage: result.usage,
          toolCalls: result.toolCalls?.length || 0,
          text: result.text,
        },
      );

      // Return result with context - use Object.assign to properly copy all properties including getters
      const returnValue = Object.assign(
        Object.create(Object.getPrototypeOf(result)), // Preserve prototype chain
        result, // Copy all enumerable properties
        { context: new Map(context.context) }, // Add context
      );

      return returnValue;
    } catch (error) {
      return this.handleError(error as Error, context, options, startTime);
    }
  }

  /**
   * Stream text response
   */
  async streamText(
    input: string | UIMessage[],
    options?: StreamTextOptions,
  ): Promise<StreamTextResultWithContext> {
    const context = await this.createContext(input, options);
    const methodLogger = context.system.logger; // Extract logger with executionId

    // No need to initialize stream collection anymore - we'll use UIMessageStreamWriter

    const { messages, model, tools, maxSteps } = await this.prepareExecution(
      input,
      context,
      options,
    );

    const modelName = this.getModelName();
    const contextLimit = options?.contextLimit;

    // Log stream start
    methodLogger.debug(
      buildAgentLogMessage(
        this.name,
        ActionType.STREAM_START,
        `Starting stream generation with ${modelName}`,
      ),
      {
        event: LogEvents.AGENT_STREAM_STARTED,
        operationType: "stream",
        contextLimit,
        memoryEnabled: !!this.memoryManager.getMemory(),
        model: modelName,
        messageCount: messages?.length || 0,
        input,
      },
    );

    try {
      // Call hooks
      await this.getMergedHooks(options).onStart?.(context);

      // Publish agent:start event
      const agentStartEvent = this.createAgentStartEvent(
        context,
        input,
        messages,
        maxSteps,
        options,
      );
      this.publishTimelineEvent(context, agentStartEvent);

      // Setup abort signal listener
      this.setupAbortSignalListener(
        context.system.abortController?.signal || context.system.signal,
        context,
        agentStartEvent,
      );

      // Extract VoltAgent-specific options
      const {
        userId,
        conversationId,
        parentAgentId,
        parentHistoryEntryId,
        parentOperationContext,
        contextLimit,
        hooks,
        maxSteps: userMaxSteps,
        onFinish: userOnFinish,
        ...aiSDKOptions
      } = options || {};

      const result = streamText({
        model,
        messages,
        tools,
        // Default values
        temperature: this.temperature,
        maxOutputTokens: this.maxOutputTokens,
        maxRetries: 3,
        stopWhen: stepCountIs(maxSteps),
        // User overrides from AI SDK options
        ...aiSDKOptions,
        // VoltAgent controlled (these should not be overridden)
        abortSignal: context.system.signal,
        onStepFinish: this.createStepHandler(context, options),
        onError: ({ error }) => {
          // Log the error
          methodLogger.error("Stream error occurred", {
            error,
            agentName: this.name,
            modelName: this.getModelName(),
          });

          // Update history entry with error status
          this.updateHistoryEntry(context, {
            status: "error",
            endTime: new Date(),
          });

          // Publish agent:error event
          const agentErrorEvent = this.createAgentErrorEvent(context, error as Error);
          this.publishTimelineEvent(context, agentErrorEvent);

          // Call error hooks if they exist
          this.getMergedHooks(options).onError?.(context, error as Error);

          // Don't re-throw - let the error be part of the stream
          // The onError callback should return void for AI SDK compatibility
        },
        onFinish: async (finalResult) => {
          // Save response messages to memory
          await this.saveResponseMessagesToMemory(context, finalResult.response?.messages);

          // Update history
          this.updateHistoryEntry(context, {
            output: finalResult.text,
            usage: convertUsage(finalResult.totalUsage),
            endTime: new Date(),
            status: "completed",
          });

          // Publish agent:success event
          const agentSuccessEvent = this.createAgentSuccessEvent(context, finalResult);
          this.publishTimelineEvent(context, agentSuccessEvent);

          // Call hooks
          await this.getMergedHooks(options).onEnd?.(context, finalResult);

          // Call user's onFinish if it exists
          if (userOnFinish) {
            await userOnFinish(finalResult);
          }
        },
      });

      // Create a wrapper that includes context and delegates to the original result
      const resultWithContext: StreamTextResultWithContext = {
        // Delegate all properties and methods to the original result
        text: result.text,
        textStream: result.textStream,
        fullStream: result.fullStream,
        usage: result.usage,
        finishReason: result.finishReason,
        // Don't access experimental_partialOutputStream directly, use getter
        get experimental_partialOutputStream() {
          return result.experimental_partialOutputStream;
        },
        // Override toUIMessageStreamResponse to use createUIMessageStream for merging
        toUIMessageStreamResponse: (options) => {
          // Only use custom stream if we have subagents and operation context
          if (this.subAgentManager.hasSubAgents() && context.operationContext) {
            // Use createUIMessageStream to enable stream merging
            const mergedStream = createUIMessageStream({
              execute: async ({ writer }) => {
                // Put the writer in context for delegate_task to use
                context.operationContext?.systemContext.set("uiStreamWriter", writer);

                // Start with the parent agent's stream
                const parentStream = result.toUIMessageStream(options);

                // Merge the parent stream
                writer.merge(parentStream);

                // The delegate_task tool will use the writer to merge subagent streams
              },
              onError: (error) => String(error),
            });

            // Return the response with the merged stream
            return createUIMessageStreamResponse({
              stream: mergedStream,
              ...options,
            });
          }

          // Fall back to original method if no subagents
          return result.toUIMessageStreamResponse.call(result, options as any);
        },
        // Keep other methods bound to the original result
        toUIMessageStream: result.toUIMessageStream.bind(result),
        pipeUIMessageStreamToResponse: result.pipeUIMessageStreamToResponse.bind(result),
        pipeTextStreamToResponse: result.pipeTextStreamToResponse.bind(result),
        toTextStreamResponse: result.toTextStreamResponse.bind(result),
        // Add our custom context
        context: new Map(context.context),
      };

      return resultWithContext;
    } catch (error) {
      return this.handleError(error as Error, context, options, 0);
    }
  }

  /**
   * Generate structured object
   */
  async generateObject<T extends z.ZodType>(
    input: string | UIMessage[],
    schema: T,
    options?: GenerateObjectOptions,
  ): Promise<GenerateObjectResultWithContext<z.infer<T>>> {
    const startTime = Date.now();
    const context = await this.createContext(input, options);
    const { messages, model, maxSteps } = await this.prepareExecution(input, context, options);

    try {
      // Call hooks
      await this.getMergedHooks(options).onStart?.(context);

      // Publish agent:start event
      const agentStartEvent = this.createAgentStartEvent(
        context,
        input,
        messages,
        maxSteps,
        options,
      );
      this.publishTimelineEvent(context, agentStartEvent);

      // Extract VoltAgent-specific options
      const {
        userId,
        conversationId,
        parentAgentId,
        parentHistoryEntryId,
        parentOperationContext,
        contextLimit,
        hooks,
        maxSteps: userMaxSteps,
        ...aiSDKOptions
      } = options || {};

      const result = await generateObject({
        model,
        messages,
        output: "object",
        schema,
        // Default values
        maxOutputTokens: this.maxOutputTokens,
        temperature: this.temperature,
        maxRetries: 3,
        // User overrides from AI SDK options
        ...aiSDKOptions,
        // VoltAgent controlled
        abortSignal: context.system.signal,
      });

      // Save the object response to memory
      if (
        context.operationContext &&
        context.operation.userId &&
        context.operation.conversationId
      ) {
        const stepHandler = this.memoryManager.createStepFinishHandler(
          context.operationContext,
          context.operation.userId,
          context.operation.conversationId,
        );

        const step: StepWithContent = {
          id: crypto.randomUUID(),
          type: "text",
          content: safeStringify(result.object),
          role: "assistant",
          usage: convertUsage(result.usage),
        };
        await stepHandler(step);
        this.addStepToHistory(step, context);
      }

      // Update history
      this.updateHistoryEntry(context, {
        output: safeStringify(result.object),
        usage: convertUsage(result.usage),
        endTime: new Date(),
        status: "completed",
      });

      // Publish agent:success event
      const agentSuccessEvent = this.createAgentSuccessEvent(context, result);
      this.publishTimelineEvent(context, agentSuccessEvent);

      // Call hooks
      await this.getMergedHooks(options).onEnd?.(context, result);

      // Return result with context for consistency
      return {
        ...result,
        context: new Map(context.context),
      };
    } catch (error) {
      return this.handleError(error as Error, context, options, startTime);
    }
  }

  /**
   * Stream structured object
   */
  async streamObject<T extends z.ZodType>(
    input: string | UIMessage[],
    schema: T,
    options?: StreamObjectOptions,
  ): Promise<StreamObjectResultWithContext<z.infer<T>>> {
    const context = await this.createContext(input, options);
    const methodLogger = context.system.logger; // Extract logger with executionId

    const { messages, model, maxSteps } = await this.prepareExecution(input, context, options);

    const modelName = this.getModelName();
    const schemaName = schema.description || "unknown";

    // Log stream object start
    methodLogger.debug(
      buildAgentLogMessage(
        this.name,
        ActionType.STREAM_START,
        `Starting object stream generation with ${modelName}`,
      ),
      {
        event: LogEvents.AGENT_STREAM_STARTED,
        operationType: "object",
        schemaName: schemaName,
        model: modelName,
        messageCount: messages?.length || 0,
        input,
      },
    );

    try {
      // Call hooks
      await this.getMergedHooks(options).onStart?.(context);

      // Publish agent:start event
      const agentStartEvent = this.createAgentStartEvent(
        context,
        input,
        messages,
        maxSteps,
        options,
      );
      this.publishTimelineEvent(context, agentStartEvent);

      // Extract VoltAgent-specific options
      const {
        userId,
        conversationId,
        parentAgentId,
        parentHistoryEntryId,
        parentOperationContext,
        contextLimit,
        hooks,
        maxSteps: userMaxSteps,
        onFinish: userOnFinish,
        ...aiSDKOptions
      } = options || {};

      const result = streamObject({
        model,
        messages,
        output: "object",
        schema,
        // Default values
        maxOutputTokens: this.maxOutputTokens,
        temperature: this.temperature,
        maxRetries: 3,
        // User overrides from AI SDK options
        ...aiSDKOptions,
        // VoltAgent controlled
        abortSignal: context.system.signal,
        onError: ({ error }) => {
          // Log the error
          methodLogger.error("Stream object error occurred", {
            error,
            agentName: this.name,
            modelName: this.getModelName(),
            schemaName: schemaName,
          });

          // Update history entry with error status
          this.updateHistoryEntry(context, {
            status: "error",
            endTime: new Date(),
          });

          // Publish agent:error event
          const agentErrorEvent = this.createAgentErrorEvent(context, error as Error);
          this.publishTimelineEvent(context, agentErrorEvent);

          // Call error hooks if they exist
          this.getMergedHooks(options).onError?.(context, error as Error);

          // Don't re-throw - let the error be part of the stream
          // The onError callback should return void for AI SDK compatibility
        },
        onFinish: async (finalResult: any) => {
          // Save the object response to memory
          if (
            context.operationContext &&
            context.operation.userId &&
            context.operation.conversationId
          ) {
            const stepHandler = this.memoryManager.createStepFinishHandler(
              context.operationContext,
              context.operation.userId,
              context.operation.conversationId,
            );

            const step: StepWithContent = {
              id: crypto.randomUUID(),
              type: "text",
              content: safeStringify(finalResult.object),
              role: "assistant",
              usage: convertUsage(finalResult.usage),
            };
            await stepHandler(step);
            this.addStepToHistory(step, context);
          }

          // Update history
          this.updateHistoryEntry(context, {
            output: safeStringify(finalResult.object),
            usage: convertUsage(finalResult.usage),
            endTime: new Date(),
            status: "completed",
          });

          // Publish agent:success event
          const agentSuccessEvent = this.createAgentSuccessEvent(context, finalResult);
          this.publishTimelineEvent(context, agentSuccessEvent);

          // Call hooks
          await this.getMergedHooks(options).onEnd?.(context, finalResult);

          // Call user's onFinish if it exists
          if (userOnFinish) {
            await userOnFinish(finalResult);
          }
        },
      });

      // Create a wrapper that includes context and delegates to the original result
      const resultWithContext: StreamObjectResultWithContext<z.infer<T>> = {
        // Delegate to original properties
        object: result.object,
        partialObjectStream: result.partialObjectStream,
        textStream: result.textStream,
        warnings: result.warnings,
        usage: result.usage,
        finishReason: result.finishReason,
        // Delegate response conversion methods
        pipeTextStreamToResponse: (response, init) =>
          result.pipeTextStreamToResponse(response, init),
        toTextStreamResponse: (init) => result.toTextStreamResponse(init),
        // Add our custom context
        context: new Map(context.context),
      };

      return resultWithContext;
    } catch (error) {
      return this.handleError(error as Error, context, options, 0);
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Common preparation for all execution methods
   */
  private async prepareExecution(
    input: string | UIMessage[],
    context: AgentContext,
    options?: BaseGenerationOptions,
  ): Promise<{
    messages: BaseMessage[];
    model: LanguageModel;
    tools: Record<string, any>;
    maxSteps: number;
  }> {
    // Resolve dynamic values
    const model = await this.resolveValue(this.model, context);
    const toolList = await this.resolveValue(this.tools, context);

    // Prepare messages (system + memory + input) as UIMessages
    const uiMessages = await this.prepareMessages(input, context, options);

    // Convert UIMessages to ModelMessages for the LLM
    const messages = convertToModelMessages(uiMessages);

    // Calculate maxSteps (use provided option or calculate based on subagents)
    const maxSteps = options?.maxSteps ?? this.calculateMaxSteps();

    // Prepare tools with execution context
    const toolsArray = Array.isArray(toolList) ? toolList : [];
    const tools = await this.prepareTools(toolsArray, context, maxSteps, options);

    return { messages, model, tools, maxSteps };
  }

  /**
   * Create execution context
   */
  private async createContext(
    input: string | UIMessage[],
    options?: BaseGenerationOptions,
  ): Promise<AgentContext> {
    const operationId = crypto.randomUUID();
    const startTime = new Date().toISOString();

    // Merge default context with runtime context
    const runtimeContext = toContextMap(options?.context);
    const context = new Map([
      ...(this.context?.entries() || []), // Agent-level default context
      ...(runtimeContext?.entries() || []), // Runtime context (overrides defaults)
      ...(options?.parentOperationContext?.context?.entries() || []), // Parent context (highest priority)
    ]);

    // Create OTEL span
    const otelSpan = startOperationSpan({
      agentId: this.id,
      agentName: this.name,
      operationName: "execute",
      parentAgentId: options?.parentAgentId,
      parentHistoryEntryId: options?.parentHistoryEntryId,
      modelName: this.getModelName(),
    });

    // Add history entry first (before creating logger)
    const historyEntry = await this.historyManager.addEntry({
      input: typeof input === "string" ? input : input,
      output: "",
      status: "working",
      steps: [],
      userId: options?.userId,
      conversationId: options?.conversationId,
      model: this.getModelName(),
      options: {
        metadata: {
          agentSnapshot: this.getFullState(),
        },
      },
    });

    // Create logger for this operation using historyEntry.id as executionId
    const logger = this.getContextualLogger(
      options?.parentAgentId,
      options?.parentHistoryEntryId,
    ).child({
      operationId,
      userId: options?.userId,
      conversationId: options?.conversationId,
      executionId: historyEntry.id, // Use historyEntry.id instead of operationId
      // Preserve parent execution ID if present
      ...(options?.parentHistoryEntryId && {
        parentExecutionId: options?.parentHistoryEntryId,
      }),
    });

    // Create legacy operation context for compatibility
    const operationContext: OperationContext = {
      operationId: historyEntry.id,
      context,
      systemContext: new Map(),
      historyEntry,
      isActive: true,
      logger,
      conversationSteps: options?.parentOperationContext?.conversationSteps || [],
      signal: options?.abortSignal,
      abortController: undefined,
      otelSpan,
      parentAgentId: options?.parentAgentId,
      parentHistoryEntryId: options?.parentHistoryEntryId,
    };

    return {
      context,
      operation: {
        id: operationId,
        userId: options?.userId,
        conversationId: options?.conversationId,
        parentAgentId: options?.parentAgentId,
        parentHistoryId: options?.parentHistoryEntryId,
      },
      system: {
        logger,
        signal: options?.abortSignal,
        abortController: undefined,
        startTime,
      },
      otelSpan,
      toolSpans: new Map(),
      conversationSteps: operationContext.conversationSteps,
      operationContext,
    };
  }

  /**
   * Get contextual logger with parent tracking
   */
  private getContextualLogger(parentAgentId?: string, parentHistoryEntryId?: string): Logger {
    if (parentAgentId) {
      const parentAgent = AgentRegistry.getInstance().getAgent(parentAgentId);
      if (parentAgent) {
        return this.logger.child({
          parentAgentId,
          isSubAgent: true,
          delegationDepth: this.calculateDelegationDepth(parentAgentId),
          ...(parentHistoryEntryId && {
            parentExecutionId: parentHistoryEntryId,
          }),
        });
      }
    }
    return this.logger;
  }

  /**
   * Calculate delegation depth
   */
  private calculateDelegationDepth(parentAgentId: string | undefined): number {
    if (!parentAgentId) return 0;

    let depth = 1;
    let currentParentId = parentAgentId;
    const visited = new Set<string>();

    while (currentParentId) {
      if (visited.has(currentParentId)) break;
      visited.add(currentParentId);

      const parentIds = AgentRegistry.getInstance().getParentAgentIds(currentParentId);
      if (parentIds.length > 0) {
        depth++;
        currentParentId = parentIds[0];
      } else {
        break;
      }
    }

    return depth;
  }

  /**
   * Prepare messages with system prompt and memory
   */
  private async prepareMessages(
    input: string | UIMessage[],
    context: AgentContext,
    options?: BaseGenerationOptions,
  ): Promise<UIMessage[]> {
    const messages: UIMessage[] = [];

    // Get system message with retriever context
    const systemMessage = await this.getSystemMessage(input, context);
    if (systemMessage) {
      // Convert system message to UIMessage format
      const systemUIMessage: UIMessage = {
        id: crypto.randomUUID(),
        role: "system",
        parts: [
          {
            type: "text",
            text:
              typeof systemMessage === "string"
                ? systemMessage
                : Array.isArray(systemMessage)
                  ? systemMessage
                      .map((m) => (typeof m.content === "string" ? m.content : ""))
                      .join("\n")
                  : typeof systemMessage.content === "string"
                    ? systemMessage.content
                    : "",
          },
        ],
      };
      messages.push(systemUIMessage);
    }

    // Load memory context if available (already returns UIMessages)
    if (context.operationContext) {
      const { messages: memoryMessages, conversationId } =
        await this.memoryManager.prepareConversationContext(
          context.operationContext,
          input,
          context.operation.userId,
          context.operation.conversationId,
          options?.contextLimit,
        );

      // Update conversation ID
      context.operation.conversationId = conversationId;

      // Add memory messages (already UIMessages)
      messages.push(...memoryMessages);
    }

    // Add current input
    if (typeof input === "string") {
      messages.push({
        id: crypto.randomUUID(),
        role: "user",
        parts: [{ type: "text", text: input }],
      });
    } else {
      messages.push(...input);
    }

    // Allow hooks to modify messages
    const hooks = this.getMergedHooks(options);
    if (hooks.onPrepareMessages) {
      const result = await hooks.onPrepareMessages(messages, context);
      return result?.messages || messages;
    }

    return messages;
  }

  /**
   * Get system message with dynamic instructions and retriever context
   */
  private async getSystemMessage(
    input: string | UIMessage[],
    context: AgentContext,
  ): Promise<BaseMessage | BaseMessage[]> {
    // Resolve dynamic instructions
    const promptHelper = VoltOpsClientClass.createPromptHelperWithFallback(
      this.id,
      this.name,
      typeof this.instructions === "function" ? "" : this.instructions,
      this.voltOpsClient,
    );

    const dynamicValueOptions: DynamicValueOptions = {
      context: context.context,
      prompts: promptHelper,
    };

    const resolvedInstructions = await this.resolveValue(
      this.instructions,
      context,
      dynamicValueOptions,
    );

    // Get retriever context if available
    let retrieverContext: string | null = null;
    if (this.retriever && input && context.operationContext) {
      retrieverContext = await this.getRetrieverContext(input, context);
    }

    // Handle different instruction types
    if (typeof resolvedInstructions === "object" && "type" in resolvedInstructions) {
      const promptContent = resolvedInstructions as PromptContent;

      if (promptContent.type === "chat" && promptContent.messages) {
        const messages = [...promptContent.messages];

        // Add retriever context to last system message if available
        if (retrieverContext) {
          const lastSystemIndex = messages
            .map((m, i) => ({ message: m, index: i }))
            .filter(({ message }) => message.role === "system")
            .pop()?.index;

          if (lastSystemIndex !== undefined) {
            const existingMessage = messages[lastSystemIndex];
            messages[lastSystemIndex] = {
              ...existingMessage,
              content: `${existingMessage.content}\n\nRelevant Context:\n${retrieverContext}`,
            } as typeof existingMessage;
          } else {
            messages.push({
              role: "system",
              content: `Relevant Context:\n${retrieverContext}`,
            } as SystemModelMessage);
          }
        }

        return messages;
      }

      if (promptContent.type === "text") {
        let content = promptContent.text || "";

        // Add toolkit instructions
        content = this.addToolkitInstructions(content);

        // Add markdown instruction
        if (this.markdown) {
          content = `${content}\n\nUse markdown to format your answers.`;
        }

        // Add retriever context
        if (retrieverContext) {
          content = `${content}\n\nRelevant Context:\n${retrieverContext}`;
        }

        // Add supervisor instructions if needed
        if (this.subAgentManager.hasSubAgents()) {
          const agentsMemory = await this.prepareAgentsMemory(context);
          content = this.subAgentManager.generateSupervisorSystemMessage(
            content,
            agentsMemory,
            this.supervisorConfig,
          );
        }

        return {
          role: "system",
          content: `You are ${this.name}. ${content}`,
        };
      }
    }

    // Default string instructions
    let content = typeof resolvedInstructions === "string" ? resolvedInstructions : "";

    // Add toolkit instructions
    content = this.addToolkitInstructions(content);

    // Add markdown instruction
    if (this.markdown) {
      content = `${content}\n\nUse markdown to format your answers.`;
    }

    // Add retriever context
    if (retrieverContext) {
      content = `${content}\n\nRelevant Context:\n${retrieverContext}`;
    }

    // Add supervisor instructions if needed
    if (this.subAgentManager.hasSubAgents()) {
      const agentsMemory = await this.prepareAgentsMemory(context);
      content = this.subAgentManager.generateSupervisorSystemMessage(
        content,
        agentsMemory,
        this.supervisorConfig,
      );
    }

    return {
      role: "system",
      content: `You are ${this.name}. ${content}`,
    };
  }

  /**
   * Add toolkit instructions
   */
  private addToolkitInstructions(baseInstructions: string): string {
    const toolkits = this.toolManager.getToolkits();
    let toolInstructions = "";

    for (const toolkit of toolkits) {
      if (toolkit.addInstructions && toolkit.instructions) {
        toolInstructions += `\n\n${toolkit.instructions}`;
      }
    }

    return baseInstructions + toolInstructions;
  }

  /**
   * Prepare agents memory for supervisor
   */
  private async prepareAgentsMemory(context: AgentContext): Promise<string> {
    try {
      const subAgents = this.subAgentManager.getSubAgents();
      if (subAgents.length === 0) return "";

      // Get recent conversation steps
      const steps = context.conversationSteps || [];
      const formattedMemory = steps
        .filter((step) => step.role !== "system" && step.role === "assistant")
        .map((step) => `${step.role}: ${step.content}`)
        .join("\n\n");

      return formattedMemory || "No previous agent interactions found.";
    } catch (error) {
      this.logger.warn("Error preparing agents memory", { error });
      return "Error retrieving agent history.";
    }
  }

  /**
   * Get retriever context
   */
  private async getRetrieverContext(
    input: string | UIMessage[],
    context: AgentContext,
  ): Promise<string | null> {
    if (!this.retriever || !context.operationContext) return null;

    const startTime = Date.now();
    const retrieverLogger = context.system.logger.child({
      operation: "retriever",
      retrieverId: this.retriever.tool.name,
    });

    retrieverLogger.debug(buildAgentLogMessage(this.name, ActionType.START, "Retrieving context"), {
      event: LogEvents.RETRIEVER_SEARCH_STARTED,
      input,
    });

    const retrieverStartEvent: RetrieverStartEvent = {
      id: crypto.randomUUID(),
      name: "retriever:start",
      type: "retriever",
      startTime: new Date().toISOString(),
      status: "running",
      input: { query: input },
      output: null,
      metadata: {
        displayName: this.retriever.tool.name || "Retriever",
        id: this.retriever.tool.name,
        agentId: this.id,
      },
      traceId: context.operationContext.historyEntry.id,
    };

    this.publishTimelineEvent(context, retrieverStartEvent);

    try {
      // Convert UIMessage to ModelMessage for retriever if needed
      const retrieverInput = typeof input === "string" ? input : convertToModelMessages(input);

      const retrieverContext = await this.retriever.retrieve(retrieverInput, {
        context: context.context,
        logger: retrieverLogger,
      });

      if (retrieverContext?.trim()) {
        const documentCount = retrieverContext.split("\n").filter((line) => line.trim()).length;

        retrieverLogger.debug(
          buildAgentLogMessage(
            this.name,
            ActionType.COMPLETE,
            `Retrieved ${documentCount} documents`,
          ),
          {
            event: LogEvents.RETRIEVER_SEARCH_COMPLETED,
            documentCount,
            duration: Date.now() - startTime,
          },
        );

        const retrieverSuccessEvent: RetrieverSuccessEvent = {
          id: crypto.randomUUID(),
          name: "retriever:success",
          type: "retriever",
          startTime: retrieverStartEvent.startTime,
          endTime: new Date().toISOString(),
          status: "completed",
          input: null,
          output: { context: retrieverContext },
          metadata: retrieverStartEvent.metadata,
          traceId: context.operationContext.historyEntry.id,
          parentEventId: retrieverStartEvent.id,
        };

        this.publishTimelineEvent(context, retrieverSuccessEvent);
        return retrieverContext;
      }

      return null;
    } catch (error) {
      const retrieverErrorEvent: RetrieverErrorEvent = {
        id: crypto.randomUUID(),
        name: "retriever:error",
        type: "retriever",
        startTime: retrieverStartEvent.startTime,
        endTime: new Date().toISOString(),
        status: "error",
        level: "ERROR",
        input: null,
        output: null,
        statusMessage: {
          message: error instanceof Error ? error.message : "Unknown retriever error",
          ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
        },
        metadata: retrieverStartEvent.metadata,
        traceId: context.operationContext.historyEntry.id,
        parentEventId: retrieverStartEvent.id,
      };

      this.publishTimelineEvent(context, retrieverErrorEvent);

      retrieverLogger.error(
        buildAgentLogMessage(
          this.name,
          ActionType.ERROR,
          `Retriever failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        ),
        {
          event: LogEvents.RETRIEVER_SEARCH_FAILED,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime,
        },
      );

      this.logger.warn("Failed to retrieve context", { error, agentId: this.id });
      return null;
    }
  }

  /**
   * Resolve dynamic value
   */
  private async resolveValue<T>(
    value: T | DynamicValue<T>,
    context: AgentContext,
    options?: DynamicValueOptions,
  ): Promise<T> {
    if (typeof value === "function") {
      const dynamicValue = value as DynamicValue<T>;
      const resolveOptions: DynamicValueOptions =
        options ||
        (this.prompts
          ? {
              context: context.context,
              prompts: this.prompts,
            }
          : {
              context: context.context,
              prompts: {
                getPrompt: async () => ({ type: "text" as const, text: "" }),
              },
            });
      return await dynamicValue(resolveOptions);
    }
    return value;
  }

  /**
   * Prepare tools with execution context
   */
  private async prepareTools(
    toolList: any,
    context: AgentContext,
    maxSteps: number,
    options?: BaseGenerationOptions,
  ): Promise<Record<string, any>> {
    const tools = Array.isArray(toolList) ? toolList : [];
    const baseTools = this.toolManager.prepareToolsForGeneration(tools);

    // Add delegate tool if we have subagents
    if (this.subAgentManager.hasSubAgents()) {
      const delegateTool = this.subAgentManager.createDelegateTool({
        sourceAgent: this as any, // Type workaround
        currentHistoryEntryId: context.operationContext?.historyEntry.id,
        operationContext: context.operationContext,
        maxSteps: maxSteps,
        conversationId: options?.conversationId,
        userId: options?.userId,
      });
      baseTools.push(delegateTool);
    }

    // Convert to AI SDK tools with context injection
    return this.convertTools(baseTools, context, options);
  }

  /**
   * Convert VoltAgent tools to AI SDK format with context injection
   */
  private convertTools(
    tools: Tool<any, any>[],
    context: AgentContext,
    options?: BaseGenerationOptions,
  ): Record<string, any> {
    const aiTools: Record<string, any> = {};
    const hooks = this.getMergedHooks(options);

    for (const tool of tools) {
      aiTools[tool.name] = {
        description: tool.description,
        inputSchema: tool.parameters, // AI SDK will convert this to JSON Schema internally
        execute: async (args: any) => {
          // Create tool execution context
          const toolExecutionContext: ToolExecutionContext = {
            operationContext: context.operationContext,
            agentId: this.id,
            historyEntryId: context.operationContext?.historyEntry.id || "unknown",
          };

          // Publish tool:start event
          const toolStartEvent: ToolStartEvent = {
            id: crypto.randomUUID(),
            name: "tool:start",
            type: "tool",
            startTime: new Date().toISOString(),
            status: "running",
            input: args || {},
            output: null,
            metadata: {
              displayName: tool.name,
              id: tool.name,
              agentId: this.id,
            },
            traceId: context.operationContext?.historyEntry.id || context.operation.id,
            parentEventId: context.system.agentStartEventId,
          };

          this.publishTimelineEvent(context, toolStartEvent);

          // Create and track OTEL span
          const toolSpan = startToolSpan({
            toolName: tool.name,
            toolCallId: crypto.randomUUID(),
            toolInput: args,
            agentId: this.id,
            parentSpan: context.otelSpan,
          });

          try {
            // Call tool start hook
            await hooks.onToolStart?.(context, tool);

            // Specifically handle Reasoning Tools (think and analyze)
            let result: any;
            if (tool.name === "think" || tool.name === "analyze") {
              // Reasoning tools require ReasoningToolExecuteOptions
              const reasoningOptions: ReasoningToolExecuteOptions = {
                ...toolExecutionContext,
                agentId: this.id,
                historyEntryId: context.operationContext?.historyEntry.id || "unknown",
              };

              // Warn if historyEntryId is not available
              if (
                !reasoningOptions.historyEntryId ||
                reasoningOptions.historyEntryId === "unknown"
              ) {
                this.logger.warn(
                  `Executing reasoning tool '${tool.name}' without a known historyEntryId`,
                  {
                    toolName: tool.name,
                    agentId: this.id,
                    operationContext: !!context.operationContext,
                  },
                );
              }

              // Execute with properly typed options
              result = await tool.execute(args, reasoningOptions);
            } else {
              // Execute regular tools with standard context
              result = await tool.execute(args, toolExecutionContext);
            }

            // Validate output if schema provided
            if (
              tool.outputSchema &&
              typeof tool.outputSchema === "object" &&
              "safeParse" in tool.outputSchema
            ) {
              const parseResult = (tool.outputSchema as any).safeParse(result);
              if (!parseResult.success) {
                const error = {
                  error: true,
                  message: `Output validation failed: ${parseResult.error.message}`,
                  validationErrors: parseResult.error.errors,
                  actualOutput: result,
                };

                // End OTEL span with error
                endToolSpan({ span: toolSpan, resultData: { error } }, this.logger);

                // Publish tool:error event
                const toolErrorEvent: ToolErrorEvent = {
                  id: crypto.randomUUID(),
                  name: "tool:error",
                  type: "tool",
                  startTime: toolStartEvent.startTime,
                  endTime: new Date().toISOString(),
                  status: "error",
                  level: "ERROR",
                  input: null,
                  output: null,
                  statusMessage: {
                    message: error.message,
                  },
                  metadata: toolStartEvent.metadata,
                  traceId: context.operationContext?.historyEntry.id || context.operation.id,
                  parentEventId: toolStartEvent.id,
                };

                this.publishTimelineEvent(context, toolErrorEvent);

                // Call tool end hook
                await hooks.onToolEnd?.(context, tool, undefined, error);

                return error;
              }

              // End OTEL span with success
              endToolSpan(
                { span: toolSpan, resultData: { result: parseResult.data } },
                this.logger,
              );

              // Publish tool:success event
              const toolSuccessEvent: ToolSuccessEvent = {
                id: crypto.randomUUID(),
                name: "tool:success",
                type: "tool",
                startTime: toolStartEvent.startTime,
                endTime: new Date().toISOString(),
                status: "completed",
                input: null,
                output: parseResult.data,
                metadata: toolStartEvent.metadata,
                traceId: context.operationContext?.historyEntry.id || context.operation.id,
                parentEventId: toolStartEvent.id,
              };

              this.publishTimelineEvent(context, toolSuccessEvent);

              // Call tool end hook
              await hooks.onToolEnd?.(context, tool, parseResult.data);

              return parseResult.data;
            }

            // End OTEL span
            endToolSpan({ span: toolSpan, resultData: { result } }, this.logger);

            // Publish tool:success event
            const toolSuccessEvent: ToolSuccessEvent = {
              id: crypto.randomUUID(),
              name: "tool:success",
              type: "tool",
              startTime: toolStartEvent.startTime,
              endTime: new Date().toISOString(),
              status: "completed",
              input: null,
              output: result as Record<string, unknown> | null,
              metadata: toolStartEvent.metadata,
              traceId: context.operationContext?.historyEntry.id || context.operation.id,
              parentEventId: toolStartEvent.id,
            };

            this.publishTimelineEvent(context, toolSuccessEvent);

            // Call tool end hook
            await hooks.onToolEnd?.(context, tool, result);

            return result;
          } catch (error) {
            const errorResult = {
              error: true,
              message: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            };

            // End OTEL span with error
            endToolSpan({ span: toolSpan, resultData: { error: errorResult } }, this.logger);

            // Publish tool:error event
            const toolErrorEvent: ToolErrorEvent = {
              id: crypto.randomUUID(),
              name: "tool:error",
              type: "tool",
              startTime: toolStartEvent.startTime,
              endTime: new Date().toISOString(),
              status: "error",
              level: "ERROR",
              input: null,
              output: null,
              statusMessage: {
                message: errorResult.message,
                ...(errorResult.stack && { stack: errorResult.stack }),
              },
              metadata: toolStartEvent.metadata,
              traceId: context.operationContext?.historyEntry.id || context.operation.id,
              parentEventId: toolStartEvent.id,
            };

            this.publishTimelineEvent(context, toolErrorEvent);

            // Call tool end hook
            await hooks.onToolEnd?.(context, tool, undefined, errorResult);

            return errorResult;
          }
        },
      };
    }

    return aiTools;
  }

  /**
   * Create step handler for memory and hooks
   */
  private createStepHandler(context: AgentContext, options?: BaseGenerationOptions) {
    return async (event: StepResult<ToolSet>) => {
      // Instead of saving immediately, collect steps in context for batch processing in onFinish
      if (
        context.operationContext &&
        context.operation.userId &&
        context.operation.conversationId &&
        event.content &&
        Array.isArray(event.content)
      ) {
        // Store the step content in context for later processing
        if (!context.operationContext.systemContext.has("conversationSteps")) {
          context.operationContext.systemContext.set("conversationSteps", []);
        }
        const conversationSteps = context.operationContext.systemContext.get(
          "conversationSteps",
        ) as StepResult<ToolSet>[];
        conversationSteps.push(event);

        // Log each content part
        for (const part of event.content) {
          if (part.type === "text") {
            context.system.logger.debug("Step: Text generated", {
              event: LogEvents.AGENT_STEP_TEXT,
              textPreview: part.text.substring(0, 100),
              length: part.text.length,
            });
          } else if (part.type === "reasoning") {
            context.system.logger.debug("Step: Reasoning generated", {
              event: LogEvents.AGENT_STEP_TEXT,
              textPreview: part.text.substring(0, 100),
              length: part.text.length,
            });
          } else if (part.type === "tool-call") {
            context.system.logger.debug(`Step: Calling tool '${part.toolName}'`, {
              event: LogEvents.AGENT_STEP_TOOL_CALL,
              toolName: part.toolName,
              toolCallId: part.toolCallId,
              arguments: part.input,
            });

            context.system.logger.debug(
              buildAgentLogMessage(this.name, ActionType.TOOL_CALL, `Executing ${part.toolName}`),
              {
                event: LogEvents.TOOL_EXECUTION_STARTED,
                toolName: part.toolName,
                toolCallId: part.toolCallId,
                args: part.input,
              },
            );
          } else if (part.type === "tool-result") {
            context.system.logger.debug(`Step: Tool '${part.toolName}' completed`, {
              event: LogEvents.AGENT_STEP_TOOL_RESULT,
              toolName: part.toolName,
              toolCallId: part.toolCallId,
              result: part.output,
              hasError: Boolean(
                part.output && typeof part.output === "object" && "error" in part.output,
              ),
            });
          } else if (part.type === "tool-error") {
            context.system.logger.debug(`Step: Tool '${part.toolName}' error`, {
              event: LogEvents.AGENT_STEP_TOOL_RESULT,
              toolName: part.toolName,
              toolCallId: part.toolCallId,
              error: part.error,
              hasError: true,
            });
          }
        }
      }

      // Call hooks
      const hooks = this.getMergedHooks(options);
      await hooks.onStepFinish?.(event);
    };
  }

  /**
   * Save response messages as UIMessages to memory
   * Converts and saves all messages from the response in batch
   */
  private async saveResponseMessagesToMemory(
    context: AgentContext,
    responseMessages: (AssistantModelMessage | ToolModelMessage)[] | undefined,
  ): Promise<void> {
    if (
      !context.operationContext ||
      !context.operation.userId ||
      !context.operation.conversationId ||
      !responseMessages
    ) {
      return;
    }

    // Convert all response messages to UIMessages
    const uiMessages = await convertResponseMessagesToUIMessages(responseMessages);

    // Save each UIMessage using the existing saveMessage method
    for (const uiMessage of uiMessages) {
      await this.memoryManager.saveMessage(
        context.operationContext,
        uiMessage,
        context.operation.userId,
        context.operation.conversationId,
      );
    }
  }

  /**
   * Add step to history
   */
  private addStepToHistory(step: StepWithContent, context: AgentContext): void {
    if (context.operationContext) {
      this.historyManager.addStepsToEntry(context.operationContext.historyEntry.id, [step]);
    }

    // Track in conversation steps
    if (context.conversationSteps) {
      context.conversationSteps.push(step);
    }
  }

  /**
   * Update history entry
   */
  private updateHistoryEntry(context: AgentContext, updates: Partial<AgentHistoryEntry>): void {
    if (context.operationContext) {
      this.historyManager.updateEntry(context.operationContext.historyEntry.id, updates);
    }
  }

  /**
   * Merge agent hooks with options hooks
   */
  private getMergedHooks(options?: { hooks?: AgentHooks }): AgentHooks {
    if (!options?.hooks) {
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
      onError: async (...args) => {
        await options.hooks?.onError?.(...args);
        await this.hooks.onError?.(...args);
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
      onStepFinish: async (...args) => {
        await options.hooks?.onStepFinish?.(...args);
        await this.hooks.onStepFinish?.(...args);
      },
      onPrepareMessages: options.hooks?.onPrepareMessages || this.hooks.onPrepareMessages,
    };
  }

  /**
   * Publish timeline event
   */
  private publishTimelineEvent(context: AgentContext, event: any, skipPropagation = false): void {
    if (!context.operationContext) return;

    AgentEventEmitter.getInstance().publishTimelineEventAsync({
      agentId: this.id,
      historyId: context.operationContext.historyEntry.id,
      event,
      skipPropagation,
      parentHistoryEntryId: context.operationContext.parentHistoryEntryId,
    });
  }

  /**
   * Create agent:start event
   */
  private createAgentStartEvent(
    context: AgentContext,
    input: string | UIMessage[],
    messages: BaseMessage[],
    maxSteps: number,
    options?: BaseGenerationOptions,
  ): AgentStartEvent {
    const event: AgentStartEvent = {
      id: crypto.randomUUID(),
      name: "agent:start",
      type: "agent",
      startTime: context.system.startTime,
      status: "running",
      input: { input },
      output: null,
      metadata: {
        displayName: this.name,
        id: this.id,
        context: Object.fromEntries(context.context.entries()) as Record<string, unknown>,
        messages,
        modelParameters: {
          model: this.getModelName(),
          temperature: options?.temperature ?? this.temperature,
          topP: options?.topP,
          frequencyPenalty: options?.frequencyPenalty,
          presencePenalty: options?.presencePenalty,
          maxSteps: maxSteps,
        },
      },
      traceId: context.operationContext?.historyEntry.id || context.operation.id,
    };

    // Store event ID for later reference
    context.system.agentStartEventId = event.id;

    return event;
  }

  /**
   * Create agent:success event
   */
  private createAgentSuccessEvent(context: AgentContext, result: any): AgentSuccessEvent {
    return {
      id: crypto.randomUUID(),
      name: "agent:success",
      type: "agent",
      startTime: context.system.startTime,
      endTime: new Date().toISOString(),
      status: "completed",
      input: null,
      output: result.text ? { text: result.text } : { object: result.object },
      metadata: {
        displayName: this.name,
        id: this.id,
        usage: convertUsage(result.usage),
        context: Object.fromEntries(context.context.entries()) as Record<string, unknown>,
      },
      traceId: context.operationContext?.historyEntry.id || context.operation.id,
      parentEventId: context.system.agentStartEventId,
    };
  }

  /**
   * Create agent:error event
   */
  private createAgentErrorEvent(context: AgentContext, error: VoltAgentError): AgentErrorEvent {
    return {
      id: crypto.randomUUID(),
      name: "agent:error",
      type: "agent",
      startTime: context.system.startTime,
      endTime: new Date().toISOString(),
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
        context: Object.fromEntries(context.context.entries()) as Record<string, unknown>,
      },
      traceId: context.operationContext?.historyEntry.id || context.operation.id,
      parentEventId: context.system.agentStartEventId,
    };
  }

  /**
   * Setup abort signal listener
   */
  private setupAbortSignalListener(
    signal: AbortSignal | undefined,
    context: AgentContext,
    agentStartEvent: { id: string; startTime: string },
  ): void {
    if (!signal) return;

    signal.addEventListener("abort", async () => {
      // Update history with cancelled status
      this.updateHistoryEntry(context, {
        status: "cancelled",
        endTime: new Date(),
      });

      // Mark operation as inactive
      if (context.operationContext) {
        context.operationContext.isActive = false;
      }

      // Get abort reason
      let abortReason: unknown = undefined;
      if (context.system.abortController && "signal" in context.system.abortController) {
        const sig = context.system.abortController.signal as AbortSignal & { reason?: unknown };
        abortReason = sig.reason;
      }

      // Create cancellation error
      const cancellationError = new Error(
        typeof abortReason === "string"
          ? abortReason
          : abortReason && typeof abortReason === "object" && "message" in abortReason
            ? String(abortReason.message)
            : "Operation cancelled",
      ) as AbortError;
      cancellationError.name = "AbortError";
      cancellationError.reason = abortReason;

      // Store cancellation error
      context.cancellationError = cancellationError;

      // Create agent:cancel event
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
          context: Object.fromEntries(context.context.entries()) as Record<string, unknown>,
        },
        traceId: context.operationContext?.historyEntry.id || context.operation.id,
        parentEventId: agentStartEvent.id,
      };

      this.publishTimelineEvent(context, agentCancelledEvent);

      // Call onEnd hook with cancellation error
      const hooks = this.getMergedHooks();
      await hooks.onEnd?.(context, undefined, cancellationError);
    });
  }

  /**
   * Handle errors
   */
  private async handleError(
    error: Error,
    context: AgentContext,
    options?: BaseGenerationOptions,
    startTime?: number,
  ): Promise<never> {
    // Check if cancelled
    if (!context.operationContext?.isActive && context.cancellationError) {
      throw context.cancellationError;
    }

    const voltagentError = error as VoltAgentError;

    // Publish agent:error event
    const agentErrorEvent = this.createAgentErrorEvent(context, voltagentError);
    this.publishTimelineEvent(context, agentErrorEvent);

    // Update history
    this.updateHistoryEntry(context, {
      status: "error",
      endTime: new Date(),
    });

    // End OTEL span
    if (context.otelSpan) {
      endOperationSpan(
        {
          span: context.otelSpan,
          status: "error",
          data: { error: voltagentError },
        },
        this.logger,
      );
    }

    // Call hooks
    const hooks = this.getMergedHooks(options);
    const errorForHooks = Object.assign(new Error(voltagentError.message), voltagentError);
    await hooks.onEnd?.(context, undefined, errorForHooks);
    await hooks.onError?.(context, errorForHooks);

    // Log error
    context.system.logger.error("Generation failed", {
      event: LogEvents.AGENT_GENERATION_FAILED,
      duration: startTime ? Date.now() - startTime : undefined,
      error: {
        message: voltagentError.message,
        code: voltagentError.code,
        stage: voltagentError.stage,
      },
    });

    throw error;
  }

  // ============================================================================
  // Public Utility Methods
  // ============================================================================

  /**
   * Calculate max steps based on SubAgents
   */
  private calculateMaxSteps(): number {
    return this.subAgentManager.calculateMaxSteps(this.maxSteps);
  }

  /**
   * Get the model name
   */
  public getModelName(): string {
    if (typeof this.model === "function") {
      return "dynamic";
    }
    if (typeof this.model === "string") {
      return this.model;
    }
    return this.model.modelId || "unknown";
  }

  /**
   * Get full agent state
   */
  public getFullState(): AgentFullState {
    return {
      id: this.id,
      name: this.name,
      instructions:
        typeof this.instructions === "function" ? "Dynamic instructions" : this.instructions,
      status: "idle",
      model: this.getModelName(),
      node_id: createNodeId(NodeType.AGENT, this.id),

      tools: this.toolManager.getTools().map((tool) => ({
        ...tool,
        node_id: createNodeId(NodeType.TOOL, tool.name, this.id),
      })),

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
            status: "idle",
            node_id: createNodeId(NodeType.RETRIEVER, this.retriever.tool.name, this.id),
          }
        : null,
    };
  }

  /**
   * Get agent's history with pagination
   */
  public async getHistory(options?: { page?: number; limit?: number }): Promise<{
    entries: AgentHistoryEntry[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    return await this.historyManager.getEntries(options);
  }

  /**
   * Add tools or toolkits to the agent
   */
  public addTools(tools: (Tool<any, any> | Toolkit)[]): { added: (Tool<any, any> | Toolkit)[] } {
    this.toolManager.addItems(tools);
    return { added: tools };
  }

  /**
   * Remove one or more tools by name
   * @param toolNames - Array of tool names to remove
   * @returns Object containing successfully removed tool names
   */
  public removeTools(toolNames: string[]): { removed: string[] } {
    const removed: string[] = [];
    for (const name of toolNames) {
      if (this.toolManager.removeTool(name)) {
        removed.push(name);
      }
    }

    this.logger.debug(`Removed ${removed.length} tools`, {
      removed,
      requested: toolNames,
    });

    return { removed };
  }

  /**
   * Remove a toolkit by name
   * @param toolkitName - Name of the toolkit to remove
   * @returns true if the toolkit was removed, false if it wasn't found
   */
  public removeToolkit(toolkitName: string): boolean {
    const result = this.toolManager.removeToolkit(toolkitName);

    if (result) {
      this.logger.debug(`Removed toolkit: ${toolkitName}`);
    } else {
      this.logger.debug(`Toolkit not found: ${toolkitName}`);
    }

    return result;
  }

  /**
   * Add a sub-agent
   */
  public addSubAgent(agentConfig: SubAgentConfig): void {
    this.subAgentManager.addSubAgent(agentConfig);

    // Add delegate tool if this is the first sub-agent
    if (this.subAgentManager.getSubAgents().length === 1) {
      const delegateTool = this.subAgentManager.createDelegateTool({
        sourceAgent: this as any,
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
   * Get all tools
   */
  public getTools() {
    return this.toolManager.getTools();
  }

  /**
   * Get tools for API
   */
  public getToolsForApi() {
    return this.toolManager.getToolsForApi();
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
    AgentEventEmitter.getInstance().emitAgentUnregistered(this.id);
  }

  /**
   * Get history manager
   */
  public getHistoryManager(): HistoryManager {
    return this.historyManager;
  }

  /**
   * Check if telemetry is configured
   */
  public isTelemetryConfigured(): boolean {
    return this.historyManager.isExporterConfigured();
  }

  /**
   * Get memory manager
   */
  public getMemoryManager(): MemoryManager {
    return this.memoryManager;
  }

  /**
   * Get tool manager
   */
  public getToolManager(): ToolManager {
    return this.toolManager;
  }

  /**
   * Internal: Set VoltAgent exporter
   */
  _INTERNAL_setVoltAgentExporter(exporter: VoltAgentExporter): void {
    if (this.historyManager) {
      this.historyManager.setExporter(exporter);
    }
  }
}
