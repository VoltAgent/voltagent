import { ClientHTTPError, Tool } from "@voltagent/core";
import { describe, expect, it, vi } from "vitest";
import { handleExecuteTool } from "./tool.handlers";

class TestExecutionValidationError extends ClientHTTPError {
  constructor(message: string) {
    super("ExecutionValidationError", 412, "DESTINATION_BLOCKED", message);
  }
}

describe("handleExecuteTool", () => {
  const logger = {
    error: vi.fn(),
  } as any;

  it("runs agent execution validators before direct tool execution", async () => {
    const execute = vi.fn().mockResolvedValue("sent");
    const validateToolExecution = vi
      .fn()
      .mockRejectedValue(new TestExecutionValidationError("Tool destination blocked"));
    const tool = new Tool({
      name: "send-message",
      description: "Send a message",
      parameters: {} as any,
      execute,
    });
    const agent = {
      id: "agent-1",
      name: "Agent 1",
      getTools: vi.fn(() => [tool]),
      validateToolExecution,
    };
    const deps = {
      agentRegistry: {
        getAllAgents: vi.fn(() => [agent]),
      },
    } as any;

    const response = await handleExecuteTool(
      "send-message",
      { input: { destination: "external" } },
      deps,
      logger,
    );

    expect(validateToolExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        tool,
        args: { destination: "external" },
        toolCallId: expect.any(String),
        messages: [],
      }),
    );
    expect(execute).not.toHaveBeenCalled();
    expect(response).toMatchObject({
      success: false,
      error: "Tool destination blocked",
      code: "DESTINATION_BLOCKED",
      name: "ExecutionValidationError",
      httpStatus: 412,
    });
  });
});
