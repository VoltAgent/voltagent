import { Elysia } from "elysia";
import { describe, expect, it, vi } from "vitest";
import { registerA2ARoutes } from "./a2a.routes";
import { registerObservabilityRoutes } from "./observability";
import { registerTriggerRoutes } from "./trigger.routes";

describe("Route Registration", () => {
  it("should register trigger routes", () => {
    const app = new Elysia();
    const deps = {
      triggerRegistry: {
        list: vi.fn().mockReturnValue([{ path: "/trigger/test", method: "POST" }]),
      },
    };

    registerTriggerRoutes(app, deps as any, console as any);

    const paths = app.routes.map((r) => r.path);
    expect(paths).toContain("/trigger/test");
  });

  it("should register observability routes", () => {
    const app = new Elysia();
    const deps = {};

    registerObservabilityRoutes(app, deps as any, console as any);

    const paths = app.routes.map((r) => r.path);
    // Check for some known observability routes
    // Note: paths might be prefixed or exact depending on implementation
    // Based on observability.ts, they seem to be absolute paths
    expect(paths).toContain("/setup-observability");
    expect(paths).toContain("/observability/traces");
  });

  it("should register A2A routes", () => {
    const app = new Elysia();
    const deps = {
      a2a: {
        registry: {
          list: () => [{ id: "test-server" }],
        },
      },
    };

    registerA2ARoutes(app, deps as any, console as any);

    const paths = app.routes.map((r) => r.path);
    // Based on A2A_ROUTES log, it registers /a2a/:serverId
    expect(paths).toContain("/a2a/:serverId");
  });
});
