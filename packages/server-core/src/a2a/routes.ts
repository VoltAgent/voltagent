export const DEFAULT_A2A_ROUTE_PREFIX = "/a2a" as const;
export const DEFAULT_A2A_WELL_KNOWN_PREFIX = "/.well-known" as const;

export function buildAgentCardPath(agentId: string): string {
  return `${DEFAULT_A2A_WELL_KNOWN_PREFIX}/${sanitizeSegment(agentId)}/agent-card.json`;
}

export function buildA2AEndpointPath(serverId: string): string {
  return `${DEFAULT_A2A_ROUTE_PREFIX}/${sanitizeSegment(serverId)}`;
}

function sanitizeSegment(segment: string): string {
  return segment.replace(/^\/+|\/+$|\s+/g, "");
}
