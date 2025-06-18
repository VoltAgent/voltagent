import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  streamEventForwarder,
  createStreamEventForwarder,
  type SubAgentEvent,
  type StreamEventForwarderOptions,
} from ".";
import devLogger from "../internal/dev-logger";

// Mock devLogger
vi.mock("./internal/dev-logger", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("streamEventForwarder", () => {
  let mockForwarder: ReturnType<typeof vi.fn>;
  let validEvent: SubAgentEvent;

  beforeEach(() => {
    vi.clearAllMocks();
    mockForwarder = vi.fn().mockResolvedValue(undefined);

    validEvent = {
      type: "tool-call",
      data: {
        toolCall: {
          toolName: "test-tool",
          toolCallId: "call-123",
          args: { param: "value" },
        },
      },
      timestamp: "2023-01-01T10:00:00.000Z",
      subAgentId: "test-sub-agent",
      subAgentName: "Test SubAgent",
    };
  });

  describe("event validation", () => {
    it("should handle null event gracefully", async () => {
      await streamEventForwarder(null as any, { forwarder: mockForwarder });

      expect(devLogger.warn).toHaveBeenCalledWith(
        "[StreamEventForwarder] Invalid event structure:",
        null,
      );
      expect(mockForwarder).not.toHaveBeenCalled();
    });

    it("should handle undefined event gracefully", async () => {
      await streamEventForwarder(undefined as any, { forwarder: mockForwarder });

      expect(devLogger.warn).toHaveBeenCalledWith(
        "[StreamEventForwarder] Invalid event structure:",
        undefined,
      );
      expect(mockForwarder).not.toHaveBeenCalled();
    });

    it("should handle non-object event gracefully", async () => {
      await streamEventForwarder("invalid" as any, { forwarder: mockForwarder });

      expect(devLogger.warn).toHaveBeenCalledWith(
        "[StreamEventForwarder] Invalid event structure:",
        "invalid",
      );
      expect(mockForwarder).not.toHaveBeenCalled();
    });

    it("should handle missing required fields", async () => {
      const incompleteEvent = {
        type: "tool-call",
        // Missing subAgentId and subAgentName
        data: {},
        timestamp: "2023-01-01",
      } as SubAgentEvent;

      await streamEventForwarder(incompleteEvent, { forwarder: mockForwarder });

      expect(devLogger.warn).toHaveBeenCalledWith(
        "[StreamEventForwarder] Missing required event fields:",
        {
          type: "tool-call",
          subAgentId: undefined,
          subAgentName: undefined,
        },
      );
      expect(mockForwarder).not.toHaveBeenCalled();
    });
  });

  describe("event filtering", () => {
    it("should filter out default filtered event types", async () => {
      const filteredTypes = ["text", "reasoning", "source"];

      for (const type of filteredTypes) {
        const event = { ...validEvent, type };
        await streamEventForwarder(event, { forwarder: mockForwarder });

        expect(devLogger.info).toHaveBeenCalledWith(
          "[StreamEventForwarder] Filtered out",
          type,
          "event from",
          validEvent.subAgentName,
        );
      }

      expect(mockForwarder).not.toHaveBeenCalled();
    });

    it("should allow custom filter types", async () => {
      const customFilterTypes = ["custom-type", "another-type"];
      const event = { ...validEvent, type: "custom-type" };

      await streamEventForwarder(event, {
        forwarder: mockForwarder,
        filterTypes: customFilterTypes,
      });

      expect(devLogger.info).toHaveBeenCalledWith(
        "[StreamEventForwarder] Filtered out",
        "custom-type",
        "event from",
        validEvent.subAgentName,
      );
      expect(mockForwarder).not.toHaveBeenCalled();
    });

    it("should not filter non-filtered event types", async () => {
      const allowedTypes = ["tool-call", "tool-result", "error", "text-delta"];

      for (const type of allowedTypes) {
        mockForwarder.mockClear();
        const event = { ...validEvent, type };

        await streamEventForwarder(event, { forwarder: mockForwarder });

        expect(mockForwarder).toHaveBeenCalled();
      }
    });

    it("should allow empty filter types", async () => {
      const event = { ...validEvent, type: "text" }; // Normally filtered

      await streamEventForwarder(event, {
        forwarder: mockForwarder,
        filterTypes: [],
      });

      expect(mockForwarder).toHaveBeenCalled();
    });
  });

  describe("event forwarding", () => {
    it("should do nothing when no forwarder is provided", async () => {
      await streamEventForwarder(validEvent, {});

      // Should not throw and should complete silently
      expect(devLogger.error).not.toHaveBeenCalled();
    });

    it("should forward valid events with correct data structure", async () => {
      await streamEventForwarder(validEvent, { forwarder: mockForwarder });

      expect(mockForwarder).toHaveBeenCalledWith({
        toolCall: {
          toolName: "Test SubAgent: test-tool",
          toolCallId: "call-123",
          args: { param: "value" },
        },
        timestamp: validEvent.timestamp,
        type: validEvent.type,
        subAgentId: validEvent.subAgentId,
        subAgentName: validEvent.subAgentName,
      });

      expect(devLogger.info).toHaveBeenCalledWith(
        "[StreamEventForwarder] Forwarded",
        "tool-call",
        "event from",
        "Test SubAgent",
      );
    });

    it("should preserve additional data fields", async () => {
      const eventWithMetadata = {
        ...validEvent,
        data: {
          ...validEvent.data,
          metadata: {
            executionTime: 150,
            custom: "value",
          },
        },
      };

      await streamEventForwarder(eventWithMetadata, { forwarder: mockForwarder });

      const forwardedData = mockForwarder.mock.calls[0][0];
      expect(forwardedData.metadata).toEqual({
        executionTime: 150,
        custom: "value",
      });
    });
  });

  describe("SubAgent prefix handling", () => {
    it("should add SubAgent prefix to tool-call events by default", async () => {
      await streamEventForwarder(validEvent, { forwarder: mockForwarder });

      const forwardedData = mockForwarder.mock.calls[0][0];
      expect(forwardedData.toolCall.toolName).toBe("Test SubAgent: test-tool");
    });

    it("should add SubAgent prefix to tool-result events", async () => {
      const toolResultEvent = {
        ...validEvent,
        type: "tool-result",
        data: {
          toolResult: {
            toolName: "result-tool",
            toolCallId: "call-456",
            result: "success",
          },
        },
      };

      await streamEventForwarder(toolResultEvent, { forwarder: mockForwarder });

      const forwardedData = mockForwarder.mock.calls[0][0];
      expect(forwardedData.toolResult.toolName).toBe("Test SubAgent: result-tool");
    });

    it("should not add prefix when addSubAgentPrefix is false", async () => {
      await streamEventForwarder(validEvent, {
        forwarder: mockForwarder,
        addSubAgentPrefix: false,
      });

      const forwardedData = mockForwarder.mock.calls[0][0];
      expect(forwardedData.toolCall.toolName).toBe("test-tool");
    });

    it("should handle events without toolCall/toolResult data", async () => {
      const genericEvent = {
        ...validEvent,
        type: "custom-event",
        data: {
          customField: "value",
        },
      };

      await streamEventForwarder(genericEvent, { forwarder: mockForwarder });

      const forwardedData = mockForwarder.mock.calls[0][0];
      expect(forwardedData.customField).toBe("value");
    });

    it("should handle events with null toolCall/toolResult", async () => {
      const eventWithNullTool = {
        ...validEvent,
        data: {
          toolCall: null,
        },
      };

      await streamEventForwarder(eventWithNullTool, { forwarder: mockForwarder });

      const forwardedData = mockForwarder.mock.calls[0][0];
      expect(forwardedData.toolCall).toBeNull();
    });
  });

  describe("error handling", () => {
    it("should handle forwarder errors gracefully", async () => {
      const errorForwarder = vi.fn().mockRejectedValue(new Error("Forwarding failed"));

      await streamEventForwarder(validEvent, { forwarder: errorForwarder });

      expect(devLogger.error).toHaveBeenCalledWith(
        "[StreamEventForwarder] Error forwarding event:",
        expect.any(Error),
      );

      // Should not throw
      expect(true).toBe(true);
    });

    it("should handle synchronous forwarder errors", async () => {
      const errorForwarder = vi.fn().mockImplementation(() => {
        throw new Error("Sync error");
      });

      await streamEventForwarder(validEvent, { forwarder: errorForwarder });

      expect(devLogger.error).toHaveBeenCalledWith(
        "[StreamEventForwarder] Error forwarding event:",
        expect.any(Error),
      );
    });
  });

  describe("edge cases", () => {
    it("should handle events with empty data", async () => {
      const eventWithEmptyData = {
        ...validEvent,
        data: {},
      };

      await streamEventForwarder(eventWithEmptyData, { forwarder: mockForwarder });

      expect(mockForwarder).toHaveBeenCalled();
      const forwardedData = mockForwarder.mock.calls[0][0];
      expect(forwardedData.type).toBe(validEvent.type);
    });

    it("should handle events with undefined data", async () => {
      const eventWithUndefinedData = {
        ...validEvent,
        data: undefined,
      };

      await streamEventForwarder(eventWithUndefinedData, { forwarder: mockForwarder });

      expect(mockForwarder).toHaveBeenCalled();
    });

    it("should handle very long SubAgent names", async () => {
      const longNameEvent = {
        ...validEvent,
        subAgentName: "A".repeat(1000),
      };

      await streamEventForwarder(longNameEvent, { forwarder: mockForwarder });

      const forwardedData = mockForwarder.mock.calls[0][0];
      expect(forwardedData.toolCall.toolName).toBe(`${"A".repeat(1000)}: test-tool`);
    });

    it("should handle special characters in SubAgent names", async () => {
      const specialCharEvent = {
        ...validEvent,
        subAgentName: "Special: Agent @#$%",
      };

      await streamEventForwarder(specialCharEvent, { forwarder: mockForwarder });

      const forwardedData = mockForwarder.mock.calls[0][0];
      expect(forwardedData.toolCall.toolName).toBe("Special: Agent @#$%: test-tool");
    });
  });
});

describe("createStreamEventForwarder", () => {
  it("should create a configured forwarder function", () => {
    const mockForwarder = vi.fn().mockResolvedValue(undefined);
    const options: StreamEventForwarderOptions = {
      forwarder: mockForwarder,
      filterTypes: ["custom-filter"],
      addSubAgentPrefix: false,
    };

    const configuredForwarder = createStreamEventForwarder(options);

    expect(typeof configuredForwarder).toBe("function");
  });

  it("should use configured options when forwarding", async () => {
    const mockForwarder = vi.fn().mockResolvedValue(undefined);
    const configuredForwarder = createStreamEventForwarder({
      forwarder: mockForwarder,
      filterTypes: ["tool-call"], // Filter out tool-call events
    });

    const validEvent: SubAgentEvent = {
      type: "tool-call",
      data: { toolCall: { toolName: "test" } },
      timestamp: "2023-01-01",
      subAgentId: "test",
      subAgentName: "Test",
    };

    await configuredForwarder(validEvent);

    // Should be filtered out due to custom filterTypes
    expect(mockForwarder).not.toHaveBeenCalled();
  });

  it("should work with default options", async () => {
    const configuredForwarder = createStreamEventForwarder();
    const validEvent: SubAgentEvent = {
      type: "text", // Default filtered type
      data: {},
      timestamp: "2023-01-01",
      subAgentId: "test",
      subAgentName: "Test",
    };

    // Should not throw
    await configuredForwarder(validEvent);
    expect(true).toBe(true);
  });
});
