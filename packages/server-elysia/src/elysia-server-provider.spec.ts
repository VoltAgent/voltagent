import { portManager } from "@voltagent/server-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as appFactory from "./app-factory";
import { ElysiaServerProvider } from "./elysia-server-provider";

const { mockCreateServer, mockHttpServer } = vi.hoisted(() => {
  const server = {
    once: vi.fn(),
    listen: vi.fn((_port: number, _hostname: string, callback?: () => void) => {
      callback?.();
      return server;
    }),
    close: vi.fn((callback?: (error?: Error) => void) => {
      callback?.();
    }),
    listening: true,
  };

  return {
    mockCreateServer: vi.fn(() => server),
    mockHttpServer: server,
  };
});

// Mock dependencies
vi.mock("@voltagent/server-core", async () => {
  const actual = await vi.importActual("@voltagent/server-core");
  return {
    ...actual,
    portManager: {
      allocatePort: vi.fn().mockImplementation((port) => Promise.resolve(port || 3000)),
      releasePort: vi.fn(),
    },
    createWebSocketServer: vi.fn(),
    setupWebSocketUpgrade: vi.fn(),
    showAnnouncements: vi.fn(),
    printServerStartup: vi.fn(),
  };
});

vi.mock("node:http", () => ({
  createServer: mockCreateServer,
}));

describe("ElysiaServerProvider", () => {
  let provider: ElysiaServerProvider;
  const mockApp = {
    stop: vi.fn(),
    routes: [], // For extractCustomEndpoints
    get: vi.fn(), // For configureApp test
  };

  const mockDeps = {
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      child: vi.fn().mockReturnThis(),
    },
    config: {
      port: 3000,
    },
  } as any;

  beforeEach(() => {
    vi.spyOn(appFactory, "createApp").mockResolvedValue({ app: mockApp } as any);
    mockCreateServer.mockReturnValue(mockHttpServer);
    mockHttpServer.once.mockReturnValue(mockHttpServer);
    mockHttpServer.listen.mockImplementation(
      (_port: number, _hostname: string, callback?: () => void) => {
        callback?.();
        return mockHttpServer;
      },
    );
    mockHttpServer.close.mockImplementation((callback?: (error?: Error) => void) => {
      callback?.();
    });
    mockHttpServer.listening = true;
    provider = new ElysiaServerProvider(mockDeps, { port: 3000 });
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockApp.routes = [];
  });

  it("should start the server", async () => {
    await provider.start();
    expect(appFactory.createApp).toHaveBeenCalled();
    expect(mockCreateServer).toHaveBeenCalledWith(expect.any(Function));
    expect(mockHttpServer.once).toHaveBeenCalledWith("error", expect.any(Function));
    expect(mockHttpServer.listen).toHaveBeenCalledWith(3000, "0.0.0.0", expect.any(Function));
  });

  it("should stop the server", async () => {
    await provider.start();
    await provider.stop();
    expect(mockApp.stop).toHaveBeenCalled();
    expect(mockHttpServer.close).toHaveBeenCalledWith(expect.any(Function));
  });

  it("should throw if already running", async () => {
    await provider.start();
    await expect(provider.start()).rejects.toThrow("Server is already running");
  });

  it("should configure websocket if enabled", async () => {
    const { createWebSocketServer } = await import("@voltagent/server-core");
    const providerWs = new ElysiaServerProvider(mockDeps, { port: 3000, enableWebSocket: true });
    await providerWs.start();
    expect(createWebSocketServer).toHaveBeenCalled();
  });

  it("should extract and display custom endpoints from configureApp", async () => {
    const { printServerStartup } = await import("@voltagent/server-core");

    // Create a fresh mock app for this test to avoid pollution
    const localMockApp = {
      stop: vi.fn(),
      routes: [{ method: "GET", path: "/custom-test" }],
      get: vi.fn(),
    };

    vi.spyOn(appFactory, "createApp").mockResolvedValue({ app: localMockApp } as any);

    const providerWithCustom = new ElysiaServerProvider(mockDeps, {
      port: 3000,
      configureApp: (app) => {
        app.get("/custom-test", () => "custom");
        return app;
      },
    });

    await providerWithCustom.start();
    expect(printServerStartup).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({
        customEndpoints: expect.arrayContaining([
          expect.objectContaining({ path: "/custom-test" }),
        ]),
      }),
    );
  });

  it("should handle startup errors and release port", async () => {
    mockHttpServer.listen.mockImplementationOnce(() => {
      throw new Error("Startup failed");
    });

    await expect(provider.start()).rejects.toThrow("Startup failed");
    expect(portManager.releasePort).toHaveBeenCalledWith(3000);
  });
});
