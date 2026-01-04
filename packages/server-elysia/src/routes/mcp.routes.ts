import type { Logger } from "@voltagent/internal";
import type { MCPServerRegistry } from "@voltagent/mcp-server";
import {
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
} from "@voltagent/server-core";
import type { Elysia } from "elysia";
import { t } from "elysia";
import {
  ErrorSchema,
  McpPromptListSchema,
  McpPromptResponseSchema,
  McpResourceListSchema,
  McpResourceResponseSchema,
  McpResourceTemplateListSchema,
  McpServerListSchema,
  McpServerResponseSchema,
  McpToolListSchema,
  McpToolResponseSchema,
} from "../schemas";

interface McpDeps {
  mcp?: {
    registry: MCPServerRegistry;
  };
}

/**
 * MCP Server ID parameter schema
 */
const ServerIdParam = t.Object({
  serverId: t.String({ description: "The ID of the MCP server" }),
});

/**
 * MCP Tool Name parameters schema
 */
const ToolNameParams = t.Object({
  serverId: t.String({ description: "The ID of the MCP server" }),
  toolName: t.String({ description: "The name of the MCP tool" }),
});

/**
 * MCP Prompt Name parameters schema
 */
const PromptNameParams = t.Object({
  serverId: t.String({ description: "The ID of the MCP server" }),
  promptName: t.String({ description: "The name of the MCP prompt" }),
});

/**
 * MCP Tool invocation request schema
 */
const McpInvokeToolRequestSchema = t.Object({
  arguments: t.Optional(t.Any({ description: "Tool arguments" })),
  context: t.Optional(
    t.Object({
      userId: t.Optional(t.String({ description: "User ID" })),
      sessionId: t.Optional(t.String({ description: "Session ID" })),
      metadata: t.Optional(t.Record(t.String(), t.Unknown())),
    }),
  ),
});

/**
 * MCP Set log level request schema
 */
const McpSetLogLevelRequestSchema = t.Object({
  level: t.Union([t.Literal("debug"), t.Literal("info"), t.Literal("warn"), t.Literal("error")], {
    description: "Log level to set for the MCP server",
  }),
});

/**
 * MCP Get prompt request schema (query parameters)
 */
const McpGetPromptQuery = t.Object({
  arguments: t.Optional(t.String({ description: "JSON-encoded arguments for the prompt" })),
});

/**
 * MCP Resource URI query parameter schema
 */
const ResourceUriQuery = t.Object({
  uri: t.String({ description: "The URI of the resource to read" }),
});

/**
 * Register MCP (Model Context Protocol) routes with validation and OpenAPI documentation
 */
export function registerMcpRoutes(app: Elysia, deps: McpDeps, logger: Logger): void {
  if (!deps.mcp?.registry) {
    logger.debug("MCP registry not available, skipping MCP routes");
    return;
  }

  const registry = deps.mcp.registry;

  // GET /mcp - List all MCP servers
  app.get(
    "/mcp",
    async () => {
      const response = handleListMcpServers(registry);
      if (!response.success) {
        throw new Error("Failed to list MCP servers");
      }
      return response;
    },
    {
      response: {
        200: McpServerListSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "List MCP servers",
        description: "Retrieves a list of all registered Model Context Protocol servers",
        tags: ["MCP"],
      },
    },
  );

  // GET /mcp/:serverId - Get MCP server details
  app.get(
    "/mcp/:serverId",
    async ({ params }) => {
      const response = handleGetMcpServer(registry, params.serverId);
      if (!response.success) {
        throw new Error("MCP server not found");
      }
      return response;
    },
    {
      params: ServerIdParam,
      response: {
        200: McpServerResponseSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "Get MCP server details",
        description: "Retrieves detailed information about a specific MCP server",
        tags: ["MCP"],
      },
    },
  );

  // GET /mcp/:serverId/tools - List tools for an MCP server
  app.get(
    "/mcp/:serverId/tools",
    async ({ params }) => {
      const response = handleListMcpServerTools(registry, logger, params.serverId);
      if (!response.success) {
        throw new Error("Failed to list MCP tools");
      }
      return response;
    },
    {
      params: ServerIdParam,
      response: {
        200: McpToolListSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "List MCP server tools",
        description: "Retrieves a list of all tools available on a specific MCP server",
        tags: ["MCP"],
      },
    },
  );

  // POST /mcp/:serverId/tools/:toolName/invoke - Invoke an MCP tool
  app.post(
    "/mcp/:serverId/tools/:toolName/invoke",
    async ({ params, body }) => {
      const response = await handleInvokeMcpServerTool(
        registry,
        logger,
        params.serverId,
        params.toolName,
        body,
      );
      if (!response.success) {
        throw new Error("Failed to invoke MCP tool");
      }
      return response;
    },
    {
      params: ToolNameParams,
      body: McpInvokeToolRequestSchema,
      response: {
        200: McpToolResponseSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "Invoke MCP tool",
        description: "Executes a tool on a specific MCP server with the provided arguments",
        tags: ["MCP"],
      },
    },
  );

  // POST /mcp/:serverId/logging/level - Set log level for MCP server
  app.post(
    "/mcp/:serverId/logging/level",
    async ({ params, body }) => {
      const response = await handleSetMcpLogLevel(registry, logger, params.serverId, body);
      if (!response.success) {
        throw new Error("Failed to set log level");
      }
      return response;
    },
    {
      params: ServerIdParam,
      body: McpSetLogLevelRequestSchema,
      response: {
        200: t.Object({ success: t.Literal(true), data: t.Any() }),
        500: ErrorSchema,
      },
      detail: {
        summary: "Set MCP server log level",
        description: "Changes the logging level for a specific MCP server",
        tags: ["MCP"],
      },
    },
  );

  // GET /mcp/:serverId/prompts - List prompts for an MCP server
  app.get(
    "/mcp/:serverId/prompts",
    async ({ params }) => {
      const response = await handleListMcpPrompts(registry, logger, params.serverId);
      if (!response.success) {
        throw new Error("Failed to list MCP prompts");
      }
      return response;
    },
    {
      params: ServerIdParam,
      response: {
        200: McpPromptListSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "List MCP server prompts",
        description: "Retrieves a list of all prompts available on a specific MCP server",
        tags: ["MCP"],
      },
    },
  );

  // GET /mcp/:serverId/prompts/:promptName - Get a specific prompt
  app.get(
    "/mcp/:serverId/prompts/:promptName",
    async ({ params, query, set }) => {
      // Parse arguments from query string if present
      let promptArgs: any;
      if (query.arguments) {
        try {
          promptArgs = JSON.parse(query.arguments);
        } catch (_error) {
          set.status = 400;
          return { success: false, error: "Invalid JSON in arguments parameter" };
        }
      }

      const response = await handleGetMcpPrompt(registry, logger, params.serverId, {
        name: params.promptName,
        arguments: promptArgs,
      });
      if (!response.success) {
        throw new Error("Failed to get MCP prompt");
      }
      return response;
    },
    {
      params: PromptNameParams,
      query: McpGetPromptQuery,
      response: {
        200: McpPromptResponseSchema,
        400: ErrorSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "Get MCP prompt",
        description: "Retrieves a specific prompt from an MCP server, optionally with arguments",
        tags: ["MCP"],
      },
    },
  );

  // GET /mcp/:serverId/resources - List resources for an MCP server
  app.get(
    "/mcp/:serverId/resources",
    async ({ params }) => {
      const response = await handleListMcpResources(registry, logger, params.serverId);
      if (!response.success) {
        throw new Error("Failed to list MCP resources");
      }
      return response;
    },
    {
      params: ServerIdParam,
      response: {
        200: McpResourceListSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "List MCP server resources",
        description: "Retrieves a list of all resources available on a specific MCP server",
        tags: ["MCP"],
      },
    },
  );

  // GET /mcp/:serverId/resources/read - Read a specific resource
  app.get(
    "/mcp/:serverId/resources/read",
    async ({ params, query }) => {
      const response = await handleGetMcpResource(registry, logger, params.serverId, query.uri);
      if (!response.success) {
        throw new Error("Failed to read MCP resource");
      }
      return response;
    },
    {
      params: ServerIdParam,
      query: ResourceUriQuery,
      response: {
        200: McpResourceResponseSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "Read MCP resource",
        description: "Reads a specific resource from an MCP server by URI",
        tags: ["MCP"],
      },
    },
  );

  // GET /mcp/:serverId/resources/templates - List resource templates
  app.get(
    "/mcp/:serverId/resources/templates",
    async ({ params }) => {
      const response = await handleListMcpResourceTemplates(registry, logger, params.serverId);
      if (!response.success) {
        throw new Error("Failed to list MCP resource templates");
      }
      return response;
    },
    {
      params: ServerIdParam,
      response: {
        200: McpResourceTemplateListSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "List MCP resource templates",
        description:
          "Retrieves a list of all resource templates available on a specific MCP server",
        tags: ["MCP"],
      },
    },
  );
}
