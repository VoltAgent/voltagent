/**
 * Sampling Wrapper Processor
 *
 * Wraps another SpanProcessor and applies sampling logic to determine
 * which spans should be forwarded to the wrapped processor.
 *
 * This allows selective sampling for remote export while keeping all spans locally.
 */

import type { Context } from "@opentelemetry/api";
import {
  AlwaysOffSampler,
  AlwaysOnSampler,
  ParentBasedSampler,
  type ReadableSpan,
  type Sampler,
  type Span,
  type SpanProcessor,
  TraceIdRatioBasedSampler,
} from "@opentelemetry/sdk-trace-base";
import type { ObservabilitySamplingConfig } from "../types";

/**
 * A SpanProcessor that wraps another processor and applies sampling
 */
export class SamplingWrapperProcessor implements SpanProcessor {
  private sampler: Sampler;
  private sampledSpans = new Set<string>();

  constructor(
    private wrappedProcessor: SpanProcessor,
    samplingConfig?: ObservabilitySamplingConfig,
  ) {
    // Initialize sampler based on strategy
    const strategy = samplingConfig?.strategy || "always";

    switch (strategy) {
      case "never":
        this.sampler = new AlwaysOffSampler();
        break;
      case "ratio": {
        const ratio = samplingConfig?.ratio ?? 1.0;
        this.sampler = new TraceIdRatioBasedSampler(ratio);
        break;
      }
      case "parent":
        this.sampler = new ParentBasedSampler({
          root: new TraceIdRatioBasedSampler(samplingConfig?.ratio ?? 1.0),
        });
        break;
      default:
        this.sampler = new AlwaysOnSampler();
        break;
    }
  }

  onStart(span: Span, parentContext: Context): void {
    // Check if this span should be sampled
    const samplingResult = this.sampler.shouldSample(
      parentContext,
      span.spanContext().traceId,
      span.name,
      span.kind,
      span.attributes,
      span.links,
    );

    // If sampled, forward to wrapped processor and track it
    if (samplingResult.decision === 1 /* RECORD_AND_SAMPLED */) {
      this.sampledSpans.add(span.spanContext().spanId);
      this.wrappedProcessor.onStart(span, parentContext);
    }
  }

  onEnd(span: ReadableSpan): void {
    // Only forward to wrapped processor if this span was sampled
    if (this.sampledSpans.has(span.spanContext().spanId)) {
      this.sampledSpans.delete(span.spanContext().spanId);
      this.wrappedProcessor.onEnd(span);
    }
  }

  async shutdown(): Promise<void> {
    this.sampledSpans.clear();
    return this.wrappedProcessor.shutdown();
  }

  async forceFlush(): Promise<void> {
    return this.wrappedProcessor.forceFlush();
  }
}
