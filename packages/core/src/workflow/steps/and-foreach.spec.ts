import { describe, expect, it } from "vitest";
import { createMockWorkflowExecuteContext } from "../../test-utils";
import { andForEach } from "./and-foreach";
import { andThen } from "./and-then";

describe("andForEach", () => {
  it("maps each item with the provided step", async () => {
    const step = andForEach({
      id: "foreach",
      step: andThen({
        id: "double",
        execute: async ({ data }) => data * 2,
      }),
    });

    const result = await step.execute(
      createMockWorkflowExecuteContext({
        data: [1, 2, 3],
      }),
    );

    expect(result).toEqual([2, 4, 6]);
  });
});
