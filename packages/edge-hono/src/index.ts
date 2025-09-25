import type { ServerProviderDeps } from "@voltagent/core/edge";
import { HonoEdgeProvider } from "./edge-provider";
import type { EdgeConfig } from "./types";

export function edgeHono(config?: EdgeConfig) {
  return (deps: ServerProviderDeps) => new HonoEdgeProvider(deps, config);
}

export { HonoEdgeProvider } from "./edge-provider";
export type { EdgeConfig, EdgeRuntime } from "./types";
export { detectEdgeRuntime } from "./utils/runtime-detection";
