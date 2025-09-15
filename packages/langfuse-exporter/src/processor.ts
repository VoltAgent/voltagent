import { BatchSpanProcessor, type SpanProcessor } from "@opentelemetry/sdk-trace-base";
import { LangfuseExporter } from "./exporter";

export type { LangfuseOptions } from "langfuse";

export interface LangfuseSpanProcessorOptions {
  publicKey?: string;
  secretKey?: string;
  baseUrl?: string;
  debug?: boolean;
  // Batch processor tuning
  batch?: {
    maxQueueSize?: number; // Default: 2048
    maxExportBatchSize?: number; // Default: 512
    scheduledDelayMillis?: number; // Default: 5000
    exportTimeoutMillis?: number; // Default: 30000
  };
}

/**
 * Create a SpanProcessor that exports spans to Langfuse using LangfuseExporter
 */
export function createLangfuseSpanProcessor(options: LangfuseSpanProcessorOptions): SpanProcessor {
  const exporter = new LangfuseExporter({
    publicKey: options.publicKey,
    secretKey: options.secretKey,
    baseUrl: options.baseUrl,
    debug: options.debug,
  });

  const processor = new BatchSpanProcessor(exporter, {
    maxQueueSize: options.batch?.maxQueueSize ?? 2048,
    maxExportBatchSize: options.batch?.maxExportBatchSize ?? 512,
    scheduledDelayMillis: options.batch?.scheduledDelayMillis ?? 5000,
    exportTimeoutMillis: options.batch?.exportTimeoutMillis ?? 30000,
  });

  return processor;
}
