import type { MCPServerRegistry } from "@voltagent/core";

import type { MCPServerLike, MCPServerMetadata } from "./types";

export interface McpServerLookupResult {
  server?: MCPServerLike;
  metadata?: MCPServerMetadata;
}

export function listMcpServers(registry: MCPServerRegistry): MCPServerMetadata[] {
  return registry.listMetadata();
}

export function lookupMcpServer(
  registry: MCPServerRegistry,
  serverId: string,
): McpServerLookupResult {
  const server = registry.getServer(serverId);
  const metadata = registry.getServerMetadata(serverId);
  return { server, metadata };
}
