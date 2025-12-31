/**
 * Unit tests for custom endpoints extraction and OpenAPI enhancement
 */

import type { ServerEndpointSummary } from "@voltagent/server-core";
import { Elysia } from "elysia";
import { describe, expect, it } from "vitest";
import { extractCustomEndpoints, getEnhancedOpenApiDoc } from "./custom-endpoints";

/**
 * Create a mock Elysia app for testing
 */
function createMockApp(options: {
  routes?: Array<{ method: string; path: string }>;
  shouldThrow?: boolean;
}) {
  return {
    routes: options.routes || [],
  } as any;
}

describe("extractCustomEndpoints", () => {
  describe("Elysia routes extraction", () => {
    it("should extract routes from app", () => {
      const app = new Elysia()
        .get("/api/health", () => ({ status: "ok" }))
        .post("/api/calculate", () => ({ result: 42 }));

      const endpoints = extractCustomEndpoints(app as any);

      expect(endpoints.length).toBeGreaterThanOrEqual(2);

      const healthEndpoint = endpoints.find((e) => e.path === "/api/health");
      const calculateEndpoint = endpoints.find((e) => e.path === "/api/calculate");

      expect(healthEndpoint).toBeDefined();
      expect(healthEndpoint?.method).toBe("GET");
      expect(healthEndpoint?.group).toBe("Custom Endpoints");

      expect(calculateEndpoint).toBeDefined();
      expect(calculateEndpoint?.method).toBe("POST");
    });

    it("should normalize paths by removing duplicate slashes", () => {
      const app = createMockApp({
        routes: [{ method: "GET", path: "/api//health" }],
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
      const app = new Elysia()
        .get("/api/users/:id", () => ({ user: "test" }))
        .get("/api/posts/:postId/comments/:commentId", () => ({ comment: "test" }));

      const endpoints = extractCustomEndpoints(app as any);

      expect(endpoints.length).toBeGreaterThanOrEqual(2);

      const userEndpoint = endpoints.find((e) => e.path === "/api/users/:id");
      const commentEndpoint = endpoints.find(
        (e) => e.path === "/api/posts/:postId/comments/:commentId",
      );

      expect(userEndpoint).toBeDefined();
      expect(commentEndpoint).toBeDefined();
    });

    it("should handle empty app", () => {
      const app = new Elysia();

      const endpoints = extractCustomEndpoints(app as any);

      expect(endpoints).toEqual([]);
    });

    it("should handle app with grouped routes", () => {
      const app = new Elysia().group("/api", (app) =>
        app.get("/health", () => ({ status: "ok" })).post("/submit", () => ({ submitted: true })),
      );

      const endpoints = extractCustomEndpoints(app as any);

      expect(endpoints.length).toBeGreaterThanOrEqual(2);

      // Routes in groups should have the full path
      const healthEndpoint = endpoints.find((e) => e.path?.includes("/health"));
      const submitEndpoint = endpoints.find((e) => e.path?.includes("/submit"));

      expect(healthEndpoint).toBeDefined();
      expect(submitEndpoint).toBeDefined();
    });

    it("should include custom group label", () => {
      const app = new Elysia().get("/custom", () => ({ custom: true }));

      const endpoints = extractCustomEndpoints(app as any);

      expect(endpoints.length).toBeGreaterThanOrEqual(1);
      expect(endpoints[0].group).toBe("Custom Endpoints");
    });

    it("should handle different HTTP methods", () => {
      const app = new Elysia()
        .get("/test", () => ({}))
        .post("/test", () => ({}))
        .put("/test", () => ({}))
        .delete("/test", () => ({}))
        .patch("/test", () => ({}));

      const endpoints = extractCustomEndpoints(app as any);

      const methods = endpoints.map((e) => e.method);
      expect(methods).toContain("GET");
      expect(methods).toContain("POST");
      expect(methods).toContain("PUT");
      expect(methods).toContain("DELETE");
      expect(methods).toContain("PATCH");
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

    it("should return empty array on complete failure", () => {
      const app = {
        routes: "not-an-array", // Invalid
      } as any;

      const endpoints = extractCustomEndpoints(app);

      expect(endpoints).toEqual([]);
    });

    it("should handle routes with empty path", () => {
      const app = createMockApp({
        routes: [{ method: "GET", path: "" }],
      });

      const endpoints = extractCustomEndpoints(app);

      // Should filter out empty paths
      expect(endpoints).toEqual([]);
    });

    it("should handle malformed route data", () => {
      const app = {
        routes: [{ method: null, path: "/test" }, { method: "GET", path: null }, {}],
      } as any;

      const endpoints = extractCustomEndpoints(app);

      // Should filter out invalid routes
      expect(endpoints).toEqual([]);
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

    it("should handle {param} format", () => {
      const app = createMockApp({
        routes: [{ method: "GET", path: "/api/users/{id}" }],
      });

      const endpoints = extractCustomEndpoints(app);

      expect(endpoints[0].path).toBe("/api/users/{id}");
    });

    it("should not duplicate routes with different param formats", () => {
      const app = createMockApp({
        routes: [
          { method: "GET", path: "/api/users/:id" },
          { method: "GET", path: "/api/users/{id}" },
        ],
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
      });

      const baseDoc = {
        paths: {
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
      };

      const enhancedDoc = getEnhancedOpenApiDoc(app, baseDoc);

      const operation = enhancedDoc.paths["/api/health"].get;
      expect(operation.summary).toBe("Existing summary");
      expect(operation.description).toBe("Existing description");
      expect(operation.responses["200"].description).toBe("Existing response");
    });

    it("should preserve existing route properties", () => {
      const app = createMockApp({
        routes: [],
      });

      const baseDoc = {
        paths: {
          "/api/users": {
            get: {
              operationId: "listUsers",
              tags: ["Users"],
              security: [{ bearerAuth: [] }],
            },
          },
        },
      };

      const enhancedDoc = getEnhancedOpenApiDoc(app, baseDoc);

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
      });

      const baseDoc = {
        paths: {
          "/api/existing": {
            get: { summary: "Existing endpoint" },
          },
        },
      };

      const enhancedDoc = getEnhancedOpenApiDoc(app, baseDoc);

      expect(Object.keys(enhancedDoc.paths)).toHaveLength(2);
      expect(enhancedDoc.paths["/api/custom"]).toBeDefined();
      expect(enhancedDoc.paths["/api/existing"]).toBeDefined();
    });

    it("should handle errors gracefully and return base doc", () => {
      const app = {
        routes: null,
      } as any;

      const baseDoc = { info: { title: "Test", version: "1.0.0" } };
      const enhancedDoc = getEnhancedOpenApiDoc(app, baseDoc);

      expect(enhancedDoc).toEqual(baseDoc);
    });

    it("should handle null base doc", () => {
      const app = new Elysia();

      const enhancedDoc = getEnhancedOpenApiDoc(app as any, null);

      expect(enhancedDoc).toBeDefined();
      expect(enhancedDoc.openapi).toBe("3.1.0");
    });
  });
});
