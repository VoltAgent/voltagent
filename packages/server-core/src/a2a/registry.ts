import type { A2AServerLike, A2AServerMetadata, A2AServerRegistry } from "@voltagent/a2a-server";

export interface A2AServerLookupResult {
  server?: A2AServerLike;
  metadata?: A2AServerMetadata;
}

export function listA2AServers(registry: A2AServerRegistry): A2AServerMetadata[] {
  return registry.listMetadata();
}

export function lookupA2AServer(
  registry: A2AServerRegistry,
  serverId: string,
): A2AServerLookupResult {
  const server = registry.getServer(serverId);
  const metadata = registry.getMetadata(serverId);
  return { server, metadata };
}
