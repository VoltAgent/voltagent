/**
 * Utilities for extracting custom endpoints from Elysia app
 */

import type { ServerEndpointSummary } from "@voltagent/server-core";
import { A2A_ROUTES, ALL_ROUTES, MCP_ROUTES } from "@voltagent/server-core";
import type { Elysia } from "elysia";

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
 * Extract custom endpoints from the Elysia app after configureApp has been called
 * @param app The Elysia app instance
 * @returns Array of custom endpoint summaries
 */
export function extractCustomEndpoints(app: Elysia): ServerEndpointSummary[] {
  try {
    const customEndpoints: ServerEndpointSummary[] = [];
    const seenRoutes = new Set<string>();

    // Extract routes from Elysia app
    try {
      const routes = (app as any).routes;

      if (routes && Array.isArray(routes)) {
        for (const route of routes) {
          if (!route.method || !route.path) {
            continue;
          }

          // Normalize path - remove duplicate slashes
          const fullPath = route.path.replace(/\/+/g, "/");

          // Skip built-in VoltAgent paths
          if (isBuiltInPath(fullPath)) {
            continue;
          }

          const routeKey = `${route.method.toUpperCase()}:${fullPath}`;
          if (!seenRoutes.has(routeKey)) {
            seenRoutes.add(routeKey);
            customEndpoints.push({
              method: route.method.toUpperCase(),
              path: fullPath,
              group: "Custom Endpoints",
            });
          }
        }
      }
    } catch (_routesError) {
      // Routes extraction failed, continue
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
  // Normalize path by removing duplicate slashes and ensuring single leading slash
  const normalizedPath = path.replace(/\/+/g, "/").replace(/^\/+/, "/");

  // Direct match against known built-in paths
  if (BUILT_IN_PATHS.has(normalizedPath)) {
    return true;
  }

  // Check against parameterized paths by converting :param to {param} format
  // This handles cases like "/agents/:id" vs "/agents/{id}"
  const paramNormalized = normalizedPath.replace(/\{([^}]+)\}/g, ":$1");
  if (BUILT_IN_PATHS.has(paramNormalized)) {
    return true;
  }

  // Not a built-in path - it's a custom endpoint
  return false;
}

/**
 * Get enhanced OpenAPI documentation including custom endpoints
 * Note: Elysia has built-in OpenAPI support via @elysiajs/swagger
 * This function is primarily for compatibility with the VoltAgent pattern
 * @param app The Elysia app instance
 * @param baseDoc The base OpenAPI document configuration
 * @returns Enhanced OpenAPI document with custom endpoints
 */
export function getEnhancedOpenApiDoc(app: Elysia, baseDoc: any): any {
  try {
    // Extract custom endpoints that were registered with regular Elysia methods
    const customEndpoints = extractCustomEndpoints(app);

    // If no custom endpoints and baseDoc has meaningful structure (info but no paths),
    // return baseDoc unchanged to avoid polluting it
    if (
      customEndpoints.length === 0 &&
      baseDoc &&
      baseDoc.info &&
      !baseDoc.paths &&
      !baseDoc.openapi
    ) {
      return baseDoc;
    }

    // Start with the base document structure
    const fullDoc = {
      ...baseDoc,
      openapi: baseDoc?.openapi || "3.1.0",
      paths: { ...(baseDoc?.paths || {}) },
    };

    // Add custom endpoints to the OpenAPI document
    customEndpoints.forEach((endpoint) => {
      const path = endpoint.path;
      const method = endpoint.method.toLowerCase();

      // Initialize path object if it doesn't exist
      if (!fullDoc.paths[path]) {
        fullDoc.paths[path] = {};
      }

      // Skip if this operation already exists in OpenAPI doc (don't overwrite)
      const pathObj = fullDoc.paths[path] as any;
      if (pathObj[method]) {
        return;
      }

      // Add the operation for this method (only for routes not in OpenAPI doc)
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

      // Add parameters for path variables (support both :param and {param} formats)
      const pathWithBraces = path.replace(/:([a-zA-Z0-9_]+)/g, "{$1}");
      if (pathWithBraces.includes("{")) {
        const params = pathWithBraces.match(/\{([^}]+)\}/g);
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
            if (operation && !operation.tags?.includes("Custom Endpoints")) {
              // Ensure we don't mutate the original pathItem or operation
              fullDoc.paths[path] = {
                ...(fullDoc.paths[path] as any),
                [method]: {
                  ...operation,
                  tags: [...(operation.tags || []), "Custom Endpoints"],
                },
              };
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
