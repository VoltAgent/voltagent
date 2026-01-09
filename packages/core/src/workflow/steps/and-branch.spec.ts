import { describe, expect, it } from "vitest";
import { createMockWorkflowExecuteContext } from "../../test-utils";
import { andBranch } from "./and-branch";
import { andThen } from "./and-then";

describe("andBranch", () => {
  it("runs matching branches and keeps index alignment", async () => {
    const step = andBranch({
      id: "branch",
      branches: [
        {
          condition: async ({ data }) => data.value > 3,
          step: andThen({
            id: "branch-a",
            execute: async () => ({ branch: "a" }),
          }),
        },
        {
          condition: async ({ data }) => data.value < 3,
          step: andThen({
            id: "branch-b",
            execute: async () => ({ branch: "b" }),
          }),
        },
        {
          condition: async ({ data }) => data.value === 5,
          step: andThen({
            id: "branch-c",
            execute: async () => ({ branch: "c" }),
          }),
        },
      ],
    });

    const result = await step.execute(
      createMockWorkflowExecuteContext({
        data: { value: 5 },
      }),
    );

    expect(result).toEqual([{ branch: "a" }, undefined, { branch: "c" }]);
  });

  it("returns undefined for branches that do not match", async () => {
    const step = andBranch({
      id: "branch",
      branches: [
        {
          condition: async () => false,
          step: andThen({
            id: "branch-a",
            execute: async () => ({ branch: "a" }),
          }),
        },
        {
          condition: async () => false,
          step: andThen({
            id: "branch-b",
            execute: async () => ({ branch: "b" }),
          }),
        },
      ],
    });

    const result = await step.execute(
      createMockWorkflowExecuteContext({
        data: { value: 0 },
      }),
    );

    expect(result).toEqual([undefined, undefined]);
  });

  it("returns an empty array when no branches are provided", async () => {
    const step = andBranch({
      id: "branch",
      branches: [],
    });

    const result = await step.execute(
      createMockWorkflowExecuteContext({
        data: { value: 1 },
      }),
    );

    expect(result).toEqual([]);
  });

  it("propagates errors from branch steps", async () => {
    const step = andBranch({
      id: "branch",
      branches: [
        {
          condition: async () => true,
          step: andThen({
            id: "boom",
            execute: async () => {
              throw new Error("boom");
            },
          }),
        },
      ],
    });

    await expect(
      step.execute(
        createMockWorkflowExecuteContext({
          data: { value: 1 },
        }),
      ),
    ).rejects.toThrow("boom");
  });

  it("throws when the workflow is cancelled", async () => {
    const controller = new AbortController();
    controller.abort({ type: "cancelled" });

    const step = andBranch({
      id: "branch",
      branches: [
        {
          condition: async () => true,
          step: andThen({
            id: "branch-a",
            execute: async () => ({ ok: true }),
          }),
        },
      ],
    });

    await expect(
      step.execute(
        createMockWorkflowExecuteContext({
          data: { value: 1 },
          state: { signal: controller.signal } as any,
        }),
      ),
    ).rejects.toThrow("WORKFLOW_CANCELLED");
  });

  it("throws when the workflow is suspended", async () => {
    const controller = new AbortController();
    controller.abort();

    const step = andBranch({
      id: "branch",
      branches: [
        {
          condition: async () => true,
          step: andThen({
            id: "branch-a",
            execute: async () => ({ ok: true }),
          }),
        },
      ],
    });

    await expect(
      step.execute(
        createMockWorkflowExecuteContext({
          data: { value: 1 },
          state: { signal: controller.signal } as any,
        }),
      ),
    ).rejects.toThrow("WORKFLOW_SUSPENDED");
  });
});
