import type { Logger } from "@voltagent/internal";
import type { MCPServerRegistry } from "@voltagent/mcp-server";
import {
  DEFAULT_MCP_HTTP_SEGMENT,
  DEFAULT_MCP_MESSAGES_SEGMENT,
  DEFAULT_MCP_ROUTE_PREFIX,
  DEFAULT_MCP_SSE_SEGMENT,
  MCP_ROUTES,
  MCP_SESSION_QUERY_PARAM,
  type McpInvokeToolRequest,
  type McpSetLogLevelRequest,
  buildMcpRoutePaths,
  handleGetMcpPrompt,
  handleGetMcpResource,
  handleGetMcpServer,
  handleInvokeMcpServerTool,
  handleListMcpPrompts,
  handleListMcpResourceTemplates,
  handleListMcpResources,
  handleListMcpServerTools,
  handleListMcpServers,
  handleSetMcpLogLevel,
  lookupMcpServer,
} from "@voltagent/server-core";
import { toFetchResponse, toReqRes } from "fetch-to-node";
import { streamSSE } from "hono/streaming";
import { HonoSseBridge } from "../mcp/hono-sse-bridge";
import { z } from "../zod-openapi-compat";
import type { OpenAPIHonoType } from "../zod-openapi-compat";
import { createPathParam, requirePathParam } from "./path-params";

interface McpDeps {
  mcp?: {
    registry: MCPServerRegistry;
  };
}

const toOpenApiPath = (path: string) => path.replace(/:([A-Za-z0-9_]+)/g, "{$1}");

const serverIdParam = () => createPathParam("serverId", "The ID of the MCP server", "server-123");
const toolNameParam = () => createPathParam("toolName", "The name of the MCP tool", "summarize");
const promptNameParam = () =>
  createPathParam("promptName", "The name of the MCP prompt", "list-open-issues");

const getServerRoute = {
  ...MCP_ROUTES.getServer,
  path: toOpenApiPath(MCP_ROUTES.getServer.path),
  request: {
    params: z.object({ serverId: serverIdParam() }),
  },
};

const listToolsRoute = {
  ...MCP_ROUTES.listTools,
  path: toOpenApiPath(MCP_ROUTES.listTools.path),
  request: {
    params: z.object({ serverId: serverIdParam() }),
  },
};

const invokeToolRoute = {
  ...MCP_ROUTES.invokeTool,
  path: toOpenApiPath(MCP_ROUTES.invokeTool.path),
  request: {
    params: z.object({
      serverId: serverIdParam(),
      toolName: toolNameParam(),
    }),
  },
};

const setLogLevelRoute = {
  ...MCP_ROUTES.setLogLevel,
  path: toOpenApiPath(MCP_ROUTES.setLogLevel.path),
  request: {
    params: z.object({ serverId: serverIdParam() }),
  },
};

const listPromptsRoute = {
  ...MCP_ROUTES.listPrompts,
  path: toOpenApiPath(MCP_ROUTES.listPrompts.path),
  request: {
    params: z.object({ serverId: serverIdParam() }),
  },
};

const getPromptRoute = {
  ...MCP_ROUTES.getPrompt,
  path: toOpenApiPath(MCP_ROUTES.getPrompt.path),
  request: {
    params: z.object({
      serverId: serverIdParam(),
      promptName: promptNameParam(),
    }),
  },
};

const listResourcesRoute = {
  ...MCP_ROUTES.listResources,
  path: toOpenApiPath(MCP_ROUTES.listResources.path),
  request: {
    params: z.object({ serverId: serverIdParam() }),
  },
};

const readResourceRoute = {
  ...MCP_ROUTES.readResource,
  path: toOpenApiPath(MCP_ROUTES.readResource.path),
  request: {
    params: z.object({ serverId: serverIdParam() }),
  },
};

const listResourceTemplatesRoute = {
  ...MCP_ROUTES.listResourceTemplates,
  path: toOpenApiPath(MCP_ROUTES.listResourceTemplates.path),
  request: {
    params: z.object({ serverId: serverIdParam() }),
  },
};

export function registerMcpRoutes(app: OpenAPIHonoType, deps: McpDeps, logger: Logger) {
  const registry = deps.mcp?.registry;

  if (!registry) {
    logger.debug("MCP server registry not available on server deps; skipping MCP routes");
    return;
  }

  const registeredServers = typeof registry.list === "function" ? registry.list() : [];

  if (registeredServers.length === 0) {
    return;
  }

  app.openapi(MCP_ROUTES.listServers, (c) => {
    const response = handleListMcpServers(registry);
    return c.json(response, response.success ? 200 : 500);
  });

  app.openapi(getServerRoute as any, (c) => {
    const serverId = requirePathParam(c, "serverId");
    const response = handleGetMcpServer(registry, serverId);
    return c.json(response, response.success ? 200 : 404);
  });

  app.openapi(listToolsRoute as any, (c) => {
    const serverId = requirePathParam(c, "serverId");
    const response = handleListMcpServerTools(registry, logger, serverId);
    return c.json(response, response.success ? 200 : 404);
  });

  app.openapi(invokeToolRoute as any, async (c) => {
    const serverId = requirePathParam(c, "serverId");
    const toolName = requirePathParam(c, "toolName");
    let body: McpInvokeToolRequest = {};

    try {
      const parsed = await c.req.json();
      body = (parsed ?? {}) as McpInvokeToolRequest;
    } catch (error) {
      logger.warn("Invalid JSON body for MCP tool invocation", { error, serverId, toolName });
      return c.json({ success: false, error: "Invalid JSON body" }, 400);
    }

    const response = await handleInvokeMcpServerTool(registry, logger, serverId, toolName, body);

    const status = response.success ? 200 : response.error?.includes("not available") ? 404 : 500;

    return c.json(response, status);
  });

  app.openapi(setLogLevelRoute as any, async (c) => {
    const serverId = requirePathParam(c, "serverId");
    let body: McpSetLogLevelRequest | undefined;

    try {
      body = (await c.req.json()) as McpSetLogLevelRequest;
    } catch (error) {
      logger.warn("Invalid JSON body for MCP log level update", { error, serverId });
      return c.json({ success: false, error: "Invalid JSON body" }, 400);
    }

    if (!body || typeof body.level !== "string" || body.level.trim().length === 0) {
      logger.warn("Missing logging level in MCP log level update", { serverId });
      return c.json({ success: false, error: "'level' must be provided" }, 400);
    }

    const response = await handleSetMcpLogLevel(registry, logger, serverId, body);
    const status = response.success
      ? 200
      : response.error?.includes("does not support log level updates")
        ? 404
        : 500;

    return c.json(response, status);
  });

  app.openapi(listPromptsRoute as any, async (c) => {
    const serverId = requirePathParam(c, "serverId");
    const response = await handleListMcpPrompts(registry, logger, serverId);
    const status = response.success
      ? 200
      : response.error?.includes("does not expose prompts")
        ? 404
        : 500;

    return c.json(response, status);
  });

  app.openapi(getPromptRoute as any, async (c) => {
    const serverId = requirePathParam(c, "serverId");
    const promptName = requirePathParam(c, "promptName");
    const rawArguments = c.req.query("arguments");
    let promptArguments: Record<string, string> | undefined;

    if (Array.isArray(rawArguments)) {
      logger.warn("Multiple prompt arguments values provided; using the first", {
        serverId,
        promptName,
      });
    }

    const argumentValue = Array.isArray(rawArguments) ? rawArguments[0] : rawArguments;

    if (typeof argumentValue === "string" && argumentValue.trim().length > 0) {
      try {
        const parsed = JSON.parse(argumentValue);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const entries = Object.entries(parsed).map(([key, value]) => [key, String(value)]);
          promptArguments = Object.fromEntries(entries);
        } else {
          throw new Error("Prompt arguments must be a JSON object");
        }
      } catch (error) {
        logger.warn("Invalid prompt arguments provided for MCP prompt", {
          error,
          serverId,
          promptName,
        });
        return c.json({ success: false, error: "Invalid prompt arguments" }, 400);
      }
    }

    const response = await handleGetMcpPrompt(registry, logger, serverId, {
      name: promptName,
      ...(promptArguments ? { arguments: promptArguments } : {}),
    });

    const status = response.success
      ? 200
      : response.error?.includes("does not expose prompts")
        ? 404
        : 500;

    return c.json(response, status);
  });

  app.openapi(listResourcesRoute as any, async (c) => {
    const serverId = requirePathParam(c, "serverId");
    const response = await handleListMcpResources(registry, logger, serverId);
    const status = response.success
      ? 200
      : response.error?.includes("does not expose resources")
        ? 404
        : 500;

    return c.json(response, status);
  });

  app.openapi(readResourceRoute as any, async (c) => {
    const serverId = requirePathParam(c, "serverId");
    const resourceUri = c.req.query("uri") ?? undefined;

    if (!resourceUri) {
      logger.warn("Missing resource URI for MCP resource read", { serverId });
      return c.json({ success: false, error: "Missing resource URI" }, 400);
    }

    const response = await handleGetMcpResource(registry, logger, serverId, resourceUri);
    const status = response.success
      ? 200
      : response.error?.includes("does not expose resources")
        ? 404
        : 500;

    return c.json(response, status);
  });

  app.openapi(listResourceTemplatesRoute as any, async (c) => {
    const serverId = requirePathParam(c, "serverId");
    const response = await handleListMcpResourceTemplates(registry, logger, serverId);
    const status = response.success
      ? 200
      : response.error?.includes("does not expose resource templates")
        ? 404
        : 500;

    return c.json(response, status);
  });

  app.all(`${DEFAULT_MCP_ROUTE_PREFIX}/:serverId/${DEFAULT_MCP_HTTP_SEGMENT}`, async (c) => {
    const serverId = requirePathParam(c, "serverId");
    const { server, metadata } = lookupMcpServer(registry, serverId);
    const typedServer = server as any;

    const httpEnabled = metadata?.protocols?.http ?? typedServer?.hasProtocol?.("http") ?? true;

    if (
      !httpEnabled ||
      !typedServer ||
      typeof typedServer.handleStreamableHttpRequest !== "function"
    ) {
      return c.json({ error: `MCP server '${serverId}' not available for HTTP transport` }, 404);
    }

    const { req, res } = toReqRes(c.req.raw);
    const sessionId =
      c.req.header("mcp-session-id") ?? c.req.query(MCP_SESSION_QUERY_PARAM) ?? undefined;
    const handleStreamableHttpRequest = typedServer.handleStreamableHttpRequest.bind(typedServer);
    const { httpPath } = buildMcpRoutePaths(serverId);

    try {
      await handleStreamableHttpRequest({
        url: new URL(c.req.url),
        httpPath,
        req,
        res,
        contextOverrides: sessionId ? { sessionId } : undefined,
      });
    } catch (error) {
      logger.error("Failed to handle MCP Streamable HTTP request", {
        err: error,
        serverId,
        path: httpPath,
      });
    }

    return await toFetchResponse(res);
  });

  app.get(`${DEFAULT_MCP_ROUTE_PREFIX}/:serverId/${DEFAULT_MCP_SSE_SEGMENT}`, async (c) => {
    const serverId = requirePathParam(c, "serverId");
    const { server, metadata } = lookupMcpServer(registry, serverId);
    const typedServer = server as any;
    const { messagePath, ssePath } = buildMcpRoutePaths(serverId);

    const sseEnabled = metadata?.protocols?.sse ?? typedServer?.hasProtocol?.("sse") ?? true;

    if (!sseEnabled || !typedServer) {
      return c.json({ error: `MCP server '${serverId}' not available for SSE transport` }, 404);
    }

    const createExternalSseSession =
      typeof typedServer.createExternalSseSession === "function"
        ? typedServer.createExternalSseSession.bind(typedServer)
        : undefined;
    const closeExternalSseSession =
      typeof typedServer.closeExternalSseSession === "function"
        ? typedServer.closeExternalSseSession.bind(typedServer)
        : undefined;

    if (!createExternalSseSession) {
      return c.json({ error: `MCP server '${serverId}' not available for SSE transport` }, 404);
    }

    return streamSSE(c, async (stream) => {
      const bridge = new HonoSseBridge(stream);
      try {
        const { sessionId, completion } = await createExternalSseSession(bridge, messagePath);
        stream.onAbort?.(() => {
          if (closeExternalSseSession) {
            void closeExternalSseSession(sessionId);
          }
        });
        await completion;
      } catch (error) {
        logger.error("Failed to establish MCP SSE stream", {
          err: error,
          serverId,
          path: ssePath,
        });
        await bridge.close();
      }
    });
  });

  app.post(`${DEFAULT_MCP_ROUTE_PREFIX}/:serverId/${DEFAULT_MCP_MESSAGES_SEGMENT}`, async (c) => {
    const serverId = requirePathParam(c, "serverId");
    const { server, metadata } = lookupMcpServer(registry, serverId);
    const typedServer = server as any;
    const { messagePath } = buildMcpRoutePaths(serverId);

    const sseEnabled = metadata?.protocols?.sse ?? typedServer?.hasProtocol?.("sse") ?? true;

    if (!sseEnabled || !typedServer) {
      return c.json({ error: `MCP server '${serverId}' not available for SSE transport` }, 404);
    }

    const handleExternalSseMessage =
      typeof typedServer.handleExternalSseMessage === "function"
        ? typedServer.handleExternalSseMessage.bind(typedServer)
        : undefined;

    const sessionId = c.req.query(MCP_SESSION_QUERY_PARAM);

    if (!sessionId) {
      return c.json({ error: "Missing sessionId" }, 400);
    }

    if (!handleExternalSseMessage) {
      return c.json({ error: `MCP server '${serverId}' not available for SSE transport` }, 404);
    }

    try {
      const bodyText = await c.req.text();
      const headers: Record<string, string> = {};
      for (const [key, value] of c.req.raw.headers) {
        headers[key] = value;
      }
      await handleExternalSseMessage(sessionId, bodyText, headers);
      return c.newResponse(null, { status: 202 });
    } catch (error) {
      logger.error("Failed to handle MCP SSE message request", {
        err: error,
        serverId,
        path: messagePath,
      });
      return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
    }
  });
}
