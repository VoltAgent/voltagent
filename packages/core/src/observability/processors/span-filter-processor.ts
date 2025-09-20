/**
 * SpanFilterProcessor
 *
 * Wraps another SpanProcessor and ensures only spans that match the
 * configured filter are forwarded. This prevents VoltAgent's
 * observability pipeline from processing spans that originate from
 * unrelated OpenTelemetry instrumentation.
 */

import type { Context } from "@opentelemetry/api";
import type { ReadableSpan, Span as SDKSpan, SpanProcessor } from "@opentelemetry/sdk-trace-base";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

/**
 * Configuration for SpanFilterProcessor
 */
export interface SpanFilterOptions {
  allowedServiceNames?: string[];
  allowedInstrumentationScopes?: string[];
  predicate?: (span: SDKSpan | ReadableSpan) => boolean;
}

/**
 * SpanProcessor wrapper that filters spans before delegating
 */
export class SpanFilterProcessor implements SpanProcessor {
  private readonly allowedServiceNames?: Set<string>;
  private readonly allowedInstrumentationScopes?: Set<string>;

  constructor(
    private readonly delegate: SpanProcessor,
    private readonly options: SpanFilterOptions = {},
  ) {
    if (options.allowedServiceNames && options.allowedServiceNames.length > 0) {
      this.allowedServiceNames = new Set(options.allowedServiceNames);
    }

    if (options.allowedInstrumentationScopes && options.allowedInstrumentationScopes.length > 0) {
      this.allowedInstrumentationScopes = new Set(options.allowedInstrumentationScopes);
    }
  }

  onStart(span: SDKSpan, parentContext: Context): void {
    if (this.shouldProcess(span)) {
      this.delegate.onStart(span, parentContext);
    }
  }

  onEnd(span: ReadableSpan): void {
    if (this.shouldProcess(span)) {
      this.delegate.onEnd(span);
    }
  }

  async shutdown(): Promise<void> {
    await this.delegate.shutdown();
  }

  async forceFlush(): Promise<void> {
    await this.delegate.forceFlush();
  }

  private shouldProcess(span: SDKSpan | ReadableSpan): boolean {
    if (this.options.predicate) {
      return this.options.predicate(span);
    }

    if (this.allowedInstrumentationScopes) {
      const scopeName = this.extractInstrumentationScopeName(span);
      if (!scopeName || !this.allowedInstrumentationScopes.has(scopeName)) {
        return false;
      }
    }

    if (!this.allowedServiceNames) {
      return true;
    }

    const serviceName = this.extractServiceName(span);
    return serviceName !== undefined && this.allowedServiceNames.has(serviceName);
  }

  private extractInstrumentationScopeName(span: SDKSpan | ReadableSpan): string | undefined {
    const scope = (span as ReadableSpan).instrumentationScope ?? (span as any).instrumentationScope;
    const value = scope?.name;
    return typeof value === "string" ? value : undefined;
  }

  private extractServiceName(span: SDKSpan | ReadableSpan): string | undefined {
    const resource = (span as ReadableSpan).resource ?? (span as any).resource;
    const attributes = resource?.attributes as Record<string, unknown> | undefined;
    const value = attributes?.[ATTR_SERVICE_NAME];

    return typeof value === "string" ? value : undefined;
  }
}
