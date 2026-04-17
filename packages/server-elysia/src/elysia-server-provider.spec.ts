import { portManager } from "@voltagent/server-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as appFactory from "./app-factory";
import { ElysiaServerProvider } from "./elysia-server-provider";

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

// Mock node:http
const mockServer = {
  listen: vi.fn(),
  close: vi.fn(),
  once: vi.fn(),
  listening: true,
};

vi.mock("node:http", () => ({
  createServer: vi.fn(() => mockServer),
}));

describe("ElysiaServerProvider", () => {
  let provider: ElysiaServerProvider;
  const mockApp = {
    listen: vi.fn().mockReturnValue({}),
    stop: vi.fn(),
    routes: [], // For extractCustomEndpoints
    get: vi.fn(), // For configureApp test
    fetch: vi.fn(), // For http server handler
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
    provider = new ElysiaServerProvider(mockDeps, { port: 3000 });

    // Reset mock server behavior for each test
    mockServer.listen.mockImplementation((port, hostname, callback) => {
      // Call callback synchronously to simulate successful listen
      callback();
      return mockServer;
    });
    mockServer.close.mockImplementation((callback) => {
      callback();
    });
    mockServer.once.mockReturnValue(mockServer);
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockApp.routes = [];
  });

  it("should start the server", async () => {
    const { createServer } = await import("node:http");
    await provider.start();
    expect(appFactory.createApp).toHaveBeenCalled();
    expect(createServer).toHaveBeenCalled();
    expect(mockServer.listen).toHaveBeenCalledWith(3000, "0.0.0.0", expect.any(Function));
  });

  it("should stop the server", async () => {
    await provider.start();
    await provider.stop();
    expect(mockApp.stop).toHaveBeenCalled();
    expect(mockServer.close).toHaveBeenCalled();
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
      listen: vi.fn().mockReturnValue({}),
      stop: vi.fn(),
      routes: [{ method: "GET", path: "/custom-test" }],
      get: vi.fn(),
      fetch: vi.fn(),
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
    // Mock server.once to capture the error handler, then trigger it
    let errorHandler: ((err: Error) => void) | undefined;
    mockServer.once.mockImplementation((event, handler) => {
      if (event === "error") {
        errorHandler = handler;
      }
      return mockServer;
    });

    // Mock server.listen to trigger the error
    mockServer.listen.mockImplementation(() => {
      // Simulate an error during listen by calling the error handler
      if (errorHandler) {
        errorHandler(new Error("Startup failed"));
      }
      return mockServer;
    });

    await expect(provider.start()).rejects.toThrow("Startup failed");
    expect(portManager.releasePort).toHaveBeenCalledWith(3000);
  });
});
