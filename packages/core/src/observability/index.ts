/**
 * VoltAgent Observability - Built on OpenTelemetry
 *
 * This module provides OpenTelemetry-based observability with:
 * - WebSocket real-time events via custom SpanProcessor
 * - Local storage via custom SpanProcessor
 * - OTLP export support
 * - Zero-configuration defaults
 */

import { getGlobalLogger } from "../logger";
import { AgentRegistry } from "../registries/agent-registry";
import { isServerlessRuntime } from "../utils/runtime";
import { VoltAgentObservability as NodeVoltAgentObservability } from "./node/volt-agent-observability";
import { ServerlessVoltAgentObservability } from "./serverless/volt-agent-observability";
import type { ObservabilityConfig } from "./types";

export { ServerlessVoltAgentObservability, NodeVoltAgentObservability };
export const VoltAgentObservability = NodeVoltAgentObservability;

export type VoltAgentObservability = NodeVoltAgentObservability | ServerlessVoltAgentObservability;

export const createVoltAgentObservability = (config?: ObservabilityConfig) => {
  const baseConfig: ObservabilityConfig = { ...config };

  if (isServerlessRuntime()) {
    const logger = getGlobalLogger().child({ component: "observability", runtime: "serverless" });
    if (!baseConfig.serverlessRemote) {
      const voltOpsClient = AgentRegistry.getInstance().getGlobalVoltOpsClient();
      if (voltOpsClient) {
        const baseUrl = voltOpsClient.getApiUrl().replace(/\/$/, "");
        const headers = voltOpsClient.getAuthHeaders();
        logger.info(
          "[createVoltAgentObservability] Auto-configured serverless remote from VoltOpsClient",
          {
            baseUrl,
            hasPublicKey: Boolean(headers["X-Public-Key"] || headers["x-public-key"]),
          },
        );
        baseConfig.serverlessRemote = {
          traces: {
            url: `${baseUrl}/api/public/otel/v1/traces`,
            headers,
          },
          logs: {
            url: `${baseUrl}/api/public/otel/v1/logs`,
            headers,
          },
          sampling: baseConfig.voltOpsSync?.sampling,
          maxQueueSize: baseConfig.voltOpsSync?.maxQueueSize,
          maxExportBatchSize: baseConfig.voltOpsSync?.maxExportBatchSize,
          scheduledDelayMillis: baseConfig.voltOpsSync?.scheduledDelayMillis,
          exportTimeoutMillis: baseConfig.voltOpsSync?.exportTimeoutMillis,
        };
      } else {
        logger.debug(
          "[createVoltAgentObservability] VoltOpsClient not set; serverlessRemote remains undefined",
        );
      }
    } else {
      logger.info("[createVoltAgentObservability] serverlessRemote provided explicitly", {
        hasTracesEndpoint: Boolean(baseConfig.serverlessRemote.traces?.url),
        hasLogsEndpoint: Boolean(baseConfig.serverlessRemote.logs?.url),
      });
    }
    return new ServerlessVoltAgentObservability(baseConfig);
  }

  return new NodeVoltAgentObservability(baseConfig);
};
export {
  WebSocketSpanProcessor,
  WebSocketEventEmitter,
} from "./processors/websocket-span-processor";
export { LocalStorageSpanProcessor } from "./processors/local-storage-span-processor";
export { LazyRemoteExportProcessor } from "./processors/lazy-remote-export-processor";
export { SpanFilterProcessor } from "./processors/span-filter-processor";
export { InMemoryStorageAdapter } from "./adapters/in-memory-adapter";

// Export log processors
export { StorageLogProcessor, WebSocketLogProcessor, RemoteLogProcessor } from "./logs";
export type { RemoteLogExportConfig } from "./logs";

// Export new unified types
export type {
  ObservabilitySpan,
  ObservabilityLogRecord,
  ObservabilityWebSocketEvent,
  ObservabilityStorageAdapter,
  ObservabilityConfig,
  ServerlessRemoteExportConfig,
  ServerlessRemoteEndpointConfig,
  SpanFilterConfig,
  SpanAttributes,
  SpanEvent,
  SpanLink,
  SpanStatus,
  SpanTreeNode,
  LogFilter,
} from "./types";

export {
  SpanKind,
  SpanStatusCode,
  readableSpanToObservabilitySpan,
  readableLogRecordToObservabilityLog,
  buildSpanTree,
} from "./types";

// Re-export OpenTelemetry types for convenience
export {
  type Span,
  type SpanOptions,
  type Tracer,
  trace,
  context,
  propagation,
  ROOT_CONTEXT,
} from "@opentelemetry/api";
export * from "./wait-until";
