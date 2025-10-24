import { type A2ARequestContext, normalizeError } from "@voltagent/a2a-server";
import type { ServerProviderDeps } from "@voltagent/core";
import { type Logger, safeStringify } from "@voltagent/internal";
import {
  A2A_ROUTES,
  executeA2ARequest,
  parseJsonRpcRequest,
  resolveAgentCard,
} from "@voltagent/server-core";
import type { OpenAPIHonoType } from "../zod-openapi-compat";
import { z } from "../zod-openapi-compat";
import { createPathParam, requirePathParam } from "./path-params";

const agentCardRoute = {
  ...A2A_ROUTES.agentCard,
  path: A2A_ROUTES.agentCard.path.replace(/:([A-Za-z0-9_]+)/g, "{$1}"),
  request: {
    params: z.object({
      serverId: createPathParam("serverId", "The ID of the A2A server", "server-123"),
    }),
  },
};

const jsonRpcRoute = {
  ...A2A_ROUTES.jsonRpc,
  path: A2A_ROUTES.jsonRpc.path.replace(/:([A-Za-z0-9_]+)/g, "{$1}"),
  request: {
    params: z.object({
      serverId: createPathParam("serverId", "The ID of the A2A server", "server-123"),
    }),
  },
};

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

export function registerA2ARoutes(app: OpenAPIHonoType, deps: ServerProviderDeps, logger: Logger) {
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

  app.openapi(agentCardRoute as any, (c) => {
    const serverId = requirePathParam(c, "serverId");
    try {
      const card = resolveAgentCard(typedRegistry, serverId, serverId, {});
      return c.json(card, 200);
    } catch (error) {
      const response = normalizeError(null, error);
      const status = response.error?.code === -32601 ? 404 : 400;
      return c.json(response, status);
    }
  });

  app.openapi(jsonRpcRoute as any, async (c) => {
    const serverId = requirePathParam(c, "serverId");
    // biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
    let request;
    let context: A2ARequestContext | undefined;

    try {
      const queryContextParam = c.req.query("context") ?? c.req.query("runtimeContext");
      if (queryContextParam) {
        let parsedQueryContext: unknown;
        try {
          parsedQueryContext = JSON.parse(queryContextParam);
        } catch (_) {
          throw new SyntaxError("Invalid 'context' query parameter; expected JSON");
        }
        context = mergeContexts(context, parseContextCandidate(parsedQueryContext));
      }

      const body = await c.req.json();
      let payload: unknown = body;

      if (body && typeof body === "object" && !Array.isArray(body)) {
        const { context: bodyContext, ...rest } = body as Record<string, unknown>;
        if (typeof bodyContext !== "undefined") {
          context = mergeContexts(context, parseContextCandidate(bodyContext));
        }
        payload = rest;
      }

      request = parseJsonRpcRequest(payload);
    } catch (error) {
      const response = normalizeError(null, error);
      return c.json(response, 400);
    }

    const response = await executeA2ARequest({
      registry: typedRegistry,
      serverId,
      request,
      context,
      logger,
    });

    if ("kind" in response && response.kind === "stream") {
      const { stream, id } = response;
      const encoder = new TextEncoder();
      const abortSignal = c.req.raw.signal;
      let abortListener: (() => void) | undefined;
      let cleanedUp = false;

      const cleanup = async () => {
        if (abortSignal && abortListener) {
          abortSignal.removeEventListener("abort", abortListener);
          abortListener = undefined;
        }
        if (!cleanedUp && typeof stream.return === "function") {
          cleanedUp = true;
          try {
            await stream.return(undefined);
          } catch {
            // Swallow generator completion errors
          }
        }
      };

      const sseStream = new ReadableStream<Uint8Array>({
        async start(controller) {
          if (abortSignal) {
            if (abortSignal.aborted) {
              await cleanup();
              controller.close();
              return;
            }

            abortListener = () => {
              controller.close();
              void cleanup();
            };

            abortSignal.addEventListener("abort", abortListener, { once: true });
          }

          try {
            for await (const chunk of stream) {
              const payload = safeStringify(chunk);
              const framed = `data: \u001E${payload}\n\n`;
              controller.enqueue(encoder.encode(framed));
            }
          } catch (error) {
            const errorResponse = normalizeError(id, error);
            const payload = safeStringify(errorResponse);
            controller.enqueue(encoder.encode(`data: \u001E${payload}\n\n`));
          } finally {
            await cleanup();
            controller.close();
          }
        },
        async cancel() {
          await cleanup();
        },
      });

      return new Response(sseStream, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    const jsonResponse = response as any;
    return c.json(jsonResponse, jsonResponse?.error ? 400 : 200);
  });
}
