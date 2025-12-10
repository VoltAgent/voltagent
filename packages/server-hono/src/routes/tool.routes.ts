import type { ServerProviderDeps } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import {
  ErrorSchema,
  TOOL_ROUTES,
  handleExecuteTool,
  handleListTools,
} from "@voltagent/server-core";
import { createRoute, z } from "../zod-openapi-compat";
import type { OpenAPIHonoType } from "../zod-openapi-compat";
import { createPathParam } from "./path-params";

const toolNameParam = () => createPathParam("name", "The name of the tool", "web_search");

const ToolDefinitionSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  parameters: z.record(z.any()).optional(),
  status: z.string().optional(),
  agents: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().optional(),
      }),
    )
    .optional(),
  tags: z.array(z.string()).optional(),
});

const ToolListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(ToolDefinitionSchema),
});

const ToolExecuteRequestSchema = z
  .object({
    input: z.any().optional().default({}),
    context: z.record(z.any()).optional().default({}),
    userId: z.string().optional(),
    conversationId: z.string().optional(),
  })
  .default({ input: {}, context: {} });

const ToolExecuteResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    toolName: z.string(),
    agentId: z.string().optional(),
    result: z.any(),
    executionTime: z.number().optional(),
    timestamp: z.string().optional(),
  }),
});

export const listToolsRoute = createRoute({
  method: TOOL_ROUTES.listTools.method,
  path: TOOL_ROUTES.listTools.path,
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ToolListResponseSchema,
        },
      },
      description: TOOL_ROUTES.listTools.responses?.[200]?.description,
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: TOOL_ROUTES.listTools.responses?.[500]?.description,
    },
  },
  tags: [...TOOL_ROUTES.listTools.tags],
  summary: TOOL_ROUTES.listTools.summary,
  description: TOOL_ROUTES.listTools.description,
});

export const executeToolRoute = createRoute({
  method: TOOL_ROUTES.executeTool.method,
  path: TOOL_ROUTES.executeTool.path.replace(":name", "{name}"),
  request: {
    params: z.object({
      name: toolNameParam(),
    }),
    body: {
      content: {
        "application/json": {
          schema: ToolExecuteRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ToolExecuteResponseSchema,
        },
      },
      description: TOOL_ROUTES.executeTool.responses?.[200]?.description,
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: TOOL_ROUTES.executeTool.responses?.[400]?.description,
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: TOOL_ROUTES.executeTool.responses?.[404]?.description,
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: TOOL_ROUTES.executeTool.responses?.[500]?.description,
    },
  },
  tags: [...TOOL_ROUTES.executeTool.tags],
  summary: TOOL_ROUTES.executeTool.summary,
  description: TOOL_ROUTES.executeTool.description,
});

export function registerToolRoutes(app: OpenAPIHonoType, deps: ServerProviderDeps, logger: Logger) {
  app.openapi(listToolsRoute, async (c) => {
    const response = await handleListTools(deps, logger);
    const status = response.success ? 200 : response.httpStatus || 500;
    return c.json(response, status);
  });

  app.openapi(executeToolRoute, async (c) => {
    const toolName = c.req.param("name");
    const body = await c.req.json();
    const response = await handleExecuteTool(toolName, body, deps, logger);
    const status = response.success ? 200 : response.httpStatus || 500;
    return c.json(response, status);
  });
}
