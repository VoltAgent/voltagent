import { Elysia } from "elysia";
import { describe, expect, it, vi } from "vitest";
import { registerMcpRoutes } from "./mcp.routes";

describe("MCP Routes", () => {
  it("should register routes", () => {
    const app = new Elysia();
    const deps = {
      mcp: {
        registry: {} as any,
      },
    };

    registerMcpRoutes(app, deps, console as any);

    // Check if routes are registered
    // Elysia routes are stored in app.routes
    expect(app.routes.length).toBeGreaterThan(0);

    // Verify some specific paths exist
    const paths = app.routes.map((r) => r.path);
    expect(paths).toContain("/mcp");
    expect(paths).toContain("/mcp/:serverId");
  });
});
