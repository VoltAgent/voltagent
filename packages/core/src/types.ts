/**
 * Basic type definitions for VoltAgent Core
 */

import type { Agent } from "./agent";
import type { CustomEndpointDefinition } from "./server/custom-endpoints";

import type { SpanExporter } from "@opentelemetry/sdk-trace-base";
import type { VoltAgentExporter } from "./telemetry/exporter";
import type { VoltOpsClient } from "./voltops/types";

// Re-export VoltOps types for convenience
export type {
  PromptReference,
  PromptHelper,
  VoltOpsClientOptions,
  VoltOpsPromptManager,
} from "./voltops/types";

/**
 * Server configuration options for VoltAgent
 */
export type ServerOptions = {
  /**
   * Whether to automatically start the server
   * @default true
   */
  autoStart?: boolean;
  /**
   * Port number for the server
   * @default 3141 (or next available port)
   */
  port?: number;
  /**
   * Optional flag to enable/disable Swagger UI
   * By default:
   * - In development (NODE_ENV !== 'production'): Swagger UI is enabled
   * - In production (NODE_ENV === 'production'): Swagger UI is disabled
   */
  enableSwaggerUI?: boolean;
  /**
   * Optional array of custom endpoint definitions to register with the API server
   */
  customEndpoints?: CustomEndpointDefinition[];
};

/**
 * VoltAgent constructor options
 */
export type VoltAgentOptions = {
  agents: Record<string, Agent<any>>;
  /**
   * Server configuration options
   */
  server?: ServerOptions;

  /**
   * Unified VoltOps client for telemetry and prompt management
   * Replaces the old telemetryExporter approach with a comprehensive solution.
   */
  voltOpsClient?: VoltOpsClient;

  /**
   * @deprecated Use `voltOpsClient` instead. Will be removed in a future version.
   * Optional OpenTelemetry SpanExporter instance or array of instances.
   * or a VoltAgentExporter instance or array of instances.
   * If provided, VoltAgent will attempt to initialize and register
   * a NodeTracerProvider with a BatchSpanProcessor for the given exporter(s).
   * It's recommended to only provide this in one VoltAgent instance per application process.
   */
  telemetryExporter?: (SpanExporter | VoltAgentExporter) | (SpanExporter | VoltAgentExporter)[];

  /**
   * @deprecated Use `server.port` instead
   */
  port?: number;
  /**
   * @deprecated Use `server.autoStart` instead
   */
  autoStart?: boolean;
  checkDependencies?: boolean;
  /**
   * @deprecated Use `server.customEndpoints` instead
   */
  customEndpoints?: CustomEndpointDefinition[];
  /**
   * @deprecated Use `server.enableSwaggerUI` instead
   */
  enableSwaggerUI?: boolean;
};
