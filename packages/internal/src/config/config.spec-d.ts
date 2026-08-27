import { describe, expectTypeOf, it } from "vitest";
import { parseEnvBoolean, parseEnvNumber, resolveConfig } from "./config";

describe("resolveConfig types", () => {
  it("should not require a parse function for string values", () => {
    expectTypeOf(resolveConfig({ defaultValue: "voltagent_memory" })).toBeString();
    expectTypeOf(
      resolveConfig({ value: "custom", env: "VOLTAGENT_TEST", defaultValue: "default" }),
    ).toBeString();
  });

  it("should require a parse function for boolean values", () => {
    // @ts-expect-error - a parse function is required for non-string values
    resolveConfig({ defaultValue: false });

    expectTypeOf(resolveConfig({ defaultValue: false, parse: parseEnvBoolean })).toBeBoolean();
  });

  it("should require a parse function for number values", () => {
    // @ts-expect-error - a parse function is required for non-string values
    resolveConfig({ defaultValue: 3141 });

    expectTypeOf(
      resolveConfig({ defaultValue: 3141, parse: (raw) => parseEnvNumber(raw, 3141) }),
    ).toBeNumber();
  });
});
