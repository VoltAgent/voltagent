import { describe, expect, it } from "vitest";
import { createMockWorkflowExecuteContext } from "../../test-utils";
import { andSleep } from "./and-sleep";
import { andSleepUntil } from "./and-sleep-until";

describe("andSleep", () => {
  it("returns input data after sleeping", async () => {
    const step = andSleep({
      id: "sleep",
      duration: 0,
    });

    const result = await step.execute(
      createMockWorkflowExecuteContext({
        data: { ok: true },
      }),
    );

    expect(result).toEqual({ ok: true });
  });

  it("returns input data when sleepUntil is in the past", async () => {
    const step = andSleepUntil({
      id: "sleep-until",
      date: new Date(Date.now() - 1000),
    });

    const result = await step.execute(
      createMockWorkflowExecuteContext({
        data: { ok: true },
      }),
    );

    expect(result).toEqual({ ok: true });
  });
});
