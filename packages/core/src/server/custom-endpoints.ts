import { Context } from "hono";
import { z } from "zod";

/**
 * HTTP methods supported by custom endpoints
 */
export type HttpMethod = "get" | "post" | "put" | "patch" | "delete" | "options" | "head";

/**
 * Handler function for custom endpoints
 */
export type CustomEndpointHandler = (c: Context) => Promise<Response> | Response;

/**
 * Schema for validating custom endpoint definitions
 */
export const CustomEndpointSchema = z.object({
  path: z.string().startsWith("/"),
  method: z.enum(["get", "post", "put", "patch", "delete", "options", "head"]),
  handler: z.function().args(z.any()).returns(z.any()),
  description: z.string().optional(),
});

/**
 * Definition for a custom endpoint
 */
export interface CustomEndpointDefinition {
  /**
   * The path for the endpoint, relative to the API root
   * Example: "/custom-endpoint" or "/custom/:param"
   */
  path: string;

  /**
   * The HTTP method for the endpoint
   */
  method: HttpMethod;

  /**
   * The handler function for the endpoint
   */
  handler: CustomEndpointHandler;

  /**
   * Optional description for the endpoint
   */
  description?: string;
}

/**
 * Error thrown when a custom endpoint definition is invalid
 */
export class CustomEndpointError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomEndpointError";
  }
}

/**
 * Validates a custom endpoint definition
 * @param endpoint The endpoint definition to validate
 * @returns The validated endpoint definition
 * @throws CustomEndpointError if the endpoint definition is invalid
 */
export function validateCustomEndpoint(
  endpoint: CustomEndpointDefinition,
): CustomEndpointDefinition {
  try {
    return CustomEndpointSchema.parse(endpoint);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new CustomEndpointError(`Invalid custom endpoint definition: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Validates an array of custom endpoint definitions
 * @param endpoints The endpoint definitions to validate
 * @returns The validated endpoint definitions
 * @throws CustomEndpointError if any endpoint definition is invalid
 */
export function validateCustomEndpoints(
  endpoints: CustomEndpointDefinition[],
): CustomEndpointDefinition[] {
  if (!endpoints || !Array.isArray(endpoints)) {
    throw new CustomEndpointError("Custom endpoints must be an array");
  }

  if (endpoints.length === 0) {
    return [];
  }

  return endpoints.map(validateCustomEndpoint);
}
