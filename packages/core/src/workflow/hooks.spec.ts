import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Memory } from "../memory";
import { InMemoryStorageAdapter } from "../memory/adapters/storage/in-memory";
import { createWorkflow } from "./core";
import { WorkflowRegistry } from "./registry";
import { andThen, andWhen } from "./steps";

describe.sequential("workflow hooks", () => {
  beforeEach(() => {
    const registry = WorkflowRegistry.getInstance();
    (registry as any).workflows.clear();
  });

  it("provides step snapshots in onFinish and onEnd", async () => {
    const hooks = {
      onFinish: vi.fn(),
      onEnd: vi.fn(),
      onError: vi.fn(),
      onSuspend: vi.fn(),
    };

    const workflow = createWorkflow(
      {
        id: "hook-success",
        name: "Hook Success",
        input: z.object({ value: z.number() }),
        result: z.object({ value: z.number() }),
        memory: new Memory({ storage: new InMemoryStorageAdapter() }),
        hooks,
      },
      andThen({
        id: "increment",
        execute: async ({ data }) => ({ value: data.value + 1 }),
      }),
      andWhen({
        id: "maybe-skip",
        condition: async () => false,
        step: andThen({
          id: "maybe-skip-inner",
          execute: async ({ data }) => ({ value: data.value + 100 }),
        }),
      }),
    );

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    const result = await workflow.run({ value: 1 });

    expect(result.status).toBe("completed");
    expect(hooks.onFinish).toHaveBeenCalledTimes(1);
    expect(hooks.onEnd).toHaveBeenCalledTimes(1);
    expect(hooks.onError).not.toHaveBeenCalled();
    expect(hooks.onSuspend).not.toHaveBeenCalled();

    const finishInfo = hooks.onFinish.mock.calls[0]?.[0];
    expect(finishInfo.status).toBe("completed");
    expect(finishInfo.steps.increment).toEqual({
      input: { value: 1 },
      output: { value: 2 },
      status: "success",
      error: null,
    });
    expect(finishInfo.steps["maybe-skip"].status).toBe("skipped");

    const [endState, endInfo] = hooks.onEnd.mock.calls[0] ?? [];
    expect(endState.status).toBe("completed");
    expect(endInfo?.steps.increment?.status).toBe("success");
  });

  it("calls onError with step error snapshots", async () => {
    const hooks = {
      onFinish: vi.fn(),
      onEnd: vi.fn(),
      onError: vi.fn(),
    };

    const workflow = createWorkflow(
      {
        id: "hook-error",
        name: "Hook Error",
        input: z.object({ value: z.number() }),
        result: z.object({ value: z.number() }),
        memory: new Memory({ storage: new InMemoryStorageAdapter() }),
        hooks,
      },
      andThen({
        id: "explode",
        execute: async () => {
          throw new Error("boom");
        },
      }),
    );

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    const result = await workflow.run({ value: 1 });

    expect(result.status).toBe("error");
    expect(hooks.onError).toHaveBeenCalledTimes(1);
    expect(hooks.onFinish).toHaveBeenCalledTimes(1);
    expect(hooks.onEnd).toHaveBeenCalledTimes(1);

    const errorInfo = hooks.onError.mock.calls[0]?.[0];
    expect(errorInfo.status).toBe("error");
    expect(errorInfo.steps.explode.status).toBe("error");
    expect(errorInfo.steps.explode.output).toBeUndefined();
    expect(errorInfo.steps.explode.error?.message).toBe("boom");
  });

  it("calls onSuspend and skips onEnd when suspended", async () => {
    const hooks = {
      onFinish: vi.fn(),
      onEnd: vi.fn(),
      onError: vi.fn(),
      onSuspend: vi.fn(),
    };

    const workflow = createWorkflow(
      {
        id: "hook-suspend",
        name: "Hook Suspend",
        input: z.object({ value: z.number() }),
        result: z.object({ value: z.number() }),
        memory: new Memory({ storage: new InMemoryStorageAdapter() }),
        hooks,
      },
      andThen({
        id: "needs-input",
        execute: async ({ suspend }) => {
          return await suspend("need-approval", { requestedBy: "system" });
        },
      }),
    );

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    const result = await workflow.run({ value: 42 });

    expect(result.status).toBe("suspended");
    expect(hooks.onSuspend).toHaveBeenCalledTimes(1);
    expect(hooks.onFinish).toHaveBeenCalledTimes(1);
    expect(hooks.onError).not.toHaveBeenCalled();
    expect(hooks.onEnd).not.toHaveBeenCalled();

    const suspendInfo = hooks.onSuspend.mock.calls[0]?.[0];
    expect(suspendInfo.status).toBe("suspended");
    expect(suspendInfo.steps["needs-input"].status).toBe("suspended");
    expect(suspendInfo.steps["needs-input"].output).toEqual({ value: 42 });
  });
});
