import { describe, expect, it } from "vitest";
import { andThen } from "./and-then";
import { andWhen } from "./and-when";

describe("andWhen", () => {
  it("should execute the step when the condition is true", async () => {
    const step = andWhen(
      (data: { value: number }) => data.value > 10,
      andThen(async (data: { value: number }) => ({ ...data, processed: true })),
    );
    const result = await step.execute({ value: 20 });
    expect(result).toEqual({ value: 20, processed: true });
  });

  it("should return input data when the condition is false", async () => {
    const step = andWhen(
      (data: { value: number }) => data.value > 10,
      andThen(async (data: { value: number }) => ({ ...data, processed: true })),
    );
    const result = await step.execute({ value: 5 });
    expect(result).toEqual({ value: 5 });
  });

  it("should work with a direct function as step", async () => {
    const step = andWhen(
      () => true,
      async (data: { foo: string }) => ({ ...data, bar: "baz" }),
    );
    const result = await step.execute({ foo: "test" });
    expect(result).toEqual({ foo: "test", bar: "baz" });
  });
});
