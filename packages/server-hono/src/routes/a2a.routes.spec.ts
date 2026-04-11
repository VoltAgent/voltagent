import * as serverCore from "@voltagent/server-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OpenAPIHono } from "../zod-openapi-compat";
import { registerA2ARoutes } from "./a2a.routes";

vi.mock("@voltagent/server-core", async () => {
  const actual = await vi.importActual("@voltagent/server-core");
  return {
    ...actual,
    executeA2ARequest: vi.fn(),
    resolveAgentCard: vi.fn(),
    A2A_ROUTES: actual.A2A_ROUTES,
  };
});

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
  let app: OpenAPIHono;
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
    app = new OpenAPIHono();
    registerA2ARoutes(app as any, mockDeps, mockLogger);
    vi.clearAllMocks();
  });

  it("passes the request URL when resolving the agent card", async () => {
    vi.mocked(serverCore.resolveAgentCard).mockReturnValue({
      name: "agent",
      description: "desc",
    } as any);

    const requestUrl = "http://agents.example/.well-known/server1/agent-card.json";
    const response = await app.request(requestUrl);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      name: "agent",
      description: "desc",
    });
    expect(serverCore.resolveAgentCard).toHaveBeenCalledWith(
      mockDeps.a2a.registry,
      "server1",
      "server1",
      { requestUrl },
    );
  });
});
