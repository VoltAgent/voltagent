import { cors } from "hono/cors";
import { describe, expect, it } from "vitest";
import { createApp } from "./app-factory";

describe("app-factory CORS configuration", () => {
  it("should apply default CORS when no custom CORS is configured", async () => {
    const { app } = await createApp(
      {
        agentRegistry: { getAll: () => [] } as any,
        workflowRegistry: { getAll: () => [] } as any,
      } as any,
      {},
    );

    const res = await app.request("/agents", {
      method: "OPTIONS",
    });

    // Default CORS should allow all origins
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("should use custom CORS configuration when provided in config", async () => {
    const { app } = await createApp(
      {
        agentRegistry: { getAll: () => [] } as any,
        workflowRegistry: { getAll: () => [] } as any,
      } as any,
      {
        cors: {
          origin: "http://example.com",
          allowHeaders: ["X-Custom-Header", "Content-Type"],
          allowMethods: ["POST", "GET", "OPTIONS"],
          maxAge: 600,
          credentials: true,
        },
      },
    );

    const res = await app.request("/agents/test-agent/text", {
      method: "OPTIONS",
      headers: {
        Origin: "http://example.com",
      },
    });

    // Custom CORS should be applied
    expect(res.headers.get("access-control-allow-origin")).toBe("http://example.com");
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
    expect(res.headers.get("access-control-max-age")).toBe("600");
  });

  it("should not apply default CORS when custom CORS is configured", async () => {
    const { app } = await createApp(
      {
        agentRegistry: { getAll: () => [] } as any,
        workflowRegistry: { getAll: () => [] } as any,
      } as any,
      {
        cors: {
          origin: "http://trusted-domain.com",
        },
      },
    );

    // Request from a different origin
    const res = await app.request("/agents", {
      method: "OPTIONS",
      headers: {
        Origin: "http://untrusted-domain.com",
      },
    });

    // Should use custom CORS (which will not allow this origin)
    // The CORS middleware will not set allow-origin for untrusted origins
    expect(res.headers.get("access-control-allow-origin")).not.toBe("*");
  });

  it("should allow custom routes in configureApp", async () => {
    const { app } = await createApp(
      {
        agentRegistry: { getAll: () => [] } as any,
        workflowRegistry: { getAll: () => [] } as any,
      } as any,
      {
        configureApp: (app) => {
          app.get("/custom-health", (c) => c.json({ status: "ok" }));
        },
      },
    );

    const res = await app.request("/custom-health");

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ status: "ok" });
  });

  it("should apply custom CORS settings from user's exact configuration", async () => {
    // This test matches the user's reported issue
    const { app } = await createApp(
      {
        agentRegistry: { getAll: () => [] } as any,
        workflowRegistry: { getAll: () => [] } as any,
      } as any,
      {
        cors: {
          origin: "http://example.com/",
          allowHeaders: ["X-Custom-Header", "Upgrade-Insecure-Requests"],
          allowMethods: ["POST", "GET", "OPTIONS"],
          exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
          maxAge: 600,
          credentials: true,
        },
      },
    );

    const res = await app.request("/agents/test-agent/text", {
      method: "OPTIONS",
      headers: {
        Origin: "http://example.com/",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "X-Custom-Header",
      },
    });

    // Verify custom CORS settings are actually applied
    expect(res.headers.get("access-control-allow-origin")).toBe("http://example.com/");
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
    expect(res.headers.get("access-control-max-age")).toBe("600");
    expect(res.headers.get("access-control-allow-methods")).toContain("POST");
    expect(res.headers.get("access-control-allow-methods")).toContain("GET");
    expect(res.headers.get("access-control-allow-methods")).toContain("OPTIONS");
  });

  it("should protect custom routes added via configureApp with auth middleware when defaultPrivate is true", async () => {
    const mockAuthProvider = {
      verifyToken: async (token: string) => {
        if (token === "valid-token") {
          return { id: "user-123", email: "test@example.com" };
        }
        return null;
      },
      publicRoutes: [],
      defaultPrivate: true, // Protect all routes by default
    };

    const { app } = await createApp(
      {
        agentRegistry: { getAll: () => [] } as any,
        workflowRegistry: { getAll: () => [] } as any,
      } as any,
      {
        auth: mockAuthProvider,
        configureApp: (app) => {
          app.get("/custom-protected", (c) => {
            const user = c.get("authenticatedUser");
            return c.json({ message: "protected", user });
          });
        },
      },
    );

    // Request without auth should fail
    const unauthorizedRes = await app.request("/custom-protected");
    expect(unauthorizedRes.status).toBe(401);
    const unauthorizedJson = await unauthorizedRes.json();
    expect(unauthorizedJson).toEqual({
      success: false,
      error: "Authentication required",
    });

    // Request with valid auth should succeed
    const authorizedRes = await app.request("/custom-protected", {
      headers: {
        Authorization: "Bearer valid-token",
      },
    });
    expect(authorizedRes.status).toBe(200);
    const authorizedJson = await authorizedRes.json();
    expect(authorizedJson.message).toBe("protected");
    expect(authorizedJson.user).toEqual({
      id: "user-123",
      email: "test@example.com",
    });
  });

  it("should allow disabling default CORS and using route-specific CORS", async () => {
    const { app } = await createApp(
      {
        agentRegistry: { getAll: () => [] } as any,
        workflowRegistry: { getAll: () => [] } as any,
      } as any,
      {
        cors: false, // Disable default CORS
        configureApp: (app) => {
          // Apply route-specific CORS
          app.use(
            "/api/agents/*",
            cors({
              origin: "https://agents.com",
              credentials: true,
            }),
          );

          app.use(
            "/api/public/*",
            cors({
              origin: "*",
            }),
          );

          app.get("/api/agents/test", (c) => c.json({ agent: "test" }));
          app.get("/api/public/test", (c) => c.json({ public: "test" }));
        },
      },
    );

    // Test agents route with specific origin
    const agentsRes = await app.request("/api/agents/test", {
      method: "OPTIONS",
      headers: {
        Origin: "https://agents.com",
        "Access-Control-Request-Method": "GET",
      },
    });
    expect(agentsRes.headers.get("access-control-allow-origin")).toBe("https://agents.com");
    expect(agentsRes.headers.get("access-control-allow-credentials")).toBe("true");

    // Test public route with wildcard
    const publicRes = await app.request("/api/public/test", {
      method: "OPTIONS",
      headers: {
        Origin: "https://any-domain.com",
        "Access-Control-Request-Method": "GET",
      },
    });
    expect(publicRes.headers.get("access-control-allow-origin")).toBe("*");

    // Test built-in route (should not have CORS since we disabled it)
    const builtinRes = await app.request("/agents", {
      method: "OPTIONS",
    });
    // No default CORS applied
    expect(builtinRes.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("should use default CORS when not explicitly disabled", async () => {
    const { app } = await createApp(
      {
        agentRegistry: { getAll: () => [] } as any,
        workflowRegistry: { getAll: () => [] } as any,
      } as any,
      {
        cors: {
          origin: "https://default.com",
          credentials: true,
        },
      },
    );

    // Test default CORS on built-in routes
    const defaultRes = await app.request("/agents", {
      method: "OPTIONS",
      headers: {
        Origin: "https://default.com",
      },
    });
    expect(defaultRes.headers.get("access-control-allow-origin")).toBe("https://default.com");
    expect(defaultRes.headers.get("access-control-allow-credentials")).toBe("true");
  });

  it("should keep custom routes public in opt-in mode (default)", async () => {
    const mockAuthProvider = {
      verifyToken: async (token: string) => {
        if (token === "valid-token") {
          return { id: "user-123", email: "test@example.com" };
        }
        return null;
      },
      publicRoutes: [],
      // defaultPrivate: false (default - implicit)
    };

    const { app } = await createApp(
      {
        agentRegistry: { getAll: () => [] } as any,
        workflowRegistry: { getAll: () => [] } as any,
      } as any,
      {
        auth: mockAuthProvider,
        configureApp: (app) => {
          app.get("/custom-public", (c) => c.json({ message: "public" }));
        },
      },
    );

    // Request without auth should succeed (opt-in mode)
    const res = await app.request("/custom-public");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toBe("public");
  });

  it("should execute auth middleware before custom routes", async () => {
    const executionOrder: string[] = [];

    const mockAuthProvider = {
      verifyToken: async (token: string) => {
        executionOrder.push("auth-middleware");
        return token === "valid" ? { id: "user" } : null;
      },
      publicRoutes: [],
      defaultPrivate: true,
    };

    const { app } = await createApp(
      {
        agentRegistry: { getAll: () => [] } as any,
        workflowRegistry: { getAll: () => [] } as any,
      } as any,
      {
        auth: mockAuthProvider,
        configureApp: (app) => {
          app.get("/test-order", (c) => {
            executionOrder.push("custom-route");
            return c.json({ order: executionOrder });
          });
        },
      },
    );

    await app.request("/test-order", {
      headers: { Authorization: "Bearer valid" },
    });

    // Auth middleware should execute before custom route
    expect(executionOrder).toEqual(["auth-middleware", "custom-route"]);
  });
});
