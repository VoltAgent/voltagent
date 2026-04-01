import { type ExportResult, ExportResultCode } from "@opentelemetry/core";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import { Langfuse, type LangfuseOptions } from "langfuse";

function safeJsonParse(jsonString: string | undefined | null): any {
  if (typeof jsonString !== "string") return jsonString; // Return as is if not a string
  try {
    return JSON.parse(jsonString);
  } catch (_e) {
    // console.warn("Failed to parse JSON string:", jsonString, e);
    return jsonString; // Return original string if parsing fails
  }
}

function extractMetadata(attributes: any): Record<string, any> {
  const metadata: Record<string, any> = {};
  const langfuseReservedKeys = new Set([
    // Keys used for specific Langfuse fields
    "ai.prompt.messages",
    "ai.response.text",
    "tool.arguments",
    "tool.result",
    "gen_ai.usage.prompt_tokens",
    "gen_ai.usage.completion_tokens",
    "ai.usage.tokens",
    "ai.model.name",
    "ai.response.finishReason",
    "gen_ai.finishReason",
    "ai.response.msToFirstChunk",
    "ai.stream.msToFirstChunk",
    "tool.call.id",
    "tool.name",
    "tool.error.message",
    // Generic I/O commonly set by @voltagent/core trace-context
    "input",
    "output",
    // Keys potentially controlling trace structure (might be filtered later)
    "langfuseTraceId",
    "langfuseUpdateParent",
    // Legacy/custom user/session keys
    "userId",
    "sessionId",
    // Core conventions
    "user.id",
    "conversation.id",
    "prompt.tags",
    "entity.id",
    "entity.type",
    "entity.name",
    "agent.state",
    "operation.id",
    // Usage fallbacks from @voltagent/core
    "usage.prompt_tokens",
    "usage.completion_tokens",
    "usage.total_tokens",
    "tags",
    "enduser.id",
    "session.id",
    "voltagent.agent.name",
  ]);
  const metadataPrefixOtel = "ai.telemetry.metadata.";
  const metadataPrefixCore = "metadata."; // Prefix used by voltagent core

  for (const key in attributes) {
    if (key.startsWith(metadataPrefixOtel)) {
      const cleanKey = key.substring(metadataPrefixOtel.length);
      if (attributes[key] != null) {
        metadata[cleanKey] = attributes[key];
      }
    } else if (key.startsWith(metadataPrefixCore)) {
      // Handle core prefix
      const cleanKey = key.substring(metadataPrefixCore.length);
      // Avoid adding internal core metadata prefixed with 'internal.'
      if (!cleanKey.startsWith("internal.") && attributes[key] != null) {
        metadata[cleanKey] = attributes[key];
      }
    } else if (!langfuseReservedKeys.has(key) && attributes[key] != null) {
      // Add other non-reserved attributes directly
      metadata[key] = attributes[key];
    }
  }
  return metadata;
}

type LangfuseExporterParams = {
  publicKey?: string;
  secretKey?: string;
  baseUrl?: string;
  debug?: boolean;
} & LangfuseOptions;

type TraceInfo = {
  rootSpan?: ReadableSpan;
  traceName?: string;
  userId?: string;
  sessionId?: string;
  tags?: string[];
  langfuseTraceId?: string;
  updateParent: boolean;
};

export class LangfuseExporter implements SpanExporter {
  private readonly langfuse: Langfuse;
  private readonly debug: boolean;

  constructor(params: LangfuseExporterParams) {
    if (!params.secretKey) {
      throw new Error("Langfuse secretKey is required for LangfuseExporter.");
    }
    this.debug = params.debug ?? false;
    this.langfuse = new Langfuse({
      ...params,
      persistence: "memory",
      sdkIntegration: "voltagent",
    });

    if (this.debug) {
      this.langfuse.debug();
      this.logDebug("LangfuseExporter initialized.");
    }
  }

  async export(
    allSpans: ReadableSpan[],
    resultCallback: (result: ExportResult) => void,
  ): Promise<void> {
    this.logDebug(`Exporting ${allSpans.length} spans...`);

    try {
      const traceSpanMap = new Map<string, ReadableSpan[]>();

      for (const span of allSpans) {
        const traceId = span.spanContext().traceId;
        traceSpanMap.set(traceId, (traceSpanMap.get(traceId) ?? []).concat(span));
      }

      let tracesProcessed = 0;
      for (const [traceId, spans] of traceSpanMap) {
        this.processTraceSpans(traceId, spans);
        tracesProcessed++;
      }
      this.logDebug(`Processed ${tracesProcessed} traces.`);

      await this.langfuse.flushAsync();
      this.logDebug("Flush scheduled.");

      resultCallback({ code: ExportResultCode.SUCCESS });
    } catch (err) {
      this.logDebug("Error exporting spans:", err);
      resultCallback({
        code: ExportResultCode.FAILED,
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }

  private extractTraceInfo(spans: ReadableSpan[]): TraceInfo {
    let rootSpan: ReadableSpan | undefined = undefined;
    let traceName: string | undefined = undefined;
    let userId: string | undefined = undefined;
    let sessionId: string | undefined = undefined;
    let tags: string[] | undefined = undefined;
    let langfuseTraceId: string | undefined = undefined;
    let updateParent = true; // Default

    // Find the root-most span in the batch (least nested) and extract trace info
    let minDepth = Number.POSITIVE_INFINITY;
    for (const span of spans) {
      const parentId = this.getParentSpanId(span);
      const depth = parentId ? 1 : 0; // Simple depth, could be improved if needed
      if (depth < minDepth) {
        minDepth = depth;
        rootSpan = span;
      }
      // Extract trace-level attributes from any span (first wins for most, last for updateParent)
      const attrs = span.attributes;
      // Use semantic conventions for user and session IDs
      if (userId === undefined && attrs["enduser.id"] != null) userId = String(attrs["enduser.id"]);
      if (userId === undefined && attrs["user.id"] != null) userId = String(attrs["user.id"]);
      if (sessionId === undefined && attrs["session.id"] != null)
        sessionId = String(attrs["session.id"]);
      if (sessionId === undefined && attrs["conversation.id"] != null)
        sessionId = String(attrs["conversation.id"]);
      // Keep existing logic for other trace attributes
      if (tags === undefined && Array.isArray(attrs.tags)) tags = attrs.tags.map(String);
      if (tags === undefined && typeof attrs["prompt.tags"] === "string") {
        try {
          const parsed = JSON.parse(String(attrs["prompt.tags"]));
          if (Array.isArray(parsed)) tags = parsed.map(String);
        } catch {}
      }
      if (traceName === undefined && attrs["voltagent.agent.name"] != null)
        traceName = String(attrs["voltagent.agent.name"]);
      if (traceName === undefined && attrs["entity.name"] != null)
        traceName = String(attrs["entity.name"]);
      if (langfuseTraceId === undefined && attrs.langfuseTraceId != null)
        langfuseTraceId = String(attrs.langfuseTraceId);
      if (attrs.langfuseUpdateParent != null) updateParent = Boolean(attrs.langfuseUpdateParent);
    }

    return {
      rootSpan,
      traceName,
      userId,
      sessionId,
      tags,
      langfuseTraceId,
      updateParent,
    };
  }

  private buildTraceParams(
    finalTraceId: string,
    traceName: string,
    traceInfo: TraceInfo,
  ): {
    id: string;
    name?: string;
    userId?: string;
    sessionId?: string;
    tags?: string[];
    metadata?: Record<string, any>;
    input?: any;
    output?: any;
    model?: string;
  } {
    const traceParams: {
      id: string;
      name?: string;
      userId?: string;
      sessionId?: string;
      tags?: string[];
      metadata?: Record<string, any>;
      input?: any;
      output?: any;
      model?: string;
    } = { id: finalTraceId };

    if (traceInfo.updateParent) {
      traceParams.name = traceName;
      traceParams.userId = traceInfo.userId;
      traceParams.sessionId = traceInfo.sessionId;
      traceParams.tags = traceInfo.tags;
      traceParams.input = safeJsonParse(
        String(
          traceInfo.rootSpan?.attributes["ai.prompt.messages"] ??
            traceInfo.rootSpan?.attributes?.input ??
            null,
        ),
      );
      traceParams.output = safeJsonParse(
        String(
          traceInfo.rootSpan?.attributes["ai.response.text"] ??
            traceInfo.rootSpan?.attributes?.output ??
            null,
        ),
      );
      // Add combined metadata from root span? Let's extract from root if available.
      traceParams.metadata = traceInfo.rootSpan
        ? extractMetadata(traceInfo.rootSpan.attributes)
        : undefined;
      const modelName = traceInfo.rootSpan?.attributes["ai.model.name"];
      traceParams.model = modelName != null ? String(modelName) : undefined;
    }

    return traceParams;
  }

  private processTraceSpans(traceId: string, spans: ReadableSpan[]): void {
    const traceInfo = this.extractTraceInfo(spans);

    const finalTraceId = traceInfo.langfuseTraceId ?? traceId;
    const traceName =
      traceInfo.traceName ?? traceInfo.rootSpan?.name ?? `Trace ${finalTraceId.substring(0, 8)}`;

    // Create Langfuse Trace - only include trace-level fields if updateParent is true
    const traceParams = this.buildTraceParams(finalTraceId, traceName, traceInfo);

    this.logDebug(`Creating/Updating Langfuse trace ${finalTraceId}`, traceParams);
    this.langfuse.trace(traceParams);

    // Process individual spans
    for (const span of spans) {
      if (this.isGenerationSpan(span)) {
        this.processSpanAsLangfuseGeneration(finalTraceId, span);
      } else {
        this.processSpanAsLangfuseSpan(finalTraceId, span);
      }
    }
  }

  // Simplified: Check for LLM-related usage attributes or specific span names
  private isGenerationSpan(span: ReadableSpan): boolean {
    const attrs = span.attributes;
    const name = span.name.toLowerCase();
    return (
      attrs["gen_ai.usage.prompt_tokens"] != null ||
      attrs["gen_ai.usage.completion_tokens"] != null ||
      attrs["ai.usage.tokens"] != null ||
      // Fallbacks used by @voltagent/core
      attrs["usage.prompt_tokens"] != null ||
      attrs["usage.completion_tokens"] != null ||
      attrs["usage.total_tokens"] != null ||
      attrs["ai.model.name"] != null ||
      name.includes("llm") ||
      name.includes("generate") ||
      name.includes("stream")
    );
  }

  private processSpanAsLangfuseSpan(traceId: string, span: ReadableSpan): void {
    const spanContext = span.spanContext();
    const attributes = span.attributes;
    const parentObservationId = this.getParentSpanId(span);

    const spanData = {
      traceId,
      parentObservationId,
      id: spanContext.spanId,
      name: attributes["tool.name"] ? `tool: ${attributes["tool.name"]}` : span.name, // Use tool name if available
      startTime: this.hrTimeToDate(span.startTime),
      endTime: this.hrTimeToDate(span.endTime),
      // Prefer tool.* fields, fallback to generic input/output set by @voltagent/core
      input: safeJsonParse(
        String(
          attributes["tool.arguments"] ??
            attributes?.input ??
            (attributes["ai.prompt.messages"] as any) ??
            null,
        ),
      ),
      output: safeJsonParse(
        String(
          attributes["tool.result"] ?? attributes?.output ?? attributes["ai.response.text"] ?? null,
        ),
      ),
      // Level can indicate success/error based on status code
      level: (attributes["error.message"] ? "ERROR" : "DEFAULT") as any,
      statusMessage: span.status.message,
      metadata: extractMetadata(attributes), // Extract remaining attributes
    };

    this.logDebug(`Creating Langfuse span ${spanData.id} for trace ${traceId}`, spanData);
    this.langfuse.span(spanData);
  }

  private processSpanAsLangfuseGeneration(traceId: string, span: ReadableSpan): void {
    const spanContext = span.spanContext();
    const attributes = span.attributes;
    const parentObservationId = this.getParentSpanId(span);

    const usage: {
      input?: number;
      output?: number;
      total?: number;
      unit?: "TOKENS";
    } = {};
    // Prefer gen_ai/ai.*; fallback to core usage.*
    const inputTokens =
      attributes["gen_ai.usage.prompt_tokens"] ?? attributes["usage.prompt_tokens"];
    const outputTokens =
      attributes["gen_ai.usage.completion_tokens"] ?? attributes["usage.completion_tokens"];
    const totalTokens = attributes["ai.usage.tokens"] ?? attributes["usage.total_tokens"];
    if (inputTokens != null) usage.input = Number(inputTokens);
    if (outputTokens != null) usage.output = Number(outputTokens);
    if (totalTokens != null) usage.total = Number(totalTokens);
    if (usage.input != null || usage.output != null || usage.total != null) usage.unit = "TOKENS"; // Set unit if any token count exists

    // Model
    const model = String(attributes["ai.model.name"] ?? "unknown");
    const modelParameters: Record<string, any> = {};
    // Extract known parameters directly (gen_ai.* first, then core ai.model.*)
    if (attributes["gen_ai.request.temperature"] != null) {
      modelParameters.temperature = Number(attributes["gen_ai.request.temperature"]);
    } else if (attributes["ai.model.temperature"] != null) {
      modelParameters.temperature = Number(attributes["ai.model.temperature"]);
    }
    if (attributes["gen_ai.request.max_tokens"] != null) {
      modelParameters.max_tokens = Number(attributes["gen_ai.request.max_tokens"]);
    } else if (attributes["ai.model.max_tokens"] != null) {
      modelParameters.max_tokens = Number(attributes["ai.model.max_tokens"]);
    }
    if (attributes["gen_ai.request.top_p"] != null) {
      modelParameters.top_p = Number(attributes["gen_ai.request.top_p"]);
    } else if (attributes["ai.model.top_p"] != null) {
      modelParameters.top_p = Number(attributes["ai.model.top_p"]);
    }
    const finishReason = String(
      attributes["ai.response.finishReason"] ?? attributes["gen_ai.finishReason"] ?? "",
    );
    if (finishReason) modelParameters.finish_reason = finishReason;

    let completionStartTime: Date | undefined;
    const msToFirstChunk =
      attributes["ai.response.msToFirstChunk"] ?? attributes["ai.stream.msToFirstChunk"];
    if (msToFirstChunk != null) {
      const ms = Number(msToFirstChunk);
      if (!Number.isNaN(ms)) {
        completionStartTime = new Date(this.hrTimeToDate(span.startTime).getTime() + ms);
      }
    }

    const metadata = extractMetadata(attributes);

    const generationData = {
      traceId,
      parentObservationId,
      id: spanContext.spanId,
      name: span.name, // Use original span name
      startTime: this.hrTimeToDate(span.startTime),
      endTime: this.hrTimeToDate(span.endTime),
      completionStartTime: completionStartTime,
      model: model,
      modelParameters: Object.keys(modelParameters).length > 0 ? modelParameters : undefined,
      usage: usage.unit ? usage : undefined, // Only add usage if unit is set
      // Prefer ai.* fields; fallback to generic input/output set by @voltagent/core
      input: safeJsonParse(String(attributes["ai.prompt.messages"] ?? attributes?.input ?? null)),
      output: safeJsonParse(String(attributes["ai.response.text"] ?? attributes?.output ?? null)),
      level: (metadata.originalError || attributes["error.message"] ? "ERROR" : "DEFAULT") as
        | "DEFAULT"
        | "ERROR"
        | "DEBUG"
        | "WARNING",
      statusMessage: span.status.message,
      metadata: metadata, // Extract remaining attributes
    };

    this.logDebug(
      `Creating Langfuse generation ${generationData.id} for trace ${traceId}`,
      generationData,
    );
    this.langfuse.generation(generationData);
  }

  private logDebug(message: string, ...args: any[]): void {
    if (!this.debug) {
      return;
    }
    const timestamp = new Date().toISOString();
    // Avoid stringifying large objects in logs if possible
    console.log(`[${timestamp}] [LangfuseExporter] ${message}`, args.length > 0 ? args : "");
  }

  // Helper to get parentSpanId consistently across OTEL versions
  private getParentSpanId(span: ReadableSpan): string | undefined {
    if ("parentSpanId" in span && span.parentSpanId) {
      return span.parentSpanId as string;
    }
    // Check legacy parentSpanContext
    return span.parentSpanContext?.spanId;
  }

  // Convert OTEL High-Resolution Time to Date object
  private hrTimeToDate(hrtime: [number, number]): Date {
    if (
      !Array.isArray(hrtime) ||
      hrtime.length !== 2 ||
      typeof hrtime[0] !== "number" ||
      typeof hrtime[1] !== "number"
    ) {
      this.logDebug("Invalid hrtime input received:", hrtime);
      return new Date(); // Fallback
    }
    const epochMillis = hrtime[0] * 1000 + hrtime[1] / 1e6;
    return new Date(epochMillis);
  }

  async forceFlush(): Promise<void> {
    this.logDebug("Forcing flush...");
    await this.langfuse.flushAsync();
    this.logDebug("Flush completed.");
  }

  async shutdown(): Promise<void> {
    this.logDebug("Shutting down exporter...");
    await this.langfuse.shutdownAsync();
    this.logDebug("Exporter shut down.");
  }
}
