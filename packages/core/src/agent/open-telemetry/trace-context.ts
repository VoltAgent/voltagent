/**
 * AgentTraceContext - Manages trace hierarchy and common attributes
 *
 * This class solves the following problems:
 * 1. Common attributes (userId, conversationId, etc.) are set once and inherited by all child spans
 * 2. Parent-child span relationships are properly maintained
 * 3. Context propagation works correctly across async operations
 * 4. Clean integration with VoltAgentObservability for WebSocket and storage
 */

import {
  type Context,
  type Span,
  SpanKind,
  type SpanOptions,
  SpanStatusCode,
  type Tracer,
  context,
  trace,
} from "@opentelemetry/api";
import { safeStringify } from "@voltagent/internal/utils";
import type { UIMessage } from "ai";
import type { VoltAgentObservability } from "../../observability";
import type { BaseGenerationOptions } from "../agent";
import type { BaseMessage } from "../providers/base/types";

export interface TraceContextOptions {
  agentId: string;
  agentName?: string;
  userId?: string;
  conversationId?: string;
  operationId: string;
  parentSpan?: Span;
  parentAgentId?: string;
  input?: string | UIMessage[] | BaseMessage[];
}

export class AgentTraceContext {
  private rootSpan: Span;
  private tracer: Tracer;
  private commonAttributes: Record<string, any>;
  private activeContext: Context;
  // @ts-ignore
  private observability: VoltAgentObservability;

  constructor(
    observability: VoltAgentObservability,
    operationName: string,
    options: TraceContextOptions,
  ) {
    this.observability = observability;
    this.tracer = observability.getTracer();

    // Store common attributes once - these will be inherited by all child spans
    this.commonAttributes = {
      "entity.id": options.agentId,
      "entity.type": "agent",
      "entity.name": options.agentName,
      ...(options.userId && { "user.id": options.userId }),
      ...(options.conversationId && { "conversation.id": options.conversationId }),
      ...(options.parentAgentId && { "agent.parent.id": options.parentAgentId }),
      "operation.id": options.operationId,
    };

    // If there's a parent span, use it as context
    const parentContext = options.parentSpan
      ? trace.setSpan(context.active(), options.parentSpan)
      : context.active();

    // Create root span with common attributes
    const spanAttributes: Record<string, any> = {
      ...this.commonAttributes,
    };

    // Add input if provided
    if (options.input !== undefined) {
      const inputStr =
        typeof options.input === "string" ? options.input : safeStringify(options.input);
      spanAttributes.input = inputStr;
    }

    this.rootSpan = this.tracer.startSpan(
      operationName,
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          ...spanAttributes,
          "agent.state": "running", // Track initial agent state
        },
      },
      parentContext,
    );

    // Set active context with root span
    this.activeContext = trace.setSpan(context.active(), this.rootSpan);
  }

  /**
   * Create a child span with automatic parent context and attribute inheritance
   */
  createChildSpan(
    name: string,
    type: "tool" | "memory" | "retriever" | "embedding" | "vector" | "agent",
    options?: {
      label?: string;
      attributes?: Record<string, any>;
      kind?: SpanKind;
    },
  ): Span {
    const spanOptions: SpanOptions = {
      kind: options?.kind || SpanKind.INTERNAL,
      attributes: {
        ...this.commonAttributes, // Inherit common attributes
        "span.type": type, // For child spans within agent
        ...(options?.label && { "span.label": options.label }),
        ...(options?.attributes || {}),
      },
    };

    // Create span with parent context
    return this.tracer.startSpan(name, spanOptions, this.activeContext);
  }

  /**
   * Create a child span with a specific parent span
   */
  createChildSpanWithParent(
    parentSpan: Span,
    name: string,
    type: "tool" | "memory" | "retriever" | "embedding" | "vector" | "agent",
    options?: {
      label?: string;
      attributes?: Record<string, any>;
      kind?: SpanKind;
    },
  ): Span {
    const spanOptions: SpanOptions = {
      kind: options?.kind || SpanKind.INTERNAL,
      attributes: {
        ...this.commonAttributes, // Inherit common attributes
        "span.type": type, // For child spans within agent
        ...(options?.label && { "span.label": options.label }),
        ...(options?.attributes || {}),
      },
    };

    // Create span with the specific parent
    const parentContext = trace.setSpan(this.activeContext, parentSpan);
    return this.tracer.startSpan(name, spanOptions, parentContext);
  }

  /**
   * Execute a function within a span's context
   */
  async withSpan<T>(span: Span, fn: () => T | Promise<T>): Promise<T> {
    const spanContext = trace.setSpan(this.activeContext, span);
    return context.with(spanContext, fn);
  }

  /**
   * Get the root span
   */
  getRootSpan(): Span {
    return this.rootSpan;
  }

  /**
   * Set input on the root span
   */
  setInput(input: any): void {
    const inputStr = typeof input === "string" ? input : safeStringify(input);
    this.rootSpan.setAttribute("input", inputStr);
  }

  /**
   * Set output on the root span
   */
  setOutput(output: any): void {
    const outputStr = typeof output === "string" ? output : safeStringify(output);
    this.rootSpan.setAttribute("output", outputStr);
  }

  /**
   * Set instructions (system prompt) on the root span
   */
  setInstructions(instructions: any): void {
    const instructionsStr =
      typeof instructions === "string" ? instructions : safeStringify(instructions);
    this.rootSpan.setAttribute("agent.instructions", instructionsStr);
  }

  /**
   * Set model attributes on the root span
   */
  setModelAttributes(
    modelName: string,
    temperature?: number,
    maxTokens?: number,
    topP?: number,
    frequencyPenalty?: number,
    presencePenalty?: number,
    maxSteps?: number,
  ): void {
    this.rootSpan.setAttributes({
      "ai.model.name": modelName,
      ...(temperature !== undefined && { "ai.model.temperature": temperature }),
      ...(maxTokens !== undefined && { "ai.model.max_tokens": maxTokens }),
      ...(topP !== undefined && { "ai.model.top_p": topP }),
      ...(frequencyPenalty !== undefined && { "ai.model.frequency_penalty": frequencyPenalty }),
      ...(presencePenalty !== undefined && { "ai.model.presence_penalty": presencePenalty }),
      ...(maxSteps !== undefined && { "ai.model.max_steps": maxSteps }),
    });
  }

  /**
   * Set usage information on the root span
   */
  setUsage(usage: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    cachedTokens?: number;
    reasoningTokens?: number;
  }): void {
    if (usage.promptTokens !== undefined) {
      this.rootSpan.setAttribute("usage.prompt_tokens", usage.promptTokens);
    }
    if (usage.completionTokens !== undefined) {
      this.rootSpan.setAttribute("usage.completion_tokens", usage.completionTokens);
    }
    if (usage.totalTokens !== undefined) {
      this.rootSpan.setAttribute("usage.total_tokens", usage.totalTokens);
    }
    if (usage.cachedTokens !== undefined) {
      this.rootSpan.setAttribute("usage.cached_tokens", usage.cachedTokens);
    }
    if (usage.reasoningTokens !== undefined) {
      this.rootSpan.setAttribute("usage.reasoning_tokens", usage.reasoningTokens);
    }
  }

  /**
   * End the root span with a status
   */
  end(status: "completed" | "error", error?: Error | any): void {
    // Set the final agent state
    this.rootSpan.setAttribute("agent.state", status);

    if (status === "completed") {
      this.rootSpan.setStatus({ code: SpanStatusCode.OK });
    } else {
      this.rootSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: error?.message || "Operation failed",
      });
      if (error) {
        // Record exception
        this.rootSpan.recordException(error);

        // Add detailed error attributes
        const errorAttributes: Record<string, any> = {
          "error.type": error.name || "Error",
          "error.message": error.message || String(error),
        };

        // Add VoltAgent-specific error fields if present
        if ("code" in error && error.code) {
          errorAttributes["error.code"] = error.code;
        }
        if ("stage" in error && error.stage) {
          errorAttributes["error.stage"] = error.stage;
        }
        if ("originalError" in error && error.originalError) {
          errorAttributes["error.original"] = String(error.originalError);
        }
        if (error.stack) {
          errorAttributes["error.stack"] = error.stack;
        }

        this.rootSpan.setAttributes(errorAttributes);
      }
    }
    this.rootSpan.end();
  }

  /**
   * End a child span with proper status
   */
  endChildSpan(
    span: Span,
    status: "completed" | "error",
    options?: {
      output?: any;
      error?: Error | any;
      attributes?: Record<string, any>;
    },
  ): void {
    if (options?.output !== undefined) {
      const outputStr =
        typeof options.output === "string" ? options.output : safeStringify(options.output);
      span.setAttribute("output", outputStr);
    }

    if (options?.attributes) {
      span.setAttributes(options.attributes);
    }

    if (status === "completed") {
      span.setStatus({ code: SpanStatusCode.OK });
    } else {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: options?.error?.message || "Operation failed",
      });
      if (options?.error) {
        span.recordException(options.error);

        // Add detailed error attributes
        const errorAttributes: Record<string, any> = {
          "error.type": options.error.name || "Error",
          "error.message": options.error.message || String(options.error),
        };

        // Add VoltAgent-specific error fields if present
        if ("code" in options.error && options.error.code) {
          errorAttributes["error.code"] = options.error.code;
        }
        if ("stage" in options.error && options.error.stage) {
          errorAttributes["error.stage"] = options.error.stage;
        }
        if (options.error.stack) {
          errorAttributes["error.stack"] = options.error.stack;
        }

        span.setAttributes(errorAttributes);
      }
    }

    span.end();
  }

  /**
   * Get the active context for manual context propagation
   */
  getActiveContext(): Context {
    return this.activeContext;
  }

  /**
   * Update active context with a new span
   */
  updateActiveContext(span: Span): void {
    this.activeContext = trace.setSpan(this.activeContext, span);
  }
}

/**
 * Add model attributes to a span
 */
export function addModelAttributesToSpan(
  span: Span | undefined,
  modelName: string,
  options?: BaseGenerationOptions,
  defaultMaxOutputTokens?: number,
  defaultTemperature?: number,
): void {
  if (!span) return;

  // Model name
  span.setAttribute("ai.model.name", modelName);

  // AI SDK CallSettings - use options directly, then providerOptions, then defaults
  const temperature =
    options?.temperature ?? options?.providerOptions?.temperature ?? defaultTemperature;
  if (temperature !== undefined && typeof temperature === "number") {
    span.setAttribute("ai.model.temperature", temperature);
  }

  const maxOutputTokens =
    options?.maxOutputTokens ?? options?.providerOptions?.maxTokens ?? defaultMaxOutputTokens;
  if (maxOutputTokens !== undefined && typeof maxOutputTokens === "number") {
    span.setAttribute("ai.model.max_tokens", maxOutputTokens);
  }

  const topP = options?.topP ?? options?.providerOptions?.topP;
  if (topP !== undefined && typeof topP === "number") {
    span.setAttribute("ai.model.top_p", topP);
  }

  if (options?.topK !== undefined && typeof options.topK === "number") {
    span.setAttribute("ai.model.top_k", options.topK);
  }

  const frequencyPenalty = options?.frequencyPenalty ?? options?.providerOptions?.frequencyPenalty;
  if (frequencyPenalty !== undefined && typeof frequencyPenalty === "number") {
    span.setAttribute("ai.model.frequency_penalty", frequencyPenalty);
  }

  const presencePenalty = options?.presencePenalty ?? options?.providerOptions?.presencePenalty;
  if (presencePenalty !== undefined && typeof presencePenalty === "number") {
    span.setAttribute("ai.model.presence_penalty", presencePenalty);
  }

  if (options?.stopSequences !== undefined && options.stopSequences.length > 0) {
    span.setAttribute("ai.model.stop_sequences", JSON.stringify(options.stopSequences));
  }

  if (options?.seed !== undefined) {
    span.setAttribute("ai.model.seed", options.seed);
  }

  if (options?.maxRetries !== undefined) {
    span.setAttribute("ai.model.max_retries", options.maxRetries);
  }

  if (options?.maxSteps !== undefined) {
    span.setAttribute("ai.model.max_steps", options.maxSteps);
  }

  // VoltAgent specific options
  if (options?.userId !== undefined) {
    span.setAttribute("user.id", options.userId);
  }

  if (options?.conversationId !== undefined) {
    span.setAttribute("conversation.id", options.conversationId);
  }

  if (options?.parentAgentId !== undefined) {
    span.setAttribute("agent.parent.id", options.parentAgentId);
  }

  if (options?.contextLimit !== undefined) {
    span.setAttribute("memory.context_limit", options.contextLimit);
  }

  // Semantic memory options
  if (options?.semanticMemory) {
    const semantic = options.semanticMemory;

    if (semantic.enabled !== undefined) {
      span.setAttribute("memory.semantic.enabled", semantic.enabled);
    }

    if (semantic.semanticLimit !== undefined) {
      span.setAttribute("memory.semantic.limit", semantic.semanticLimit);
    }

    if (semantic.semanticThreshold !== undefined) {
      span.setAttribute("memory.semantic.threshold", semantic.semanticThreshold);
    }

    if (semantic.mergeStrategy !== undefined) {
      span.setAttribute("memory.semantic.merge_strategy", semantic.mergeStrategy);
    }
  }
}
