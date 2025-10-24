/**
 * Utilities for extracting custom endpoints from Hono app
 */

import type { ServerEndpointSummary } from "@voltagent/server-core";
import { A2A_ROUTES, ALL_ROUTES, MCP_ROUTES } from "@voltagent/server-core";
import type { OpenAPIHonoType } from "../zod-openapi-compat";

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
    const seenRoutes = new Set<string>();

    // First, extract routes from app.routes (includes ALL Hono routes, even non-OpenAPI ones)
    try {
      if (app.routes && Array.isArray(app.routes)) {
        app.routes.forEach((route) => {
          // Construct full path and normalize it
          const rawPath = route.basePath ? `${route.basePath}${route.path}` : route.path;
          const fullPath = rawPath.replace(/\/+/g, "/"); // Remove duplicate slashes

          // Skip built-in VoltAgent paths
          if (isBuiltInPath(fullPath)) {
            return;
          }

          const routeKey = `${route.method}:${fullPath}`;
          if (!seenRoutes.has(routeKey)) {
            seenRoutes.add(routeKey);
            customEndpoints.push({
              method: route.method.toUpperCase(),
              path: fullPath,
              group: "Custom Endpoints",
            });
          }
        });
      }
    } catch (_routesError) {
      // Routes extraction failed, continue with OpenAPI extraction
    }

    // Then, extract routes from OpenAPI document to get descriptions
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
            const routeKey = `${method.toUpperCase()}:${path}`;

            // Update existing route with description or add new one
            const existingIndex = customEndpoints.findIndex(
              (ep) => `${ep.method}:${ep.path}` === routeKey,
            );

            if (existingIndex >= 0) {
              // Update existing route with description from OpenAPI
              customEndpoints[existingIndex].description =
                operation.summary || operation.description || undefined;
            } else if (!seenRoutes.has(routeKey)) {
              // Add new route from OpenAPI document
              seenRoutes.add(routeKey);
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
      // OpenAPI extraction failed, continue with routes we already have
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
