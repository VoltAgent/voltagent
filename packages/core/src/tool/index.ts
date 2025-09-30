import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import type { BaseTool, ToolSchema } from "../agent/providers/base/types";
import type { OperationContext } from "../agent/types";
import { LoggerProxy } from "../logger";
import type { Context } from "hono";
import type { CustomEndpointDefinition } from "../server/custom-endpoints";

// Export ToolManager and related types
export { ToolManager, ToolStatus, ToolStatusInfo } from "./manager";
// Export Toolkit type and createToolkit function
export { type Toolkit, createToolkit } from "./toolkit";

/**
 * Tool definition compatible with Vercel AI SDK
 */
export type AgentTool = BaseTool;

/**
 * Endpoint configuration for tools
 */
export interface ToolEndpointConfig {
  /**
   * Whether to auto-generate an endpoint for this tool
   * @default false
   */
  enabled?: boolean;

  /**
   * HTTP method for the endpoint
   * @default "post"
   */
  method?: "get" | "post" | "put" | "patch" | "delete";

  /**
   * Custom path for the endpoint (overrides default)
   */
  path?: string;

  /**
   * Whether to support GET requests with query parameters
   * @default false
   */
  supportsGet?: boolean;

  /**
   * Custom response transformer
   */
  responseTransformer?: (result: unknown, context: Context) => unknown;

  /**
   * Custom error handler
   */
  errorHandler?: (error: Error, context: Context) => Response | Promise<Response>;

  /**
   * Authentication configuration
   */
  auth?: {
    required: boolean;
    roles?: string[];
  };

  /**
   * Rate limiting configuration
   */
  rateLimit?: {
    requests: number;
    window: number; // seconds
  };

  /**
   * Additional metadata for the endpoint
   */
  metadata?: Record<string, unknown>;
}

/**
 * Tool options for creating a new tool
 */
export type ToolOptions<
  T extends ToolSchema = ToolSchema,
  O extends ToolSchema | undefined = undefined,
> = {
  /**
   * Unique identifier for the tool
   */
  id?: string;

  /**
   * Name of the tool
   */
  name: string;

  /**
   * Description of the tool
   */
  description: string;

  /**
   * Tool parameter schema
   */
  parameters: T;

  /**
   * Tool output schema (optional)
   */
  outputSchema?: O;

  /**
   * Function to execute when the tool is called
   */
  execute: (
    args: z.infer<T>,
    context?: OperationContext,
  ) => Promise<O extends ToolSchema ? z.infer<O> : unknown>;

  /**
   * Optional endpoint configuration
   * Set enabled: true to expose this tool as an HTTP endpoint
   */
  endpoint?: ToolEndpointConfig;
};

/**
 * Tool class for defining tools that agents can use
 */
export class Tool<T extends ToolSchema = ToolSchema, O extends ToolSchema | undefined = undefined> {
  /* implements BaseTool<z.infer<T>> */
  /**
   * Unique identifier for the tool
   */
  readonly id: string;

  /**
   * Name of the tool
   */
  readonly name: string;

  /**
   * Description of the tool
   */
  readonly description: string;

  /**
   * Tool parameter schema
   */
  readonly parameters: T;

  /**
   * Tool output schema
   */
  readonly outputSchema?: O;

  /**
   * Function to execute when the tool is called
   */
  readonly execute: (
    args: z.infer<T>,
    context?: OperationContext,
  ) => Promise<O extends ToolSchema ? z.infer<O> : unknown>;

  /**
   * Optional endpoint configuration
   */
  readonly endpoint?: ToolEndpointConfig;

  /**
   * Create a new tool
   */
  constructor(options: ToolOptions<T, O>) {
    if (!options.name) {
      throw new Error("Tool name is required");
    }
    if (!options.description) {
      const logger = new LoggerProxy({ component: "tool" });
      logger.warn(`Tool '${options.name}' created without a description`);
    }
    if (!options.parameters) {
      throw new Error(`Tool '${options.name}' parameters schema is required`);
    }
    if (!options.execute) {
      throw new Error(`Tool '${options.name}' execute function is required`);
    }

    this.id = options.id || uuidv4();
    this.name = options.name;
    this.description = options.description || "";
    this.parameters = options.parameters;
    this.outputSchema = options.outputSchema;
    this.execute = options.execute;
    this.endpoint = options.endpoint;
  }

  /**
   * Check if this tool can be exposed as an endpoint
   */
  canBeEndpoint(): boolean {
    return this.endpoint?.enabled === true;
  }

  /**
   * Generate a custom endpoint definition for this tool
   */
  toEndpoint(basePath: string = "/tools"): CustomEndpointDefinition | null {
    if (!this.canBeEndpoint()) {
      return null;
    }

    const path = this.endpoint?.path || `${basePath}/${this.name}`;
    const method = this.endpoint?.method || "post";

    const handler = async (c: Context) => {
      try {
        // Get parameters from request body or query params
        let params: z.infer<T>;

        if (c.req.method === "GET" && this.endpoint?.supportsGet) {
          // Parse query parameters
          const query = c.req.query();
          params = this.parameters.parse(query);
        } else {
          // Parse JSON body
          params = await c.req.json();
          params = this.parameters.parse(params);
        }

        // Execute the tool
        const result = await this.execute(params);

        // Use custom response transformer if provided
        if (this.endpoint?.responseTransformer) {
          const transformed = this.endpoint.responseTransformer(result, c);
          return c.json(transformed as any);
        }

        // Default response format
        return c.json({
          success: true,
          data: result,
          tool: this.name,
        });
      } catch (error) {
        // Use custom error handler if provided
        if (this.endpoint?.errorHandler) {
          return this.endpoint.errorHandler(error as Error, c);
        }

        // Default error handling
        if (error instanceof z.ZodError) {
          return c.json(
            {
              success: false,
              error: "Invalid parameters",
              details: error.errors,
              tool: this.name,
            },
            400,
          );
        }

        return c.json(
          {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            tool: this.name,
          },
          500,
        );
      }
    };

    return {
      path,
      method,
      handler,
      description: `Auto-generated endpoint for ${this.name}: ${this.description}`,
    };
  }

  /**
   * Get endpoint metadata for documentation
   */
  getEndpointInfo(basePath: string = "/tools") {
    if (!this.canBeEndpoint()) {
      return null;
    }

    return {
      name: this.name,
      description: this.description,
      path: this.endpoint?.path || `${basePath}/${this.name}`,
      method: this.endpoint?.method || "post",
      supportsGet: this.endpoint?.supportsGet || false,
      parameters: this.parameters._def,
      auth: this.endpoint?.auth,
      rateLimit: this.endpoint?.rateLimit,
      metadata: this.endpoint?.metadata,
    };
  }
}

/**
 * Helper function for creating a new tool
 */
export function createTool<T extends ToolSchema>(
  options: ToolOptions<T, undefined>,
): Tool<T, undefined>;
export function createTool<T extends ToolSchema, O extends ToolSchema>(
  options: ToolOptions<T, O>,
): Tool<T, O>;
export function createTool<T extends ToolSchema, O extends ToolSchema | undefined = undefined>(
  options: ToolOptions<T, O>,
): Tool<T, O> {
  return new Tool<T, O>(options);
}

/**
 * Alias for createTool function
 */
export const tool = createTool;

/**
 * Generate endpoints from tools that have endpoint configuration enabled
 */
export function generateEndpointsFromTools(
  tools: Tool<any>[],
  options: {
    basePath?: string;
    includeBatch?: boolean;
    includeListing?: boolean;
  } = {},
): CustomEndpointDefinition[] {
  const { basePath = "/tools", includeBatch = true, includeListing = true } = options;
  const endpoints: CustomEndpointDefinition[] = [];
  const enabledTools = tools.filter((tool) => tool.canBeEndpoint());

  if (enabledTools.length === 0) {
    console.warn("[Tool] No tools with enabled endpoints found");
    return endpoints;
  }

  // Create individual tool endpoints
  for (const tool of enabledTools) {
    const endpoint = tool.toEndpoint(basePath);
    if (endpoint) {
      endpoints.push(endpoint);
    }
  }

  // Create batch endpoint if requested and we have multiple tools
  if (includeBatch && enabledTools.length > 1) {
    endpoints.push(createBatchEndpoint(enabledTools, basePath));
  }

  // Create listing endpoint if requested
  if (includeListing) {
    endpoints.push(createListingEndpoint(enabledTools, basePath));
  }

  return endpoints;
}

/**
 * Create a batch execution endpoint for multiple tools
 */
function createBatchEndpoint(
  tools: Tool<any>[],
  basePath: string = "/tools",
): CustomEndpointDefinition {
  const toolMap = new Map(tools.map((tool) => [tool.name, tool]));

  const handler = async (c: Context) => {
    try {
      const body = await c.req.json();
      const { tools: toolRequests } = body;

      if (!Array.isArray(toolRequests)) {
        return c.json(
          {
            success: false,
            error: "Expected 'tools' array in request body",
          },
          400,
        );
      }

      const results = [];
      for (const request of toolRequests) {
        const { name, parameters } = request;
        const tool = toolMap.get(name);

        if (!tool) {
          results.push({
            tool: name,
            success: false,
            error: `Tool '${name}' not found`,
          });
          continue;
        }

        try {
          const result = await tool.execute(parameters);
          results.push({
            tool: name,
            success: true,
            data: result,
          });
        } catch (error) {
          results.push({
            tool: name,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return c.json({
        success: true,
        results,
        toolsExecuted: results.length,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        500,
      );
    }
  };

  return {
    path: `${basePath}/batch`,
    method: "post",
    handler,
    description: "Execute multiple tools in a single request",
  };
}

/**
 * Create a listing endpoint that shows all available tools
 */
function createListingEndpoint(
  tools: Tool<any>[],
  basePath: string = "/tools",
): CustomEndpointDefinition {
  const handler = async (c: Context) => {
    const toolsInfo = tools.map((tool) => tool.getEndpointInfo(basePath)).filter(Boolean);

    return c.json({
      success: true,
      data: {
        tools: toolsInfo,
        count: toolsInfo.length,
        basePath,
        endpoints: {
          batch: `${basePath}/batch`,
          individual: toolsInfo
            .map((tool) =>
              tool
                ? {
                    name: tool.name,
                    path: tool.path,
                    method: tool.method,
                  }
                : null,
            )
            .filter(Boolean),
        },
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        version: "1.0",
      },
    });
  };

  return {
    path: basePath,
    method: "get",
    handler,
    description: "List all available tools and their endpoints",
  };
}
