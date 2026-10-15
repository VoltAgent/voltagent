import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createWorkflowChain } from "./chain";
import { andThen } from "./steps";

describe("workflow scenario regressions", () => {
  it("applies input defaults and validates before executing a step", async () => {
    const execute = vi.fn(async ({ data, state }) => ({
      value: data.value,
      original: state.input.value,
    }));
    const workflow = createWorkflowChain({
      id: "validated-input",
      name: "Validated input",
      input: z.object({ value: z.number().default(2) }),
      result: z.object({ value: z.number(), original: z.number() }),
    })
      .andThen({ id: "read", execute })
      .toWorkflow();
    expect((await workflow.run({} as { value: number })).result).toEqual({ value: 2, original: 2 });
    execute.mockClear();
    const failed = await workflow.run({ value: "invalid" as unknown as number });
    expect(failed.status).toBe("error");
    expect(execute).not.toHaveBeenCalled();
  });
  it("validates and transforms step input and output, including parallel branches", async () => {
    const step = andThen({
      id: "validate-step",
      inputSchema: z.object({ value: z.coerce.number() }),
      outputSchema: z.number().transform((value) => value * 2),
      execute: async ({ data }: { data: { value: number } }) => data.value,
    });
    const workflow = createWorkflowChain({
      id: "validated-step",
      name: "Validated step",
      input: z.any(),
      result: z.array(z.number()),
    })
      .andAll({ id: "parallel", steps: [step] })
      .toWorkflow();
    expect((await workflow.run({ value: "3" })).result).toEqual([6]);
    expect((await workflow.run({ value: "invalid" })).status).toBe("error");
  });
  it("rejects invalid final results and preserves errors in streaming events", async () => {
    const workflow = createWorkflowChain({
      id: "validated-result",
      name: "Validated result",
      input: z.object({}),
      result: z.number(),
    })
      .andThen({ id: "bad-result", execute: async () => "not a number" })
      .toWorkflow();
    const run = workflow.stream({});
    const events = [];
    for await (const event of run) events.push(event);
    expect(await run.status).toBe("error");
    expect(events.find((event) => event.type === "workflow-error")?.error).toMatchObject({
      message: expect.stringContaining("number"),
    });
  });
  it("returns a race winner without waiting for a non-cooperative loser", async () => {
    let finishSlow: (() => void) | undefined;
    let loserSignal: AbortSignal | undefined;
    const slow = new Promise<void>((resolve) => {
      finishSlow = resolve;
    });
    const workflow = createWorkflowChain({
      id: "race-regression",
      name: "Race regression",
      input: z.object({}),
      result: z.string(),
    })
      .andRace({
        id: "race",
        steps: [
          andThen({ id: "fast", execute: async () => "winner" }),
          andThen({
            id: "slow",
            execute: async ({ state }) => {
              loserSignal = state.signal;
              await slow;
              throw new Error("Late loser");
            },
          }),
        ],
      })
      .toWorkflow();
    try {
      expect((await workflow.run({})).result).toBe("winner");
      expect(loserSignal?.aborted).toBe(true);
    } finally {
      finishSlow?.();
    }
  }, 2000);
  it("keeps nested execution IDs separate and propagates child errors", async () => {
    const child = createWorkflowChain({
      id: "child-regression",
      name: "Child",
      input: z.object({ fail: z.boolean() }),
      result: z.number(),
    })
      .andThen({
        id: "child-step",
        execute: async ({ data }) => {
          if (data.fail) throw new Error("Child failed");
          return 3;
        },
      })
      .toWorkflow();
    const workflow = createWorkflowChain({
      id: "parent-regression",
      name: "Parent",
      input: z.object({ fail: z.boolean() }),
      result: z.number(),
    })
      .andThen({ id: "before-child", execute: async ({ data }) => data })
      .andWorkflow(child)
      .toWorkflow();
    const success = await workflow.run({ fail: false });
    expect(success.result).toBe(3);
    expect((await workflow.memory.getWorkflowState(success.executionId))?.workflowId).toBe(
      "parent-regression",
    );
    expect((await workflow.run({ fail: true })).status).toBe("error");
  });
});
