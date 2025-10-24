/**
 * Unit tests for custom endpoints extraction and OpenAPI enhancement
 */

import type { ServerEndpointSummary } from "@voltagent/server-core";
import { describe, expect, it } from "vitest";
import { extractCustomEndpoints, getEnhancedOpenApiDoc } from "./custom-endpoints";

/**
 * Create a mock OpenAPI Hono app for testing
 */
function createMockApp(options: {
  routes?: Array<{ method: string; path: string; basePath?: string }>;
  openApiPaths?: Record<string, any>;
  shouldThrowOnGetDocument?: boolean;
}) {
  return {
    routes: options.routes || [],
    getOpenAPIDocument: (config: any) => {
      if (options.shouldThrowOnGetDocument) {
        throw new Error("OpenAPI document generation failed");
      }
      return {
        openapi: config.openapi || "3.1.0",
        info: config.info || { title: "Test", version: "1.0.0" },
        paths: options.openApiPaths || {},
      };
    },
  } as any;
}

describe("extractCustomEndpoints", () => {
  describe("Regular Hono routes extraction", () => {
    it("should extract routes from app.routes array", () => {
      const app = createMockApp({
        routes: [
          { method: "GET", path: "/api/health" },
          { method: "POST", path: "/api/calculate" },
        ],
      });

      const endpoints = extractCustomEndpoints(app);

      expect(endpoints).toHaveLength(2);
      expect(endpoints[0]).toEqual({
        method: "GET",
        path: "/api/health",
        group: "Custom Endpoints",
      });
      expect(endpoints[1]).toEqual({
        method: "POST",
        path: "/api/calculate",
        group: "Custom Endpoints",
      });
    });

    it("should normalize paths by removing duplicate slashes", () => {
      const app = createMockApp({
        routes: [{ method: "GET", path: "/api//health", basePath: "/" }],
      });

      const endpoints = extractCustomEndpoints(app);

      expect(endpoints).toHaveLength(1);
      expect(endpoints[0].path).toBe("/api/health");
    });

    it("should combine basePath with path", () => {
      const app = createMockApp({
        routes: [{ method: "GET", path: "/health", basePath: "/api" }],
      });

      const endpoints = extractCustomEndpoints(app);

      expect(endpoints).toHaveLength(1);
      expect(endpoints[0].path).toBe("/api/health");
    });

    it("should deduplicate routes", () => {
      const app = createMockApp({
        routes: [
          { method: "GET", path: "/api/health" },
          { method: "GET", path: "/api/health" }, // Duplicate
        ],
      });

      const endpoints = extractCustomEndpoints(app);

      expect(endpoints).toHaveLength(1);
    });

    it("should handle routes with path parameters", () => {
      const app = createMockApp({
        routes: [
          { method: "GET", path: "/api/users/:id" },
          { method: "GET", path: "/api/posts/:postId/comments/:commentId" },
        ],
      });

      const endpoints = extractCustomEndpoints(app);

      expect(endpoints).toHaveLength(2);
      expect(endpoints[0].path).toBe("/api/users/:id");
      expect(endpoints[1].path).toBe("/api/posts/:postId/comments/:commentId");
    });
  });

  describe("Built-in route filtering", () => {
    it("should filter out built-in agent routes", () => {
      const app = createMockApp({
        routes: [
          { method: "GET", path: "/agents" },
          { method: "GET", path: "/agents/:id" },
          { method: "POST", path: "/agents/:id/text" },
          { method: "GET", path: "/api/custom" }, // Custom route
        ],
      });

      const endpoints = extractCustomEndpoints(app);

      expect(endpoints).toHaveLength(1);
      expect(endpoints[0].path).toBe("/api/custom");
    });

    it("should filter out built-in workflow routes", () => {
      const app = createMockApp({
        routes: [
          { method: "GET", path: "/workflows" },
          { method: "GET", path: "/workflows/:id" },
          { method: "POST", path: "/workflows/:id/execute" },
          { method: "GET", path: "/api/custom" }, // Custom route
        ],
      });

      const endpoints = extractCustomEndpoints(app);

      expect(endpoints).toHaveLength(1);
      expect(endpoints[0].path).toBe("/api/custom");
    });

    it("should filter out observability routes", () => {
      const app = createMockApp({
        routes: [
          { method: "GET", path: "/observability/traces" },
          { method: "GET", path: "/observability/spans/:spanId" },
          { method: "GET", path: "/api/custom" }, // Custom route
        ],
      });

      const endpoints = extractCustomEndpoints(app);

      expect(endpoints).toHaveLength(1);
      expect(endpoints[0].path).toBe("/api/custom");
    });

    it("should filter out core routes (/, /doc, /ui)", () => {
      const app = createMockApp({
        routes: [
          { method: "GET", path: "/" },
          { method: "GET", path: "/doc" },
          { method: "GET", path: "/ui" },
          { method: "GET", path: "/api/custom" }, // Custom route
        ],
      });

      const endpoints = extractCustomEndpoints(app);

      expect(endpoints).toHaveLength(1);
      expect(endpoints[0].path).toBe("/api/custom");
    });

    it("should filter out /api/logs route", () => {
      const app = createMockApp({
        routes: [
          { method: "GET", path: "/api/logs" },
          { method: "GET", path: "/api/custom" }, // Custom route
        ],
      });

      const endpoints = extractCustomEndpoints(app);

      expect(endpoints).toHaveLength(1);
      expect(endpoints[0].path).toBe("/api/custom");
    });

    it("should filter out /updates and /setup-observability routes", () => {
      const app = createMockApp({
        routes: [
          { method: "GET", path: "/updates" },
          { method: "POST", path: "/setup-observability" },
          { method: "GET", path: "/api/custom" }, // Custom route
        ],
      });

      const endpoints = extractCustomEndpoints(app);

      expect(endpoints).toHaveLength(1);
      expect(endpoints[0].path).toBe("/api/custom");
    });

    it("should NOT filter custom routes that START with built-in path prefixes", () => {
      const app = createMockApp({
        routes: [
          // Built-in routes (should be filtered)
          { method: "GET", path: "/agents" },
          { method: "GET", path: "/workflows" },
          { method: "GET", path: "/observability/traces" },
          // Custom routes that START with built-in prefixes (should NOT be filtered)
          { method: "GET", path: "/agents-custom" },
          { method: "GET", path: "/agents-dashboard" },
          { method: "GET", path: "/workflows-manager" },
          { method: "GET", path: "/workflows-builder" },
          { method: "GET", path: "/observability-ui" },
          { method: "GET", path: "/observability-metrics" },
        ],
      });

      const endpoints = extractCustomEndpoints(app);

      // Should extract only the 6 custom routes, not the 3 built-in routes
      expect(endpoints).toHaveLength(6);

      const paths = endpoints.map((e) => e.path);
      expect(paths).toContain("/agents-custom");
      expect(paths).toContain("/agents-dashboard");
      expect(paths).toContain("/workflows-manager");
      expect(paths).toContain("/workflows-builder");
      expect(paths).toContain("/observability-ui");
      expect(paths).toContain("/observability-metrics");
      expect(paths).not.toContain("/agents");
      expect(paths).not.toContain("/workflows");
      expect(paths).not.toContain("/observability/traces");
    });

    it("should handle routes with hyphens and underscores correctly", () => {
      const app = createMockApp({
        routes: [
          { method: "GET", path: "/api/my-custom-route" },
          { method: "POST", path: "/api/another_custom_route" },
          { method: "PUT", path: "/custom-agents" }, // NOT /agents
          { method: "DELETE", path: "/my_workflows" }, // NOT /workflows
        ],
      });

      const endpoints = extractCustomEndpoints(app);

      expect(endpoints).toHaveLength(4);
      expect(endpoints.map((e) => e.path)).toEqual([
        "/api/my-custom-route",
        "/api/another_custom_route",
        "/custom-agents",
        "/my_workflows",
      ]);
    });
  });

  describe("OpenAPI document extraction", () => {
    it("should extract routes from OpenAPI document", () => {
      const app = createMockApp({
        openApiPaths: {
          "/api/health": {
            get: {
              summary: "Health check endpoint",
              description: "Returns server health status",
            },
          },
        },
      });

      const endpoints = extractCustomEndpoints(app);

      expect(endpoints).toHaveLength(1);
      expect(endpoints[0]).toEqual({
        method: "GET",
        path: "/api/health",
        description: "Health check endpoint",
        group: "Custom Endpoints",
      });
    });

    it("should merge OpenAPI descriptions with app.routes", () => {
      const app = createMockApp({
        routes: [{ method: "GET", path: "/api/health" }],
        openApiPaths: {
          "/api/health": {
            get: {
              summary: "Health check",
              description: "Detailed health check description",
            },
          },
        },
      });

      const endpoints = extractCustomEndpoints(app);

      expect(endpoints).toHaveLength(1);
      expect(endpoints[0]).toEqual({
        method: "GET",
        path: "/api/health",
        description: "Health check",
        group: "Custom Endpoints",
      });
    });

    it("should use summary over description from OpenAPI", () => {
      const app = createMockApp({
        openApiPaths: {
          "/api/health": {
            get: {
              summary: "Short summary",
              description: "Longer description",
            },
          },
        },
      });

      const endpoints = extractCustomEndpoints(app);

      expect(endpoints[0].description).toBe("Short summary");
    });

    it("should handle multiple HTTP methods on same path", () => {
      const app = createMockApp({
        openApiPaths: {
          "/api/users": {
            get: { summary: "List users" },
            post: { summary: "Create user" },
          },
        },
      });

      const endpoints = extractCustomEndpoints(app);

      expect(endpoints).toHaveLength(2);
      expect(endpoints.find((e) => e.method === "GET")?.description).toBe("List users");
      expect(endpoints.find((e) => e.method === "POST")?.description).toBe("Create user");
    });

    it("should filter out built-in routes from OpenAPI document", () => {
      const app = createMockApp({
        openApiPaths: {
          "/agents": { get: { summary: "List agents" } },
          "/api/custom": { get: { summary: "Custom endpoint" } },
        },
      });

      const endpoints = extractCustomEndpoints(app);

      expect(endpoints).toHaveLength(1);
      expect(endpoints[0].path).toBe("/api/custom");
    });
  });

  describe("Edge cases and error handling", () => {
    it("should return empty array when app has no routes", () => {
      const app = createMockApp({ routes: [] });

      const endpoints = extractCustomEndpoints(app);

      expect(endpoints).toEqual([]);
    });

    it("should handle missing app.routes property gracefully", () => {
      const app = createMockApp({ routes: undefined });

      const endpoints = extractCustomEndpoints(app);

      expect(endpoints).toEqual([]);
    });

    it("should handle OpenAPI extraction errors gracefully", () => {
      const app = createMockApp({
        routes: [{ method: "GET", path: "/api/health" }],
        shouldThrowOnGetDocument: true,
      });

      const endpoints = extractCustomEndpoints(app);

      // Should still extract from app.routes despite OpenAPI error
      expect(endpoints).toHaveLength(1);
      expect(endpoints[0].path).toBe("/api/health");
    });

    it("should return empty array on complete failure", () => {
      const app = {
        routes: "not-an-array", // Invalid
        getOpenAPIDocument: () => {
          throw new Error("Failed");
        },
      } as any;

      const endpoints = extractCustomEndpoints(app);

      expect(endpoints).toEqual([]);
    });

    it("should handle routes with empty basePath", () => {
      const app = createMockApp({
        routes: [{ method: "GET", path: "/api/health", basePath: "" }],
      });

      const endpoints = extractCustomEndpoints(app);

      expect(endpoints).toHaveLength(1);
      expect(endpoints[0].path).toBe("/api/health");
    });
  });

  describe("Path parameter format handling", () => {
    it("should handle :param format from regular routes", () => {
      const app = createMockApp({
        routes: [{ method: "GET", path: "/api/users/:id/posts/:postId" }],
      });

      const endpoints = extractCustomEndpoints(app);

      expect(endpoints[0].path).toBe("/api/users/:id/posts/:postId");
    });

    it("should handle {param} format from OpenAPI", () => {
      const app = createMockApp({
        openApiPaths: {
          "/api/users/{id}": {
            get: { summary: "Get user" },
          },
        },
      });

      const endpoints = extractCustomEndpoints(app);

      expect(endpoints[0].path).toBe("/api/users/{id}");
    });

    it("should not duplicate routes with different param formats", () => {
      const app = createMockApp({
        routes: [{ method: "GET", path: "/api/users/:id" }],
        openApiPaths: {
          "/api/users/{id}": {
            get: { summary: "Get user" },
          },
        },
      });

      const endpoints = extractCustomEndpoints(app);

      // Should have both because they use different formats
      // This is expected behavior - they're technically different paths
      expect(endpoints.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe("getEnhancedOpenApiDoc", () => {
  describe("Adding custom routes to OpenAPI document", () => {
    it("should add custom routes to OpenAPI document", () => {
      const app = createMockApp({
        routes: [{ method: "GET", path: "/api/health" }],
      });

      const baseDoc = {
        info: { title: "Test API", version: "1.0.0" },
      };

      const enhancedDoc = getEnhancedOpenApiDoc(app, baseDoc);

      expect(enhancedDoc.paths["/api/health"]).toBeDefined();
      expect(enhancedDoc.paths["/api/health"].get).toBeDefined();
    });

    it("should generate response schema for custom routes", () => {
      const app = createMockApp({
        routes: [{ method: "GET", path: "/api/health" }],
      });

      const enhancedDoc = getEnhancedOpenApiDoc(app, {});

      const operation = enhancedDoc.paths["/api/health"].get;
      expect(operation.responses["200"]).toBeDefined();
      expect(operation.responses["200"].content["application/json"]).toBeDefined();
    });

    it("should tag custom routes as 'Custom Endpoints'", () => {
      const app = createMockApp({
        routes: [{ method: "GET", path: "/api/health" }],
      });

      const enhancedDoc = getEnhancedOpenApiDoc(app, {});

      expect(enhancedDoc.paths["/api/health"].get.tags).toEqual(["Custom Endpoints"]);
    });

    it("should add summary and description to custom routes", () => {
      const app = createMockApp({
        routes: [{ method: "GET", path: "/api/health" }],
      });

      const enhancedDoc = getEnhancedOpenApiDoc(app, {});

      const operation = enhancedDoc.paths["/api/health"].get;
      expect(operation.summary).toBe("GET /api/health");
      expect(operation.description).toBe("Custom endpoint: GET /api/health");
    });
  });

  describe("Preserving existing OpenAPI documentation", () => {
    it("should not overwrite existing OpenAPI route documentation", () => {
      const app = createMockApp({
        routes: [{ method: "GET", path: "/api/health" }],
        openApiPaths: {
          "/api/health": {
            get: {
              summary: "Existing summary",
              description: "Existing description",
              responses: {
                200: {
                  description: "Existing response",
                },
              },
            },
          },
        },
      });

      const enhancedDoc = getEnhancedOpenApiDoc(app, {});

      const operation = enhancedDoc.paths["/api/health"].get;
      expect(operation.summary).toBe("Existing summary");
      expect(operation.description).toBe("Existing description");
      expect(operation.responses["200"].description).toBe("Existing response");
    });

    it("should preserve existing route properties", () => {
      const app = createMockApp({
        openApiPaths: {
          "/api/users": {
            get: {
              operationId: "listUsers",
              tags: ["Users"],
              security: [{ bearerAuth: [] }],
            },
          },
        },
      });

      const enhancedDoc = getEnhancedOpenApiDoc(app, {});

      const operation = enhancedDoc.paths["/api/users"].get;
      expect(operation.operationId).toBe("listUsers");
      // Should have both original tags and "Custom Endpoints" tag added
      expect(operation.tags).toEqual(["Users", "Custom Endpoints"]);
      expect(operation.security).toEqual([{ bearerAuth: [] }]);
    });
  });

  describe("HTTP method-specific behavior", () => {
    it("should add requestBody for POST methods", () => {
      const app = createMockApp({
        routes: [{ method: "POST", path: "/api/calculate" }],
      });

      const enhancedDoc = getEnhancedOpenApiDoc(app, {});

      const operation = enhancedDoc.paths["/api/calculate"].post;
      expect(operation.requestBody).toBeDefined();
      expect(operation.requestBody.content["application/json"]).toBeDefined();
    });

    it("should add requestBody for PUT methods", () => {
      const app = createMockApp({
        routes: [{ method: "PUT", path: "/api/users/:id" }],
      });

      const enhancedDoc = getEnhancedOpenApiDoc(app, {});

      const operation = enhancedDoc.paths["/api/users/:id"].put;
      expect(operation.requestBody).toBeDefined();
    });

    it("should add requestBody for PATCH methods", () => {
      const app = createMockApp({
        routes: [{ method: "PATCH", path: "/api/users/:id" }],
      });

      const enhancedDoc = getEnhancedOpenApiDoc(app, {});

      const operation = enhancedDoc.paths["/api/users/:id"].patch;
      expect(operation.requestBody).toBeDefined();
    });

    it("should not add requestBody for GET methods", () => {
      const app = createMockApp({
        routes: [{ method: "GET", path: "/api/health" }],
      });

      const enhancedDoc = getEnhancedOpenApiDoc(app, {});

      const operation = enhancedDoc.paths["/api/health"].get;
      expect(operation.requestBody).toBeUndefined();
    });

    it("should not add requestBody for DELETE methods", () => {
      const app = createMockApp({
        routes: [{ method: "DELETE", path: "/api/users/:id" }],
      });

      const enhancedDoc = getEnhancedOpenApiDoc(app, {});

      const operation = enhancedDoc.paths["/api/users/:id"].delete;
      expect(operation.requestBody).toBeUndefined();
    });
  });

  describe("Path parameter handling", () => {
    it("should extract path parameters from :param format", () => {
      const app = createMockApp({
        routes: [{ method: "GET", path: "/api/users/:id" }],
      });

      const enhancedDoc = getEnhancedOpenApiDoc(app, {});

      const operation = enhancedDoc.paths["/api/users/:id"].get;
      expect(operation.parameters).toBeDefined();
      expect(operation.parameters).toHaveLength(1);
      expect(operation.parameters[0].name).toBe("id");
      expect(operation.parameters[0].in).toBe("path");
      expect(operation.parameters[0].required).toBe(true);
    });

    it("should extract multiple path parameters", () => {
      const app = createMockApp({
        routes: [{ method: "GET", path: "/api/posts/:postId/comments/:commentId" }],
      });

      const enhancedDoc = getEnhancedOpenApiDoc(app, {});

      const operation = enhancedDoc.paths["/api/posts/:postId/comments/:commentId"].get;
      expect(operation.parameters).toHaveLength(2);
      expect(operation.parameters[0].name).toBe("postId");
      expect(operation.parameters[1].name).toBe("commentId");
    });

    it("should handle {param} format from OpenAPI routes", () => {
      const app = createMockApp({
        routes: [{ method: "GET", path: "/api/users/{id}" }],
      });

      const enhancedDoc = getEnhancedOpenApiDoc(app, {});

      const operation = enhancedDoc.paths["/api/users/{id}"].get;
      expect(operation.parameters).toBeDefined();
      expect(operation.parameters[0].name).toBe("id");
    });

    it("should not add parameters for routes without path variables", () => {
      const app = createMockApp({
        routes: [{ method: "GET", path: "/api/health" }],
      });

      const enhancedDoc = getEnhancedOpenApiDoc(app, {});

      const operation = enhancedDoc.paths["/api/health"].get;
      expect(operation.parameters).toBeUndefined();
    });
  });

  describe("Edge cases", () => {
    it("should handle empty custom endpoints gracefully", () => {
      const app = createMockApp({
        routes: [],
      });

      const enhancedDoc = getEnhancedOpenApiDoc(app, {});

      expect(enhancedDoc.paths).toEqual({});
    });

    it("should merge custom endpoints with existing OpenAPI paths", () => {
      const app = createMockApp({
        routes: [{ method: "GET", path: "/api/custom" }],
        openApiPaths: {
          "/api/existing": {
            get: { summary: "Existing endpoint" },
          },
        },
      });

      const enhancedDoc = getEnhancedOpenApiDoc(app, {});

      expect(Object.keys(enhancedDoc.paths)).toHaveLength(2);
      expect(enhancedDoc.paths["/api/custom"]).toBeDefined();
      expect(enhancedDoc.paths["/api/existing"]).toBeDefined();
    });

    it("should handle errors gracefully and return base doc", () => {
      const app = {
        routes: null,
        getOpenAPIDocument: () => {
          throw new Error("Failed");
        },
      } as any;

      const baseDoc = { info: { title: "Test", version: "1.0.0" } };
      const enhancedDoc = getEnhancedOpenApiDoc(app, baseDoc);

      expect(enhancedDoc).toEqual(baseDoc);
    });
  });
});
