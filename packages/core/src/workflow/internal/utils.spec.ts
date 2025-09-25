import { createUIMessageStream } from "ai";
import { createUIMessageStreamResponse } from "ai";
import { describe, expect, it } from "vitest";
import type { WorkflowStreamController } from "../stream";
import type { WorkflowStreamEvent } from "../types";
import { convertWorkflowStreamEventToUIMessage, eventToUIMessageStreamResponse } from "./utils";

vi.mock("ai", async () => {
  // Import the original module
  const actual = await vi.importActual<object>("ai");

  return {
    ...actual,
    createUIMessageStream: vi.fn().mockReturnValue("mocked-ui-stream"),
    createUIMessageStreamResponse: vi.fn().mockReturnValue("mocked-response"),
  };
});

function baseEvent(overrides: Partial<WorkflowStreamEvent>): WorkflowStreamEvent {
  return {
    type: "workflow-start",
    executionId: "exec-1",
    from: "workflow",
    status: "running",
    timestamp: new Date().toISOString(),
    ...overrides,
  } as WorkflowStreamEvent;
}

describe("convertWorkflowStreamEventToUIMessages", () => {
  it("converts workflow-start to data-workflow-start", () => {
    const event = baseEvent({
      type: "workflow-start",
      input: { foo: "bar" },
    });

    const chunk = convertWorkflowStreamEventToUIMessage(event);

    expect(chunk).toEqual({
      type: "data-workflow-start",
      data: expect.objectContaining({
        executionId: "exec-1",
        status: "running",
        from: "workflow",
        input: { foo: "bar" },
      }),
    });
  });

  it("converts step-start to data-step-start", () => {
    const event = baseEvent({
      type: "step-start",
      from: "step-1",
      input: { a: 1 },
      stepType: "func",
      stepIndex: 0,
      metadata: { k: "v" },
    });

    const chunk = convertWorkflowStreamEventToUIMessage(event);

    expect(chunk).toEqual({
      type: "data-step-start",
      data: expect.objectContaining({
        executionId: "exec-1",
        status: "running",
        from: "step-1",
        input: { a: 1 },
        stepType: "func",
        stepIndex: 0,
        metadata: { k: "v" },
      }),
    });
  });

  describe("eventToUIMessageStreamResponse", () => {
    it("should build a UI message stream response", async () => {
      // Mock WorkflowStreamController
      const mockStreamController = {
        getStream: vi.fn(async function* () {
          yield { type: "workflow-start", timestamp: 123 };
          yield { type: "workflow-complete", timestamp: 456 };
        }),
      } as unknown as WorkflowStreamController;

      const resultFunction = eventToUIMessageStreamResponse(mockStreamController);
      const result = resultFunction({ customOption: true });

      expect(createUIMessageStream).toHaveBeenCalledTimes(1);
      expect(createUIMessageStream).toHaveBeenCalledWith({
        execute: expect.any(Function),
        onError: expect.any(Function),
      });

      expect(createUIMessageStreamResponse).toHaveBeenCalledTimes(1);
      expect(createUIMessageStreamResponse).toHaveBeenCalledWith({
        stream: "mocked-ui-stream",
        customOption: true,
      });

      expect(result).toBe("mocked-response");
    });
  });
});
