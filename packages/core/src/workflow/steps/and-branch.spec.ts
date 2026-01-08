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
});
