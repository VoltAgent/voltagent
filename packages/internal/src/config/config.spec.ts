import { describe, expect, it } from "vitest";
import { resolveConfig } from "./config";

describe("resolveConfig", () => {
  const defaults = { tableName: "voltagent_memory", debug: false, retries: 3 };

  it("should return the defaults when no overrides are given", () => {
    expect(resolveConfig(defaults)).toEqual(defaults);
  });

  it("should return the defaults when overrides are null", () => {
    expect(resolveConfig(defaults, null)).toEqual(defaults);
  });

  it("should let a defined override win", () => {
    expect(resolveConfig(defaults, { tableName: "my_app" })).toEqual({
      tableName: "my_app",
      debug: false,
      retries: 3,
    });
  });

  it("should ignore undefined and null override values", () => {
    const overrides = { tableName: undefined, debug: null } as unknown as Partial<typeof defaults>;
    expect(resolveConfig(defaults, overrides)).toEqual(defaults);
  });

  it("should keep falsy override values", () => {
    const result = resolveConfig(
      { enabled: true, count: 5, label: "default" },
      { enabled: false, count: 0, label: "" },
    );
    expect(result).toEqual({ enabled: false, count: 0, label: "" });
  });

  it("should not mutate the defaults", () => {
    const original = { ...defaults };
    resolveConfig(defaults, { tableName: "my_app", debug: true });
    expect(defaults).toEqual(original);
  });

  it("should return a new object", () => {
    const result = resolveConfig(defaults);
    expect(result).not.toBe(defaults);
  });
});
