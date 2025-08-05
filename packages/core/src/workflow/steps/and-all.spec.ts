import { describe, it } from "vitest";
import { createMockWorkflowExecuteContext } from "../../test-utils";
import { andAll } from "./and-all";
import { andThen } from "./and-then";

describe("andAll", () => {
  it("should return the results in order", async () => {
    const step = andAll({
      id: "and-all",
      steps: [
        andThen({
          id: "a",
          execute: async () => {
            return {
              a: 2,
            };
          },
        }),
        andThen({
          id: "b",
          execute: async () => {
            return {
              b: 3,
            };
          },
        }),
      ],
    });

    expect(await step.execute(createMockWorkflowExecuteContext())).toEqual([{ a: 2 }, { b: 3 }]);
  });

  it("should return the results in order for dynamic steps", async () => {
    type DATA = { add: number };

    const step = andAll({
      id: "and-all",
      // @ts-expect-error - We just need to test that the data is propagated
      steps: async ({ data }: { data: DATA }) => {
        return [
          andThen({
            id: "a",
            execute: async () => {
              return {
                a: 2 + data.add,
              };
            },
          }),
          andThen({
            id: "b",
            execute: async () => {
              return {
                b: 3 + data.add,
              };
            },
          }),
        ] as const;
      },
    });

    expect(
      await step.execute(
        createMockWorkflowExecuteContext({
          data: { add: 4 },
        }),
      ),
    ).toEqual([{ a: 6 }, { b: 7 }]);
  });
});
