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
import { isEdgeRuntime } from "../utils/runtime";
import { EdgeVoltAgentObservability } from "./edge/volt-agent-observability";
import { VoltAgentObservability as NodeVoltAgentObservability } from "./node/volt-agent-observability";
import type { ObservabilityConfig } from "./types";

export { EdgeVoltAgentObservability, NodeVoltAgentObservability };

export type VoltAgentObservability = NodeVoltAgentObservability | EdgeVoltAgentObservability;

export const createVoltAgentObservability = (config?: ObservabilityConfig) => {
  const baseConfig: ObservabilityConfig = { ...config };

  if (isEdgeRuntime()) {
    const logger = getGlobalLogger().child({ component: "observability", runtime: "edge" });
    if (!baseConfig.edgeRemote) {
      const voltOpsClient = AgentRegistry.getInstance().getGlobalVoltOpsClient();
      if (voltOpsClient) {
        const baseUrl = voltOpsClient.getApiUrl().replace(/\/$/, "");
        const headers = voltOpsClient.getAuthHeaders();
        logger.info(
          "[createVoltAgentObservability] Auto-configured edgeRemote from VoltOpsClient",
          {
            baseUrl,
            hasPublicKey: Boolean(headers["X-Public-Key"] || headers["x-public-key"]),
          },
        );
        baseConfig.edgeRemote = {
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
          "[createVoltAgentObservability] VoltOpsClient not set; edgeRemote remains undefined",
        );
      }
    } else {
      logger.info("[createVoltAgentObservability] edgeRemote provided explicitly", {
        hasTracesEndpoint: Boolean(baseConfig.edgeRemote.traces?.url),
        hasLogsEndpoint: Boolean(baseConfig.edgeRemote.logs?.url),
      });
    }
    return new EdgeVoltAgentObservability(baseConfig);
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
export { NullStorageAdapter } from "./adapters/null-adapter";

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
} from "@opentelemetry/api";
