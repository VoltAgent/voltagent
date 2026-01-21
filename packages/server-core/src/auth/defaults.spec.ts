import { describe, expect, it } from "vitest";
import { DEFAULT_PUBLIC_ROUTES, PROTECTED_ROUTES, pathMatches, requiresAuth } from "./defaults";

describe("Auth Defaults", () => {
  describe("pathMatches", () => {
    it("should match exact paths", () => {
      expect(pathMatches("/agents", "/agents")).toBe(true);
      expect(pathMatches("/workflows", "/workflows")).toBe(true);
      expect(pathMatches("/api/data", "/api/data")).toBe(true);
    });

    it("should not match different paths", () => {
      expect(pathMatches("/agents", "/workflows")).toBe(false);
      expect(pathMatches("/api/users", "/api/data")).toBe(false);
    });

    it("should match paths with parameters", () => {
      expect(pathMatches("/agents/123", "/agents/:id")).toBe(true);
      expect(pathMatches("/agents/my-agent", "/agents/:id")).toBe(true);
      expect(pathMatches("/workflows/abc-123/run", "/workflows/:id/run")).toBe(true);
    });

    it("should not match when path segments differ in count", () => {
      expect(pathMatches("/agents", "/agents/:id")).toBe(false);
      expect(pathMatches("/agents/123/extra", "/agents/:id")).toBe(false);
    });

    it("should match wildcards", () => {
      expect(pathMatches("/api/anything", "/api/*")).toBe(true);
      expect(pathMatches("/webhooks/stripe", "/webhooks/*")).toBe(true);
    });

    it("should match trailing wildcard /* for deep paths", () => {
      expect(pathMatches("/observability/traces", "/observability/*")).toBe(true);
      expect(pathMatches("/observability/memory/users", "/observability/*")).toBe(true);
      expect(pathMatches("/observability/memory/conversations/123", "/observability/*")).toBe(true);
      expect(pathMatches("/observability/spans/abc-123", "/observability/*")).toBe(true);
    });

    it("should not match trailing wildcard /* for exact prefix without slash", () => {
      expect(pathMatches("/observability", "/observability/*")).toBe(false);
    });

    it("should match double-star /** for exact path and all children", () => {
      expect(pathMatches("/api", "/api/**")).toBe(true);
      expect(pathMatches("/api/users", "/api/**")).toBe(true);
      expect(pathMatches("/api/users/123/posts", "/api/**")).toBe(true);
    });

    it("should not match double-star /** for different paths", () => {
      expect(pathMatches("/other", "/api/**")).toBe(false);
      expect(pathMatches("/other/api", "/api/**")).toBe(false);
    });

    it("should handle method prefix in pattern", () => {
      expect(pathMatches("/agents", "GET /agents")).toBe(true);
      expect(pathMatches("/agents/123", "POST /agents/:id")).toBe(true);
    });

    it("should match multiple parameters", () => {
      expect(pathMatches("/api/users/123/posts/456", "/api/users/:userId/posts/:postId")).toBe(
        true,
      );
    });
  });

  describe("requiresAuth - Opt-In Mode (default behavior)", () => {
    describe("Default Public Routes", () => {
      it("should not require auth for default public routes", () => {
        expect(requiresAuth("GET", "/agents")).toBe(false);
        expect(requiresAuth("GET", "/workflows")).toBe(false);
        expect(requiresAuth("GET", "/tools")).toBe(false);
        expect(requiresAuth("GET", "/doc")).toBe(false);
        expect(requiresAuth("GET", "/ui")).toBe(false);
        expect(requiresAuth("GET", "/")).toBe(false);
      });

      it("should not require auth for public routes with parameters", () => {
        expect(requiresAuth("GET", "/agents/my-agent")).toBe(false);
        expect(requiresAuth("GET", "/workflows/my-workflow")).toBe(false);
      });

      it("should not require auth for MCP discovery endpoints", () => {
        expect(requiresAuth("GET", "/mcp/servers")).toBe(false);
        expect(requiresAuth("GET", "/mcp/servers/my-server")).toBe(false);
        expect(requiresAuth("GET", "/mcp/servers/my-server/tools")).toBe(false);
      });

      it("should not require auth for A2A agent card endpoint", () => {
        expect(requiresAuth("GET", "/agents/my-agent/card")).toBe(false);
      });
    });

    describe("Protected Routes", () => {
      it("should require auth for agent execution endpoints", () => {
        expect(requiresAuth("POST", "/agents/my-agent/text")).toBe(true);
        expect(requiresAuth("POST", "/agents/123/stream")).toBe(true);
        expect(requiresAuth("GET", "/agents/123/chat/conv-1/stream")).toBe(true);
        expect(requiresAuth("POST", "/agents/abc/object")).toBe(true);
        expect(requiresAuth("POST", "/agents/test/stream-object")).toBe(true);
      });

      it("should require auth for tool execution but not listing", () => {
        expect(requiresAuth("GET", "/tools")).toBe(false); // Listing is public (like /agents, /workflows)
        expect(requiresAuth("POST", "/tools/example/execute")).toBe(true); // Execution requires auth
      });

      it("should require auth for workflow execution endpoints", () => {
        expect(requiresAuth("POST", "/workflows/my-workflow/run")).toBe(true);
        expect(requiresAuth("POST", "/workflows/123/stream")).toBe(true);
      });

      it("should require auth for workflow control endpoints", () => {
        expect(requiresAuth("POST", "/workflows/my-workflow/executions/exec-123/suspend")).toBe(
          true,
        );
        expect(requiresAuth("POST", "/workflows/abc/executions/exec-456/resume")).toBe(true);
        expect(requiresAuth("POST", "/workflows/test/executions/exec-789/cancel")).toBe(true);
      });

      it("should require auth for all observability endpoints via wildcard", () => {
        expect(requiresAuth("GET", "/observability/traces")).toBe(true);
        expect(requiresAuth("GET", "/observability/spans/abc-123")).toBe(true);
        expect(requiresAuth("GET", "/observability/logs")).toBe(true);
        expect(requiresAuth("GET", "/observability/memory/users")).toBe(true);
        expect(requiresAuth("POST", "/observability/memory/conversations")).toBe(true);
        expect(requiresAuth("DELETE", "/observability/spans/123")).toBe(true);
      });

      it("should require auth for memory endpoints via wildcard", () => {
        expect(requiresAuth("GET", "/api/memory/conversations")).toBe(true);
        expect(requiresAuth("GET", "/api/memory/conversations/conv-1/messages")).toBe(true);
        expect(requiresAuth("POST", "/api/memory/save-messages")).toBe(true);
      });

      it("should require auth for system update endpoints", () => {
        expect(requiresAuth("GET", "/updates")).toBe(true);
        expect(requiresAuth("POST", "/updates")).toBe(true);
        expect(requiresAuth("POST", "/updates/package-name")).toBe(true);
        expect(requiresAuth("POST", "/updates/@voltagent-core")).toBe(true);
      });

      it("should be case-insensitive for HTTP methods", () => {
        expect(requiresAuth("post", "/agents/test/text")).toBe(true);
        expect(requiresAuth("POST", "/agents/test/text")).toBe(true);
        expect(requiresAuth("Post", "/agents/test/text")).toBe(true);
      });
    });

    describe("Custom Routes (Opt-In Mode)", () => {
      it("should NOT require auth for unknown custom routes by default", () => {
        // This is the current behavior - custom routes are public
        expect(requiresAuth("GET", "/api/custom")).toBe(false);
        expect(requiresAuth("POST", "/api/data")).toBe(false);
        expect(requiresAuth("PUT", "/api/users/123")).toBe(false);
      });

      it("should NOT require auth when defaultPrivate is explicitly false", () => {
        expect(requiresAuth("GET", "/api/custom", undefined, false)).toBe(false);
        expect(requiresAuth("POST", "/api/data", undefined, false)).toBe(false);
      });
    });

    describe("Custom Public Routes", () => {
      it("should not require auth for routes in publicRoutes", () => {
        const publicRoutes = ["GET /api/status", "POST /webhooks/stripe"];

        expect(requiresAuth("GET", "/api/status", publicRoutes)).toBe(false);
        expect(requiresAuth("POST", "/webhooks/stripe", publicRoutes)).toBe(false);
      });

      it("should support wildcards in publicRoutes", () => {
        const publicRoutes = ["GET /public/*", "POST /webhooks/*"];

        expect(requiresAuth("GET", "/public/data", publicRoutes)).toBe(false);
        expect(requiresAuth("GET", "/public/anything", publicRoutes)).toBe(false);
        expect(requiresAuth("POST", "/webhooks/stripe", publicRoutes)).toBe(false);
        expect(requiresAuth("POST", "/webhooks/clerk", publicRoutes)).toBe(false);
      });

      it("should support publicRoutes without method (any method)", () => {
        const publicRoutes = ["/health", "/status"];

        expect(requiresAuth("GET", "/health", publicRoutes)).toBe(false);
        expect(requiresAuth("POST", "/health", publicRoutes)).toBe(false);
        expect(requiresAuth("PUT", "/status", publicRoutes)).toBe(false);
      });

      it("should allow overriding default protected routes with publicRoutes", () => {
        // Make a normally protected route public
        const publicRoutes = ["POST /agents/:id/text"];

        expect(requiresAuth("POST", "/agents/test/text", publicRoutes)).toBe(false);
      });
    });
  });

  describe("requiresAuth - Opt-Out Mode (defaultPrivate: true)", () => {
    describe("Default Public Routes Still Work", () => {
      it("should keep default public routes public even with defaultPrivate", () => {
        expect(requiresAuth("GET", "/agents", undefined, true)).toBe(false);
        expect(requiresAuth("GET", "/workflows", undefined, true)).toBe(false);
        expect(requiresAuth("GET", "/doc", undefined, true)).toBe(false);
        expect(requiresAuth("GET", "/ui", undefined, true)).toBe(false);
      });

      it("should keep default public routes with params public", () => {
        expect(requiresAuth("GET", "/agents/my-agent", undefined, true)).toBe(false);
        expect(requiresAuth("GET", "/workflows/my-workflow", undefined, true)).toBe(false);
      });
    });

    describe("Protected Routes Still Work", () => {
      it("should keep protected routes protected with defaultPrivate", () => {
        expect(requiresAuth("POST", "/agents/test/text", undefined, true)).toBe(true);
        expect(requiresAuth("POST", "/agents/123/stream", undefined, true)).toBe(true);
        expect(requiresAuth("POST", "/workflows/my-workflow/run", undefined, true)).toBe(true);
      });
    });

    describe("Custom Routes (Opt-Out Mode) - Main Feature", () => {
      it("should require auth for custom routes when defaultPrivate is true", () => {
        // This is the NEW behavior - custom routes are protected by default
        expect(requiresAuth("GET", "/api/custom", undefined, true)).toBe(true);
        expect(requiresAuth("POST", "/api/data", undefined, true)).toBe(true);
        expect(requiresAuth("PUT", "/api/users/123", undefined, true)).toBe(true);
        expect(requiresAuth("DELETE", "/api/items/456", undefined, true)).toBe(true);
      });

      it("should protect custom routes at any path", () => {
        expect(requiresAuth("GET", "/my-custom-endpoint", undefined, true)).toBe(true);
        expect(requiresAuth("POST", "/internal/admin", undefined, true)).toBe(true);
        expect(requiresAuth("GET", "/api/v2/users", undefined, true)).toBe(true);
      });
    });

    describe("Selective Public Routes with defaultPrivate", () => {
      it("should allow making custom routes public via publicRoutes", () => {
        const publicRoutes = ["GET /api/health", "POST /webhooks/clerk"];

        expect(requiresAuth("GET", "/api/health", publicRoutes, true)).toBe(false);
        expect(requiresAuth("POST", "/webhooks/clerk", publicRoutes, true)).toBe(false);
      });

      it("should protect other custom routes while making some public", () => {
        const publicRoutes = ["GET /health", "POST /webhooks/*"];

        // These should be public
        expect(requiresAuth("GET", "/health", publicRoutes, true)).toBe(false);
        expect(requiresAuth("POST", "/webhooks/stripe", publicRoutes, true)).toBe(false);
        expect(requiresAuth("POST", "/webhooks/clerk", publicRoutes, true)).toBe(false);

        // These should be protected
        expect(requiresAuth("GET", "/api/data", publicRoutes, true)).toBe(true);
        expect(requiresAuth("POST", "/api/users", publicRoutes, true)).toBe(true);
      });

      it("should support wildcards in publicRoutes with defaultPrivate", () => {
        const publicRoutes = ["GET /public/*", "POST /webhooks/*"];

        // Public via wildcards
        expect(requiresAuth("GET", "/public/anything", publicRoutes, true)).toBe(false);
        expect(requiresAuth("POST", "/webhooks/stripe", publicRoutes, true)).toBe(false);

        // Still protected
        expect(requiresAuth("GET", "/private/data", publicRoutes, true)).toBe(true);
        expect(requiresAuth("POST", "/api/users", publicRoutes, true)).toBe(true);
      });
    });

    describe("Real-World Scenarios", () => {
      it("should support Clerk integration pattern", () => {
        // User's scenario: protect everything except webhooks and health
        const publicRoutes = ["GET /health", "POST /webhooks/clerk"];

        // VoltAgent management routes - still public by default
        expect(requiresAuth("GET", "/agents", publicRoutes, true)).toBe(false);

        // VoltAgent execution routes - still protected
        expect(requiresAuth("POST", "/agents/my-agent/text", publicRoutes, true)).toBe(true);

        // Custom health - made public
        expect(requiresAuth("GET", "/health", publicRoutes, true)).toBe(false);

        // Custom webhook - made public
        expect(requiresAuth("POST", "/webhooks/clerk", publicRoutes, true)).toBe(false);

        // Custom API routes - protected by defaultPrivate
        expect(requiresAuth("GET", "/api/user/data", publicRoutes, true)).toBe(true);
        expect(requiresAuth("POST", "/api/admin/settings", publicRoutes, true)).toBe(true);
      });

      it("should support Auth0 integration pattern", () => {
        const publicRoutes = ["GET /api/status", "POST /api/auth/*"];

        // Auth endpoints public
        expect(requiresAuth("POST", "/api/auth/login", publicRoutes, true)).toBe(false);
        expect(requiresAuth("POST", "/api/auth/callback", publicRoutes, true)).toBe(false);

        // Status endpoint public
        expect(requiresAuth("GET", "/api/status", publicRoutes, true)).toBe(false);

        // All other custom routes protected
        expect(requiresAuth("GET", "/api/user/profile", publicRoutes, true)).toBe(true);
        expect(requiresAuth("POST", "/api/data", publicRoutes, true)).toBe(true);
      });

      it("should support mixed public/private custom routes", () => {
        const publicRoutes = [
          "GET /health",
          "GET /metrics",
          "POST /webhooks/*",
          "/public", // Any method
        ];

        // Multiple public routes
        expect(requiresAuth("GET", "/health", publicRoutes, true)).toBe(false);
        expect(requiresAuth("GET", "/metrics", publicRoutes, true)).toBe(false);
        expect(requiresAuth("POST", "/webhooks/stripe", publicRoutes, true)).toBe(false);
        expect(requiresAuth("GET", "/public", publicRoutes, true)).toBe(false);
        expect(requiresAuth("POST", "/public", publicRoutes, true)).toBe(false);

        // Protected custom routes
        expect(requiresAuth("GET", "/api/users", publicRoutes, true)).toBe(true);
        expect(requiresAuth("POST", "/api/data", publicRoutes, true)).toBe(true);
        expect(requiresAuth("DELETE", "/api/items/123", publicRoutes, true)).toBe(true);
      });
    });
  });

  describe("Edge Cases & Backward Compatibility", () => {
    it("should treat undefined defaultPrivate as false (backward compatible)", () => {
      expect(requiresAuth("GET", "/api/custom", undefined, undefined)).toBe(false);
      expect(requiresAuth("GET", "/api/custom")).toBe(false);
    });

    it("should handle empty publicRoutes array", () => {
      expect(requiresAuth("GET", "/api/custom", [], false)).toBe(false);
      expect(requiresAuth("GET", "/api/custom", [], true)).toBe(true);
    });

    it("should handle both method-specific and any-method publicRoutes", () => {
      const publicRoutes = ["GET /specific", "/any-method"];

      expect(requiresAuth("GET", "/specific", publicRoutes)).toBe(false);
      expect(requiresAuth("POST", "/specific", publicRoutes)).toBe(false); // Not public (method specific)
      expect(requiresAuth("GET", "/any-method", publicRoutes)).toBe(false);
      expect(requiresAuth("POST", "/any-method", publicRoutes)).toBe(false);
      expect(requiresAuth("PUT", "/any-method", publicRoutes)).toBe(false);
    });

    it("should prioritize public routes over protected routes", () => {
      // If a route is in both publicRoutes and PROTECTED_ROUTES,
      // publicRoutes should win (it's checked first)
      const publicRoutes = ["POST /agents/:id/text"];

      expect(requiresAuth("POST", "/agents/test/text", publicRoutes)).toBe(false);
    });

    it("should handle routes with special characters", () => {
      const publicRoutes = ["POST /webhooks/stripe-test", "GET /api/data-export"];

      expect(requiresAuth("POST", "/webhooks/stripe-test", publicRoutes)).toBe(false);
      expect(requiresAuth("GET", "/api/data-export", publicRoutes)).toBe(false);
    });
  });

  describe("Constants Validation", () => {
    it("should export DEFAULT_PUBLIC_ROUTES", () => {
      expect(DEFAULT_PUBLIC_ROUTES).toBeDefined();
      expect(Array.isArray(DEFAULT_PUBLIC_ROUTES)).toBe(true);
      expect(DEFAULT_PUBLIC_ROUTES.length).toBeGreaterThan(0);
    });

    it("should export PROTECTED_ROUTES", () => {
      expect(PROTECTED_ROUTES).toBeDefined();
      expect(Array.isArray(PROTECTED_ROUTES)).toBe(true);
      expect(PROTECTED_ROUTES.length).toBeGreaterThan(0);
    });

    it("should have no overlap between DEFAULT_PUBLIC_ROUTES and PROTECTED_ROUTES", () => {
      const publicSet = new Set(DEFAULT_PUBLIC_ROUTES);
      const protectedSet = new Set(PROTECTED_ROUTES);

      DEFAULT_PUBLIC_ROUTES.forEach((route) => {
        expect(protectedSet.has(route)).toBe(false);
      });

      PROTECTED_ROUTES.forEach((route) => {
        expect(publicSet.has(route)).toBe(false);
      });
    });
  });
});
