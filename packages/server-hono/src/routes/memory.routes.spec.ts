import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@voltagent/server-core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@voltagent/server-core")>();
  return {
    ...actual,
    handleListMemoryConversations: vi.fn().mockResolvedValue({
      success: true,
      data: { conversations: [], total: 0, limit: 0, offset: 0 },
    }),
  };
});

import { MEMORY_ROUTES, handleListMemoryConversations } from "@voltagent/server-core";
import { registerMemoryRoutes } from "./memory.routes";

type RouteHandler = (context: Record<string, any>) => Promise<unknown>;

function createRouteCollector() {
  const handlers = new Map<string, RouteHandler>();
  const app: Record<string, ReturnType<typeof vi.fn>> = {};

  for (const method of ["get", "post", "patch", "delete"] as const) {
    app[method] = vi.fn((path: string, handler: RouteHandler) => {
      handlers.set(`${method}:${path}`, handler);
      return app;
    });
  }

  return { app, handlers };
}

describe("Hono memory routes", () => {
  const deps = {} as any;
  const logger = { trace: vi.fn(), warn: vi.fn() } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes the authenticated user to list-conversations", async () => {
    const { app, handlers } = createRouteCollector();
    registerMemoryRoutes(app as any, deps, logger);
    const handler = handlers.get(`get:${MEMORY_ROUTES.listConversations.path}`);
    expect(handler).toBeDefined();

    const context = {
      req: {
        query: () => ({ agentId: "agent-1", userId: "user-alice" }),
      },
      get: vi.fn((key: string) => (key === "authenticatedUser" ? { sub: "user-bob" } : undefined)),
      json: vi.fn((response: unknown, status: number) => ({ response, status })),
    };

    await handler?.(context);

    expect(handleListMemoryConversations).toHaveBeenCalledWith(
      deps,
      expect.objectContaining({
        agentId: "agent-1",
        userId: "user-alice",
        requestingUserId: "user-bob",
      }),
    );
  });
});
