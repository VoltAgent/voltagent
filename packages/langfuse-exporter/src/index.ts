export { VoltAgentLangfuseProcessor } from "./exporter";
export type { VoltAgentLangfuseProcessorOptions } from "./exporter";

// Re-export from @langfuse/otel for advanced usage
export type { LangfuseSpanProcessorParams, ShouldExportSpan, MaskFunction } from "@langfuse/otel";

// Backward-compatible factory + aliases carried over from 2.x
export { createLangfuseSpanProcessor } from "./processor";
export { VoltAgentLangfuseProcessor as LangfuseSpanProcessor } from "./exporter";
export type { VoltAgentLangfuseProcessorOptions as LangfuseSpanProcessorOptions } from "./exporter";
