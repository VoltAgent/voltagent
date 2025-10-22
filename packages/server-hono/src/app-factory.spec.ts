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

  it("should use custom CORS configuration when provided in configureApp", async () => {
    const { app } = await createApp(
      {
        agentRegistry: { getAll: () => [] } as any,
        workflowRegistry: { getAll: () => [] } as any,
      } as any,
      {
        configureApp: (app) => {
          // Apply custom CORS with specific origin
          app.use(
            "/agents/*",
            cors({
              origin: "http://example.com",
              allowHeaders: ["X-Custom-Header", "Content-Type"],
              allowMethods: ["POST", "GET", "OPTIONS"],
              maxAge: 600,
              credentials: true,
            }),
          );
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
        configureApp: (app) => {
          // Apply custom CORS that restricts origins
          app.use(
            "*",
            cors({
              origin: "http://trusted-domain.com",
            }),
          );
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

  it("should allow custom routes in configureApp to run before default middleware", async () => {
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
        configureApp: (app) => {
          app.use(
            "/agents/*",
            cors({
              origin: "http://example.com/",
              allowHeaders: ["X-Custom-Header", "Upgrade-Insecure-Requests"],
              allowMethods: ["POST", "GET", "OPTIONS"],
              exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
              maxAge: 600,
              credentials: true,
            }),
          );
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
});
