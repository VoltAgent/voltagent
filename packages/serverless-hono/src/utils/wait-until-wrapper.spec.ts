import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WaitUntilContext } from "./wait-until-wrapper";
import { withWaitUntil } from "./wait-until-wrapper";

type VoltAgentGlobal = typeof globalThis & {
  ___voltagent_wait_until?: (promise: Promise<unknown>) => void;
};

describe("withWaitUntil", () => {
  let originalWaitUntil: ((promise: Promise<unknown>) => void) | undefined;

  beforeEach(() => {
    const globals = globalThis as VoltAgentGlobal;
    originalWaitUntil = globals.___voltagent_wait_until;
  });

  afterEach(() => {
    const globals = globalThis as VoltAgentGlobal;
    globals.___voltagent_wait_until = originalWaitUntil;
  });

  it("should set global waitUntil when context has waitUntil", () => {
    const mockWaitUntil = vi.fn();
    const context: WaitUntilContext = { waitUntil: mockWaitUntil };

    withWaitUntil(context);

    const globals = globalThis as VoltAgentGlobal;
    expect(globals.___voltagent_wait_until).toBeDefined();
  });

  it("should not set global waitUntil when context is undefined", () => {
    withWaitUntil(undefined);

    const globals = globalThis as VoltAgentGlobal;
    expect(globals.___voltagent_wait_until).toBeUndefined();
  });

  it("should not set global waitUntil when context is null", () => {
    withWaitUntil(null);

    const globals = globalThis as VoltAgentGlobal;
    expect(globals.___voltagent_wait_until).toBeUndefined();
  });

  it("should not set global waitUntil when context has no waitUntil", () => {
    const context = {};

    withWaitUntil(context);

    const globals = globalThis as VoltAgentGlobal;
    expect(globals.___voltagent_wait_until).toBeUndefined();
  });

  it("should call context.waitUntil when global waitUntil is invoked", () => {
    const mockWaitUntil = vi.fn();
    const context: WaitUntilContext = { waitUntil: mockWaitUntil };

    withWaitUntil(context);

    const globals = globalThis as VoltAgentGlobal;
    const promise = Promise.resolve();
    globals.___voltagent_wait_until?.(promise);

    expect(mockWaitUntil).toHaveBeenCalledWith(promise);
  });

  it("should handle errors from context.waitUntil gracefully", () => {
    const mockWaitUntil = vi.fn(() => {
      throw new Error("waitUntil error");
    });
    const context: WaitUntilContext = { waitUntil: mockWaitUntil };

    withWaitUntil(context);

    const globals = globalThis as VoltAgentGlobal;
    const promise = Promise.resolve();

    // Should not throw
    expect(() => globals.___voltagent_wait_until?.(promise)).not.toThrow();
    expect(mockWaitUntil).toHaveBeenCalled();
  });

  it("should restore previous waitUntil after cleanup", () => {
    const previousWaitUntil = vi.fn();
    const mockWaitUntil = vi.fn();
    const context: WaitUntilContext = { waitUntil: mockWaitUntil };

    const globals = globalThis as VoltAgentGlobal;
    globals.___voltagent_wait_until = previousWaitUntil;

    const cleanup = withWaitUntil(context);

    expect(globals.___voltagent_wait_until).not.toBe(previousWaitUntil);

    cleanup();

    expect(globals.___voltagent_wait_until).toBe(previousWaitUntil);
  });

  it("should clear global waitUntil after cleanup when no previous value existed", () => {
    const mockWaitUntil = vi.fn();
    const context: WaitUntilContext = { waitUntil: mockWaitUntil };

    const globals = globalThis as VoltAgentGlobal;
    globals.___voltagent_wait_until = undefined;

    const cleanup = withWaitUntil(context);

    expect(globals.___voltagent_wait_until).toBeDefined();

    cleanup();

    expect(globals.___voltagent_wait_until).toBeUndefined();
  });

  it("should handle nested calls with proper state restoration", () => {
    const outerWaitUntil = vi.fn();
    const innerWaitUntil = vi.fn();

    const outerContext: WaitUntilContext = { waitUntil: outerWaitUntil };
    const innerContext: WaitUntilContext = { waitUntil: innerWaitUntil };

    const globals = globalThis as VoltAgentGlobal;

    const outerCleanup = withWaitUntil(outerContext);
    const outerGlobalWaitUntil = globals.___voltagent_wait_until;

    const innerCleanup = withWaitUntil(innerContext);
    const innerGlobalWaitUntil = globals.___voltagent_wait_until;

    expect(outerGlobalWaitUntil).toBeDefined();
    expect(innerGlobalWaitUntil).toBeDefined();
    expect(innerGlobalWaitUntil).not.toBe(outerGlobalWaitUntil);

    // Call inner global waitUntil
    const promise1 = Promise.resolve();
    globals.___voltagent_wait_until?.(promise1);
    expect(innerWaitUntil).toHaveBeenCalledWith(promise1);
    expect(outerWaitUntil).not.toHaveBeenCalled();

    // Cleanup inner
    innerCleanup();
    expect(globals.___voltagent_wait_until).toBe(outerGlobalWaitUntil);

    // Call outer global waitUntil
    const promise2 = Promise.resolve();
    globals.___voltagent_wait_until?.(promise2);
    expect(outerWaitUntil).toHaveBeenCalledWith(promise2);

    // Cleanup outer
    outerCleanup();
    expect(globals.___voltagent_wait_until).toBeUndefined();
  });

  it("should not affect global state when context has no waitUntil", () => {
    const globals = globalThis as VoltAgentGlobal;
    const previousWaitUntil = vi.fn();
    globals.___voltagent_wait_until = previousWaitUntil;

    const cleanup = withWaitUntil({});

    expect(globals.___voltagent_wait_until).toBe(previousWaitUntil);

    cleanup();

    expect(globals.___voltagent_wait_until).toBe(previousWaitUntil);
  });

  it("should handle context with non-function waitUntil", () => {
    const context = { waitUntil: "not a function" as any };

    const cleanup = withWaitUntil(context);

    const globals = globalThis as VoltAgentGlobal;
    expect(globals.___voltagent_wait_until).toBeUndefined();

    cleanup();
  });
});
