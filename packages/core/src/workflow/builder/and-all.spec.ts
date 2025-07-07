import { describe, expect, it } from "vitest";
import { andAll } from "./and-all";
import { andThen } from "./and-then";

type WorkflowInput = { value: number; name: string };

describe("andAll", () => {
  it("should execute all steps in parallel and return their results as an array", async () => {
    const steps = [
      andThen<WorkflowInput, number>(async (data) => data.value + 1),
      andThen<WorkflowInput, string>(async (data) => `Hello ${data.name}`),
    ] as const;
    const step = andAll<WorkflowInput, unknown, typeof steps>(steps);
    const result = await step.execute({ value: 5, name: "Alice" });
    expect(result).toEqual([6, "Hello Alice"]);
  });

  it("should work with steps that return objects", async () => {
    const steps = [
      andThen<WorkflowInput, { greeting: string }>(async (data) => ({
        greeting: `Hi ${data.name}`,
      })),
      andThen<WorkflowInput, { length: number }>(async (data) => ({ length: data.name.length })),
    ] as const;
    const step = andAll<WorkflowInput, unknown, typeof steps>(steps);
    const result = await step.execute({ value: 0, name: "Alice" });
    expect(result).toEqual([{ greeting: "Hi Alice" }, { length: 5 }]);
  });
});
