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

  it("returns an empty array for empty input", async () => {
    const step = andForEach({
      id: "foreach-empty",
      step: andThen({
        id: "noop",
        execute: async ({ data }) => data,
      }),
    });

    const result = await step.execute(
      createMockWorkflowExecuteContext({
        data: [],
      }),
    );

    expect(result).toEqual([]);
  });

  it("handles single-item arrays", async () => {
    const step = andForEach({
      id: "foreach-single",
      step: andThen({
        id: "double",
        execute: async ({ data }) => data * 2,
      }),
    });

    const result = await step.execute(
      createMockWorkflowExecuteContext({
        data: [4],
      }),
    );

    expect(result).toEqual([8]);
  });

  it("preserves order with async steps", async () => {
    const step = andForEach({
      id: "foreach-order",
      concurrency: 3,
      step: andThen({
        id: "delayed",
        execute: async ({ data }) => {
          const delay = data === 1 ? 30 : data === 2 ? 10 : 20;
          await new Promise((resolve) => setTimeout(resolve, delay));
          return data * 2;
        },
      }),
    });

    const result = await step.execute(
      createMockWorkflowExecuteContext({
        data: [1, 2, 3],
      }),
    );

    expect(result).toEqual([2, 4, 6]);
  });

  it("uses items selector to iterate nested arrays", async () => {
    const step = andForEach({
      id: "foreach-selector",
      items: ({ data }) => data.items,
      step: andThen({
        id: "double",
        execute: async ({ data }) => data * 2,
      }),
    });

    const result = await step.execute(
      createMockWorkflowExecuteContext({
        data: { items: [1, 2, 3] },
      }),
    );

    expect(result).toEqual([2, 4, 6]);
  });

  it("maps items before executing the step", async () => {
    const step = andForEach({
      id: "foreach-map",
      items: ({ data }) => data.values,
      map: ({ data }, item) => ({ label: data.label, value: item }),
      step: andThen({
        id: "format",
        execute: async ({ data }) => `${data.label}:${data.value}`,
      }),
    });

    const result = await step.execute(
      createMockWorkflowExecuteContext({
        data: { label: "A", values: [1, 2] },
      }),
    );

    expect(result).toEqual(["A:1", "A:2"]);
  });

  it("respects the concurrency limit", async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    const step = andForEach({
      id: "foreach-concurrency",
      concurrency: 2,
      step: andThen({
        id: "track",
        execute: async ({ data }) => {
          inFlight += 1;
          maxInFlight = Math.max(maxInFlight, inFlight);
          await new Promise((resolve) => setTimeout(resolve, 20));
          inFlight -= 1;
          return data;
        },
      }),
    });

    await step.execute(
      createMockWorkflowExecuteContext({
        data: [1, 2, 3, 4],
      }),
    );

    expect(maxInFlight).toBeLessThanOrEqual(2);
  });

  it("throws when input is not an array", async () => {
    const step = andForEach({
      id: "foreach-invalid",
      step: andThen({
        id: "noop",
        execute: async ({ data }) => data,
      }),
    });

    await expect(
      step.execute(
        createMockWorkflowExecuteContext({
          data: { value: 1 } as any,
        }),
      ),
    ).rejects.toThrow("andForEach expects array input data");
  });

  it("throws when items selector does not return an array", async () => {
    const step = andForEach({
      id: "foreach-selector-invalid",
      items: () => "not-array" as any,
      step: andThen({
        id: "noop",
        execute: async ({ data }) => data,
      }),
    });

    await expect(
      step.execute(
        createMockWorkflowExecuteContext({
          data: { items: [1] },
        }),
      ),
    ).rejects.toThrow("andForEach expects array input data");
  });

  it("propagates errors from inner steps", async () => {
    const step = andForEach({
      id: "foreach-error",
      step: andThen({
        id: "boom",
        execute: async () => {
          throw new Error("boom");
        },
      }),
    });

    await expect(
      step.execute(
        createMockWorkflowExecuteContext({
          data: [1, 2],
        }),
      ),
    ).rejects.toThrow("boom");
  });
});
