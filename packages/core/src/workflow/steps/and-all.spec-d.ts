import { describe, it } from "vitest";
import { andAll } from "./and-all";
import { andThen } from "./and-then";

describe("andAll", () => {
  it("should provide the correct type for the result for static steps", () => {
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
      ] as const,
    });

    expectTypeOf(step.execute).returns.resolves.toMatchTypeOf<
      readonly [{ a: number }, { b: number }]
    >();
  });

  it("should provide the correct type for the result for dynamic steps", () => {
    const step = andAll({
      id: "and-all",
      steps: async () => {
        return [
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
                bar: "bar",
              };
            },
          }),
        ] as const;
      },
    });

    expectTypeOf(step.execute).returns.resolves.toMatchTypeOf<
      readonly [{ a: number }, { b: number; bar: string }]
    >();
  });
});
