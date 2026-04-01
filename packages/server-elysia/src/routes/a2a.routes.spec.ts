import * as serverCore from "@voltagent/server-core";
import { Elysia } from "elysia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerA2ARoutes } from "./a2a.routes";

// Mock server-core handlers
vi.mock("@voltagent/server-core", async () => {
  const actual = await vi.importActual("@voltagent/server-core");
  return {
    ...actual,
    executeA2ARequest: vi.fn(),
    resolveAgentCard: vi.fn(),
    A2A_ROUTES: actual.A2A_ROUTES,
  };
});

// Mock a2a-server
vi.mock("@voltagent/a2a-server", async () => {
  return {
    normalizeError: vi.fn().mockImplementation((id, error) => ({
      jsonrpc: "2.0",
      id,
      error: {
        code: error.code || -32603,
        message: error.message,
      },
    })),
  };
});

describe("A2A Routes", () => {
  let app: Elysia;
  const mockDeps = {
    a2a: {
      registry: {
        list: vi.fn().mockReturnValue([{ id: "server1" }]),
      },
    },
  } as any;
  const mockLogger = {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  } as any;

  beforeEach(() => {
    app = new Elysia();
    registerA2ARoutes(app, mockDeps, mockLogger);
    vi.clearAllMocks();
  });

  it("should handle JSON-RPC request", async () => {
    vi.mocked(serverCore.executeA2ARequest).mockResolvedValue({
      jsonrpc: "2.0",
      id: "1",
      result: "success",
    });

    const response = await app.handle(
      new Request("http://localhost/a2a/server1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "test",
          id: "1",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      jsonrpc: "2.0",
      id: "1",
      result: "success",
    });
    expect(serverCore.executeA2ARequest).toHaveBeenCalled();
  });

  it("should handle agent card request", async () => {
    vi.mocked(serverCore.resolveAgentCard).mockResolvedValue({
      name: "agent",
      description: "desc",
    } as any);

    const response = await app.handle(
      new Request("http://localhost/.well-known/server1/agent-card.json"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      name: "agent",
      description: "desc",
    });
    expect(serverCore.resolveAgentCard).toHaveBeenCalledWith(
      mockDeps.a2a.registry,
      "server1",
      "server1",
      {},
    );
  });

  it("should handle agent card not found", async () => {
    vi.mocked(serverCore.resolveAgentCard).mockImplementation(() => {
      const error = new Error("Not found");
      (error as any).code = -32601;
      throw error;
    });

    const response = await app.handle(
      new Request("http://localhost/.well-known/server1/agent-card.json"),
    );

    expect(response.status).toBe(404);
  });
});
