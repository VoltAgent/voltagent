/**
 * Utilities for extracting custom endpoints from Hono app
 */

import type { ServerEndpointSummary } from "@voltagent/server-core";
import { A2A_ROUTES, ALL_ROUTES, MCP_ROUTES } from "@voltagent/server-core";
import type { OpenAPIHonoType } from "../zod-openapi-compat";

const OPENAPI_METHODS = ["get", "post", "put", "patch", "delete", "options", "head"] as const;
const OPENAPI_METHOD_SET = new Set(OPENAPI_METHODS.map((method) => method.toUpperCase()));
const BUILT_IN_ROUTE_DEFINITIONS = [
  ...Object.values(ALL_ROUTES),
  ...Object.values(MCP_ROUTES),
  ...Object.values(A2A_ROUTES),
];
const BUILT_IN_ROUTE_MAP = new Map(
  BUILT_IN_ROUTE_DEFINITIONS.map((route) => [`${route.method.toUpperCase()}:${route.path}`, route]),
);

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
        OPENAPI_METHODS.forEach((method) => {
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

function getRoutePath(route: { path: string; basePath?: string }): string {
  const rawPath = route.basePath ? `${route.basePath}${route.path}` : route.path;
  return rawPath.replace(/\/+/g, "/");
}

function toOpenApiPath(path: string): string {
  return path.replace(/:([a-zA-Z0-9_]+)/g, "{$1}");
}

function toRouteDefinitionPath(path: string): string {
  return path.replace(/\{([^}]+)\}/g, ":$1");
}

function getFallbackTag(path: string): string {
  if (path.startsWith("/agents")) {
    return "Agents";
  }
  if (path.startsWith("/workflows")) {
    return "Workflows";
  }
  if (path.startsWith("/tools")) {
    return "Tools";
  }
  if (path.startsWith("/api/logs")) {
    return "Logs";
  }
  if (path.startsWith("/observability")) {
    return "Observability";
  }
  if (path.startsWith("/memory")) {
    return "Memory";
  }
  if (path.startsWith("/mcp")) {
    return "MCP";
  }
  if (path.startsWith("/.well-known") || path.startsWith("/a2a")) {
    return "A2A";
  }
  if (path.startsWith("/updates")) {
    return "Updates";
  }
  return isBuiltInPath(path) ? "VoltAgent API" : "Custom Endpoints";
}

function addEndpointToDoc(doc: any, endpoint: ServerEndpointSummary, pathOverride?: string) {
  const path = pathOverride ?? endpoint.path;
  const method = endpoint.method.toLowerCase();

  if (!OPENAPI_METHODS.includes(method as (typeof OPENAPI_METHODS)[number])) {
    return;
  }

  doc.paths = doc.paths || {};

  if (!doc.paths[path]) {
    doc.paths[path] = {};
  }

  const pathObj = doc.paths[path] as any;
  if (pathObj[method]) {
    return;
  }

  const tag = endpoint.group || getFallbackTag(path);
  const descriptionPrefix = tag === "Custom Endpoints" ? "Custom endpoint" : `${tag} endpoint`;
  pathObj[method] = {
    tags: [tag],
    summary: endpoint.description || `${endpoint.method} ${path}`,
    description: endpoint.description || `${descriptionPrefix}: ${endpoint.method} ${path}`,
    responses: {
      200: {
        description: "Successful response",
        content: {
          "application/json": {
            schema: {
              type: "object",
              additionalProperties: true,
            },
          },
        },
      },
    },
  };

  const pathWithBraces = toOpenApiPath(path);
  if (pathWithBraces.includes("{")) {
    const params = pathWithBraces.match(/\{([^}]+)\}/g);
    if (params) {
      pathObj[method].parameters = params.map((param: string) => {
        const paramName = param.slice(1, -1);
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
}

function applyRouteDefinitionMetadata(
  doc: any,
  route: (typeof BUILT_IN_ROUTE_DEFINITIONS)[number],
) {
  const path = toOpenApiPath(route.path);
  const method = route.method;
  const operation = doc.paths?.[path]?.[method];
  if (!operation) {
    return;
  }

  operation.tags = [...route.tags];
  operation.summary = route.summary;
  operation.description = route.description;
  if (route.operationId) {
    operation.operationId = route.operationId;
  }

  if (route.responses) {
    operation.responses = {};
    Object.entries(route.responses).forEach(([statusCode, response]) => {
      operation.responses[statusCode] = {
        description: response.description,
        ...(response.contentType
          ? {
              content: {
                [response.contentType]: {
                  schema: {
                    type: "object",
                    additionalProperties: true,
                  },
                },
              },
            }
          : {}),
      };
    });
  }
}

function getFallbackOpenApiDocFromRoutes(app: OpenAPIHonoType, baseDoc: any): any {
  try {
    if (!app.routes || !Array.isArray(app.routes)) {
      return baseDoc;
    }

    const fallbackDoc = {
      ...baseDoc,
      openapi: baseDoc.openapi || "3.1.0",
      paths: { ...(baseDoc.paths || {}) },
    };
    const seenRoutes = new Set<string>();

    app.routes.forEach((route) => {
      const method = route.method.toUpperCase();
      if (!OPENAPI_METHOD_SET.has(method)) {
        return;
      }

      const routePath = getRoutePath(route);
      if (!routePath || routePath === "*" || routePath === "/" || routePath === "/doc") {
        return;
      }

      if (toOpenApiPath(routePath) === "/ui") {
        return;
      }

      const routeDefinitionPath = toRouteDefinitionPath(routePath);
      const routeDefinition = BUILT_IN_ROUTE_MAP.get(`${method}:${routeDefinitionPath}`);
      if (!routeDefinition) {
        return;
      }

      const openApiPath = toOpenApiPath(routeDefinition.path);
      const routeKey = `${method}:${openApiPath}`;
      if (seenRoutes.has(routeKey)) {
        return;
      }

      seenRoutes.add(routeKey);
      addEndpointToDoc(
        fallbackDoc,
        {
          method,
          path: openApiPath,
          group: routeDefinition.tags[0] || getFallbackTag(routePath),
        },
        openApiPath,
      );
      applyRouteDefinitionMetadata(fallbackDoc, routeDefinition);
    });

    extractCustomEndpoints(app).forEach((endpoint) => {
      const routeKey = `${endpoint.method}:${endpoint.path}`;
      if (seenRoutes.has(routeKey)) {
        return;
      }

      seenRoutes.add(routeKey);
      addEndpointToDoc(fallbackDoc, endpoint);
    });

    return seenRoutes.size > 0 ? fallbackDoc : baseDoc;
  } catch (_fallbackError) {
    return baseDoc;
  }
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

    customEndpoints.forEach((endpoint) => addEndpointToDoc(fullDoc, endpoint));

    // Ensure proper tags for organization of existing routes
    if (fullDoc.paths) {
      Object.entries(fullDoc.paths).forEach(([path, pathItem]) => {
        if (pathItem && !isBuiltInPath(path)) {
          // Add "Custom Endpoints" tag to custom routes for better organization
          OPENAPI_METHODS.forEach((method) => {
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
    return getFallbackOpenApiDocFromRoutes(app, baseDoc);
  }
}
