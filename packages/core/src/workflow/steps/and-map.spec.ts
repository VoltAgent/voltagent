import { describe, expect, it } from "vitest";
import { createMockWorkflowExecuteContext } from "../../test-utils";
import { andMap } from "./and-map";

describe("andMap", () => {
  it("maps values from data, input, context, and steps", async () => {
    const step = andMap({
      id: "map",
      map: {
        userId: { source: "data", path: "userId" },
        orderId: { source: "input", path: "orderId" },
        region: { source: "context", key: "region", path: "code" },
        name: { source: "step", stepId: "fetch-user", path: "name" },
        constant: { source: "value", value: 42 },
      },
    });

    const result = await step.execute(
      createMockWorkflowExecuteContext({
        data: { userId: "u-1" },
        state: {
          input: { orderId: "o-9" },
          context: new Map([["region", { code: "eu" }]]),
        } as any,
        getStepData: (stepId) =>
          stepId === "fetch-user"
            ? { input: null, output: { name: "Ada" }, status: "success", error: null }
            : undefined,
      }),
    );

    expect(result).toEqual({
      userId: "u-1",
      orderId: "o-9",
      region: "eu",
      name: "Ada",
      constant: 42,
    });
  });

  it("awaits async fn map entries", async () => {
    const step = andMap({
      id: "map",
      map: {
        value: {
          source: "fn",
          fn: async () => {
            await new Promise((resolve) => setTimeout(resolve, 5));
            return "ok";
          },
        },
      },
    });

    const result = await step.execute(
      createMockWorkflowExecuteContext({
        data: { ok: true },
      }),
    );

    expect(result).toEqual({ value: "ok" });
  });
});
