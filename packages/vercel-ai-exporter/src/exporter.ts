import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import { type ExportResult, ExportResultCode } from "@opentelemetry/core";
import { VoltAgentObservabilitySDK } from "@voltagent/sdk";
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
 * Agent information structure for multi-agent tracking
 */
interface AgentInfo {
  agentId: string;
  parentAgentId?: string;
  displayName?: string;
  startTime: string;
  spans: ReadableSpan[];
}

/**
 * VoltAgent OpenTelemetry Exporter for Vercel AI SDK
 *
 * This exporter converts OpenTelemetry spans from Vercel AI SDK into VoltAgent timeline events.
 * It follows the same pattern as LangfuseExporter but targets VoltAgent backend.
 */
export class VoltAgentExporter implements SpanExporter {
  private readonly sdk: VoltAgentObservabilitySDK;
  private readonly debug: boolean;

  // Track active histories by historyId (from telemetry metadata)
  private activeHistories = new Map<string, string>(); // historyId -> historyId mapping

  // Track agents within each trace for multi-agent support
  private traceAgents = new Map<string, Map<string, AgentInfo>>();

  constructor(options: VoltAgentExporterOptions) {
    this.debug = options.debug ?? false;

    // Initialize VoltAgent SDK
    this.sdk = new VoltAgentObservabilitySDK({
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

      // Force flush after processing all spans (like Langfuse does)
      await this.sdk.flush();

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
      // Extract trace metadata once for the entire trace
      const traceMetadata = this.extractTraceMetadata(spans);

      // Get historyId from metadata, fallback to traceId
      const historyId = (traceMetadata.metadata?.historyId as string) || traceId;

      // Discover and organize agents within this trace
      const agentsInTrace = this.discoverAgentsInTrace(spans);
      this.traceAgents.set(traceId, agentsInTrace);

      // Find or create history for this historyId
      const historyExists = this.activeHistories.has(historyId);

      if (!historyExists) {
        // Find root span
        const rootSpan = this.findRootSpan(spans);
        const rootAgent = this.findRootAgent(agentsInTrace);

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

        // Create new history with historyId as key
        await this.sdk.createHistory({
          id: historyId,
          agent_id: rootAgent?.agentId ?? traceMetadata.agentId ?? "no-named-ai-agent",
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

        this.activeHistories.set(historyId, historyId);
        this.logDebug(
          `Created new history ${historyId} for trace ${traceId} with ${agentsInTrace.size} agents`,
        );
      } else {
        this.logDebug(
          `Using existing history ${historyId} for trace ${traceId} with ${agentsInTrace.size} agents`,
        );
      }

      // Process each span as VoltAgent events
      for (const span of spans) {
        const spanAgentId = this.extractAgentIdFromSpan(span, spans);
        const agentInfo = agentsInTrace.get(spanAgentId);
        const isRootSpan = this.findRootSpan(spans) === span;

        await this.processSpanAsVoltAgentEvents(
          historyId,
          span,
          traceMetadata,
          agentInfo,
          isRootSpan,
        );
      }

      // Check if this trace is complete and update history accordingly
      if (this.isTraceComplete(spans)) {
        const rootSpan = this.findRootSpan(spans);
        const finalOutput = rootSpan ? this.parseSpanOutput(rootSpan) : undefined;
        const finalUsage = this.parseUsage(rootSpan?.attributes ?? {});
        const endTime = rootSpan?.endTime ? this.hrTimeToISOString(rootSpan.endTime) : undefined;

        // Complete the history for this trace
        await this.sdk.endHistory(historyId, {
          output: finalOutput,
          usage: finalUsage,
          endTime: endTime,
          status: "completed",
        });

        this.logDebug(`Trace ${traceId} completed and history ${historyId} ended`);
      }

      // Clean up trace agents after processing
      this.traceAgents.delete(traceId);
    } catch (error) {
      this.logDebug(`Error processing trace ${traceId}:`, error);
    }
  }

  private async processSpanAsVoltAgentEvents(
    historyId: string,
    span: ReadableSpan,
    traceMetadata: TraceMetadata,
    agentInfo?: AgentInfo,
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
        // Create agent events for each agent's generation spans
        await this.processGenerationSpan(
          historyId,
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
          agentInfo,
          isRootSpan,
        );
        break;

      case "tool":
        // Map to tool events
        await this.processToolSpan(
          historyId,
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
          agentInfo,
        );
        break;

      default:
        this.logDebug(`Unknown span type for span: ${span.name}`);
    }
  }

  private async processGenerationSpan(
    historyId: string,
    span: ReadableSpan,
    data: SpanData,
    traceMetadata: TraceMetadata,
    agentInfo?: AgentInfo,
    _isRootSpan = false,
  ): Promise<void> {
    // Use agent info first, then trace metadata, then defaults
    const agentId = agentInfo?.agentId ?? traceMetadata.agentId ?? "vercel-ai-agent";
    const displayName =
      agentInfo?.displayName ?? (data.metadata.displayName as string) ?? span.name;
    const usage = this.parseUsage(span.attributes);
    const modelParameters = this.parseModelParameters(span.attributes);
    const completionStartTime = this.parseCompletionStartTime(span, data.startTime);

    // For multi-agent scenarios, create agent:start event for each new agent
    // Check if this is the first generation span for this agent
    if (agentInfo && this.isFirstGenerationSpanForAgent(span, agentInfo)) {
      const agentStartEvent = {
        name: "agent:start" as const,
        type: "agent" as const,
        startTime: agentInfo.startTime,
        status: "running" as const,
        input: {
          input: data.input as any[],
        },
        metadata: {
          displayName,
          id: agentId,
          ...(agentInfo.parentAgentId && { agentId: agentInfo.parentAgentId }),
          instructions: data.metadata.instructions as string,
          usage,
          modelParameters,
          completionStartTime,
        },
      };

      await this.sdk.addEventToHistory(historyId, agentStartEvent);

      this.logDebug(`Added agent:start event for agent: ${agentId}`);
    }

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
            ...(agentInfo?.parentAgentId && {
              agentId: agentInfo.parentAgentId,
            }),
            usage,
            modelParameters,
            completionStartTime,
          },
          error: {
            message: span.status?.message || "Unknown error",
          },
        };

        await this.sdk.addEventToHistory(historyId, errorEvent);
      } else {
        // Only add success event if this is the last generation span for this agent
        if (agentInfo && this.isLastGenerationSpanForAgent(span, agentInfo)) {
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
              ...(agentInfo.parentAgentId && {
                agentId: agentInfo.parentAgentId,
              }),
              usage,
              modelParameters,
              completionStartTime,
            },
          };

          await this.sdk.addEventToHistory(historyId, successEvent);
          this.logDebug(`Added agent:success event for agent: ${agentId}`);
        }
      }
    }
  }

  private async processToolSpan(
    historyId: string,
    span: ReadableSpan,
    data: SpanData,
    traceMetadata: TraceMetadata,
    agentInfo?: AgentInfo,
  ): Promise<void> {
    const toolName = (data.metadata.toolName as string) ?? span.name;
    // Use agent info first, then trace metadata, then defaults
    const agentId = agentInfo?.agentId ?? traceMetadata.agentId ?? "vercel-ai-agent";

    this.logDebug(
      `Processing tool span: ${toolName}, agentId: ${agentId}, agentInfo: ${agentInfo ? "found" : "not found"}, span agentId: ${span.attributes["ai.telemetry.metadata.agentId"] ?? "not found"}`,
    );

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

    await this.sdk.addEventToHistory(historyId, startEvent);

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

        await this.sdk.addEventToHistory(historyId, errorEvent);
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

        await this.sdk.addEventToHistory(historyId, successEvent);
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

  private getSpanType(span: ReadableSpan): "generation" | "tool" | "unknown" {
    const spanName = span.name.toLowerCase();

    if (spanName.includes("generate") || spanName.includes("stream")) {
      return "generation";
    }

    if (spanName.includes("tool") || span.attributes["ai.toolCall.name"]) {
      return "tool";
    }

    return "unknown";
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
      if (attrs["ai.telemetry.metadata.agentId"]) {
        agentId = String(attrs["ai.telemetry.metadata.agentId"]);
      }
      if (attrs["ai.telemetry.metadata.userId"]) {
        userId = String(attrs["ai.telemetry.metadata.userId"]);
      }
      if (attrs["ai.telemetry.metadata.conversationId"]) {
        conversationId = String(attrs["ai.telemetry.metadata.conversationId"]);
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
    if (attrs["ai.telemetry.metadata.agentId"]) {
      metadata.agentId = attrs["ai.telemetry.metadata.agentId"];
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

    // End any remaining active histories (only on force flush/shutdown)
    for (const [historyId, history] of this.activeHistories) {
      try {
        await this.sdk.endHistory(history);
        this.logDebug(`Force completed history ${historyId}`);
      } catch (error) {
        this.logDebug(`Error force completing history ${historyId}:`, error);
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

  // New utility methods for multi-agent support

  private discoverAgentsInTrace(spans: ReadableSpan[]): Map<string, AgentInfo> {
    const agents = new Map<string, AgentInfo>();

    for (const span of spans) {
      const agentId = this.extractAgentIdFromSpan(span, spans);
      const parentAgentId = this.extractParentAgentIdFromSpan(span);
      const displayName = this.extractAgentDisplayNameFromSpan(span);

      if (!agents.has(agentId)) {
        agents.set(agentId, {
          agentId,
          parentAgentId,
          displayName,
          startTime: this.hrTimeToISOString(span.startTime),
          spans: [],
        });
      }

      const agent = agents.get(agentId);
      if (agent) {
        agent.spans.push(span);
      }
    }

    this.logDebug(`Discovered ${agents.size} agents in trace:`, Array.from(agents.keys()));
    return agents;
  }

  private findRootAgent(agents: Map<string, AgentInfo>): AgentInfo | undefined {
    // Find agent with no parentAgentId (root agent)
    for (const agent of agents.values()) {
      if (!agent.parentAgentId) {
        return agent;
      }
    }

    // Fallback to first agent
    return agents.values().next().value;
  }

  private extractAgentIdFromSpan(span: ReadableSpan, allSpans?: ReadableSpan[]): string {
    const attrs = span.attributes;
    const spanType = this.getSpanType(span);

    // Try to get agentId from telemetry metadata
    if (attrs["ai.telemetry.metadata.agentId"]) {
      const agentId = String(attrs["ai.telemetry.metadata.agentId"]);
      this.logDebug(`Found agentId in span attributes for ${spanType} span: ${agentId}`);
      return agentId;
    }

    // For tool calls, try to get agentId from parent span
    if (allSpans && spanType === "tool") {
      const parentSpanId = this.getParentSpanId(span);
      if (parentSpanId) {
        const parentSpan = allSpans.find((s) => s.spanContext().spanId === parentSpanId);
        if (parentSpan?.attributes["ai.telemetry.metadata.agentId"]) {
          const agentId = String(parentSpan.attributes["ai.telemetry.metadata.agentId"]);
          this.logDebug(`Found agentId from parent span for tool span: ${agentId}`);
          return agentId;
        }
      }

      // If no parent agentId found, try to find agentId from any generation span in the same trace
      for (const otherSpan of allSpans) {
        if (
          this.getSpanType(otherSpan) === "generation" &&
          otherSpan.attributes["ai.telemetry.metadata.agentId"]
        ) {
          const agentId = String(otherSpan.attributes["ai.telemetry.metadata.agentId"]);
          this.logDebug(`Found agentId from generation span for tool span: ${agentId}`);
          return agentId;
        }
      }

      this.logDebug("No agentId found for tool span, using default");
    }

    // Fallback to default agent id
    this.logDebug(`Using default agentId for ${spanType} span`);
    return "vercel-ai-agent";
  }

  private extractParentAgentIdFromSpan(span: ReadableSpan): string | undefined {
    const attrs = span.attributes;

    // Try to get parentAgentId from telemetry metadata
    if (attrs["ai.telemetry.metadata.parentAgentId"]) {
      return String(attrs["ai.telemetry.metadata.parentAgentId"]);
    }

    return undefined;
  }

  private extractAgentDisplayNameFromSpan(span: ReadableSpan): string | undefined {
    const attrs = span.attributes;

    // Try to get display name from telemetry metadata
    if (attrs["ai.telemetry.metadata.agentDisplayName"]) {
      return String(attrs["ai.telemetry.metadata.agentDisplayName"]);
    }

    if (attrs["ai.telemetry.metadata.agentName"]) {
      return String(attrs["ai.telemetry.metadata.agentName"]);
    }

    return undefined;
  }

  private isFirstGenerationSpanForAgent(span: ReadableSpan, agentInfo: AgentInfo): boolean {
    // Check if this is the first generation span for this agent
    const generationSpans = agentInfo.spans.filter((s) => this.getSpanType(s) === "generation");
    const sortedSpans = generationSpans.sort((a, b) => {
      const aTime = a.startTime[0] * 1e9 + a.startTime[1];
      const bTime = b.startTime[0] * 1e9 + b.startTime[1];
      return aTime - bTime;
    });

    return sortedSpans[0] === span;
  }

  private isLastGenerationSpanForAgent(span: ReadableSpan, agentInfo: AgentInfo): boolean {
    // Check if this is the last completed generation span for this agent
    const generationSpans = agentInfo.spans.filter(
      (s) => this.getSpanType(s) === "generation" && s.endTime,
    );
    const sortedSpans = generationSpans.sort((a, b) => {
      const aEndTime = a.endTime;
      const bEndTime = b.endTime;
      if (!aEndTime || !bEndTime) return 0;

      const aTime = aEndTime[0] * 1e9 + aEndTime[1];
      const bTime = bEndTime[0] * 1e9 + bEndTime[1];
      return bTime - aTime; // Sort by end time descending
    });

    return sortedSpans[0] === span;
  }

  private isTraceComplete(spans: ReadableSpan[]): boolean {
    // Check if all spans in the trace are completed
    return spans.every((span) => span.endTime && span.endTime[0] > 0);
  }
}
