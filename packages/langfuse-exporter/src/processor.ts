import { VoltAgentLangfuseProcessor } from "./exporter";
import type { VoltAgentLangfuseProcessorOptions } from "./exporter";

/**
 * Create a {@link VoltAgentLangfuseProcessor}.
 *
 * This factory is kept as a drop-in replacement for the `createLangfuseSpanProcessor`
 * helper that shipped in 2.x and wrapped the old v3-based exporter in a
 * `BatchSpanProcessor`. The v5 processor takes care of batching itself, so the
 * factory is now a thin constructor wrapper.
 *
 * @deprecated Construct {@link VoltAgentLangfuseProcessor} directly — the public
 * class name is clearer and lets you call `forceFlush()` / `shutdown()` on the
 * processor you created. This factory will be removed in a future major release.
 *
 * @example
 * ```ts
 * import { createLangfuseSpanProcessor } from "@voltagent/langfuse-exporter";
 *
 * const observability = new VoltAgentObservability({
 *   spanProcessors: [
 *     createLangfuseSpanProcessor({
 *       publicKey: process.env.LANGFUSE_PUBLIC_KEY,
 *       secretKey: process.env.LANGFUSE_SECRET_KEY,
 *       baseUrl: process.env.LANGFUSE_BASE_URL,
 *     }),
 *   ],
 * });
 * ```
 */
export function createLangfuseSpanProcessor(
  options: VoltAgentLangfuseProcessorOptions = {},
): VoltAgentLangfuseProcessor {
  return new VoltAgentLangfuseProcessor(options);
}

export { VoltAgentLangfuseProcessor };
export type { VoltAgentLangfuseProcessorOptions };
