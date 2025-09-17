/**
 * Lazy Remote Export Processor for OpenTelemetry
 *
 * This processor delays the initialization of remote export until
 * the VoltOpsClient is available in the global registry, solving
 * the race condition between Agent and VoltAgent initialization.
 */

import type { Context, Span } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor, type SpanProcessor } from "@opentelemetry/sdk-trace-base";
import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import type { Logger } from "@voltagent/internal";
import { AgentRegistry } from "../../registries/agent-registry";

interface LazyRemoteExportConfig {
  maxQueueSize?: number;
  maxExportBatchSize?: number;
  scheduledDelayMillis?: number;
  exportTimeoutMillis?: number;
  logger?: Logger;
}

export class LazyRemoteExportProcessor implements SpanProcessor {
  private config: LazyRemoteExportConfig;
  private actualProcessor?: BatchSpanProcessor;
  private pendingSpans: ReadableSpan[] = [];
  private initialized = false;
  private initCheckInterval?: NodeJS.Timeout;
  private logger?: Logger;

  constructor(config: LazyRemoteExportConfig = {}) {
    this.config = config;
    this.logger = config.logger;

    // Start checking for VoltOpsClient availability
    this.startInitializationCheck();
  }

  /**
   * Called when a span is started
   */
  onStart(_span: Span, _parentContext: Context): void {
    // Try to initialize if not done yet
    this.tryInitialize();

    // BatchSpanProcessor's onStart is a no-op, so we don't need to forward this call
    // The processor only needs to handle onEnd events for export
  }

  /**
   * Called when a span ends
   */
  onEnd(span: ReadableSpan): void {
    // Try to initialize if not done yet
    this.tryInitialize();

    if (this.actualProcessor) {
      this.actualProcessor.onEnd(span);
    } else {
      // Store spans until we can initialize
      this.pendingSpans.push(span);

      // Limit pending spans to prevent memory issues
      if (this.pendingSpans.length > 1000) {
        this.pendingSpans.shift(); // Remove oldest
      }
    }
  }

  /**
   * Force flush all pending spans
   */
  async forceFlush(): Promise<void> {
    this.tryInitialize();

    if (this.actualProcessor) {
      await this.actualProcessor.forceFlush();
    }
  }

  /**
   * Shutdown the processor
   */
  async shutdown(): Promise<void> {
    if (this.initCheckInterval) {
      clearInterval(this.initCheckInterval);
      this.initCheckInterval = undefined;
    }

    if (this.actualProcessor) {
      await this.actualProcessor.shutdown();
    }

    this.pendingSpans = [];
  }

  /**
   * Start periodic check for VoltOpsClient availability
   */
  private startInitializationCheck(): void {
    // Check every 100ms for the first 5 seconds
    let checkCount = 0;
    this.initCheckInterval = setInterval(() => {
      checkCount++;

      if (this.tryInitialize() || checkCount > 50) {
        // Either initialized or gave up after 5 seconds
        if (this.initCheckInterval) {
          clearInterval(this.initCheckInterval);
          this.initCheckInterval = undefined;
        }

        if (!this.initialized) {
          this.logger?.debug(
            "[LazyRemoteExport] Gave up waiting for VoltOpsClient after 5 seconds",
          );
        }
      }
    }, 100);
  }

  /**
   * Try to initialize the actual processor
   */
  private tryInitialize(): boolean {
    if (this.initialized) {
      return true;
    }

    const voltOpsClient = AgentRegistry.getInstance().getGlobalVoltOpsClient();

    if (!voltOpsClient) {
      return false;
    }

    try {
      // Get base URL and auth headers from VoltOpsClient
      const baseUrl = voltOpsClient.getApiUrl();
      const headers = voltOpsClient.getAuthHeaders();

      // Create OTLP exporter
      const exporter = new OTLPTraceExporter({
        url: `${baseUrl}/api/public/otel/v1/traces`,
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
      });

      // Create batch processor with config
      this.actualProcessor = new BatchSpanProcessor(exporter, {
        maxQueueSize: this.config.maxQueueSize ?? 2048,
        maxExportBatchSize: this.config.maxExportBatchSize ?? 512,
        scheduledDelayMillis: this.config.scheduledDelayMillis ?? 5000,
        exportTimeoutMillis: this.config.exportTimeoutMillis ?? 30000,
      });

      // Process pending spans
      if (this.pendingSpans.length > 0) {
        for (const span of this.pendingSpans) {
          this.actualProcessor.onEnd(span);
        }

        this.logger?.debug(
          `[LazyRemoteExport] Processed ${this.pendingSpans.length} pending spans`,
        );

        this.pendingSpans = [];
      }

      this.initialized = true;

      this.logger?.debug("[LazyRemoteExport] Successfully initialized remote export", {
        url: `${baseUrl}/api/public/otel/v1/traces`,
        maxQueueSize: this.config.maxQueueSize ?? 2048,
        maxExportBatchSize: this.config.maxExportBatchSize ?? 512,
        scheduledDelayMillis: this.config.scheduledDelayMillis ?? 5000,
      });

      return true;
    } catch (error) {
      this.logger?.debug("[LazyRemoteExport] Failed to initialize remote export", { error });
      return false;
    }
  }
}
