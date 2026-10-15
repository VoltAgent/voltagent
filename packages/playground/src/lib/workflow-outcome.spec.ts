import { describe, expect, it } from "vitest";
import { workflowOutcome } from "./workflow-outcome";

describe("workflow outcomes", () => {
  it.each([false, 0, "", null])("preserves a result of %j", (result) => {
    expect(workflowOutcome([{ type: "workflow-result", result }]).result).toBe(result);
  });
  it("restores output and error details from persisted state", () => {
    expect(workflowOutcome([], { status: "completed", output: { ok: true } }).result).toEqual({
      ok: true,
    });
    expect(
      workflowOutcome([], { status: "error", metadata: { errorMessage: "Invalid input" } }).error,
    ).toBe("Invalid input");
  });
  it("shows serialized stream errors", () => {
    expect(
      workflowOutcome([{ type: "workflow-error", error: { message: "Step failed" } }]).error,
    ).toBe("Step failed");
  });
});
