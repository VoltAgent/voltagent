import { describe, expect, it } from "vitest";
import { andThen } from "./and-then";

describe("andThen", () => {
  it("should create a workflow step with proper type", () => {
    const step = andThen(async (data: { name: string }) => ({
      greeting: `Hello ${data.name}`,
    }));
    expect(step).toBeDefined();
    expect(typeof step.execute).toBe("function");
  });

  it("should execute the function with input data", async () => {
    const step = andThen(async (data: { name: string; age: number }) => ({
      greeting: `Hello ${data.name}`,
      isAdult: data.age >= 18,
    }));
    const result = await step.execute({ name: "John", age: 25 });
    expect(result).toEqual({ greeting: "Hello John", isAdult: true });
  });

  it("should handle async operations", async () => {
    const step = andThen(async (data: { id: number }) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { processedId: data.id * 2 };
    });
    const result = await step.execute({ id: 5 });
    expect(result).toEqual({ processedId: 10 });
  });

  it("should preserve input data when not modified", async () => {
    const step = andThen(async (data: { name: string; age: number }) => {
      return { ...data, processed: true };
    });
    const result = await step.execute({ name: "Alice", age: 30 });
    expect(result).toEqual({ name: "Alice", age: 30, processed: true });
  });

  it("should handle errors in the function", async () => {
    const step = andThen(async (_data: { name: string }) => {
      throw new Error("Test error");
    });
    await expect(step.execute({ name: "John" })).rejects.toThrow("Test error");
  });

  it("should work with primitive return types", async () => {
    const step = andThen(async (data: { value: number }) => {
      return data.value * 2;
    });
    const result = await step.execute({ value: 7 });
    expect(result).toBe(14);
  });

  it("should work with array return types", async () => {
    const step = andThen(async (data: { items: string[] }) => {
      return data.items.map((item) => item.toUpperCase());
    });
    const result = await step.execute({ items: ["a", "b", "c"] });
    expect(result).toEqual(["A", "B", "C"]);
  });
});
