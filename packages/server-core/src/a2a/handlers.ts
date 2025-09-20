import type {
  A2ARequestContext,
  A2AServerRegistry,
  AgentCard,
  JsonRpcHandlerResult,
  JsonRpcRequest,
} from "@voltagent/a2a-server";
import { VoltA2AError, isJsonRpcRequest, normalizeError } from "@voltagent/a2a-server";
import type { Logger } from "@voltagent/internal";

import { lookupA2AServer } from "./registry";

export function parseJsonRpcRequest(payload: unknown): JsonRpcRequest {
  if (!isJsonRpcRequest(payload)) {
    throw VoltA2AError.invalidRequest("Body is not a valid JSON-RPC request");
  }

  if (typeof payload.id === "undefined") {
    throw VoltA2AError.invalidRequest("JSON-RPC request 'id' must be provided");
  }

  return payload;
}

export function resolveAgentCard(
  registry: A2AServerRegistry,
  serverId: string,
  agentId: string,
  context: A2ARequestContext = {},
): AgentCard {
  const { server } = lookupA2AServer(registry, serverId);
  if (!server || typeof server.getAgentCard !== "function") {
    throw VoltA2AError.invalidRequest(`A2A server '${serverId}' not available`);
  }

  return server.getAgentCard(agentId, context);
}

export async function executeA2ARequest(params: {
  registry: A2AServerRegistry;
  serverId: string;
  request: JsonRpcRequest;
  context?: A2ARequestContext;
  logger?: Logger;
}): Promise<JsonRpcHandlerResult> {
  const { registry, serverId, request, context = {}, logger } = params;
  const { server } = lookupA2AServer(registry, serverId);

  if (!server || typeof server.handleRequest !== "function") {
    return normalizeError(
      request.id ?? null,
      VoltA2AError.invalidRequest(`A2A server '${serverId}' not available`),
    );
  }

  try {
    return await server.handleRequest(serverId, request, context);
  } catch (error) {
    logger?.error("A2A request failed", {
      error: error instanceof Error ? error.message : error,
      serverId,
    });
    return normalizeError(request.id ?? null, error);
  }
}
