import { describe, expect, it } from "vitest";
import { safeParseError } from "./utils";

describe("safeParseError", () => {
  it("should return the error message", () => {
    const error = new Error("test");
    const result = safeParseError(error);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("test");
  });

  it("should return the error with the passed in message", () => {
    const result = safeParseError({}, "This is a test");
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("This is a test");
  });

  it("should return a error using defaulting to 'Unknown error'", () => {
    const result = safeParseError({});
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("Unknown error");
  });
});
