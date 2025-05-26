import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import { type ExportResult, ExportResultCode } from "@opentelemetry/core";
import { VoltAgentSDK, type VoltAgentHistoryWrapper } from "@voltagent/sdk";
import type { Usage } from "@voltagent/core";

/**
 * Configuration options for VoltAgentExporter
 */
export interface VoltAgentExporterOptions {
  // VoltAgent SaaS backend
  publicKey?: string;
  secretKey?: string;
  baseUrl?: string;

  // SDK options
  autoFlush?: boolean;
  flushInterval?: number;
  debug?: boolean;
}

/**
 * Span data structure for processing
 */
interface SpanData {
  startTime: string;
  endTime?: string;
  spanId: string;
  input: unknown;
  output: unknown;
  metadata: Record<string, unknown>;
}

/**
 * Trace metadata structure
 */
interface TraceMetadata {
  agentId?: string;
  userId?: string;
  conversationId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * VoltAgent OpenTelemetry Exporter for Vercel AI SDK
 *
 * This exporter converts OpenTelemetry spans from Vercel AI SDK into VoltAgent timeline events.
 * It follows the same pattern as LangfuseExporter but targets VoltAgent backend.
 */
export class VoltAgentExporter implements SpanExporter {
  private readonly sdk: VoltAgentSDK;
  private readonly debug: boolean;

  // Track active histories by traceId
  private activeHistories = new Map<string, VoltAgentHistoryWrapper>();

  constructor(options: VoltAgentExporterOptions) {
    this.debug = options.debug ?? false;

    // Initialize VoltAgent SDK
    this.sdk = new VoltAgentSDK({
      publicKey: options.publicKey ?? "",
      secretKey: options.secretKey ?? "",
      baseUrl: options.baseUrl ?? "https://api.voltagent.com",
      autoFlush: options.autoFlush ?? true,
      flushInterval: options.flushInterval ?? 5000,
    });

    if (this.debug) {
      this.logDebug("VoltAgentExporter initialized with options:", options);
    }
  }

  export(allSpans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    this.logDebug(`Exporting ${allSpans.length} spans...`);

    // Process asynchronously but don't await in the export method
    this.processSpansAsync(allSpans, resultCallback);
  }

  private async processSpansAsync(
    allSpans: ReadableSpan[],
    resultCallback: (result: ExportResult) => void,
  ): Promise<void> {
    try {
      // Group spans by trace ID
      const traceSpanMap = new Map<string, ReadableSpan[]>();

      for (const span of allSpans) {
        if (!this.isVercelAiSpan(span)) {
          this.logDebug("Ignoring non-Vercel AI span", span.name);
          continue;
        }

        const traceId = span.spanContext().traceId;
        traceSpanMap.set(traceId, (traceSpanMap.get(traceId) ?? []).concat(span));
      }

      // Process each trace
      for (const [traceId, spans] of traceSpanMap) {
        await this.processTraceSpans(traceId, spans);
      }

      this.logDebug(`Processed ${traceSpanMap.size} traces.`);

      resultCallback({ code: ExportResultCode.SUCCESS });
    } catch (err) {
      this.logDebug("Error exporting spans:", err);
      resultCallback({
        code: ExportResultCode.FAILED,
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }

  private async processTraceSpans(traceId: string, spans: ReadableSpan[]): Promise<void> {
    try {
      // Find or create history for this trace
      let history = this.activeHistories.get(traceId);

      // Extract trace metadata once for the entire trace
      const traceMetadata = this.extractTraceMetadata(spans);

      if (!history) {
        // Find root span
        const rootSpan = this.findRootSpan(spans);

        // Parse model parameters and completion start time from root span
        const modelParameters = rootSpan ? this.parseModelParameters(rootSpan.attributes) : {};
        const completionStartTime = rootSpan
          ? this.parseCompletionStartTime(
              rootSpan,
              rootSpan ? this.hrTimeToISOString(rootSpan.startTime) : new Date().toISOString(),
            )
          : undefined;

        // Combine trace metadata with model parameters and timing
        const combinedMetadata = {
          ...traceMetadata.metadata,
          modelParameters,
          ...(completionStartTime && { completionStartTime }),
        };

        // Create new history
        history = await this.sdk.createHistory({
          agent_id: traceMetadata.agentId ?? "no-named-ai-agent",
          input: this.parseSpanInput(rootSpan),
          metadata: combinedMetadata,
          userId: traceMetadata.userId,
          conversationId: traceMetadata.conversationId,
          completionStartTime: completionStartTime,
          tags:
            traceMetadata.tags && traceMetadata.tags.length > 0 ? traceMetadata.tags : undefined,
          status: "running",
          startTime: rootSpan
            ? this.hrTimeToISOString(rootSpan.startTime)
            : new Date().toISOString(),
          version: "1.0.0",
        });

        this.activeHistories.set(traceId, history);
        this.logDebug(`Created new history for trace ${traceId}`);
      }

      // Find root span for agent events
      const rootSpan = this.findRootSpan(spans);

      // Process each span as VoltAgent events, passing trace metadata
      for (const span of spans) {
        await this.processSpanAsVoltAgentEvents(history, span, traceMetadata, span === rootSpan);
      }

      // Check if trace is complete
      if (this.isTraceComplete(spans)) {
        const finalOutput = rootSpan ? this.parseSpanOutput(rootSpan) : undefined;

        history.end({
          output: finalOutput,
          usage: this.parseUsage(rootSpan?.attributes ?? {}),
          endTime: rootSpan?.endTime ? this.hrTimeToISOString(rootSpan.endTime) : undefined,
        });

        this.activeHistories.delete(traceId);
        this.logDebug(`Completed trace ${traceId}`);
      }
    } catch (error) {
      this.logDebug(`Error processing trace ${traceId}:`, error);
    }
  }

  private async processSpanAsVoltAgentEvents(
    history: VoltAgentHistoryWrapper,
    span: ReadableSpan,
    traceMetadata: TraceMetadata,
    isRootSpan = false,
  ): Promise<void> {
    const spanType = this.getSpanType(span);
    const startTime = this.hrTimeToISOString(span.startTime);
    const endTime = span.endTime ? this.hrTimeToISOString(span.endTime) : undefined;
    const spanId = span.spanContext().spanId;
    const input = this.parseSpanInput(span);
    const output = this.parseSpanOutput(span);
    const metadata = this.parseSpanMetadata(span);

    switch (spanType) {
      case "generation":
        // Only create agent events for root generation span
        if (isRootSpan) {
          await this.processGenerationSpan(
            history,
            span,
            {
              startTime,
              endTime,
              spanId,
              input,
              output,
              metadata,
            },
            traceMetadata,
          );
        }
        break;

      case "tool":
        // Map to tool events
        await this.processToolSpan(
          history,
          span,
          {
            startTime,
            endTime,
            spanId,
            input,
            output,
            metadata,
          },
          traceMetadata,
        );
        break;

      case "embedding":
        // Map to retriever events (if we had this case)
        this.logDebug(`Embedding span not implemented: ${span.name}`);
        break;

      default:
        this.logDebug(`Unknown span type for span: ${span.name}`);
    }
  }

  private async processGenerationSpan(
    history: VoltAgentHistoryWrapper,
    span: ReadableSpan,
    data: SpanData,
    traceMetadata: TraceMetadata,
  ): Promise<void> {
    // Use trace metadata agentId first, then fall back to span metadata, then default
    const agentId = traceMetadata.agentId ?? "vercel-ai-agent";
    const displayName = (data.metadata.displayName as string) ?? span.name;
    const usage = this.parseUsage(span.attributes);
    const modelParameters = this.parseModelParameters(span.attributes);
    const completionStartTime = this.parseCompletionStartTime(span, data.startTime);

    // Agent start event
    const startEvent = {
      name: "agent:start" as const,
      type: "agent" as const,
      startTime: data.startTime,
      status: "running" as const,
      input: {
        input: Array.isArray(data.input)
          ? data.input
          : JSON.stringify(JSON.parse(data.input as string).messages) || "",
      },
      metadata: {
        displayName,
        id: agentId,
        instructions: data.metadata.instructions as string,
        usage,
        modelParameters,
        completionStartTime,
      },
    };

    history.addEvent(startEvent);

    // Agent completion event (if span is finished)
    if (data.endTime) {
      const hasError = span.status?.code === 2; // ERROR

      if (hasError) {
        const errorEvent = {
          name: "agent:error" as const,
          type: "agent" as const,
          startTime: data.startTime,
          endTime: data.endTime,
          status: "error" as const,
          level: "ERROR" as const,
          metadata: {
            displayName,
            id: agentId,
            usage,
            modelParameters,
            completionStartTime,
          },
          error: {
            message: span.status?.message || "Unknown error",
          },
        };

        history.addEvent(errorEvent);
      } else {
        const successEvent = {
          name: "agent:success" as const,
          type: "agent" as const,
          startTime: data.endTime,
          endTime: data.endTime,
          status: "completed" as const,
          output: data.output as Record<string, unknown> | null,
          metadata: {
            displayName,
            id: agentId,
            usage,
            modelParameters,
            completionStartTime,
          },
        };

        history.addEvent(successEvent);
      }
    }
  }

  private async processToolSpan(
    history: VoltAgentHistoryWrapper,
    span: ReadableSpan,
    data: SpanData,
    traceMetadata: TraceMetadata,
  ): Promise<void> {
    const toolName = (data.metadata.toolName as string) ?? span.name;
    // Use trace metadata agentId first, then fall back to span metadata, then default
    const agentId = traceMetadata.agentId ?? "vercel-ai-agent";

    // Tool start event
    const startEvent = {
      name: "tool:start" as const,
      type: "tool" as const,
      startTime: data.startTime,
      status: "running" as const,
      input: data.input as Record<string, unknown> | null,
      metadata: {
        displayName: toolName,
        id: toolName,
        agentId: agentId,
      },
    };

    history.addEvent(startEvent);

    // Tool completion event (if span is finished)
    if (data.endTime) {
      const hasError = span.status?.code === 2; // ERROR

      if (hasError) {
        const errorEvent = {
          name: "tool:error" as const,
          type: "tool" as const,
          startTime: data.startTime,
          endTime: data.endTime,
          status: "error" as const,
          level: "ERROR" as const,
          metadata: {
            displayName: toolName,
            id: toolName,
            agentId: agentId,
          },
          error: {
            message: span.status?.message || "Tool execution failed",
          },
        };

        history.addEvent(errorEvent);
      } else {
        const successEvent = {
          name: "tool:success" as const,
          type: "tool" as const,
          startTime: data.endTime,
          endTime: data.endTime,
          status: "completed" as const,
          output: data.output as Record<string, unknown> | null,
          metadata: {
            displayName: toolName,
            id: toolName,
            agentId: agentId,
          },
        };

        history.addEvent(successEvent);
      }
    }
  }

  // Utility methods
  private isVercelAiSpan(span: ReadableSpan): boolean {
    // Check if this is a Vercel AI SDK span
    const instrumentationScopeName =
      (span as any).instrumentationLibrary?.name ?? (span as any).instrumentationScope?.name;
    return instrumentationScopeName === "ai";
  }

  private findRootSpan(spans: ReadableSpan[]): ReadableSpan | undefined {
    // Find the span with no parent (root span)
    const spanIds = new Set(spans.map((span) => span.spanContext().spanId));

    for (const span of spans) {
      const parentSpanId = this.getParentSpanId(span);
      if (!parentSpanId || !spanIds.has(parentSpanId)) {
        return span;
      }
    }

    return spans[0]; // Fallback to first span
  }

  private getSpanType(span: ReadableSpan): "generation" | "tool" | "embedding" | "unknown" {
    const spanName = span.name.toLowerCase();

    if (spanName.includes("generate") || spanName.includes("stream")) {
      return "generation";
    }

    if (spanName.includes("tool") || span.attributes["ai.toolCall.name"]) {
      return "tool";
    }

    if (spanName.includes("embed") || spanName.includes("embedding")) {
      return "embedding";
    }

    return "unknown";
  }

  private isTraceComplete(spans: ReadableSpan[]): boolean {
    // Check if all spans in the trace are completed
    return spans.every((span) => span.endTime && span.endTime[0] > 0);
  }

  private extractTraceMetadata(spans: ReadableSpan[]): {
    agentId?: string;
    userId?: string;
    conversationId?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
  } {
    const metadata: Record<string, unknown> = {};
    let agentId: string | undefined;
    let userId: string | undefined;
    let conversationId: string | undefined;

    for (const span of spans) {
      const attrs = span.attributes;

      // Extract standard metadata
      if (attrs["ai.telemetry.metadata.agent.id"]) {
        agentId = String(attrs["ai.telemetry.metadata.agent.id"]);
      }
      if (attrs["ai.telemetry.metadata.user.id"] || attrs["ai.telemetry.metadata.enduser.id"]) {
        userId = String(
          attrs["ai.telemetry.metadata.user.id"] || attrs["ai.telemetry.metadata.enduser.id"],
        );
      }
      if (
        attrs["ai.telemetry.metadata.session.id"] ||
        attrs["ai.telemetry.metadata.conversation.id"]
      ) {
        conversationId = String(
          attrs["ai.telemetry.metadata.session.id"] ||
            attrs["ai.telemetry.metadata.conversation.id"],
        );
      }

      // Extract custom metadata with prefix
      for (const [key, value] of Object.entries(attrs)) {
        if (key.startsWith("ai.telemetry.metadata.") && value != null) {
          const cleanKey = key.substring("ai.telemetry.metadata.".length);
          metadata[cleanKey] = value;
        }
      }
    }

    // Parse tags from spans
    const tags = this.parseTagsTraceAttribute(spans);

    return { agentId, userId, conversationId, tags, metadata };
  }

  private parseTagsTraceAttribute(spans: ReadableSpan[]): string[] {
    return [
      ...new Set(
        spans
          .map((span) => this.parseSpanMetadata(span).tags)
          .filter((tags) => Array.isArray(tags) && tags.every((tag) => typeof tag === "string"))
          .reduce((acc, tags) => acc.concat(tags as string[]), []),
      ),
    ];
  }

  private parseSpanInput(span: ReadableSpan | undefined): any {
    if (!span) return undefined;

    const attrs = span.attributes;

    // Try to parse input from various attributes
    if (attrs["ai.prompt.messages"]) {
      return this.safeJsonParse(String(attrs["ai.prompt.messages"]));
    }
    if (attrs["ai.prompt"]) {
      return attrs["ai.prompt"];
    }
    if (attrs["ai.toolCall.args"]) {
      return this.safeJsonParse(String(attrs["ai.toolCall.args"]));
    }

    return undefined;
  }

  private parseSpanOutput(span: ReadableSpan | undefined): any {
    if (!span) return undefined;

    const attrs = span.attributes;

    // Try to parse output from various attributes
    if (attrs["ai.response.text"]) {
      return { text: attrs["ai.response.text"] };
    }
    if (attrs["ai.result.text"]) {
      return { text: attrs["ai.result.text"] };
    }
    if (attrs["ai.toolCall.result"]) {
      return this.safeJsonParse(String(attrs["ai.toolCall.result"]));
    }
    if (attrs["ai.response.object"]) {
      return this.safeJsonParse(String(attrs["ai.response.object"]));
    }
    if (attrs["ai.response.toolCalls"]) {
      return this.safeJsonParse(String(attrs["ai.response.toolCalls"]));
    }

    return undefined;
  }

  private parseSpanMetadata(span: ReadableSpan): Record<string, unknown> {
    const metadata: Record<string, unknown> = {};
    const attrs = span.attributes;

    // Extract tool-specific metadata
    if (attrs["ai.toolCall.name"]) {
      metadata.toolName = attrs["ai.toolCall.name"];
    }
    if (attrs["ai.toolCall.id"]) {
      metadata.toolId = attrs["ai.toolCall.id"];
    }

    // Extract agent metadata
    if (attrs["ai.telemetry.metadata.agent.name"]) {
      metadata.displayName = attrs["ai.telemetry.metadata.agent.name"];
    }
    if (attrs["ai.telemetry.metadata.agent.id"]) {
      metadata.agentId = attrs["ai.telemetry.metadata.agent.id"];
    }

    // Extract custom metadata
    for (const [key, value] of Object.entries(attrs)) {
      if (key.startsWith("ai.telemetry.metadata.") && value != null) {
        const cleanKey = key.substring("ai.telemetry.metadata.".length);
        metadata[cleanKey] = value;
      }
    }

    return metadata;
  }

  private parseUsage(attributes: Record<string, any>): Usage | undefined {
    const inputTokens =
      "gen_ai.usage.prompt_tokens" in attributes // Backward compat, input_tokens used in latest ai SDK versions
        ? Number.parseInt(attributes["gen_ai.usage.prompt_tokens"]?.toString() ?? "0")
        : "gen_ai.usage.input_tokens" in attributes
          ? Number.parseInt(attributes["gen_ai.usage.input_tokens"]?.toString() ?? "0")
          : "ai.usage.promptTokens" in attributes
            ? Number.parseInt(attributes["ai.usage.promptTokens"]?.toString() ?? "0")
            : undefined;

    const outputTokens =
      "gen_ai.usage.completion_tokens" in attributes // Backward compat, output_tokens used in latest ai SDK versions
        ? Number.parseInt(attributes["gen_ai.usage.completion_tokens"]?.toString() ?? "0")
        : "gen_ai.usage.output_tokens" in attributes
          ? Number.parseInt(attributes["gen_ai.usage.output_tokens"]?.toString() ?? "0")
          : "ai.usage.completionTokens" in attributes
            ? Number.parseInt(attributes["ai.usage.completionTokens"]?.toString() ?? "0")
            : undefined;
    // Input tokens - Backward compatibility, input_tokens used in latest AI SDK versions
    return {
      promptTokens: inputTokens,
      completionTokens: outputTokens,
      totalTokens: inputTokens && outputTokens ? inputTokens + outputTokens : undefined,
    };
  }

  private parseModelParameters(attributes: Record<string, any>): Record<string, any> {
    return {
      toolChoice:
        "ai.prompt.toolChoice" in attributes
          ? (attributes["ai.prompt.toolChoice"]?.toString() ?? null)
          : null,
      maxTokens:
        "gen_ai.request.max_tokens" in attributes
          ? (attributes["gen_ai.request.max_tokens"]?.toString() ?? null)
          : null,
      finishReason:
        "gen_ai.response.finish_reasons" in attributes
          ? (attributes["gen_ai.response.finish_reasons"]?.toString() ?? null)
          : "gen_ai.finishReason" in attributes // Legacy support for ai SDK versions < 4.0.0
            ? (attributes["gen_ai.finishReason"]?.toString() ?? null)
            : null,
      system:
        "gen_ai.system" in attributes
          ? (attributes["gen_ai.system"]?.toString() ?? null)
          : "ai.model.provider" in attributes
            ? (attributes["ai.model.provider"]?.toString() ?? null)
            : null,
      maxRetries:
        "ai.settings.maxRetries" in attributes
          ? (attributes["ai.settings.maxRetries"]?.toString() ?? null)
          : null,
      mode:
        "ai.settings.mode" in attributes
          ? (attributes["ai.settings.mode"]?.toString() ?? null)
          : null,
      temperature:
        "gen_ai.request.temperature" in attributes
          ? (attributes["gen_ai.request.temperature"]?.toString() ?? null)
          : null,
      model:
        "ai.response.model" in attributes
          ? attributes["ai.response.model"]?.toString()
          : "gen_ai.request.model" in attributes
            ? attributes["gen_ai.request.model"]?.toString()
            : "ai.model.id" in attributes
              ? attributes["ai.model.id"]?.toString()
              : undefined,
    };
  }

  private parseCompletionStartTime(span: ReadableSpan, startTime: string): string | undefined {
    const attributes = span.attributes;

    // Calculate completion start time based on msToFirstChunk
    const msToFirstChunk =
      "ai.response.msToFirstChunk" in attributes
        ? Number(attributes["ai.response.msToFirstChunk"])
        : "ai.stream.msToFirstChunk" in attributes // Legacy support for ai SDK versions < 4.0.0
          ? Number(attributes["ai.stream.msToFirstChunk"])
          : null;

    if (msToFirstChunk !== null && !Number.isNaN(msToFirstChunk)) {
      const startDate = new Date(startTime);
      const completionStartDate = new Date(startDate.getTime() + msToFirstChunk);
      return completionStartDate.toISOString();
    }

    return undefined;
  }

  private getParentSpanId(span: ReadableSpan): string | undefined {
    return (span as any).parentSpanId ?? (span as any).parentSpanContext?.spanId;
  }

  private hrTimeToISOString(hrtime: [number, number]): string {
    const nanoSeconds = hrtime[0] * 1e9 + hrtime[1];
    const milliSeconds = nanoSeconds / 1e6;
    return new Date(milliSeconds).toISOString();
  }

  private safeJsonParse(jsonString: string | undefined | null): any {
    if (typeof jsonString !== "string") return jsonString;
    try {
      return JSON.parse(jsonString);
    } catch (_e) {
      return jsonString;
    }
  }

  private logDebug(message: string, ...args: any[]): void {
    if (this.debug) {
      console.log(`[${new Date().toISOString()}] [VoltAgentExporter] ${message}`, ...args);
    }
  }

  async forceFlush(): Promise<void> {
    this.logDebug("Force flushing VoltAgent SDK...");

    // End any remaining active histories
    for (const [traceId, history] of this.activeHistories) {
      try {
        history.end({});
        this.logDebug(`Force completed trace ${traceId}`);
      } catch (error) {
        this.logDebug(`Error force completing trace ${traceId}:`, error);
      }
    }

    this.activeHistories.clear();

    // Force flush the SDK
    await this.sdk.flush();
  }

  async shutdown(): Promise<void> {
    this.logDebug("Shutting down VoltAgent exporter...");
    await this.forceFlush();
  }
}
