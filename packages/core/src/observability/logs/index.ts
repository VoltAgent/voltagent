/**
 * OpenTelemetry Logs Integration
 *
 * Exports all log-related components for observability
 */

export { StorageLogProcessor } from "./storage-log-processor";
export { WebSocketLogProcessor } from "./websocket-log-processor";
export { RemoteLogProcessor } from "./remote-log-processor";
export type { RemoteLogExportConfig } from "./remote-log-processor";
