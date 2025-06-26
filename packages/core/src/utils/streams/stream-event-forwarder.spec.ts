import { devLogger } from "@voltagent/internal/dev";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type StreamEventForwarderOptions,
  createStreamEventForwarder,
  streamEventForwarder,
} from "./stream-event-forwarder";
import type { StreamEvent } from "./types";

// Mock devLogger
vi.mock("@voltagent/internal/dev", () => ({
  devLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const defaultTypes = ["tool-call", "tool-result"] as const;

describe("streamEventForwarder", () => {
  let mockForwarder: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockForwarder = vi.fn().mockResolvedValue(undefined);
  });

  describe("event validation", () => {
    it("should handle null event gracefully", async () => {
      await streamEventForwarder(null as any, { forwarder: mockForwarder, types: defaultTypes });

      expect(devLogger.warn).toHaveBeenCalledWith(
        "[StreamEventForwarder] Invalid event structure:",
        null,
      );
      expect(mockForwarder).not.toHaveBeenCalled();
    });

    it("should handle undefined event gracefully", async () => {
      await streamEventForwarder(undefined as any, {
        forwarder: mockForwarder,
        types: defaultTypes,
      });

      expect(devLogger.warn).toHaveBeenCalledWith(
        "[StreamEventForwarder] Invalid event structure:",
        undefined,
      );
      expect(mockForwarder).not.toHaveBeenCalled();
    });

    it("should handle non-object event gracefully", async () => {
      await streamEventForwarder("invalid" as any, {
        forwarder: mockForwarder,
        types: defaultTypes,
      });

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
      } as StreamEvent;

      await streamEventForwarder(incompleteEvent, {
        forwarder: mockForwarder,
        types: defaultTypes,
      });

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

  describe("event type inclusion", () => {
    it("should allow custom types", async () => {
      const customFilterTypes = ["custom-type", "another-type"];
      const event = {
        ...mockStreamEvent("text-delta"),
        type: "custom-type",
      } as unknown as StreamEvent;

      await streamEventForwarder(event, {
        forwarder: mockForwarder,
        types: customFilterTypes,
      });

      expect(devLogger.info).toHaveBeenCalledWith(
        "[StreamEventForwarder] Forwarded",
        "custom-type",
        "event from",
        event.subAgentName,
      );
      expect(mockForwarder).toHaveBeenCalled();
    });

    it("should allow empty types", async () => {
      // Filtered by default
      const event = mockStreamEvent("text-delta");
      await streamEventForwarder(event, {
        forwarder: mockForwarder,
        types: [],
      });
      expect(mockForwarder).not.toHaveBeenCalled();
    });
  });

  describe("event forwarding", () => {
    it("should forward valid events with correct data structure", async () => {
      const event = mockStreamEvent("tool-call");
      await streamEventForwarder(event, {
        forwarder: mockForwarder,
        types: defaultTypes,
        addSubAgentPrefix: false,
      });

      expect(mockForwarder).toHaveBeenCalledWith({
        data: event.data,
        timestamp: event.timestamp,
        type: event.type,
        subAgentId: event.subAgentId,
        subAgentName: event.subAgentName,
      });

      expect(devLogger.info).toHaveBeenCalledWith(
        "[StreamEventForwarder] Forwarded",
        event.type,
        "event from",
        event.subAgentName,
      );
    });

    it("should preserve additional data fields", async () => {
      const baseEvent = mockStreamEvent("tool-call");
      const eventWithMetadata = {
        ...baseEvent,
        data: {
          ...baseEvent.data,
          metadata: {
            executionTime: 150,
            custom: "value",
          },
        },
      } as unknown as StreamEvent;

      await streamEventForwarder(eventWithMetadata, {
        forwarder: mockForwarder,
        types: defaultTypes,
      });

      const forwardedData = mockForwarder.mock.calls[0][0];
      expect(forwardedData.data.metadata).toEqual({
        executionTime: 150,
        custom: "value",
      });
    });
  });

  describe("SubAgent prefix handling", () => {
    it("should add SubAgent prefix to tool-call events by default", async () => {
      const event = mockStreamEvent("tool-call");
      await streamEventForwarder(event, { forwarder: mockForwarder, types: defaultTypes });

      const forwardedData = mockForwarder.mock.calls[0][0];
      expect(forwardedData.data.toolName).toBe(`${event.subAgentName}: ${event.data?.toolName}`);
    });

    it("should add SubAgent prefix to tool-result events", async () => {
      const event = mockStreamEvent("tool-result");

      await streamEventForwarder(event, {
        forwarder: mockForwarder,
        types: defaultTypes,
      });

      const forwardedData = mockForwarder.mock.calls[0][0];
      expect(forwardedData.data.toolName).toBe(`${event.subAgentName}: ${event.data?.toolName}`);
    });

    it("should not add prefix when addSubAgentPrefix is false", async () => {
      const event = mockStreamEvent("tool-call");
      await streamEventForwarder(event, {
        forwarder: mockForwarder,
        types: defaultTypes,
        addSubAgentPrefix: false,
      });

      const forwardedData = mockForwarder.mock.calls[0][0];
      expect(forwardedData.data.toolName).toBe(event.data?.toolName);
    });

    it("should handle custom event types", async () => {
      const genericEvent = {
        type: "custom-event",
        timestamp: "2023-01-01T10:00:00.000Z",
        subAgentId: "test-sub-agent",
        subAgentName: "Test SubAgent",
        data: {
          customField: "value",
        },
      } as unknown as StreamEvent;

      await streamEventForwarder(genericEvent, {
        forwarder: mockForwarder,
        types: [...defaultTypes, "custom-event"] as const,
      });

      const forwardedData = mockForwarder.mock.calls[0][0];
      expect(forwardedData.data.customField).toBe("value");
    });

    it("should handle events with null toolCall/toolResult", async () => {
      const eventWithNullTool = {
        ...mockStreamEvent("tool-call"),
        data: {
          toolName: null,
          toolCallId: null,
          args: null,
        },
      } as unknown as StreamEvent;

      await streamEventForwarder(eventWithNullTool, {
        forwarder: mockForwarder,
        types: defaultTypes,
      });

      const forwardedData = mockForwarder.mock.calls[0][0];
      expect(forwardedData.data).toBeNull();
    });
  });

  describe("error handling", () => {
    it("should handle forwarder errors gracefully", async () => {
      const errorForwarder = vi.fn().mockRejectedValue(new Error("Forwarding failed"));

      await streamEventForwarder(mockStreamEvent("tool-call"), {
        forwarder: errorForwarder,
        types: defaultTypes,
      });

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

      await streamEventForwarder(mockStreamEvent("tool-call"), {
        forwarder: errorForwarder,
        types: defaultTypes,
      });

      expect(devLogger.error).toHaveBeenCalledWith(
        "[StreamEventForwarder] Error forwarding event:",
        expect.any(Error),
      );
    });
  });

  describe("edge cases", () => {
    it("should handle events with empty data", async () => {
      const eventWithEmptyData = {
        ...mockStreamEvent("tool-call"),
        data: {},
      } as unknown as StreamEvent;

      await streamEventForwarder(eventWithEmptyData, {
        forwarder: mockForwarder,
        types: defaultTypes,
      });

      expect(mockForwarder).toHaveBeenCalled();
      const forwardedData = mockForwarder.mock.calls[0][0];
      expect(forwardedData.type).toBe(eventWithEmptyData.type);
    });

    it("should handle events with undefined data", async () => {
      const eventWithUndefinedData = {
        ...mockStreamEvent("tool-call"),
        data: undefined,
      } as unknown as StreamEvent;

      await streamEventForwarder(eventWithUndefinedData, {
        forwarder: mockForwarder,
        types: defaultTypes,
      });

      expect(mockForwarder).toHaveBeenCalled();
    });

    it("should handle very long SubAgent names", async () => {
      const longNameEvent = {
        ...mockStreamEvent("tool-call"),
        subAgentName: "A".repeat(1000),
      };

      await streamEventForwarder(longNameEvent, {
        forwarder: mockForwarder,
        types: defaultTypes,
      });

      const forwardedData = mockForwarder.mock.calls[0][0];
      expect(forwardedData.data.toolName).toBe(
        `${longNameEvent.subAgentName}: ${longNameEvent.data?.toolName}`,
      );
    });

    it("should handle special characters in SubAgent names", async () => {
      const specialCharEvent = {
        ...mockStreamEvent("tool-call"),
        subAgentName: "Special: Agent @#$%",
      };
      await streamEventForwarder(specialCharEvent, {
        forwarder: mockForwarder,
        types: defaultTypes,
      });

      const forwardedData = mockForwarder.mock.calls[0][0];
      expect(forwardedData.data.toolName).toBe(
        `${specialCharEvent.subAgentName}: ${specialCharEvent.data?.toolName}`,
      );
    });
  });
});

describe("createStreamEventForwarder", () => {
  it("should create a configured forwarder function", () => {
    const mockForwarder = vi.fn().mockResolvedValue(undefined);
    const options: StreamEventForwarderOptions = {
      forwarder: mockForwarder,
      types: ["custom-filter"],
      addSubAgentPrefix: false,
    };

    const configuredForwarder = createStreamEventForwarder(options);
    expectTypeOf(configuredForwarder).toBeFunction();
    expectTypeOf(configuredForwarder).parameter(0).toEqualTypeOf<StreamEvent>();
    expectTypeOf(configuredForwarder).returns.toEqualTypeOf<Promise<void>>();
  });

  it("should use configured options when forwarding", async () => {
    const mockForwarder = vi.fn().mockResolvedValue(undefined);
    const configuredForwarder = createStreamEventForwarder({
      forwarder: mockForwarder,
      types: ["text-delta"],
    });

    const validEvent = mockStreamEvent("text-delta");
    await configuredForwarder(validEvent);

    expect(mockForwarder).toHaveBeenCalled();
  });
});

type MockStreamEventType = StreamEvent["type"];

type MockStreamEvent<TStreamEventType extends MockStreamEventType> = Extract<
  StreamEvent,
  { type: TStreamEventType }
>;

function mockStreamEvent<
  TStreamEventType extends MockStreamEventType,
  TStreamEvent extends MockStreamEvent<TStreamEventType>,
>(type: TStreamEventType): TStreamEvent {
  const baseEvent = {
    timestamp: "2023-01-01T10:00:00.000Z",
    subAgentId: "test-sub-agent",
    subAgentName: "Test SubAgent",
  };

  switch (type) {
    case "text-delta":
      return {
        ...baseEvent,
        type: "text-delta",
        data: { textDelta: "test" },
      } as TStreamEvent;
    case "reasoning":
      return {
        ...baseEvent,
        type: "reasoning",
        data: { reasoning: "test" },
      } as TStreamEvent;
    case "source":
      return {
        ...baseEvent,
        type: "source",
        data: { source: "test" },
      } as TStreamEvent;
    case "tool-call":
      return {
        ...baseEvent,
        type: "tool-call",
        data: { toolName: "test", toolCallId: "test", args: {} },
      } as TStreamEvent;
    case "tool-result":
      return {
        ...baseEvent,
        type: "tool-result",
        data: { toolName: "test", toolCallId: "test", result: "test" },
      } as TStreamEvent;
    case "error":
      return {
        ...baseEvent,
        type: "error",
        data: { error: new Error("test") },
      } as TStreamEvent;
    case "finish":
      return {
        ...baseEvent,
        type: "finish",
        data: { finishReason: "test", usage: { promptTokens: 10, completionTokens: 10 } },
      } as TStreamEvent;
    default: {
      throw new Error(`Unknown stream event type: ${type}`);
    }
  }
}
