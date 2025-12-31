import * as serverCore from "@voltagent/server-core";
import { Elysia } from "elysia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerTriggerRoutes } from "./trigger.routes";

// Mock server-core handlers
vi.mock("@voltagent/server-core", async () => {
  const actual = await vi.importActual("@voltagent/server-core");
  return {
    ...actual,
    executeTriggerHandler: vi.fn(),
  };
});

describe("Trigger Routes", () => {
  let app: Elysia;
  const mockDeps = {
    triggerRegistry: {
      list: vi.fn(),
    },
  } as any;
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
  } as any;

  beforeEach(() => {
    app = new Elysia();
    vi.clearAllMocks();
  });

  it("should register and execute a POST trigger", async () => {
    mockDeps.triggerRegistry.list.mockReturnValue([
      { name: "test-trigger", method: "POST", path: "/trigger/test" },
    ]);
    vi.mocked(serverCore.executeTriggerHandler).mockResolvedValue({
      status: 200,
      body: { success: true },
      headers: {},
    });

    registerTriggerRoutes(app, mockDeps, mockLogger);

    const response = await app.handle(
      new Request("http://localhost/trigger/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Custom": "value" },
        body: JSON.stringify({ data: "test" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(serverCore.executeTriggerHandler).toHaveBeenCalledWith(
      expect.objectContaining({ name: "test-trigger" }),
      expect.objectContaining({
        body: { data: "test" },
        headers: expect.objectContaining({ "x-custom": "value" }),
      }),
      mockDeps,
      mockLogger,
    );
  });

  it("should register and execute a GET trigger", async () => {
    mockDeps.triggerRegistry.list.mockReturnValue([
      { name: "get-trigger", method: "GET", path: "/trigger/get" },
    ]);
    vi.mocked(serverCore.executeTriggerHandler).mockResolvedValue({
      status: 200,
      body: { success: true },
      headers: {},
    });

    registerTriggerRoutes(app, mockDeps, mockLogger);

    const response = await app.handle(new Request("http://localhost/trigger/get?param=value"));

    expect(response.status).toBe(200);
    expect(serverCore.executeTriggerHandler).toHaveBeenCalledWith(
      expect.objectContaining({ name: "get-trigger" }),
      expect.objectContaining({
        query: { param: "value" },
      }),
      mockDeps,
      mockLogger,
    );
  });

  it("should skip unsupported methods", async () => {
    mockDeps.triggerRegistry.list.mockReturnValue([
      { name: "bad-trigger", method: "HEAD", path: "/trigger/bad" },
    ]);

    registerTriggerRoutes(app, mockDeps, mockLogger);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("method head not supported"),
    );
  });
});
