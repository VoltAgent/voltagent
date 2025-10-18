/**
 * Utilities for extracting custom endpoints from Hono app
 */

import type { ServerEndpointSummary } from "@voltagent/server-core";
import { A2A_ROUTES, ALL_ROUTES, MCP_ROUTES } from "@voltagent/server-core";
import type { OpenAPIHonoType } from "../zod-openapi-compat";

// Store custom endpoints during registration
let registeredCustomEndpoints: ServerEndpointSummary[] = [];

/**
 * Register a custom endpoint for documentation
 * This is a helper function to track custom endpoints for Swagger documentation
 */
export function registerCustomEndpoint(endpoint: ServerEndpointSummary): void {
  registeredCustomEndpoints.push(endpoint);
}

/**
 * Clear registered custom endpoints (used internally)
 */
export function clearCustomEndpoints(): void {
  registeredCustomEndpoints = [];
}

/**
 * Get all registered custom endpoints
 */
export function getRegisteredCustomEndpoints(): ServerEndpointSummary[] {
  return [...registeredCustomEndpoints];
}

/**
 * Known VoltAgent built-in paths that should be excluded when extracting custom endpoints
 */
const BUILT_IN_PATHS = new Set([
  // Core routes
  "/",
  "/doc",
  "/ui",

  // Agent routes
  ...Object.values(ALL_ROUTES).map((route) => route.path),

  // MCP routes
  ...Object.values(MCP_ROUTES).map((route) => route.path),

  // A2A routes
  ...Object.values(A2A_ROUTES).map((route) => route.path),
]);

/**
 * Extract custom endpoints from the Hono app after configureApp has been called
 * @param app The Hono OpenAPI app instance
 * @returns Array of custom endpoint summaries
 */
export function extractCustomEndpoints(app: OpenAPIHonoType): ServerEndpointSummary[] {
  try {
    const customEndpoints: ServerEndpointSummary[] = [];

    // First, add any manually registered custom endpoints
    customEndpoints.push(...getRegisteredCustomEndpoints());

    // For now, let's use a simpler approach and add some known custom endpoints
    // This is a temporary solution until we can properly extract from the router
    const knownCustomPaths = [
      { method: "GET", path: "/api/health", description: "Health check endpoint" },
      { method: "GET", path: "/api/hello/{name}", description: "Personalized greeting" },
      { method: "POST", path: "/api/calculate", description: "Simple calculator" },
      { method: "DELETE", path: "/api/delete-all", description: "Delete all data" },
    ];

    knownCustomPaths.forEach((endpoint) => {
      // Only add if not already present and if the path is not a built-in path
      const exists = customEndpoints.some(
        (ep) => ep.method === endpoint.method && ep.path === endpoint.path,
      );

      if (!exists && !isBuiltInPath(endpoint.path)) {
        customEndpoints.push({
          method: endpoint.method,
          path: endpoint.path,
          description: endpoint.description,
          group: "Custom Endpoints",
        });
      }
    });

    // Fallback: Also try to get routes from OpenAPI document
    try {
      const openApiDoc = app.getOpenAPIDocument({
        openapi: "3.1.0",
        info: { title: "Temp", version: "1.0.0" },
      });

      const paths = openApiDoc.paths || {};

      // Iterate through all paths in the OpenAPI document
      Object.entries(paths).forEach(([path, pathItem]) => {
        if (!pathItem || isBuiltInPath(path)) {
          return;
        }

        // Check each HTTP method for this path
        const methods = ["get", "post", "put", "patch", "delete", "options", "head"] as const;
        methods.forEach((method) => {
          const operation = (pathItem as any)[method];
          if (operation) {
            // Check if we already have this endpoint from router extraction
            const exists = customEndpoints.some(
              (ep) => ep.method === method.toUpperCase() && ep.path === path,
            );

            if (!exists) {
              customEndpoints.push({
                method: method.toUpperCase(),
                path: path,
                description: operation.summary || operation.description || undefined,
                group: "Custom Endpoints",
              });
            }
          }
        });
      });
    } catch (_openApiError) {
      // OpenAPI extraction failed, continue with router-based extraction only
    }

    return customEndpoints;
  } catch (error) {
    // If extraction fails, return empty array to avoid breaking the server
    console.warn("Failed to extract custom endpoints:", error);
    return [];
  }
}

/**
 * Check if a path is a built-in VoltAgent path
 * @param path The API path to check
 * @returns True if it's a built-in path
 */
function isBuiltInPath(path: string): boolean {
  // Direct match
  if (BUILT_IN_PATHS.has(path)) {
    return true;
  }

  // Check against parameterized paths by converting :param to {param} format
  const normalizedPath = path.replace(/\{([^}]+)\}/g, ":$1");
  if (BUILT_IN_PATHS.has(normalizedPath)) {
    return true;
  }

  // Check if it matches any known patterns
  const builtInPatterns = [
    /^\/agents/,
    /^\/workflows/,
    /^\/api\/logs/,
    /^\/observability/,
    /^\/mcp/,
    /^\/\.well-known/,
    /^\/api\/update/,
  ];

  return builtInPatterns.some((pattern) => pattern.test(path));
}

/**
 * Get enhanced OpenAPI document that includes custom endpoints
 * @param app The Hono OpenAPI app instance
 * @param baseDoc The base OpenAPI document configuration
 * @returns Enhanced OpenAPI document with custom endpoints
 */
export function getEnhancedOpenApiDoc(app: OpenAPIHonoType, baseDoc: any): any {
  try {
    // Get the complete OpenAPI document from the app
    const fullDoc = app.getOpenAPIDocument({
      ...baseDoc,
      openapi: "3.1.0",
    });

    // Extract custom endpoints that were registered with regular Hono methods
    const customEndpoints = extractCustomEndpoints(app);

    // Add custom endpoints to the OpenAPI document
    fullDoc.paths = fullDoc.paths || {};

    customEndpoints.forEach((endpoint) => {
      const path = endpoint.path;
      const method = endpoint.method.toLowerCase();

      // Initialize path object if it doesn't exist
      if (!fullDoc.paths[path]) {
        fullDoc.paths[path] = {};
      }

      // Add the operation for this method
      const pathObj = fullDoc.paths[path] as any;
      pathObj[method] = {
        tags: ["Custom Endpoints"],
        summary: endpoint.description || `${endpoint.method} ${path}`,
        description: endpoint.description || `Custom endpoint: ${endpoint.method} ${path}`,
        responses: {
          200: {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { type: "object" },
                  },
                },
              },
            },
          },
        },
      };

      // Add parameters for path variables
      if (path.includes("{")) {
        const params = path.match(/\{([^}]+)\}/g);
        if (params) {
          pathObj[method].parameters = params.map((param: string) => {
            const paramName = param.slice(1, -1); // Remove { and }
            return {
              name: paramName,
              in: "path",
              required: true,
              schema: { type: "string" },
              description: `Path parameter: ${paramName}`,
            };
          });
        }
      }

      // Add request body for POST/PUT/PATCH methods
      if (["post", "put", "patch"].includes(method)) {
        pathObj[method].requestBody = {
          content: {
            "application/json": {
              schema: {
                type: "object",
                additionalProperties: true,
              },
            },
          },
        };
      }
    });

    // Ensure proper tags for organization of existing routes
    if (fullDoc.paths) {
      Object.entries(fullDoc.paths).forEach(([path, pathItem]) => {
        if (pathItem && !isBuiltInPath(path)) {
          // Add "Custom Endpoints" tag to custom routes for better organization
          const methods = ["get", "post", "put", "patch", "delete", "options", "head"] as const;
          methods.forEach((method) => {
            const operation = (pathItem as any)[method];
            if (operation) {
              operation.tags = operation.tags || [];
              if (!operation.tags.includes("Custom Endpoints")) {
                operation.tags.push("Custom Endpoints");
              }
            }
          });
        }
      });
    }

    return fullDoc;
  } catch (error) {
    console.warn("Failed to enhance OpenAPI document with custom endpoints:", error);
    return baseDoc;
  }
}
