/**
 * Framework-agnostic custom endpoint types
 */

import type { HttpMethod } from "../routes/definitions";

/**
 * Framework-agnostic custom endpoint handler
 * Takes a generic request and returns a generic response
 */
export type CustomEndpointHandler<TRequest = any, TResponse = any> = (
  request: TRequest,
) => Promise<TResponse> | TResponse;

/**
 * Base custom endpoint definition that can be adapted by any framework
 */
export interface BaseCustomEndpointDefinition<THandler = CustomEndpointHandler> {
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
   * Each framework adapter will convert this to their specific handler type
   */
  handler: THandler;

  /**
   * Optional description for the endpoint
   */
  description?: string;

  /**
   * Optional tags for grouping endpoints
   */
  tags?: string[];

  /**
   * Optional operation ID for OpenAPI
   */
  operationId?: string;

  /**
   * Whether this endpoint requires authentication
   * Defaults to true if not specified
   */
  requiresAuth?: boolean;
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
 * Validates a custom endpoint path
 */
export function validateEndpointPath(path: string): void {
  if (!path || typeof path !== "string") {
    throw new CustomEndpointError("Endpoint path must be a non-empty string");
  }

  if (!path.startsWith("/")) {
    throw new CustomEndpointError("Endpoint path must start with '/'");
  }
}

/**
 * Validates a custom endpoint method
 */
export function validateEndpointMethod(method: string): void {
  const validMethods: HttpMethod[] = ["get", "post", "put", "patch", "delete", "options", "head"];

  if (!validMethods.includes(method as HttpMethod)) {
    throw new CustomEndpointError(
      `Invalid HTTP method: ${method}. Must be one of: ${validMethods.join(", ")}`,
    );
  }
}

/**
 * Base validation for custom endpoints
 * Framework-specific validators can extend this
 */
export function validateBaseCustomEndpoint<T extends BaseCustomEndpointDefinition>(endpoint: T): T {
  validateEndpointPath(endpoint.path);
  validateEndpointMethod(endpoint.method);

  if (!endpoint.handler || typeof endpoint.handler !== "function") {
    throw new CustomEndpointError("Endpoint handler must be a function");
  }

  return endpoint;
}
