/**
 * Remote Log Processor
 *
 * Exports OpenTelemetry log records to remote VoltOps API using OTLP protocol
 * Similar to LazyRemoteExportProcessor for spans, but for logs
 */

import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import {
  BatchLogRecordProcessor,
  type LogRecordProcessor,
  type SdkLogRecord,
} from "@opentelemetry/sdk-logs";
import { AgentRegistry } from "../../registries/agent-registry";

export interface RemoteLogExportConfig {
  maxQueueSize?: number;
  maxExportBatchSize?: number;
  scheduledDelayMillis?: number;
  exportTimeoutMillis?: number;
  samplingConfig?: {
    strategy?: "always" | "never" | "ratio" | "parent";
    ratio?: number;
  };
}

/**
 * Lazy Remote Log Processor
 *
 * Delays initialization until VoltOpsClient is available,
 * then exports logs to VoltOps API using OTLP protocol
 */
export class RemoteLogProcessor implements LogRecordProcessor {
  private config: RemoteLogExportConfig;
  private actualProcessor?: BatchLogRecordProcessor;
  private pendingLogs: SdkLogRecord[] = [];
  private initialized = false;
  private initCheckInterval?: NodeJS.Timeout;

  constructor(config: RemoteLogExportConfig = {}) {
    this.config = config;

    // Start checking for VoltOpsClient availability
    this.startInitializationCheck();
  }

  /**
   * Called to emit a log record
   */
  onEmit(logRecord: SdkLogRecord): void {
    // For logs with trace context, check sampling strategy
    // Note: This is a simplified approach - ideally we'd track sampled trace IDs
    // For now, we'll apply sampling to all logs if strategy is not 'always'
    const strategy = this.config.samplingConfig?.strategy || "always";

    if (strategy === "never") {
      return; // Don't export any logs
    }

    if (strategy === "ratio" && this.config.samplingConfig?.ratio !== undefined) {
      // Simple random sampling for logs
      if (Math.random() > this.config.samplingConfig.ratio) {
        return; // Skip this log based on sampling ratio
      }
    }

    // Try to initialize if not done yet
    this.tryInitialize();

    if (this.actualProcessor) {
      this.actualProcessor.onEmit(logRecord);
    } else {
      // Store logs until we can initialize
      this.pendingLogs.push(logRecord);

      // Limit pending logs to prevent memory issues
      if (this.pendingLogs.length > 1000) {
        this.pendingLogs.shift(); // Remove oldest
      }
    }
  }

  /**
   * Force flush all pending logs
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

    this.pendingLogs = [];
  }

  /**
   * Start periodic check for VoltOpsClient availability
   */
  private startInitializationCheck(): void {
    let checkCount = 0;
    const maxChecks = 50; // 5 seconds total (100ms * 50)

    this.initCheckInterval = setInterval(() => {
      const initialized = this.tryInitialize();

      checkCount++;

      if (initialized || checkCount >= maxChecks) {
        if (this.initCheckInterval) {
          clearInterval(this.initCheckInterval);
          this.initCheckInterval = undefined;
        }

        // If still uninitialized, give up silently
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

      // Create OTLP log exporter
      const exporter = new OTLPLogExporter({
        url: `${baseUrl}/api/public/otel/v1/logs`,
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
      });

      // Create batch processor with config
      this.actualProcessor = new BatchLogRecordProcessor(exporter, {
        maxQueueSize: this.config.maxQueueSize ?? 2048,
        maxExportBatchSize: this.config.maxExportBatchSize ?? 512,
        scheduledDelayMillis: this.config.scheduledDelayMillis ?? 5000,
        exportTimeoutMillis: this.config.exportTimeoutMillis ?? 30000,
      });

      // Process pending logs
      if (this.pendingLogs.length > 0) {
        for (const log of this.pendingLogs) {
          this.actualProcessor.onEmit(log);
        }

        this.pendingLogs = [];
      }

      this.initialized = true;

      return true;
    } catch (_) {
      return false;
    }
  }
}
