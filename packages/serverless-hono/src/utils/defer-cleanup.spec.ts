import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deferCleanup } from "../serverless-provider";
import type { WaitUntilContext } from "./wait-until-wrapper";

type VoltAgentGlobal = typeof globalThis & {
  ___voltagent_wait_until?: (promise: Promise<unknown>) => void;
};

describe("deferCleanup", () => {
  let originalWaitUntil: ((promise: Promise<unknown>) => void) | undefined;

  beforeEach(() => {
    const globals = globalThis as VoltAgentGlobal;
    originalWaitUntil = globals.___voltagent_wait_until;
  });

  afterEach(() => {
    const globals = globalThis as VoltAgentGlobal;
    globals.___voltagent_wait_until = originalWaitUntil;
  });

  it("should defer cleanup until all tracked promises settle", async () => {
    const cleanup = vi.fn();
    const registeredPromises: Promise<unknown>[] = [];
    const context: WaitUntilContext = {
      waitUntil: vi.fn((p: Promise<unknown>) => {
        registeredPromises.push(p);
      }),
    };

    // Set up a global so the tracking wrapper can intercept
    const globals = globalThis as VoltAgentGlobal;
    globals.___voltagent_wait_until = context.waitUntil?.bind(context);

    // Simulate a background tool promise that takes time
    let resolveToolPromise!: () => void;
    const toolPromise = new Promise<void>((r) => {
      resolveToolPromise = r;
    });

    deferCleanup(context, cleanup);

    // Simulate tool registering via the global after deferCleanup
    globals.___voltagent_wait_until?.(toolPromise);

    // cleanup should NOT have run yet — tool is still pending
    await Promise.resolve(); // flush microtasks
    expect(cleanup).not.toHaveBeenCalled();

    // Now resolve the tool promise
    resolveToolPromise();
    await Promise.allSettled(registeredPromises);

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("should fall back to synchronous cleanup when context is null", () => {
    const cleanup = vi.fn();

    deferCleanup(null, cleanup);

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("should fall back to synchronous cleanup when context is undefined", () => {
    const cleanup = vi.fn();

    deferCleanup(undefined, cleanup);

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("should fall back to synchronous cleanup when context has no waitUntil", () => {
    const cleanup = vi.fn();

    deferCleanup({} as unknown as WaitUntilContext, cleanup);

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("should fall back to synchronous cleanup when waitUntil throws", () => {
    const cleanup = vi.fn();
    const context: WaitUntilContext = {
      waitUntil: vi.fn(() => {
        throw new Error("Cannot call waitUntil after response committed");
      }),
    };

    deferCleanup(context, cleanup);

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("should not throw when waitUntil throws", () => {
    const cleanup = vi.fn();
    const context: WaitUntilContext = {
      waitUntil: vi.fn(() => {
        throw new Error("platform error");
      }),
    };

    expect(() => deferCleanup(context, cleanup)).not.toThrow();
  });

  it("should handle context with non-function waitUntil", () => {
    const cleanup = vi.fn();
    const context = { waitUntil: "not a function" } as unknown as WaitUntilContext;

    deferCleanup(context, cleanup);

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("should handle late-registered promises", async () => {
    const cleanup = vi.fn();
    const registeredPromises: Promise<unknown>[] = [];
    const context: WaitUntilContext = {
      waitUntil: vi.fn((p: Promise<unknown>) => {
        registeredPromises.push(p);
      }),
    };

    const globals = globalThis as VoltAgentGlobal;
    globals.___voltagent_wait_until = context.waitUntil?.bind(context);

    let resolveFirst!: () => void;
    const firstPromise = new Promise<void>((r) => {
      resolveFirst = r;
    });

    let resolveSecond!: () => void;
    const secondPromise = new Promise<void>((r) => {
      resolveSecond = r;
    });

    deferCleanup(context, cleanup);

    // Register first background task
    globals.___voltagent_wait_until?.(firstPromise);

    // Resolve first — but second hasn't been registered yet
    resolveFirst();
    await Promise.resolve();
    await Promise.resolve();

    // Register second task AFTER first settled (late registration)
    globals.___voltagent_wait_until?.(secondPromise);

    // cleanup should still NOT have run
    expect(cleanup).not.toHaveBeenCalled();

    // Now resolve second
    resolveSecond();
    await Promise.allSettled(registeredPromises);

    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
