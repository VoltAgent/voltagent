import { afterEach, describe, expect, it } from "vitest";
import { parseEnvBoolean, parseEnvNumber, resolveConfig } from "./config";

const TEST_ENV_VAR = "VOLTAGENT_INTERNAL_CONFIG_TEST";

afterEach(() => {
  delete process.env[TEST_ENV_VAR];
});

describe("resolveConfig", () => {
  it("should return the explicit value when provided", () => {
    process.env[TEST_ENV_VAR] = "from-env";

    expect(resolveConfig({ value: "explicit", env: TEST_ENV_VAR, defaultValue: "default" })).toBe(
      "explicit",
    );
  });

  it("should return the environment variable when no explicit value is provided", () => {
    process.env[TEST_ENV_VAR] = "from-env";

    expect(resolveConfig({ env: TEST_ENV_VAR, defaultValue: "default" })).toBe("from-env");
  });

  it("should return the default value when neither value nor env is set", () => {
    expect(resolveConfig({ env: TEST_ENV_VAR, defaultValue: "default" })).toBe("default");
  });

  it("should return the default value when no env var name is provided", () => {
    expect(resolveConfig({ defaultValue: "default" })).toBe("default");
  });

  it("should ignore an empty environment variable", () => {
    process.env[TEST_ENV_VAR] = "";

    expect(resolveConfig({ env: TEST_ENV_VAR, defaultValue: "default" })).toBe("default");
  });

  it("should treat an explicit undefined value as not provided", () => {
    expect(resolveConfig({ value: undefined, defaultValue: "default" })).toBe("default");
  });

  it("should use the parse function for the environment variable", () => {
    process.env[TEST_ENV_VAR] = "true";

    expect(
      resolveConfig({
        env: TEST_ENV_VAR,
        defaultValue: false,
        parse: parseEnvBoolean,
      }),
    ).toBe(true);
  });

  it("should not use the parse function for the explicit value", () => {
    process.env[TEST_ENV_VAR] = "not-a-boolean";

    expect(
      resolveConfig({
        value: true,
        env: TEST_ENV_VAR,
        defaultValue: false,
        parse: parseEnvBoolean,
      }),
    ).toBe(true);
  });
});

describe("parseEnvBoolean", () => {
  it.each(["1", "true", "TRUE", "True", "yes", "on", " true "])(
    "should return true for %j",
    (raw) => {
      expect(parseEnvBoolean(raw)).toBe(true);
    },
  );

  it.each(["0", "false", "no", "off", "anything", " "])("should return false for %j", (raw) => {
    expect(parseEnvBoolean(raw)).toBe(false);
  });
});

describe("parseEnvNumber", () => {
  it("should parse a numeric string", () => {
    expect(parseEnvNumber("42", 0)).toBe(42);
    expect(parseEnvNumber("3.14", 0)).toBe(3.14);
    expect(parseEnvNumber(" 42 ", 0)).toBe(42);
  });

  it("should return the fallback for non-numeric strings", () => {
    expect(parseEnvNumber("abc", 10)).toBe(10);
    expect(parseEnvNumber("12x", 10)).toBe(10);
  });

  it("should return the fallback for empty and whitespace-only strings", () => {
    expect(parseEnvNumber("", 10)).toBe(10);
    expect(parseEnvNumber(" ", 10)).toBe(10);
    expect(parseEnvNumber("   ", 10)).toBe(10);
  });
});
