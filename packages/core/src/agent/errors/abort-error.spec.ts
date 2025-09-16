import { describe, expect, it } from "vitest";
import { AbortError, createAbortError, isAbortError } from "./abort-error";

describe("AbortError", () => {
  it("should create an AbortError", () => {
    const error = createAbortError();
    expect(error).toBeInstanceOf(AbortError);
  });

  it("should create an AbortError with a reason", () => {
    const error = createAbortError("test reason");
    expect(error).toBeInstanceOf(AbortError);
    expect(error.message).toBe("Operation aborted: test reason");
    expect(error.reason).toBe("test reason");
  });
});

describe("isAbortError", () => {
  it("should return true if the error is an AbortError", () => {
    const error = createAbortError();
    expect(isAbortError(error)).toBe(true);
  });

  it("should return false if the error is not an AbortError", () => {
    const error = new Error("test error");
    expect(isAbortError(error)).toBe(false);
  });
});
