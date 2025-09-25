import type { A2AServerRegistry } from "@voltagent/core";
import type { A2AServerMetadata } from "@voltagent/internal/a2a";

import type { A2AServerLikeWithHandlers } from "./types";

export interface A2AServerLookupResult {
  server?: A2AServerLikeWithHandlers;
  metadata?: A2AServerMetadata;
}

export function listA2AServers(
  registry: A2AServerRegistry<A2AServerLikeWithHandlers>,
): A2AServerMetadata[] {
  return registry.listMetadata();
}

export function lookupA2AServer(
  registry: A2AServerRegistry<A2AServerLikeWithHandlers>,
  serverId: string,
): A2AServerLookupResult {
  const server = registry.getServer(serverId);
  const metadata = registry.getMetadata(serverId);
  return { server, metadata };
}
