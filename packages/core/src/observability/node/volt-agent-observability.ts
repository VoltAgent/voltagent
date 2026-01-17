/**
 * VoltAgentObservability (Node runtime)
 *
 * Wraps OpenTelemetry's NodeTracerProvider and configures VoltAgent-specific
 * processors/exporters. This retains the existing Node behavior.
 */

import { SpanKind, SpanStatusCode, context, trace } from "@opentelemetry/api";
import type { Span, SpanOptions, Tracer } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import { defaultResource, resourceFromAttributes } from "@opentelemetry/resources";
import { LoggerProvider } from "@opentelemetry/sdk-logs";
import type { SpanProcessor } from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";

import type { Logger } from "@voltagent/internal";
import { getGlobalLogger } from "../../logger";
import { InMemoryStorageAdapter } from "../adapters/in-memory-adapter";
import { RemoteLogProcessor, StorageLogProcessor, WebSocketLogProcessor } from "../logs";
import { LazyRemoteExportProcessor } from "../processors/lazy-remote-export-processor";
import { LocalStorageSpanProcessor } from "../processors/local-storage-span-processor";
import { SamplingWrapperProcessor } from "../processors/sampling-wrapper-processor";
import { type SpanFilterOptions, SpanFilterProcessor } from "../processors/span-filter-processor";
import { WebSocketSpanProcessor } from "../processors/websocket-span-processor";
import type { ObservabilityConfig, ObservabilityStorageAdapter } from "../types";

/**
 * VoltAgent Observability wrapper around OpenTelemetry for Node
 */
export class VoltAgentObservability {
  private provider: NodeTracerProvider;
  private loggerProvider: LoggerProvider;
  private tracer: Tracer;
  private storage: ObservabilityStorageAdapter;
  private websocketProcessor?: WebSocketSpanProcessor;
  private localStorageProcessor?: LocalStorageSpanProcessor;
  private config: ObservabilityConfig;
  private logger: Logger;
  private spanFilterOptions?: SpanFilterOptions;
  private instrumentationScopeName: string;
  private flushLock: Promise<void> = Promise.resolve();

  constructor(config: ObservabilityConfig = {}) {
    this.config = config;
    this.logger = getGlobalLogger();
    this.instrumentationScopeName = config.instrumentationScopeName || "@voltagent/core";
    this.spanFilterOptions = this.resolveSpanFilterOptions();

    if (this.spanFilterOptions) {
      const scopes = this.spanFilterOptions.allowedInstrumentationScopes ?? [];
      const services = this.spanFilterOptions.allowedServiceNames ?? [];
      const parts = [] as string[];
      if (scopes.length > 0) {
        parts.push(`instrumentation scopes [${scopes.join(", ")}]`);
      }
      if (services.length > 0) {
        parts.push(`service.name values [${services.join(", ")}]`);
      }
      this.logger.trace(
        `[VoltAgent] Observability span filtering active for ${parts.join(" and ")}`,
      );
    } else {
      this.logger.trace("[VoltAgent] Observability span filtering disabled");
    }

    // Initialize storage
    this.storage =
      config.storage ||
      new InMemoryStorageAdapter({
        maxSpans: 10000,
        cleanupIntervalMs: 60000, // Clean up every minute
      });

    // Create resource with service information
    const resource = defaultResource().merge(
      resourceFromAttributes({
        [ATTR_SERVICE_NAME]: config.serviceName || "voltagent",
        [ATTR_SERVICE_VERSION]: config.serviceVersion || "1.0.0",
        ...config.resourceAttributes,
      }),
    );

    // Setup processors and initialize tracer provider
    const spanProcessors = this.setupProcessors();

    this.provider = new NodeTracerProvider({
      resource,
      spanProcessors,
    });

    // Register the provider
    this.provider.register();

    // Get tracer
    this.tracer = trace.getTracer(this.instrumentationScopeName, config.serviceVersion || "1.0.0");

    // Setup log processors
    const logProcessors = this.setupLogProcessors();

    this.loggerProvider = new LoggerProvider({
      resource,
      processors: logProcessors as any,
    });

    // Set as global provider so logs API works immediately
    logs.setGlobalLoggerProvider(this.loggerProvider);

    // Store LoggerProvider globally for Pino bridge to consume
    // @ts-expect-error custom global marker
    globalThis.___voltagent_otel_logger_provider = this.loggerProvider;
    // @ts-expect-error custom global marker
    globalThis.___voltagent_otel_api = {
      trace,
      context,
    };

    this.tryInitializePinoBridge();
  }

  /**
   * Set up span processors
   */
  private setupProcessors(): SpanProcessor[] {
    const processors: SpanProcessor[] = [];

    this.websocketProcessor = new WebSocketSpanProcessor(true);
    processors.push(this.applySpanFilter(this.websocketProcessor));

    this.localStorageProcessor = new LocalStorageSpanProcessor(this.storage);
    processors.push(this.applySpanFilter(this.localStorageProcessor));

    const samplingStrategy = this.config.voltOpsSync?.sampling?.strategy || "always";
    if (samplingStrategy !== "never") {
      const lazyProcessor = new LazyRemoteExportProcessor({
        maxQueueSize: this.config.voltOpsSync?.maxQueueSize,
        maxExportBatchSize: this.config.voltOpsSync?.maxExportBatchSize,
        scheduledDelayMillis: this.config.voltOpsSync?.scheduledDelayMillis,
        exportTimeoutMillis: this.config.voltOpsSync?.exportTimeoutMillis,
        logger: this.logger,
      });

      const finalProcessor =
        samplingStrategy === "always"
          ? lazyProcessor
          : new SamplingWrapperProcessor(lazyProcessor, this.config.voltOpsSync?.sampling);

      processors.push(this.applySpanFilter(finalProcessor));

      this.logger.debug(
        `[VoltAgent] VoltOps sync enabled with ${samplingStrategy} sampling strategy`,
      );
      if (samplingStrategy === "ratio") {
        this.logger.debug(
          `[VoltAgent] Sampling ratio: ${this.config.voltOpsSync?.sampling?.ratio ?? 1.0}`,
        );
      }
    }

    if (this.config.spanProcessors) {
      processors.push(
        ...this.config.spanProcessors.map((processor) => this.applySpanFilter(processor)),
      );
    }

    return processors;
  }

  private applySpanFilter(processor: SpanProcessor): SpanProcessor {
    if (!this.spanFilterOptions) {
      return processor;
    }

    if (processor instanceof SpanFilterProcessor) {
      return processor;
    }

    return new SpanFilterProcessor(processor, this.spanFilterOptions);
  }

  private resolveSpanFilterOptions(): SpanFilterOptions | undefined {
    const filterConfig = this.config.spanFilters;

    if (filterConfig?.enabled === false) {
      return undefined;
    }

    const instrumentationScopes = filterConfig?.instrumentationScopeNames ?? [
      this.instrumentationScopeName,
    ];
    const serviceNames = filterConfig?.serviceNames;

    const options: SpanFilterOptions = {};

    if (instrumentationScopes && instrumentationScopes.length > 0) {
      options.allowedInstrumentationScopes = instrumentationScopes;
    }

    if (serviceNames && serviceNames.length > 0) {
      options.allowedServiceNames = serviceNames;
    }

    if (!options.allowedInstrumentationScopes && !options.allowedServiceNames) {
      return undefined;
    }

    return options;
  }

  private tryInitializePinoBridge(): void {
    // @ts-expect-error custom global marker
    const bridgeInitializer = globalThis.___voltagent_init_pino_otel_bridge;

    if (typeof bridgeInitializer === "function") {
      try {
        bridgeInitializer(this.loggerProvider);
      } catch (error) {
        this.logger.error("[VoltAgentObservability] Failed to initialize Pino bridge", { error });
      }
    } else {
      this.logger.trace("[VoltAgentObservability] Pino OpenTelemetry bridge not available");
    }
  }

  private setupLogProcessors(): any[] {
    const processors: any[] = [];

    processors.push(new StorageLogProcessor(this.storage));
    processors.push(new WebSocketLogProcessor());

    const samplingStrategy = this.config.voltOpsSync?.sampling?.strategy || "always";
    if (samplingStrategy !== "never") {
      processors.push(
        new RemoteLogProcessor({
          maxQueueSize: this.config.voltOpsSync?.maxQueueSize,
          maxExportBatchSize: this.config.voltOpsSync?.maxExportBatchSize,
          scheduledDelayMillis: this.config.voltOpsSync?.scheduledDelayMillis,
          exportTimeoutMillis: this.config.voltOpsSync?.exportTimeoutMillis,
          samplingConfig: this.config.voltOpsSync?.sampling,
        }),
      );
    }

    if (this.config.logProcessors) {
      processors.push(...this.config.logProcessors);
    }

    return processors;
  }

  getTracer(): Tracer {
    return this.tracer;
  }

  getLoggerProvider(): LoggerProvider {
    return this.loggerProvider;
  }

  getStorage(): ObservabilityStorageAdapter {
    return this.storage;
  }

  startSpan(
    name: string,
    options?: SpanOptions & {
      type?: string;
      attributes?: Record<string, any>;
    },
  ): Span {
    const spanOptions: SpanOptions = {
      ...options,
      attributes: {
        ...options?.attributes,
      },
    };

    if (options?.type && spanOptions.attributes) {
      spanOptions.attributes["voltagent.type"] = options.type;
    }

    return this.tracer.startSpan(name, spanOptions);
  }

  startActiveSpan<T>(
    name: string,
    options: SpanOptions & {
      type?: string;
      attributes?: Record<string, any>;
    },
    fn: (span: Span) => T,
  ): T {
    const spanOptions: SpanOptions = {
      ...options,
      attributes: {
        ...options?.attributes,
      },
    };

    if (options?.type && spanOptions.attributes) {
      spanOptions.attributes["voltagent.type"] = options.type;
    }

    return this.tracer.startActiveSpan(name, spanOptions, fn);
  }

  getActiveSpan(): Span | undefined {
    return trace.getActiveSpan();
  }

  setSpanAttributes(attributes: Record<string, any>): void {
    const span = this.getActiveSpan();
    if (span) {
      span.setAttributes(attributes);
    }
  }

  addSpanEvent(name: string, attributes?: Record<string, any>): void {
    const span = this.getActiveSpan();
    if (span) {
      span.addEvent(name, attributes);
    }
  }

  setSpanStatus(code: SpanStatusCode, message?: string): void {
    const span = this.getActiveSpan();
    if (span) {
      span.setStatus({ code, message });
    }
  }

  recordException(error: Error): void {
    const span = this.getActiveSpan();
    if (span) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    }
  }

  subscribeToWebSocketEvents(callback: (event: any) => void): (() => void) | undefined {
    if (this.websocketProcessor) {
      return WebSocketSpanProcessor.subscribe(callback);
    }
    return undefined;
  }

  async getTraceFromStorage(traceId: string): Promise<any> {
    return this.storage.getTrace(traceId);
  }

  async getSpan(spanId: string): Promise<any> {
    return this.storage.getSpan(spanId);
  }

  async cleanupOldSpans(beforeTimestamp: number): Promise<number> {
    return this.storage.deleteOldSpans(beforeTimestamp);
  }

  async getLogsByTraceId(traceId: string): Promise<any[]> {
    return this.storage.getLogsByTraceId(traceId);
  }

  async getLogsBySpanId(spanId: string): Promise<any[]> {
    return this.storage.getLogsBySpanId(spanId);
  }

  async shutdown(): Promise<void> {
    await this.provider.shutdown();
    await this.loggerProvider.shutdown();

    if (this.storage instanceof InMemoryStorageAdapter) {
      (this.storage as InMemoryStorageAdapter).destroy();
    }
  }

  async forceFlush(): Promise<void> {
    await this.provider.forceFlush();
    await this.loggerProvider.forceFlush();
  }

  /**
   * Flushes spans on finish.
   * We force flush here to ensure spans are exported even if the runtime
   * is incorrectly detected or if we are in a short-lived process.
   */
  async flushOnFinish(): Promise<void> {
    if (!this.shouldFlushOnFinish()) {
      return;
    }
    await this.withFlushLock(async () => {
      await this.forceFlush();
    });
  }

  private shouldFlushOnFinish(): boolean {
    const strategy = this.config.flushOnFinishStrategy ?? "auto";
    if (strategy === "never") {
      return false;
    }
    if (strategy === "always") {
      return true;
    }
    return false;
  }

  private async withFlushLock<T>(fn: () => Promise<T>): Promise<T> {
    const previous = this.flushLock;
    let release!: () => void;
    this.flushLock = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  }

  getProvider(): NodeTracerProvider {
    return this.provider;
  }

  getContext(): typeof context {
    return context;
  }

  getTraceAPI(): typeof trace {
    return trace;
  }

  getSpanKind() {
    return SpanKind;
  }

  getSpanStatusCode() {
    return SpanStatusCode;
  }
}

export { VoltAgentObservability as default };
