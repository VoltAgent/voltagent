import type { ServerProviderDeps } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import { handleExecuteTool, handleListTools } from "@voltagent/server-core";
import type { Elysia } from "elysia";
import { t } from "elysia";
import { ErrorSchema, ToolExecutionResponseSchema, ToolListSchema } from "../schemas";

/**
 * Tool name parameter schema
 */
const ToolNameParam = t.Object({
  name: t.String({ description: "The name of the tool to execute" }),
});

/**
 * Tool execution request schema
 */
const ToolExecutionRequestSchema = t.Object({
  input: t.Optional(t.Any({ description: "Input parameters for the tool execution" })),
  context: t.Optional(
    t.Object({
      userId: t.Optional(t.String({ description: "User ID for context" })),
      conversationId: t.Optional(t.String({ description: "Conversation ID for context" })),
      metadata: t.Optional(
        t.Record(t.String(), t.Unknown(), {
          description: "Additional metadata for context",
        }),
      ),
    }),
  ),
});

/**
 * Register tool routes with validation and OpenAPI documentation
 */
export function registerToolRoutes(app: Elysia, deps: ServerProviderDeps, logger: Logger): void {
  // GET /tools - List all tools
  app.get(
    "/tools",
    async ({ set }) => {
      const response = await handleListTools(deps, logger);
      if (!response.success) {
        const { httpStatus, ...details } = response;
        set.status = httpStatus || 500;
        return details;
      }
      return response;
    },
    {
      response: {
        200: ToolListSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "List all tools",
        description:
          "Retrieves a list of all available tools from all registered agents and workflows",
        tags: ["Tools"],
      },
    },
  );

  // POST /tools/:name/execute - Execute a tool
  app.post(
    "/tools/:name/execute",
    async ({ params, body, set }) => {
      const response = await handleExecuteTool(params.name, body, deps, logger);
      if (!response.success) {
        const { httpStatus, ...details } = response;
        set.status = httpStatus || 500;
        return details;
      }
      return response;
    },
    {
      params: ToolNameParam,
      body: ToolExecutionRequestSchema,
      response: {
        200: ToolExecutionResponseSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "Execute tool",
        description: "Executes a specific tool by name with the provided input parameters",
        tags: ["Tools"],
      },
    },
  );
}
