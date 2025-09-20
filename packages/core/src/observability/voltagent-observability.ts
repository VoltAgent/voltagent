/**
 * VoltAgentObservability
 *
 * Main observability class that wraps OpenTelemetry's NodeTracerProvider
 * and configures it with VoltAgent-specific processors and exporters.
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
import { getGlobalLogger } from "../logger";
import { InMemoryStorageAdapter } from "./adapters/in-memory-adapter";
import { RemoteLogProcessor, StorageLogProcessor, WebSocketLogProcessor } from "./logs";
import { LazyRemoteExportProcessor } from "./processors/lazy-remote-export-processor";
import { LocalStorageSpanProcessor } from "./processors/local-storage-span-processor";
import { SamplingWrapperProcessor } from "./processors/sampling-wrapper-processor";
import { type SpanFilterOptions, SpanFilterProcessor } from "./processors/span-filter-processor";
import { WebSocketSpanProcessor } from "./processors/websocket-span-processor";
import type { ObservabilityConfig, ObservabilityStorageAdapter } from "./types";

/**
 * VoltAgent Observability wrapper around OpenTelemetry
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

    // Initialize provider with processors (supported by our OTEL version)
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

    // Setup LoggerProvider with the same resource and processors (supported by our OTEL version)
    this.loggerProvider = new LoggerProvider({
      resource,
      processors: logProcessors as any,
    });

    // Set as global provider so logs API works immediately (even without Pino bridge)
    logs.setGlobalLoggerProvider(this.loggerProvider);

    // Store LoggerProvider globally for Pino to use
    // @ts-expect-error - globalThis is not typed for our custom property
    globalThis.___voltagent_otel_logger_provider = this.loggerProvider;

    // Also store the OpenTelemetry API for Pino to access trace context
    // @ts-expect-error - globalThis is not typed for our custom property
    globalThis.___voltagent_otel_api = {
      trace,
      context,
    };

    // Try to initialize Pino OpenTelemetry bridge if @voltagent/logger is available
    this.tryInitializePinoBridge();
  }

  /**
   * Set up span processors
   */
  private setupProcessors(): SpanProcessor[] {
    const processors: SpanProcessor[] = [];

    // Add WebSocket processor (always enabled)
    this.websocketProcessor = new WebSocketSpanProcessor(true);
    processors.push(this.applySpanFilter(this.websocketProcessor));

    // Add local storage processor
    this.localStorageProcessor = new LocalStorageSpanProcessor(this.storage);
    processors.push(this.applySpanFilter(this.localStorageProcessor));

    // Add lazy remote export to VoltOps (enabled by default)
    // This processor will initialize itself when VoltOpsClient becomes available
    // Users can disable by setting voltOpsSync: { sampling: { strategy: 'never' } }
    const samplingStrategy = this.config.voltOpsSync?.sampling?.strategy || "always";

    if (samplingStrategy !== "never") {
      const lazyProcessor = new LazyRemoteExportProcessor({
        maxQueueSize: this.config.voltOpsSync?.maxQueueSize,
        maxExportBatchSize: this.config.voltOpsSync?.maxExportBatchSize,
        scheduledDelayMillis: this.config.voltOpsSync?.scheduledDelayMillis,
        exportTimeoutMillis: this.config.voltOpsSync?.exportTimeoutMillis,
        logger: this.logger,
      });

      // Wrap with sampling if not 'always'
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

    // Add custom processors
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

    // Avoid wrapping a SpanFilterProcessor multiple times
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

  /**
   * Try to initialize Pino OpenTelemetry bridge if available
   */
  private tryInitializePinoBridge(): void {
    // This is registered globally when @voltagent/logger is imported
    // @ts-expect-error - globalThis is not typed for our custom property
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

  /**
   * Set up log processors
   */
  private setupLogProcessors(): any[] {
    const processors: any[] = [];

    // Add storage processor
    processors.push(new StorageLogProcessor(this.storage));

    // Add WebSocket processor (always enabled)
    processors.push(new WebSocketLogProcessor());

    // Add remote export processor (enabled by default)
    // Users can disable by setting voltOpsSync: { sampling: { strategy: 'never' } }
    const samplingStrategy = this.config.voltOpsSync?.sampling?.strategy || "always";

    if (samplingStrategy !== "never") {
      processors.push(
        new RemoteLogProcessor({
          maxQueueSize: this.config.voltOpsSync?.maxQueueSize,
          maxExportBatchSize: this.config.voltOpsSync?.maxExportBatchSize,
          scheduledDelayMillis: this.config.voltOpsSync?.scheduledDelayMillis,
          exportTimeoutMillis: this.config.voltOpsSync?.exportTimeoutMillis,
          logger: this.logger,
          // Pass sampling config to filter logs based on trace sampling
          samplingConfig: this.config.voltOpsSync?.sampling,
        }),
      );
    }

    // Add custom log processors
    if (this.config.logProcessors) {
      processors.push(...this.config.logProcessors);
    }

    return processors;
  }

  /**
   * Get the OpenTelemetry tracer
   */
  getTracer(): Tracer {
    return this.tracer;
  }

  /**
   * Get the LoggerProvider for logs integration
   */
  getLoggerProvider(): LoggerProvider {
    return this.loggerProvider;
  }

  /**
   * Get the storage adapter
   */
  getStorage(): ObservabilityStorageAdapter {
    return this.storage;
  }

  /**
   * Start a new span
   */
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

    // Add VoltAgent type if specified
    if (options?.type && spanOptions.attributes) {
      spanOptions.attributes["voltagent.type"] = options.type;
    }

    return this.tracer.startSpan(name, spanOptions);
  }

  /**
   * Start an active span (sets it as the current span in context)
   */
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

    // Add VoltAgent type if specified
    if (options?.type && spanOptions.attributes) {
      spanOptions.attributes["voltagent.type"] = options.type;
    }

    return this.tracer.startActiveSpan(name, spanOptions, fn);
  }

  /**
   * Get the current active span
   */
  getActiveSpan(): Span | undefined {
    return trace.getActiveSpan();
  }

  /**
   * Set attributes on the current span
   */
  setSpanAttributes(attributes: Record<string, any>): void {
    const span = this.getActiveSpan();
    if (span) {
      span.setAttributes(attributes);
    }
  }

  /**
   * Add an event to the current span
   */
  addSpanEvent(name: string, attributes?: Record<string, any>): void {
    const span = this.getActiveSpan();
    if (span) {
      span.addEvent(name, attributes);
    }
  }

  /**
   * Set the status of the current span
   */
  setSpanStatus(code: SpanStatusCode, message?: string): void {
    const span = this.getActiveSpan();
    if (span) {
      span.setStatus({ code, message });
    }
  }

  /**
   * Record an exception on the current span
   */
  recordException(error: Error): void {
    const span = this.getActiveSpan();
    if (span) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    }
  }

  /**
   * Subscribe to WebSocket events
   */
  subscribeToWebSocketEvents(callback: (event: any) => void): (() => void) | undefined {
    if (this.websocketProcessor) {
      return WebSocketSpanProcessor.subscribe(callback);
    }
    return undefined;
  }

  /**
   * Get traces from storage
   */
  async getTraceFromStorage(traceId: string): Promise<any> {
    return this.storage.getTrace(traceId);
  }

  /**
   * Get a span from storage
   */
  async getSpan(spanId: string): Promise<any> {
    return this.storage.getSpan(spanId);
  }

  /**
   * Clean up old spans from storage
   */
  async cleanupOldSpans(beforeTimestamp: number): Promise<number> {
    return this.storage.deleteOldSpans(beforeTimestamp);
  }

  /**
   * Get logs from storage
   */
  async getLogsByTraceId(traceId: string): Promise<any[]> {
    return this.storage.getLogsByTraceId(traceId);
  }

  /**
   * Get logs from storage by span ID
   */
  async getLogsBySpanId(spanId: string): Promise<any[]> {
    return this.storage.getLogsBySpanId(spanId);
  }

  /**
   * Shutdown the observability system
   */
  async shutdown(): Promise<void> {
    await this.provider.shutdown();
    await this.loggerProvider.shutdown();

    // Destroy in-memory storage if it's the default one
    if (this.storage instanceof InMemoryStorageAdapter) {
      (this.storage as InMemoryStorageAdapter).destroy();
    }
  }

  /**
   * Force flush all pending spans and logs
   */
  async forceFlush(): Promise<void> {
    await this.provider.forceFlush();
    await this.loggerProvider.forceFlush();
  }

  /**
   * Get provider for advanced usage
   */
  getProvider(): NodeTracerProvider {
    return this.provider;
  }

  /**
   * Get OpenTelemetry context API
   */
  getContext() {
    return context;
  }

  /**
   * Get OpenTelemetry trace API
   */
  getTraceAPI() {
    return trace;
  }

  /**
   * Get span kinds enum
   */
  getSpanKind() {
    return SpanKind;
  }

  /**
   * Get span status codes enum
   */
  getSpanStatusCode() {
    return SpanStatusCode;
  }
}
