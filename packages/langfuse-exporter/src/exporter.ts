import {
  LangfuseSpanProcessor as LangfuseOtelSpanProcessor,
  type LangfuseSpanProcessorParams,
  isDefaultExportSpan,
} from "@langfuse/otel";
import type { Context } from "@opentelemetry/api";
import type { ReadableSpan, Span, SpanProcessor } from "@opentelemetry/sdk-trace-base";

// Re-export for convenience
export type { LangfuseSpanProcessorParams } from "@langfuse/otel";

/**
 * Options for the VoltAgentLangfuseProcessor.
 *
 * Extends the standard LangfuseSpanProcessor params from @langfuse/otel.
 *
 * `shouldExportSpan`, when provided, fully overrides the built-in filter —
 * exactly as it does on `LangfuseSpanProcessor` itself. When it is omitted,
 * a default filter is applied that exports VoltAgent-scoped spans in addition
 * to everything `isDefaultExportSpan` already allows (Langfuse spans, spans
 * carrying `gen_ai.*` attributes, and spans from known LLM instrumentors).
 */
export interface VoltAgentLangfuseProcessorOptions extends LangfuseSpanProcessorParams {}

// --- Instrumentation scopes ---

/**
 * Scope used by VoltAgent's own tracer when no custom
 * `instrumentationScopeName` is configured on `VoltAgentObservability`.
 *
 * @see packages/core/src/observability/node/volt-agent-observability.ts
 */
const VOLTAGENT_CORE_SCOPE = "@voltagent/core";

/**
 * Returns true if the span belongs to a VoltAgent instrumentation scope.
 *
 * Covers `@voltagent/core` (the default tracer scope used by
 * `VoltAgentObservability`) as well as the historical `voltagent.*` /
 * `voltagent-core` names.
 *
 * This is intentionally a superset of what `isDefaultExportSpan` matches:
 * `isDefaultExportSpan` only knows the scopes in
 * `KNOWN_LLM_INSTRUMENTATION_SCOPE_PREFIXES`, which does **not** include
 * `@voltagent/core`. Without this check, ordinary VoltAgent agent/workflow
 * spans would be silently dropped by the processor.
 */
function isVoltAgentScope(span: ReadableSpan): boolean {
  const scope = span.instrumentationScope.name;

  return (
    scope === VOLTAGENT_CORE_SCOPE ||
    scope === "voltagent-core" ||
    scope.startsWith("@voltagent/") ||
    scope.startsWith("voltagent.")
  );
}

// --- Attribute normalisation ---

type AttributeTarget = {
  attributes: Record<string, unknown>;
  /** Write a value, using `Span#setAttribute` when the span is still live. */
  set: (key: string, value: unknown) => void;
};

/**
 * Read the attribute map and a write function for the span.
 *
 * Writes go through `Span#setAttribute` while the span is live. Once the span
 * has ended it is only a `ReadableSpan`: it exposes the same mutable
 * `attributes` object (OTel keeps a single map for the span's lifetime) but no
 * `setAttribute` method, so the map is written to directly.
 */
function attributeTarget(span: Span | ReadableSpan): AttributeTarget {
  const attributes = span.attributes as Record<string, unknown>;
  const setter = (span as Partial<Span>).setAttribute;

  return {
    attributes,
    set:
      typeof setter === "function"
        ? (key, value) => {
            setter.call(span, key, value as string | number);
          }
        : (key, value) => {
            attributes[key] = value;
          },
  };
}

/**
 * VoltAgent stores trace tags in a couple of shapes depending on the code path:
 * `prompt.tags` as a JSON-encoded string, or `tags` as an array.
 *
 * Langfuse v5 reads tags from the `langfuse.trace.tags` span attribute.
 */
function readTags(attrs: Record<string, unknown>): string[] | undefined {
  const rawArray = attrs.tags;
  if (Array.isArray(rawArray)) {
    return rawArray.map(String);
  }

  const rawString = attrs["prompt.tags"];
  if (typeof rawString === "string") {
    try {
      const parsed: unknown = JSON.parse(rawString);
      if (Array.isArray(parsed)) {
        return parsed.map(String);
      }
    } catch {
      // Not JSON — treat the raw string as a single tag.
      return [rawString];
    }
  }

  return undefined;
}

/**
 * Normalise VoltAgent / Vercel-AI-SDK style attributes to standard
 * OpenTelemetry `gen_ai.*` semantic conventions and Langfuse v5
 * observation attributes.
 */
function normalizeVoltAgentAttributes(span: Span | ReadableSpan): void {
  const { attributes: attrs, set } = attributeTarget(span);

  // -- ai.* -> gen_ai.* (LLM / generation attributes) --
  //
  // `ai.model.name` and `ai.model.id` both target `gen_ai.request.model`.
  // A derived value is only written when the target is still unset, so an
  // upstream instrumentor's standard value is never clobbered and the result
  // does not depend on `Object.entries` iteration order.
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
    if (val != null && attrs[to] == null) {
      set(to, val);
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
    if (val != null && attrs[to] == null) {
      set(to, Number(val));
    }
  }

  // -- gen_ai.usage.prompt/completion_tokens -> input/output (v5 convention) --
  const promptTokens = attrs["gen_ai.usage.prompt_tokens"];
  if (promptTokens != null && attrs["gen_ai.usage.input_tokens"] == null) {
    set("gen_ai.usage.input_tokens", Number(promptTokens));
  }
  const completionTokens = attrs["gen_ai.usage.completion_tokens"];
  if (completionTokens != null && attrs["gen_ai.usage.output_tokens"] == null) {
    set("gen_ai.usage.output_tokens", Number(completionTokens));
  }

  // -- Trace tags -> langfuse.trace.tags (v5 convention) --
  if (attrs["langfuse.trace.tags"] == null) {
    const tags = readTags(attrs);
    if (tags) {
      set("langfuse.trace.tags", tags);
    }
  }

  // -- System attributes -> standard OTel conventions --
  const sysMap: Record<string, string> = {
    "enduser.id": "user.id",
    "conversation.id": "session.id",
  };

  for (const [from, to] of Object.entries(sysMap)) {
    const val = attrs[from];
    if (val != null && attrs[to] == null) {
      set(to, String(val));
    }
  }
}

// --- Processor ---

/**
 * A thin wrapper around {@link LangfuseOtelSpanProcessor} from `@langfuse/otel`
 * that normalises VoltAgent's custom `ai.*` / `usage.*` attributes to standard
 * `gen_ai.*` semantic conventions before they reach the Langfuse OTel pipeline,
 * and widens the default export filter to include VoltAgent-scoped spans.
 *
 * `shouldExportSpan` keeps the same semantics as `LangfuseSpanProcessor`:
 * supplying it replaces the built-in filter entirely.
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
    // VoltAgent's own tracer scope (`@voltagent/core`) is not covered by
    // `isDefaultExportSpan`, so the built-in filter has to be widened — but
    // only when the caller did not supply a filter of their own.
    //
    // A caller-supplied `shouldExportSpan` is treated as the override, matching
    // `LangfuseSpanProcessor` semantics. Forcing VoltAgent spans through it via
    // `||` would make the predicate unable to exclude anything.
    const userFilter = options.shouldExportSpan;

    const filter =
      userFilter ??
      (({ otelSpan }: { otelSpan: ReadableSpan }) =>
        isVoltAgentScope(otelSpan) || isDefaultExportSpan(otelSpan));

    this.inner = new LangfuseOtelSpanProcessor({
      ...options,
      shouldExportSpan: filter,
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
   * Normalise again for attributes set after `onStart`, then delegate.
   *
   * The span is only a `ReadableSpan` at this point, so derived values are
   * written straight into the (still mutable) attribute map.
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
