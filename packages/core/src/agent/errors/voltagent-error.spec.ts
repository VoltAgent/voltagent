import { describe, expect, it } from "vitest";
import { VoltAgentError, createVoltAgentError, isVoltAgentError } from "./voltagent-error";

describe("VoltAgentError", () => {
  it("should create an VoltAgentError when passed a message string", () => {
    const error = createVoltAgentError("test error");
    expect(error).toBeInstanceOf(VoltAgentError);
    expect(error.message).toBe("test error");
  });

  it("should create an VoltAgentError when passed an error object", () => {
    const originalError = new Error("test error");
    const error = createVoltAgentError(originalError);
    expect(error).toBeInstanceOf(VoltAgentError);
    expect(error.message).toBe("test error");
    expect(error.originalError).toBe(originalError);
  });

  it("should create a VoltAgentError with additional options", () => {
    const error = createVoltAgentError("test error", {
      code: "TEST_ERROR",
      metadata: { test: "test" },
      stage: "test stage",
      toolError: {
        toolCallId: "test call id",
        toolName: "test tool name",
        toolArguments: "test arguments",
        toolExecutionError: new Error("test error"),
      },
    });
    expect(error).toBeInstanceOf(VoltAgentError);
    expect(error.message).toBe("test error");
    expect(error.code).toBe("TEST_ERROR");
    expect(error.metadata).toEqual({ test: "test" });
    expect(error.stage).toBe("test stage");
    expect(error.toolError).toEqual({
      toolCallId: "test call id",
      toolName: "test tool name",
      toolArguments: "test arguments",
      toolExecutionError: new Error("test error"),
    });
  });
});

describe("isVoltAgentError", () => {
  it("should return true if the error is an VoltAgentError", () => {
    const error = createVoltAgentError("test");
    expect(isVoltAgentError(error)).toBe(true);
  });

  it("should return false if the error is not an AbortError", () => {
    const error = new Error("test error");
    expect(isVoltAgentError(error)).toBe(false);
  });
});
