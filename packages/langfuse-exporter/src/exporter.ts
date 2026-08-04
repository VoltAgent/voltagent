import {
  LangfuseSpanProcessor as LangfuseOtelSpanProcessor,
  isDefaultExportSpan,
  type LangfuseSpanProcessorParams,
} from "@langfuse/otel";
import type { Context } from "@opentelemetry/api";
import type { Span, SpanProcessor, ReadableSpan } from "@opentelemetry/sdk-trace-base";

// Re-export for convenience
export type { LangfuseSpanProcessorParams } from "@langfuse/otel";

/**
 * Options for the VoltAgentLangfuseProcessor.
 *
 * Extends the standard LangfuseSpanProcessor params from @langfuse/otel.
 * The `shouldExportSpan` option, when provided, is composed with the
 * VoltAgent scope check so that VoltAgent spans are always exported
 * alongside whatever the custom predicate allows.
 */
export interface VoltAgentLangfuseProcessorOptions extends LangfuseSpanProcessorParams {}

// --- Attribute normalisation ---

/**
 * Normalise VoltAgent / Vercel-AI-SDK style attributes to standard
 * OpenTelemetry `gen_ai.*` semantic conventions and Langfuse v5
 * observation attributes.
 *
 * Mutates the span in place via `setAttribute`.
 */
function normalizeVoltAgentAttributes(span: Span | ReadableSpan): void {
  const attrs = span.attributes;

  // -- ai.* -> gen_ai.* (LLM / generation attributes) --
  const aiToGenAi: Record<string, string> = {
    "ai.model.name": "gen_ai.request.model",
    "ai.model.id": "gen_ai.request.model",
    "ai.response.text": "gen_ai.output.text",
    "ai.response.finishReason": "gen_ai.response.finish_reasons",
    "ai.response.msToFirstChunk": "gen_ai.response.time_to_first_token_ms",
    "ai.stream.msToFirstChunk": "gen_ai.response.time_to_first_token_ms",
    "ai.prompt.messages": "gen_ai.input.messages",
    "ai.prompt": "gen_ai.prompt",
  };

  for (const [from, to] of Object.entries(aiToGenAi)) {
    const val = attrs[from];
    if (val != null) {
      span.setAttribute(to, val as string | number);
    }
  }

  // -- usage.* / ai.usage.* -> gen_ai.usage.* --
  const usageMap: Record<string, string> = {
    "ai.usage.tokens": "gen_ai.usage.total_tokens",
    "ai.usage.promptTokens": "gen_ai.usage.input_tokens",
    "ai.usage.completionTokens": "gen_ai.usage.output_tokens",
    "usage.prompt_tokens": "gen_ai.usage.input_tokens",
    "usage.completion_tokens": "gen_ai.usage.output_tokens",
    "usage.total_tokens": "gen_ai.usage.total_tokens",
  };

  for (const [from, to] of Object.entries(usageMap)) {
    const val = attrs[from];
    if (val != null) {
      span.setAttribute(to, Number(val));
    }
  }

  // -- gen_ai.usage.prompt/completion_tokens -> input/output (v5 convention) --
  const promptTokens = attrs["gen_ai.usage.prompt_tokens"];
  if (promptTokens != null && attrs["gen_ai.usage.input_tokens"] == null) {
    span.setAttribute("gen_ai.usage.input_tokens", Number(promptTokens));
  }
  const completionTokens = attrs["gen_ai.usage.completion_tokens"];
  if (completionTokens != null && attrs["gen_ai.usage.output_tokens"] == null) {
    span.setAttribute("gen_ai.usage.output_tokens", Number(completionTokens));
  }

  // -- System attributes -> standard OTel conventions --
  const sysMap: Record<string, string> = {
    "enduser.id": "user.id",
    "conversation.id": "session.id",
  };

  for (const [from, to] of Object.entries(sysMap)) {
    const val = attrs[from];
    if (val != null && attrs[to] == null) {
      span.setAttribute(to, val as string);
    }
  }
}

// --- shouldExportSpan filter ---

/**
 * Returns true if the span belongs to a VoltAgent instrumentation scope.
 *
 * Covers both the legacy `"ai"` scope (Vercel AI SDK used by VoltAgent)
 * and any scope prefixed with `"voltagent."`.
 */
function isVoltAgentScope(span: ReadableSpan): boolean {
  const scope = span.instrumentationScope.name;
  return scope === "ai" || scope.startsWith("voltagent.");
}

// --- Processor ---

/**
 * A thin wrapper around {@link LangfuseOtelSpanProcessor} from `@langfuse/otel`
 * that normalises VoltAgent's custom `ai.*` / `usage.*` attributes to standard
 * `gen_ai.*` semantic conventions before they reach the Langfuse OTel pipeline.
 *
 * The wrapper also ensures VoltAgent-scoped spans are always exported by
 * composing a VoltAgent scope check with the default (or user-supplied)
 * `shouldExportSpan` predicate.
 *
 * @example
 * ```ts
 * import { VoltAgentLangfuseProcessor } from "@voltagent/langfuse-exporter";
 *
 * const processor = new VoltAgentLangfuseProcessor({
 *   publicKey: "pk-...",
 *   secretKey: "sk-...",
 *   baseUrl: "https://cloud.langfuse.com",
 * });
 * ```
 */
export class VoltAgentLangfuseProcessor implements SpanProcessor {
  private readonly inner: LangfuseOtelSpanProcessor;

  constructor(options: VoltAgentLangfuseProcessorOptions = {}) {
    // Compose the VoltAgent scope check with the caller's predicate (if any)
    // so VoltAgent spans are always included in the export.
    const userFilter = options.shouldExportSpan;

    const composedFilter = userFilter
      ? ({ otelSpan }: { otelSpan: ReadableSpan }) =>
          isVoltAgentScope(otelSpan) || userFilter({ otelSpan })
      : ({ otelSpan }: { otelSpan: ReadableSpan }) =>
          isVoltAgentScope(otelSpan) || isDefaultExportSpan(otelSpan);

    this.inner = new LangfuseOtelSpanProcessor({
      ...options,
      shouldExportSpan: composedFilter,
    });
  }

  /**
   * Normalise VoltAgent attributes and delegate to the inner processor.
   */
  onStart(span: Span, parentContext: Context): void {
    normalizeVoltAgentAttributes(span);
    this.inner.onStart(span, parentContext);
  }

  /**
   * Normalise attributes again (belt-and-suspenders for spans whose
   * attributes may have been set after onStart) and delegate.
   */
  onEnd(span: ReadableSpan): void {
    normalizeVoltAgentAttributes(span);
    this.inner.onEnd(span);
  }

  async forceFlush(): Promise<void> {
    return this.inner.forceFlush();
  }

  async shutdown(): Promise<void> {
    return this.inner.shutdown();
  }
}
