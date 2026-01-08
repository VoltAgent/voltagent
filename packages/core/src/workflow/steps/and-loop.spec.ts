import { describe, expect, it } from "vitest";
import { createMockWorkflowExecuteContext } from "../../test-utils";
import { andDoUntil, andDoWhile } from "./and-loop";
import { andThen } from "./and-then";

describe("andLoop", () => {
  it("runs a do-while loop until the condition is false", async () => {
    const step = andDoWhile({
      id: "loop",
      step: andThen({
        id: "increment",
        execute: async ({ data }) => data + 1,
      }),
      condition: async ({ data }) => data < 3,
    });

    const result = await step.execute(
      createMockWorkflowExecuteContext({
        data: 0,
      }),
    );

    expect(result).toBe(3);
  });

  it("runs a do-until loop until the condition is true", async () => {
    const step = andDoUntil({
      id: "loop",
      step: andThen({
        id: "increment",
        execute: async ({ data }) => data + 1,
      }),
      condition: async ({ data }) => data >= 2,
    });

    const result = await step.execute(
      createMockWorkflowExecuteContext({
        data: 0,
      }),
    );

    expect(result).toBe(2);
  });
});
