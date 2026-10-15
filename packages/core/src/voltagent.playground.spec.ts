import { startPlaygroundServer } from "@voltagent/playground";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ServerlessVoltAgentObservability } from "./observability";
import type { IServerProvider, VoltAgentOptions } from "./types";
import { VoltAgent } from "./voltagent";

vi.mock("@voltagent/playground", () => ({ startPlaygroundServer: vi.fn() }));
const stop = vi.fn(async () => {});
const instances: VoltAgent[] = [];
let server: IServerProvider;
let running = false;
let rejectionListeners: NodeJS.UnhandledRejectionListener[];
let signalListeners: { interrupt: NodeJS.SignalsListener[]; terminate: NodeJS.SignalsListener[] };

beforeEach(() => {
  vi.clearAllMocks();
  rejectionListeners = process.listeners("unhandledRejection");
  signalListeners = {
    interrupt: process.listeners("SIGINT"),
    terminate: process.listeners("SIGTERM"),
  };
  vi.mocked(startPlaygroundServer).mockResolvedValue({
    port: 3142,
    url: "http://localhost:3142",
    stop,
  });
  running = false;
  server = {
    start: vi.fn(async () => {
      running = true;
      return { port: 4321 };
    }),
    stop: vi.fn(async () => {
      running = false;
    }),
    isRunning: () => running,
  };
});
afterEach(async () => {
  for (const instance of instances.splice(0)) await instance.shutdown();
  for (const listener of process.listeners("SIGINT"))
    if (!signalListeners.interrupt.includes(listener)) process.off("SIGINT", listener);
  for (const listener of process.listeners("SIGTERM"))
    if (!signalListeners.terminate.includes(listener)) process.off("SIGTERM", listener);
  for (const listener of process.listeners("unhandledRejection")) {
    if (!rejectionListeners.includes(listener)) process.off("unhandledRejection", listener);
  }
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
async function create(options: Partial<VoltAgentOptions> = {}) {
  const instance = new VoltAgent({
    agents: {},
    checkDependencies: false,
    observability: new ServerlessVoltAgentObservability({ serviceName: "playground-test" }),
    server: () => server,
    ...options,
  });
  instances.push(instance);
  await instance.ready;
  await instance.startServer();
  return instance;
}

describe("VoltAgent playground lifecycle", () => {
  it("starts in development using the actual API port", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const instance = await create();
    expect(startPlaygroundServer).toHaveBeenCalledWith({
      port: 3142,
      apiUrl: "http://127.0.0.1:4321",
    });
    expect(instance.getPlaygroundUrl()).toBe("http://localhost:3142");
    expect(server.start).toHaveBeenCalledTimes(1);
  });
  it.each([false, { enabled: false, port: 4444 }])(
    "respects disabled configuration: %s",
    async (playground) => {
      vi.stubEnv("NODE_ENV", "development");
      await create({ playground });
      expect(startPlaygroundServer).not.toHaveBeenCalled();
    },
  );
  it.each(["production", "test"])("defaults off in %s", async (environment) => {
    vi.stubEnv("NODE_ENV", environment);
    await create();
    expect(startPlaygroundServer).not.toHaveBeenCalled();
  });
  it("allows explicit production enablement and custom port/address", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await create({ playground: { port: 5555, apiUrl: "https://localhost:4444" } });
    expect(startPlaygroundServer).toHaveBeenCalledWith({
      port: 5555,
      apiUrl: "https://localhost:4444",
    });
  });
  it("can stop and restart the playground while keeping the API running", async () => {
    const instance = await create({ playground: false });
    await Promise.all([instance.startPlayground(), instance.startPlayground()]);
    expect(startPlaygroundServer).toHaveBeenCalledTimes(1);
    await instance.stopPlayground();
    expect(stop).toHaveBeenCalledTimes(1);
    expect(instance.getPlaygroundUrl()).toBeUndefined();
    expect(server.isRunning()).toBe(true);
    await instance.startPlayground();
    expect(startPlaygroundServer).toHaveBeenCalledTimes(2);
    await instance.stopServer();
    expect(stop).toHaveBeenCalledTimes(2);
    expect(server.isRunning()).toBe(false);
  });
  it("leaves the API running when the playground fails to bind", async () => {
    vi.mocked(startPlaygroundServer).mockRejectedValueOnce(new Error("EADDRINUSE"));
    const instance = await create({ playground: true });
    expect(server.isRunning()).toBe(true);
    expect(instance.getPlaygroundUrl()).toBeUndefined();
    await instance.startPlayground();
    expect(instance.getPlaygroundUrl()).toBeDefined();
  });
  it("does not import/start the playground for a serverless runtime", async () => {
    vi.stubGlobal("EdgeRuntime", "edge-runtime");
    const instance = await create({ playground: true });
    expect(startPlaygroundServer).not.toHaveBeenCalled();
    await expect(instance.startPlayground()).rejects.toThrow("Node server provider");
  });
  it("waits for automatic startup when stopped immediately after construction", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.start = vi.fn(async () => {
      await gate;
      running = true;
      return { port: 4321 };
    });
    const instance = new VoltAgent({
      agents: {},
      checkDependencies: false,
      observability: new ServerlessVoltAgentObservability({ serviceName: "playground-test" }),
      server: () => server,
      playground: true,
    });
    instances.push(instance);
    const stopping = instance.stopPlayground();
    release();
    await stopping;
    expect(stop).toHaveBeenCalledTimes(1);
    expect(instance.getPlaygroundUrl()).toBeUndefined();
    expect(server.isRunning()).toBe(true);
  });
  it("requires an API provider", async () => {
    const instance = await create({ server: undefined, playground: true });
    expect(startPlaygroundServer).not.toHaveBeenCalled();
    await expect(instance.startPlayground()).rejects.toThrow("Node server provider");
  });
});
