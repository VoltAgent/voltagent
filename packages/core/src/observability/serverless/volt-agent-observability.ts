/**
 * VoltAgentObservability (serverless runtime)
 *
 * Simplified observability pipeline for Workers/serverless runtimes. Uses
 * BasicTracerProvider and fetch-friendly processors only.
 */

import { SpanKind, SpanStatusCode, context, trace } from "@opentelemetry/api";
import type { Span, SpanOptions, Tracer } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import { ExportResultCode } from "@opentelemetry/core";
import { JsonLogsSerializer, JsonTraceSerializer } from "@opentelemetry/otlp-transformer";
import { type Resource, defaultResource, resourceFromAttributes } from "@opentelemetry/resources";
import {
  type LogRecordProcessor,
  LoggerProvider,
  type ReadableLogRecord,
  SimpleLogRecordProcessor,
} from "@opentelemetry/sdk-logs";
import {
  BasicTracerProvider,
  BatchSpanProcessor,
  type SpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";

import { AsyncHooksContextManager } from "@opentelemetry/context-async-hooks";
import { InMemoryStorageAdapter } from "../adapters/in-memory-adapter";
import { StorageLogProcessor, WebSocketLogProcessor } from "../logs";
import { LocalStorageSpanProcessor } from "../processors/local-storage-span-processor";
import { SamplingWrapperProcessor } from "../processors/sampling-wrapper-processor";
import { type SpanFilterOptions, SpanFilterProcessor } from "../processors/span-filter-processor";
import { WebSocketSpanProcessor } from "../processors/websocket-span-processor";
import type {
  ObservabilityConfig,
  ObservabilitySamplingConfig,
  ObservabilityStorageAdapter,
  ServerlessRemoteEndpointConfig,
  ServerlessRemoteExportConfig,
} from "../types";

const textDecoder = typeof TextDecoder !== "undefined" ? new TextDecoder() : undefined;

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
  typeof value === "object" && value !== null && typeof (value as any).then === "function";

const DEFAULT_MAX_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 500;
const RETRY_BACKOFF_FACTOR = 2;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type ObservabilityGlobals = typeof globalThis & {
  ___voltagent_otel_logger_provider?: LoggerProvider;
  ___voltagent_otel_api?: { trace: typeof trace; context: typeof context };
  ___voltagent_get_active_span?: () => Span | undefined;
  ___voltagent_push_span?: (span: Span) => void;
  ___voltagent_pop_span?: (span: Span) => void;
  ___voltagent_wait_until?: (promise: Promise<unknown>) => void;
};

export class ServerlessVoltAgentObservability {
  private provider: BasicTracerProvider;
  private loggerProvider: LoggerProvider;
  private tracer: Tracer;
  private storage: ObservabilityStorageAdapter;
  private websocketProcessor?: WebSocketSpanProcessor;
  private localStorageProcessor?: LocalStorageSpanProcessor;
  private config: ObservabilityConfig;
  private resource: Resource;
  private spanFilterOptions?: SpanFilterOptions;
  private instrumentationScopeName: string;
  private spanStack: Span[] = [];

  constructor(config: ObservabilityConfig = {}) {
    this.config = { ...config };
    this.instrumentationScopeName = config.instrumentationScopeName || "@voltagent/core";
    this.spanFilterOptions = this.resolveSpanFilterOptions();

    const defaultStorage =
      this.config.storage ??
      new InMemoryStorageAdapter({
        maxSpans: 5000,
        maxLogs: 10000,
      });

    this.storage = defaultStorage;
    this.config.storage = defaultStorage;

    this.resource = defaultResource().merge(
      resourceFromAttributes({
        [ATTR_SERVICE_NAME]: config.serviceName || "voltagent-serverless",
        [ATTR_SERVICE_VERSION]: config.serviceVersion || "1.0.0",
        ...config.resourceAttributes,
      }),
    );

    const { provider, tracer, loggerProvider } = this.initializeTelemetryPipeline();
    this.provider = provider;
    this.tracer = tracer;
    this.loggerProvider = loggerProvider;

    const globals = globalThis as ObservabilityGlobals;

    globals.___voltagent_otel_logger_provider = this.loggerProvider;
    globals.___voltagent_otel_api = { trace, context };

    const pushSpan = (span: Span) => {
      this.pushSpan(span);
    };
    const popSpan = (span: Span) => {
      this.popSpan(span);
    };

    globals.___voltagent_get_active_span = () =>
      this.spanStack.length > 0 ? this.spanStack[this.spanStack.length - 1] : undefined;
    globals.___voltagent_push_span = pushSpan;
    globals.___voltagent_pop_span = popSpan;
  }

  private setupProcessors(): SpanProcessor[] {
    const processors: SpanProcessor[] = [];

    let websocketProcessor = this.websocketProcessor;
    if (!websocketProcessor) {
      websocketProcessor = new WebSocketSpanProcessor(true);
      this.websocketProcessor = websocketProcessor;
    }
    processors.push(this.applySpanFilter(websocketProcessor));

    if (this.config.storage) {
      let localStorageProcessor = this.localStorageProcessor;
      if (!localStorageProcessor) {
        localStorageProcessor = new LocalStorageSpanProcessor(this.storage);
        this.localStorageProcessor = localStorageProcessor;
      }
      processors.push(this.applySpanFilter(localStorageProcessor));
    }

    if (this.config.serverlessRemote) {
      const remoteProcessor = createRemoteSpanProcessor(this.config.serverlessRemote);
      if (remoteProcessor) {
        processors.push(this.applySpanFilter(remoteProcessor));
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

  private setupLogProcessors(): LogRecordProcessor[] {
    const processors: LogRecordProcessor[] = [];
    if (this.config.storage) {
      processors.push(new StorageLogProcessor(this.storage));
    }
    processors.push(new WebSocketLogProcessor());

    if (this.config.serverlessRemote) {
      const remoteProcessor = createRemoteLogProcessor(this.config.serverlessRemote);
      if (remoteProcessor) {
        processors.push(remoteProcessor);
      }
    }

    if (this.config.logProcessors) {
      processors.push(...this.config.logProcessors);
    }

    return processors;
  }

  private initializeTelemetryPipeline(): {
    provider: BasicTracerProvider;
    tracer: Tracer;
    loggerProvider: LoggerProvider;
  } {
    const spanProcessors = this.setupProcessors();
    const provider = new BasicTracerProvider({
      resource: this.resource,
      spanProcessors,
    });

    // Explicitly set ContextManager for Serverless runtime
    // We use AsyncHooksContextManager to ensure parity with Node.js behavior
    const contextManager = new AsyncHooksContextManager();
    contextManager.enable();
    context.setGlobalContextManager(contextManager);

    trace.setGlobalTracerProvider(provider);

    const tracer = provider.getTracer(
      this.instrumentationScopeName,
      this.config.serviceVersion || "1.0.0",
    );

    const logProcessors = this.setupLogProcessors();
    const loggerProvider = new LoggerProvider({
      resource: this.resource,
      processors: logProcessors as any,
    });
    logs.setGlobalLoggerProvider(loggerProvider);

    const globals = globalThis as ObservabilityGlobals;
    globals.___voltagent_otel_logger_provider = loggerProvider;

    return { provider, tracer, loggerProvider };
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

    const parentSpan = this.spanStack[this.spanStack.length - 1];
    const activeContext = context.active();
    const spanContext = parentSpan ? trace.setSpan(activeContext, parentSpan) : activeContext;

    return this.tracer.startSpan(name, spanOptions, spanContext);
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

    const parentSpan = this.spanStack[this.spanStack.length - 1];
    const activeContext = context.active();
    const spanContext = parentSpan ? trace.setSpan(activeContext, parentSpan) : activeContext;

    return this.tracer.startActiveSpan(name, spanOptions, spanContext, (span) => {
      this.pushSpan(span);
      try {
        const result = fn(span);
        if (isPromiseLike(result)) {
          return (result as unknown as Promise<T>).finally(() => {
            this.popSpan(span);
          }) as T;
        }
        this.popSpan(span);
        return result;
      } catch (error) {
        this.popSpan(span);
        throw error;
      }
    });
  }

  getActiveSpan(): Span | undefined {
    if (this.spanStack.length > 0) {
      return this.spanStack[this.spanStack.length - 1];
    }
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

    const destroy = (this.storage as any)?.destroy;
    if (typeof destroy === "function") {
      destroy.call(this.storage);
    }
  }

  async forceFlush(): Promise<void> {
    await this.provider.forceFlush();
    await this.loggerProvider.forceFlush();
  }

  /**
   * Flushes spans without blocking the response if waitUntil is available.
   * This is the preferred method to call at the end of a request.
   */
  async flushOnFinish(): Promise<void> {
    const waitUntil = (globalThis as ObservabilityGlobals).___voltagent_wait_until;

    if (waitUntil) {
      try {
        // If waitUntil is available (Cloudflare/Vercel), schedule flush in background
        // and return immediately to unblock the response.
        waitUntil(
          this.forceFlush().catch((err) => {
            // eslint-disable-next-line no-console
            console.warn("[voltagent] Background flush failed", err);
          }),
        );
        return;
      } catch (error) {
        // If waitUntil fails (e.g. DataCloneError or context issues), fall back to blocking flush
        // This ensures spans are exported even if the optimized path fails
        // eslint-disable-next-line no-console
        console.warn("[voltagent] waitUntil failed, falling back to blocking flush", error);
      }
    }

    // Fallback: Must wait for flush to ensure data is sent
    await this.forceFlush();
  }

  getProvider(): BasicTracerProvider {
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

  updateServerlessRemote(config: ServerlessRemoteExportConfig): void {
    this.config.serverlessRemote = config;
    const previousProvider = this.provider;
    const previousLoggerProvider = this.loggerProvider;

    void previousProvider.forceFlush().catch(() => {});
    void previousLoggerProvider.forceFlush().catch(() => {});

    const { provider, tracer, loggerProvider } = this.initializeTelemetryPipeline();
    this.provider = provider;
    this.tracer = tracer;
    this.loggerProvider = loggerProvider;

    void previousProvider.shutdown().catch(() => {});
    void previousLoggerProvider.shutdown().catch(() => {});
  }

  private pushSpan(span: Span): void {
    this.spanStack.push(span);
  }

  private popSpan(span: Span): void {
    for (let i = this.spanStack.length - 1; i >= 0; i--) {
      if (this.spanStack[i] === span) {
        this.spanStack.splice(i, 1);
        break;
      }
    }
  }
}

export { ServerlessVoltAgentObservability as default };

function createRemoteSpanProcessor(
  config: ServerlessRemoteExportConfig,
): SpanProcessor | undefined {
  if (!config.traces?.url) {
    return undefined;
  }

  const exporter = new FetchTraceExporter(config.traces);

  // Use BatchSpanProcessor for better performance and reliability
  // We rely on flushOnFinish() to export spans at the end of execution
  let processor: SpanProcessor = new BatchSpanProcessor(exporter, {
    // Don't keep the process alive for the export timer
    scheduledDelayMillis: 1000,
    // Export quickly if we have enough spans
    maxExportBatchSize: 64,
  });

  if (config.sampling?.strategy && config.sampling.strategy !== "always") {
    processor = new SamplingWrapperProcessor(
      processor,
      config.sampling as ObservabilitySamplingConfig,
    );
  }

  return processor;
}

function createRemoteLogProcessor(
  config: ServerlessRemoteExportConfig,
): LogRecordProcessor | undefined {
  if (!config.logs?.url) {
    return undefined;
  }

  const exporter = new FetchLogExporter(config.logs);

  return new SimpleLogRecordProcessor(exporter);
}

class FetchTraceExporter {
  constructor(private endpoint: ServerlessRemoteEndpointConfig) {}

  export(items: ReadableSpan[], resultCallback: (result: any) => void): void {
    if (!this.endpoint.url) {
      resultCallback({ code: ExportResultCode.FAILED, error: new Error("Missing trace URL") });
      return;
    }

    try {
      const payloadBytes = JsonTraceSerializer.serializeRequest(items);
      const body = (textDecoder ?? new TextDecoder()).decode(payloadBytes);

      const performExport = async () => {
        let attempt = 0;
        let delayMs = INITIAL_RETRY_DELAY_MS;

        while (attempt < DEFAULT_MAX_ATTEMPTS) {
          attempt += 1;
          try {
            const response = await fetch(this.endpoint.url, {
              method: this.endpoint.method ?? "POST",
              headers: {
                "content-type": "application/json",
                ...this.endpoint.headers,
              },
              body,
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }

            resultCallback({ code: ExportResultCode.SUCCESS });
            return;
          } catch (error) {
            if (attempt >= DEFAULT_MAX_ATTEMPTS) {
              console.error("[ServerlessTraceExporter] export error", error);
              resultCallback({
                code: ExportResultCode.FAILED,
                error: error instanceof Error ? error : new Error(String(error)),
              });
              return;
            }

            console.warn("[ServerlessTraceExporter] retrying export", {
              attempt,
              delayMs,
              error: error instanceof Error ? error.message : String(error),
            });
            await sleep(delayMs);
            delayMs *= RETRY_BACKOFF_FACTOR;
          }
        }
      };

      const promise = performExport();
      const waitUntil = (globalThis as ObservabilityGlobals).___voltagent_wait_until;
      if (waitUntil) {
        waitUntil(promise);
      } else {
        void promise.catch(() => {});
      }
    } catch (error) {
      resultCallback({
        code: ExportResultCode.FAILED,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  async shutdown(): Promise<void> {}
  async forceFlush(): Promise<void> {}
}

class FetchLogExporter {
  constructor(private endpoint: ServerlessRemoteEndpointConfig) {}

  export(items: ReadableLogRecord[], resultCallback: (result: any) => void): void {
    if (!this.endpoint.url) {
      resultCallback({ code: ExportResultCode.FAILED, error: new Error("Missing log URL") });
      return;
    }

    try {
      const payloadBytes = JsonLogsSerializer.serializeRequest(items);
      const body = (textDecoder ?? new TextDecoder()).decode(payloadBytes);

      const performExport = async () => {
        let attempt = 0;
        let delayMs = INITIAL_RETRY_DELAY_MS;

        while (attempt < DEFAULT_MAX_ATTEMPTS) {
          attempt += 1;
          try {
            const response = await fetch(this.endpoint.url, {
              method: this.endpoint.method ?? "POST",
              headers: {
                "content-type": "application/json",
                ...this.endpoint.headers,
              },
              body,
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }

            resultCallback({ code: ExportResultCode.SUCCESS });
            return;
          } catch (error) {
            if (attempt >= DEFAULT_MAX_ATTEMPTS) {
              console.error("[ServerlessLogExporter] export error", error);
              resultCallback({
                code: ExportResultCode.FAILED,
                error: error instanceof Error ? error : new Error(String(error)),
              });
              return;
            }

            console.warn("[ServerlessLogExporter] retrying export", {
              attempt,
              delayMs,
              error: error instanceof Error ? error.message : String(error),
            });
            await sleep(delayMs);
            delayMs *= RETRY_BACKOFF_FACTOR;
          }
        }
      };

      const promise = performExport();
      const waitUntil = (globalThis as ObservabilityGlobals).___voltagent_wait_until;
      if (waitUntil) {
        waitUntil(promise);
      } else {
        void promise.catch(() => {});
      }
    } catch (error) {
      resultCallback({
        code: ExportResultCode.FAILED,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  async shutdown(): Promise<void> {}
}
