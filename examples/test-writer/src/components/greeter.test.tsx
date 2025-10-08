import { describe, expect, it } from "vitest";
import { type GreetingOptions, greetMany, makeGreeting } from "./your-module"; // Replace './your-module' with the actual path to your file

describe("makeGreeting", () => {
  it("should return a simple greeting with a name", () => {
    const options: GreetingOptions = { name: "World" };
    expect(makeGreeting(options)).toBe("Hello, World.");
  });

  it("should return an excited greeting when excited is true", () => {
    const options: GreetingOptions = { name: "World", excited: true };
    expect(makeGreeting(options)).toBe("Hello, World!");
  });

  it("should return an excited greeting when excited is truthy", () => {
    const options: GreetingOptions = { name: "World", excited: true };
    expect(makeGreeting(options)).toBe("Hello, World!");
  });

  it("should handle names with special characters", () => {
    const options: GreetingOptions = { name: "World!@#$" };
    expect(makeGreeting(options)).toBe("Hello, World!@#$.");
  });

  it("should handle empty names", () => {
    const options: GreetingOptions = { name: "" };
    expect(makeGreeting(options)).toBe("Hello, .");
  });
});

describe("greetMany", () => {
  it("should return an array of greetings for multiple names", () => {
    const names = ["Alice", "Bob", "Charlie"];
    expect(greetMany(names)).toEqual(["Hello, Alice.", "Hello, Bob.", "Hello, Charlie."]);
  });

  it("should return an array of excited greetings for multiple names when excited is true", () => {
    const names = ["Alice", "Bob", "Charlie"];
    expect(greetMany(names, true)).toEqual(["Hello, Alice!", "Hello, Bob!", "Hello, Charlie!"]);
  });

  it("should handle an empty array of names", () => {
    const names: string[] = [];
    expect(greetMany(names)).toEqual([]);
  });

  it("should handle an array of names with some empty names", () => {
    const names = ["Alice", "", "Charlie"];
    expect(greetMany(names)).toEqual(["Hello, Alice.", "Hello, .", "Hello, Charlie."]);
  });
});
