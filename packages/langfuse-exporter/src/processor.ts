/**
 * @deprecated Use {@link VoltAgentLangfuseProcessor} from "./exporter" directly.
 *
 * This module is kept for backward compatibility. The old
 * `createLangfuseSpanProcessor` factory (which wrapped a custom v3-backed
 * `LangfuseExporter` in a `BatchSpanProcessor`) has been replaced by the
 * `VoltAgentLangfuseProcessor` class that wraps `LangfuseSpanProcessor`
 * from `@langfuse/otel` (Langfuse JS SDK v5).
 */
export { VoltAgentLangfuseProcessor } from "./exporter";
export type { VoltAgentLangfuseProcessorOptions } from "./exporter";
