import { describe, expect, it } from "vitest";
import { andThen } from "./and-then";
import { andWith } from "./and-with";

describe("andWith", () => {
  it("should execute the step when the pattern matches", async () => {
    const step = andWith(
      { type: "admin" },
      andThen(async (data: { type: string }) => ({ ...data, matched: true })),
    );
    const result = await step.execute({ type: "admin" });
    expect(result).toEqual({ type: "admin", matched: true });
  });

  it("should return input data when the pattern does not match", async () => {
    const step = andWith(
      { type: "user" },
      andThen(async (data: { type: string }) => ({ ...data, matched: true })),
    );
    const result = await step.execute({ type: "admin" });
    expect(result).toEqual({ type: "admin" });
  });

  it("should work with a direct function as step", async () => {
    const step = andWith({ foo: "bar" }, async (data: { foo: string }) => ({
      ...data,
      baz: "qux",
    }));
    const result = await step.execute({ foo: "bar" });
    expect(result).toEqual({ foo: "bar", baz: "qux" });
  });
});
