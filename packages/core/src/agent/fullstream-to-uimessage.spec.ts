/**
 * Tests for fullStreamToUIMessageStream conversion utilities
 */
import { describe, expect, it } from "vitest";
import {
  type FullStreamToUIMessageStreamOptions,
  convertFullStreamPartToUIMessageChunk,
} from "./agent";
import type { VoltAgentTextStreamPart } from "./subagent/types";

const defaultOptions: FullStreamToUIMessageStreamOptions = {
  sendReasoning: true,
  sendSources: true,
  sendStart: true,
  sendFinish: true,
  onError: (e: unknown) => String(e),
};

const subagentMetadata = {
  subAgentId: "sub-1",
  subAgentName: "SubAgent",
  executingAgentId: "exec-1",
  executingAgentName: "ExecutingAgent",
  parentAgentId: "parent-1",
  parentAgentName: "ParentAgent",
  agentPath: ["parent", "sub"],
};

describe("convertFullStreamPartToUIMessageChunk", () => {
  describe("subagent metadata preservation", () => {
    it("should include subagent metadata in text-delta chunks", () => {
      const part: VoltAgentTextStreamPart = {
        type: "text-delta",
        id: "text-1",
        text: "Hello world",
        ...subagentMetadata,
      } as VoltAgentTextStreamPart;

      const result = convertFullStreamPartToUIMessageChunk(part, defaultOptions);

      expect(result).toEqual({
        type: "text-delta",
        id: "text-1",
        delta: "Hello world",
        ...subagentMetadata,
      });
    });

    it("should include subagent metadata in reasoning-delta chunks", () => {
      const part: VoltAgentTextStreamPart = {
        type: "reasoning-delta",
        id: "reasoning-1",
        text: "Thinking...",
        ...subagentMetadata,
      } as VoltAgentTextStreamPart;

      const result = convertFullStreamPartToUIMessageChunk(part, defaultOptions);

      expect(result).toEqual({
        type: "reasoning-delta",
        id: "reasoning-1",
        delta: "Thinking...",
        ...subagentMetadata,
      });
    });

    it("should include subagent metadata in source chunks", () => {
      const part = {
        type: "source",
        sourceType: "url",
        id: "source-1",
        url: "https://example.com",
        title: "Example",
        ...subagentMetadata,
      } as VoltAgentTextStreamPart;

      const result = convertFullStreamPartToUIMessageChunk(part, defaultOptions);

      expect(result).toMatchObject({
        type: "source",
        ...subagentMetadata,
      });
    });

    it("should include subagent metadata in tool-call (tool-input-available) chunks", () => {
      const part: VoltAgentTextStreamPart = {
        type: "tool-call",
        toolCallId: "tool-call-1",
        toolName: "search",
        input: { query: "test" },
        ...subagentMetadata,
      } as VoltAgentTextStreamPart;

      const result = convertFullStreamPartToUIMessageChunk(part, defaultOptions);

      expect(result).toEqual({
        type: "tool-input-available",
        toolCallId: "tool-call-1",
        toolName: "search",
        input: { query: "test" },
        ...subagentMetadata,
      });
    });

    it("should include subagent metadata in tool-result (tool-output-available) chunks", () => {
      const part: VoltAgentTextStreamPart = {
        type: "tool-result",
        toolCallId: "tool-call-1",
        output: { results: ["a", "b"] },
        ...subagentMetadata,
      } as VoltAgentTextStreamPart;

      const result = convertFullStreamPartToUIMessageChunk(part, defaultOptions);

      expect(result).toEqual({
        type: "tool-output-available",
        toolCallId: "tool-call-1",
        output: { results: ["a", "b"] },
        ...subagentMetadata,
      });
    });

    it("should include subagent metadata in tool-input-start chunks", () => {
      const part: VoltAgentTextStreamPart = {
        type: "tool-input-start",
        id: "tool-1",
        toolName: "calculator",
        ...subagentMetadata,
      } as VoltAgentTextStreamPart;

      const result = convertFullStreamPartToUIMessageChunk(part, defaultOptions);

      expect(result).toEqual({
        type: "tool-input-start",
        toolCallId: "tool-1",
        toolName: "calculator",
        ...subagentMetadata,
      });
    });

    it("should include subagent metadata in tool-input-delta chunks", () => {
      const part: VoltAgentTextStreamPart = {
        type: "tool-input-delta",
        id: "tool-1",
        delta: '{"x":',
        ...subagentMetadata,
      } as VoltAgentTextStreamPart;

      const result = convertFullStreamPartToUIMessageChunk(part, defaultOptions);

      expect(result).toEqual({
        type: "tool-input-delta",
        toolCallId: "tool-1",
        inputTextDelta: '{"x":',
        ...subagentMetadata,
      });
    });

    it("should include subagent metadata in tool-error (tool-output-error) chunks", () => {
      const part: VoltAgentTextStreamPart = {
        type: "tool-error",
        toolCallId: "tool-call-1",
        error: new Error("Tool failed"),
        ...subagentMetadata,
      } as VoltAgentTextStreamPart;

      const result = convertFullStreamPartToUIMessageChunk(part, defaultOptions);

      expect(result).toEqual({
        type: "tool-output-error",
        toolCallId: "tool-call-1",
        errorText: "Error: Tool failed",
        ...subagentMetadata,
      });
    });

    it("should include subagent metadata in start chunks", () => {
      const part: VoltAgentTextStreamPart = {
        type: "start",
        ...subagentMetadata,
      } as VoltAgentTextStreamPart;

      const result = convertFullStreamPartToUIMessageChunk(part, defaultOptions);

      expect(result).toEqual({
        type: "start",
        ...subagentMetadata,
      });
    });

    it("should include subagent metadata in finish chunks", () => {
      const part: VoltAgentTextStreamPart = {
        type: "finish",
        finishReason: "stop",
        totalUsage: { inputTokens: 10, outputTokens: 5 },
        ...subagentMetadata,
      } as VoltAgentTextStreamPart;

      const result = convertFullStreamPartToUIMessageChunk(part, defaultOptions);

      expect(result).toEqual({
        type: "finish",
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5 },
        ...subagentMetadata,
      });
    });

    it("should include subagent metadata in error chunks", () => {
      const part: VoltAgentTextStreamPart = {
        type: "error",
        error: new Error("Stream error"),
        ...subagentMetadata,
      } as VoltAgentTextStreamPart;

      const result = convertFullStreamPartToUIMessageChunk(part, defaultOptions);

      expect(result).toEqual({
        type: "error",
        error: "Error: Stream error",
        ...subagentMetadata,
      });
    });
  });

  describe("without subagent metadata", () => {
    it("should work correctly when no subagent metadata is present", () => {
      const part: VoltAgentTextStreamPart = {
        type: "text-delta",
        id: "text-1",
        text: "Hello",
      } as VoltAgentTextStreamPart;

      const result = convertFullStreamPartToUIMessageChunk(part, defaultOptions);

      expect(result).toEqual({
        type: "text-delta",
        id: "text-1",
        delta: "Hello",
      });
    });
  });

  describe("options filtering", () => {
    it("should filter by types when specified", () => {
      const textPart: VoltAgentTextStreamPart = {
        type: "text-delta",
        id: "text-1",
        text: "Hello",
      } as VoltAgentTextStreamPart;

      const toolPart: VoltAgentTextStreamPart = {
        type: "tool-call",
        toolCallId: "tool-1",
        toolName: "search",
        input: {},
      } as VoltAgentTextStreamPart;

      const options: FullStreamToUIMessageStreamOptions = {
        ...defaultOptions,
        types: ["text-delta"],
      };

      expect(convertFullStreamPartToUIMessageChunk(textPart, options)).toBeDefined();
      expect(convertFullStreamPartToUIMessageChunk(toolPart, options)).toBeUndefined();
    });

    it("should respect sendReasoning option", () => {
      const part: VoltAgentTextStreamPart = {
        type: "reasoning-delta",
        id: "r-1",
        text: "thinking",
      } as VoltAgentTextStreamPart;

      expect(
        convertFullStreamPartToUIMessageChunk(part, { ...defaultOptions, sendReasoning: false }),
      ).toBeUndefined();
      expect(
        convertFullStreamPartToUIMessageChunk(part, { ...defaultOptions, sendReasoning: true }),
      ).toBeDefined();
    });

    it("should respect sendSources option", () => {
      const part = {
        type: "source",
        sourceType: "url",
        id: "s-1",
        url: "https://example.com",
        title: "Example",
      } as VoltAgentTextStreamPart;

      expect(
        convertFullStreamPartToUIMessageChunk(part, { ...defaultOptions, sendSources: false }),
      ).toBeUndefined();
      expect(
        convertFullStreamPartToUIMessageChunk(part, { ...defaultOptions, sendSources: true }),
      ).toBeDefined();
    });

    it("should respect sendStart option", () => {
      const part: VoltAgentTextStreamPart = {
        type: "start",
      } as VoltAgentTextStreamPart;

      expect(
        convertFullStreamPartToUIMessageChunk(part, { ...defaultOptions, sendStart: false }),
      ).toBeUndefined();
      expect(
        convertFullStreamPartToUIMessageChunk(part, { ...defaultOptions, sendStart: true }),
      ).toBeDefined();
    });

    it("should respect sendFinish option", () => {
      const part: VoltAgentTextStreamPart = {
        type: "finish",
        finishReason: "stop",
        totalUsage: { inputTokens: 1, outputTokens: 1 },
      } as VoltAgentTextStreamPart;

      expect(
        convertFullStreamPartToUIMessageChunk(part, { ...defaultOptions, sendFinish: false }),
      ).toBeUndefined();
      expect(
        convertFullStreamPartToUIMessageChunk(part, { ...defaultOptions, sendFinish: true }),
      ).toBeDefined();
    });
  });
});
