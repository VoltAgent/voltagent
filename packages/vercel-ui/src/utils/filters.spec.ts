import type { StepWithContent } from "@voltagent/core";
import { describe, expect, it } from "vitest";
import type { UIMessage, UIMessagePart } from "../types";
import { rejectStepsWithContent, rejectUIMessageParts } from "./filters";

describe("utils", () => {
  describe("rejectStepsWithContent", () => {
    it("should return empty array when all steps are rejected", () => {
      const steps: StepWithContent[] = [
        {
          id: "step-1",
          type: "text",
          content: "Hello",
          role: "assistant",
        },
        {
          id: "step-2",
          type: "tool_call",
          content: "Tool call",
          role: "assistant",
          name: "test-tool",
          arguments: { arg1: "value1" },
        },
      ];

      const result = rejectStepsWithContent(steps, () => true);

      expect(result).toEqual([]);
    });

    it("should return all steps when no steps are rejected", () => {
      const steps: StepWithContent[] = [
        {
          id: "step-1",
          type: "text",
          content: "Hello",
          role: "assistant",
        },
        {
          id: "step-2",
          type: "tool_call",
          content: "Tool call",
          role: "assistant",
          name: "test-tool",
          arguments: { arg1: "value1" },
        },
      ];

      const result = rejectStepsWithContent(steps, () => false);

      expect(result).toEqual(steps);
    });

    it("should reject steps based on type", () => {
      const steps: StepWithContent[] = [
        {
          id: "step-1",
          type: "text",
          content: "Hello",
          role: "assistant",
        },
        {
          id: "step-2",
          type: "tool_call",
          content: "Tool call",
          role: "assistant",
          name: "test-tool",
          arguments: { arg1: "value1" },
        },
        {
          id: "step-3",
          type: "tool_result",
          content: "Tool result",
          role: "tool",
          name: "test-tool",
          result: "success",
        },
      ];

      const result = rejectStepsWithContent(steps, (step) => step.type === "tool_call");

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe("text");
      expect(result[1].type).toBe("tool_result");
    });

    it("should reject sub-agent steps", () => {
      const steps: StepWithContent[] = [
        {
          id: "step-1",
          type: "text",
          content: "Hello from main agent",
          role: "assistant",
        },
        {
          id: "step-2",
          type: "text",
          content: "Hello from sub-agent",
          role: "assistant",
          subAgentId: "sub-agent-1",
          subAgentName: "SubAgent",
        },
        {
          id: "step-3",
          type: "tool_call",
          content: "Tool call from sub-agent",
          role: "assistant",
          name: "test-tool",
          arguments: { arg1: "value1" },
          subAgentId: "sub-agent-1",
          subAgentName: "SubAgent",
        },
      ];

      const result = rejectStepsWithContent(steps, (step) => !!step.subAgentId);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("Hello from main agent");
      expect(result[0].subAgentId).toBeUndefined();
    });

    it("should handle empty steps array", () => {
      const steps: StepWithContent[] = [];

      const result = rejectStepsWithContent(steps, () => true);

      expect(result).toEqual([]);
    });

    it("should reject steps based on content", () => {
      const steps: StepWithContent[] = [
        {
          id: "step-1",
          type: "text",
          content: "Hello world",
          role: "assistant",
        },
        {
          id: "step-2",
          type: "text",
          content: "Goodbye world",
          role: "assistant",
        },
        {
          id: "step-3",
          type: "text",
          content: "Another message",
          role: "assistant",
        },
      ];

      const result = rejectStepsWithContent(steps, (step) => step.content.includes("world"));

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("Another message");
    });
  });

  describe("rejectUIMessageParts", () => {
    it("should return empty parts array when all parts are rejected", () => {
      const message = {
        id: "msg-1",
        role: "assistant",
        content: "Hello World",
        parts: [
          {
            type: "text",
            text: "Hello",
          },
          {
            type: "text",
            text: "World",
          },
        ],
      } as UIMessage;

      const result = rejectUIMessageParts(message, () => true);

      expect(result).toEqual([]);
    });

    it("should return all parts when no parts are rejected", () => {
      const message = {
        id: "msg-1",
        role: "assistant",
        content: "Hello World",
        parts: [
          {
            type: "text",
            text: "Hello",
          },
          {
            type: "text",
            text: "World",
          },
        ],
      } as UIMessage;

      const result = rejectUIMessageParts(message, () => false);

      expect(result).toEqual(message.parts);
    });

    it("should reject text parts", () => {
      const message = {
        id: "msg-1",
        role: "assistant",
        content: "Hello Tool World",
        parts: [
          {
            type: "text",
            text: "Hello",
          },
          {
            type: "tool-invocation",
            toolInvocation: {
              toolCallId: "call-1",
              toolName: "test-tool",
              args: { arg1: "value1" },
              state: "partial-call",
            },
          },
          {
            type: "text",
            text: "World",
          },
        ],
      } as UIMessage;

      const result = rejectUIMessageParts(message, (part) => part.type === "text");

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("tool-invocation");
    });

    it("should reject sub-agent parts", () => {
      const message = {
        id: "msg-1",
        role: "assistant",
        content: "Hello from main agent Hello from sub-agent",
        parts: [
          {
            type: "text",
            text: "Hello from main agent",
          },
          {
            type: "text",
            text: "Hello from sub-agent",
            subAgentId: "sub-agent-1",
            subAgentName: "SubAgent",
          },
          {
            type: "tool-invocation",
            toolInvocation: {
              toolCallId: "call-1",
              toolName: "test-tool",
              args: { arg1: "value1" },
              subAgentId: "sub-agent-1",
              subAgentName: "SubAgent",
              state: "partial-call",
            },
          },
        ],
      } as UIMessage;

      const result = rejectUIMessageParts(message, (part) => {
        if (part.type === "text") {
          return !!(part as any).subAgentId;
        }
        if (part.type === "tool-invocation") {
          return !!part.toolInvocation.subAgentId;
        }
        return false;
      });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("text");
      expect((result[0] as any).subAgentId).toBeUndefined();
    });

    it("should handle message with empty parts array", () => {
      const message = {
        id: "msg-1",
        role: "assistant",
        content: "",
        parts: [],
      } as UIMessage;

      const result = rejectUIMessageParts(message, () => true);

      expect(result).toEqual([]);
    });

    it("should reject parts based on content", () => {
      const message = {
        id: "msg-1",
        role: "assistant",
        content: "Hello world Goodbye world Another message",
        parts: [
          {
            type: "text",
            text: "Hello world",
          },
          {
            type: "text",
            text: "Goodbye world",
          },
          {
            type: "text",
            text: "Another message",
          },
        ],
      } as UIMessage;

      const result = rejectUIMessageParts(message, (part) => {
        if (part.type === "text") {
          return part.text.includes("world");
        }
        return false;
      });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("text");
      expect((result[0] as any).text).toBe("Another message");
    });

    it("should handle mixed part types with complex rejection logic", () => {
      const message = {
        id: "msg-1",
        role: "assistant",
        content: "Main agent response Sub agent response",
        parts: [
          {
            type: "text",
            text: "Main agent response",
          },
          {
            type: "tool-invocation",
            toolInvocation: {
              toolCallId: "call-1",
              toolName: "main-tool",
              args: { arg1: "value1" },
              state: "call",
            },
          },
          {
            type: "text",
            text: "Sub agent response",
            subAgentId: "sub-agent-1",
            subAgentName: "SubAgent",
          },
          {
            type: "tool-invocation",
            toolInvocation: {
              toolCallId: "call-2",
              toolName: "sub-tool",
              args: { arg2: "value2" },
              subAgentId: "sub-agent-1",
              subAgentName: "SubAgent",
              state: "result",
              result: "success",
            },
          },
        ],
      } as UIMessage;

      // Reject all sub-agent related parts
      const result = rejectUIMessageParts(message, (part) => {
        if (part.type === "text") {
          return !!(part as any).subAgentId;
        }
        if (part.type === "tool-invocation") {
          return !!part.toolInvocation.subAgentId;
        }
        return false;
      });

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe("text");
      expect((result[0] as any).text).toBe("Main agent response");
      expect(result[1].type).toBe("tool-invocation");
      expect((result[1] as any).toolInvocation.toolName).toBe("main-tool");
    });
  });
});
