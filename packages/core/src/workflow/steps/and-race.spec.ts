import { describe, expect, it } from "vitest";
import { andRace } from "./and-race";
import { andThen } from "./and-then";

describe("andRace", () => {
  it("should return the result of the first completed step", async () => {
    const step = andRace([
      andThen(
        async (_data: { value: number }) =>
          new Promise((resolve) => setTimeout(() => resolve("slow"), 50)),
      ),
      andThen(async (_data: { value: number }) => "fast"),
    ]);
    const result = await step.execute({ value: 1 });
    expect(result).toBe("fast");
  });

  it("should work with steps that return objects", async () => {
    const step = andRace([
      andThen(
        async (_data: { name: string }) =>
          new Promise((resolve) => setTimeout(() => resolve({ greeting: "Hi" }), 30)),
      ),
      andThen(async (_data: { name: string }) => ({ greeting: "Hello" })),
    ]);
    const result = await step.execute({ name: "Bob" });
    expect(result).toEqual({ greeting: "Hello" });
  });
});
