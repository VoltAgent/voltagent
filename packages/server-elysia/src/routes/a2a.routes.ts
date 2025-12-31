import { type A2ARequestContext, normalizeError } from "@voltagent/a2a-server";
import type { ServerProviderDeps } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import {
  A2A_ROUTES,
  executeA2ARequest,
  parseJsonRpcRequest,
  resolveAgentCard,
} from "@voltagent/server-core";
import type { Elysia } from "elysia";
import { t } from "elysia";
import { A2AResponseSchema, ErrorSchema } from "../schemas";

/**
 * A2A Server ID parameter schema
 */
const ServerIdParam = t.Object({
  serverId: t.String({ description: "The ID of the A2A server" }),
});

/**
 * A2A JSON-RPC query parameters schema
 */
const JsonRpcQuery = t.Object({
  context: t.Optional(
    t.String({
      description: "JSON-encoded A2A request context (userId, sessionId, metadata)",
    }),
  ),
  runtimeContext: t.Optional(t.String({ description: "Alternative name for context parameter" })),
});

/**
 * A2A JSON-RPC request body schema
 */
const JsonRpcRequestSchema = t.Object({
  jsonrpc: t.Optional(t.Literal("2.0", { description: "JSON-RPC version" })),
  method: t.String({ description: "JSON-RPC method name" }),
  params: t.Optional(t.Any({ description: "Method parameters" })),
  id: t.Optional(
    t.Union([t.String(), t.Number(), t.Null()], {
      description: "Request ID",
    }),
  ),
  context: t.Optional(
    t.Object({
      userId: t.Optional(t.String()),
      sessionId: t.Optional(t.String()),
      metadata: t.Optional(t.Record(t.String(), t.Unknown())),
    }),
  ),
});

function parseContextCandidate(candidate: unknown): A2ARequestContext | undefined {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return undefined;
  }

  const { userId, sessionId, metadata } = candidate as Record<string, unknown>;
  const context: A2ARequestContext = {};

  if (typeof userId === "string") {
    context.userId = userId;
  }

  if (typeof sessionId === "string") {
    context.sessionId = sessionId;
  }

  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    context.metadata = metadata as Record<string, unknown>;
  }

  return Object.keys(context).length > 0 ? context : undefined;
}

function mergeContexts(
  base: A2ARequestContext | undefined,
  next: A2ARequestContext | undefined,
): A2ARequestContext | undefined {
  if (!base) {
    return next;
  }
  if (!next) {
    return base;
  }

  const merged: A2ARequestContext = {
    ...base,
    ...next,
  };

  if (base.metadata || next.metadata) {
    merged.metadata = {
      ...(base.metadata ?? {}),
      ...(next.metadata ?? {}),
    };
  }

  return merged;
}

/**
 * Register A2A (Agent-to-Agent) routes with validation and OpenAPI documentation
 */
export function registerA2ARoutes(app: Elysia, deps: ServerProviderDeps, logger: Logger): void {
  const registry = deps.a2a?.registry;

  if (!registry) {
    logger.debug("A2A server registry not available on server deps; skipping A2A routes");
    return;
  }

  const registeredServers = typeof registry.list === "function" ? registry.list() : [];

  if (registeredServers.length === 0) {
    return;
  }

  const typedRegistry = registry as Parameters<typeof resolveAgentCard>[0];

  // POST /a2a/:serverId - Handle JSON-RPC request
  app.post(
    A2A_ROUTES.jsonRpc.path,
    async ({ params, body, query, set }) => {
      try {
        let context: A2ARequestContext | undefined;
        const contextStr = query.context || query.runtimeContext;

        if (contextStr) {
          try {
            const parsed = JSON.parse(contextStr);
            context = mergeContexts(context, parseContextCandidate(parsed));
          } catch (_e) {
            throw new Error("Invalid 'context' query parameter; expected JSON");
          }
        }

        const bodyObj = body as any;
        let payload = bodyObj;

        if (bodyObj && typeof bodyObj === "object" && !Array.isArray(bodyObj)) {
          const { context: bodyContext, ...rest } = bodyObj;
          if (typeof bodyContext !== "undefined") {
            context = mergeContexts(context, parseContextCandidate(bodyContext));
          }
          payload = rest;
        }

        const rpcRequest = parseJsonRpcRequest(payload);

        const response = await executeA2ARequest({
          registry: typedRegistry,
          serverId: params.serverId,
          request: rpcRequest,
          context,
          logger,
        });

        return response;
      } catch (error) {
        const response = normalizeError(null, error);
        const code = response.error?.code;
        const isServerError =
          code === -32603 || (code !== undefined && code <= -32000 && code >= -32099);
        set.status = isServerError ? 500 : 400;
        return response;
      }
    },
    {
      params: ServerIdParam,
      body: JsonRpcRequestSchema,
      query: JsonRpcQuery,
      response: {
        200: A2AResponseSchema,
        400: A2AResponseSchema, // Error response is also JSON-RPC
        500: ErrorSchema,
      },
      detail: {
        summary: "Handle A2A JSON-RPC request",
        description: "Processes a JSON-RPC request for the Agent-to-Agent protocol",
        tags: ["A2A"],
      },
    },
  );

  // GET /a2a/:serverId/card - Get agent card
  app.get(
    A2A_ROUTES.agentCard.path,
    async ({ params, set }) => {
      try {
        const card = resolveAgentCard(typedRegistry, params.serverId, params.serverId, {});
        return card;
      } catch (error) {
        const response = normalizeError(null, error);
        const code = response.error?.code;
        let status = 400;

        if (code === -32601) {
          status = 404;
        } else if (code === -32603 || (code !== undefined && code <= -32000 && code >= -32099)) {
          status = 500;
        }

        set.status = status;
        return response;
      }
    },
    {
      params: ServerIdParam,
      response: {
        200: A2AResponseSchema, // Agent card is a JSON object
        400: A2AResponseSchema,
        404: A2AResponseSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "Get agent card",
        description: "Retrieve the agent card for a specific A2A server",
        tags: ["A2A"],
      },
    },
  );
}
