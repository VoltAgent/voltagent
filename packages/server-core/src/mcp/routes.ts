import {
  DEFAULT_MCP_HTTP_SEGMENT,
  DEFAULT_MCP_MESSAGES_SEGMENT,
  DEFAULT_MCP_ROUTE_PREFIX,
  DEFAULT_MCP_SSE_SEGMENT,
} from "./constants";

export interface McpRouteOptions {
  basePath?: string;
  httpSegment?: string;
  sseSegment?: string;
  messageSegment?: string;
}

export interface McpRoutePaths {
  basePath: string;
  httpPath: string;
  ssePath: string;
  messagePath: string;
}

export function buildMcpRoutePaths(serverId: string, options: McpRouteOptions = {}): McpRoutePaths {
  const basePath = normalizeBasePath(options.basePath ?? DEFAULT_MCP_ROUTE_PREFIX);
  const httpSegment = normalizeSegment(options.httpSegment ?? DEFAULT_MCP_HTTP_SEGMENT);
  const sseSegment = normalizeSegment(options.sseSegment ?? DEFAULT_MCP_SSE_SEGMENT);
  const messageSegment = normalizeSegment(options.messageSegment ?? DEFAULT_MCP_MESSAGES_SEGMENT);
  const normalizedServerId = normalizeSegment(serverId);

  return {
    basePath,
    httpPath: joinPath(basePath, normalizedServerId, httpSegment),
    ssePath: joinPath(basePath, normalizedServerId, sseSegment),
    messagePath: joinPath(basePath, normalizedServerId, messageSegment),
  };
}

function normalizeBasePath(path: string): string {
  let effectivePath = path.trim();
  if (!effectivePath.startsWith("/")) {
    effectivePath = `/${effectivePath}`;
  }
  return effectivePath.endsWith("/") && effectivePath.length > 1
    ? effectivePath.slice(0, -1)
    : effectivePath;
}

function normalizeSegment(segment: string): string {
  return segment.replace(/^\/+|\/+$|\s+/g, "");
}

function joinPath(...segments: string[]): string {
  return segments
    .filter((segment) => segment.length > 0)
    .join("/")
    .replace(/\/+/g, "/");
}
