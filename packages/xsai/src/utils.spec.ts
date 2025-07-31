import type { StreamPart } from "@voltagent/core";
import type { StreamTextEvent } from "xsai";
import { describe, expect, it } from "vitest";
import { createMappedFullStream, mapToStreamPart } from "./utils";

describe("mapToStreamPart", () => {
  it("should map text-delta part", () => {
    const part = {
      type: "text-delta",
      text: "Hello",
    } as StreamTextEvent;

    const result = mapToStreamPart(part);

    expect(result).toEqual({
      type: "text-delta",
      textDelta: "Hello",
    });
  });

  it("should map tool-call part", () => {
    const part = {
      type: "tool-call",
      toolCallId: "call-123",
      toolName: "getWeather",
      args: '{ "location": "New York" }',
    } as StreamTextEvent;

    const result = mapToStreamPart(part);

    expect(result).toEqual({
      type: "tool-call",
      toolCallId: "call-123",
      toolName: "getWeather",
      args: { location: "New York" },
    });
  });

  it("should map tool-result part", () => {
    const part = {
      type: "tool-result",
      toolCallId: "call-123",
      toolName: "getWeather",
      result: { temperature: 72 },
    } as unknown as StreamTextEvent;

    const result = mapToStreamPart(part);

    expect(result).toEqual({
      type: "tool-result",
      toolCallId: "call-123",
      toolName: "getWeather",
      result: { temperature: 72 },
    });
  });

  it("should map finish part with usage", () => {
    const part = {
      type: "finish",
      finishReason: "stop",
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    } as StreamTextEvent;

    const result = mapToStreamPart(part);

    expect(result).toEqual({
      type: "finish",
      finishReason: "stop",
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
    });
  });

  it("should map finish part without usage", () => {
    const part = {
      type: "finish",
      finishReason: "stop",
    } as StreamTextEvent;

    const result = mapToStreamPart(part);

    expect(result).toEqual({
      type: "finish",
      finishReason: "stop",
      usage: undefined,
    });
  });

  it("should map error part", () => {
    const error = new Error("Something went wrong");
    const part = {
      type: "error",
      error,
    } as StreamTextEvent;

    const result = mapToStreamPart(part);

    expect(result).toEqual({
      type: "error",
      error,
    });
  });

  it("should return null for unsupported part type", () => {
    const part = {
      type: "unsupported",
      data: "some data",
    } as unknown as StreamTextEvent;

    const result = mapToStreamPart(part);

    expect(result).toBeNull();
  });
});

describe("createMappedFullStream", () => {
  it("should map stream parts correctly", async () => {
    const originalStream = (async function* () {
      yield { type: "text-delta", text: "Hello" };
      yield { type: "tool-call", toolCallId: "call-123", toolName: "getWeather", args: "{}" };
      yield { type: "tool-result", toolCallId: "call-123", toolName: "getWeather", result: {} };
      yield { type: "finish", finishReason: "stop" };
    })() as unknown as AsyncIterable<StreamTextEvent>;

    const mappedStream = createMappedFullStream(originalStream);
    const results: StreamPart[] = [];

    for await (const part of mappedStream) {
      results.push(part);
    }

    expect(results).toHaveLength(4);
    expect(results[0]).toEqual({ type: "text-delta", textDelta: "Hello" });
    expect(results[1]).toEqual({
      type: "tool-call",
      toolCallId: "call-123",
      toolName: "getWeather",
      args: {},
    });
    expect(results[2]).toEqual({
      type: "tool-result",
      toolCallId: "call-123",
      toolName: "getWeather",
      result: {},
    });
    expect(results[3]).toEqual({ type: "finish", finishReason: "stop" });
  });

  it("should filter out unsupported parts", async () => {
    const originalStream = (async function* () {
      yield { type: "text-delta", text: "Hello" };
      yield { type: "unsupported", data: "should be filtered" };
      yield { type: "finish", finishReason: "stop" };
    })() as unknown as AsyncIterable<StreamTextEvent>;

    const mappedStream = createMappedFullStream(originalStream);
    const results: StreamPart[] = [];

    for await (const part of mappedStream) {
      results.push(part);
    }

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ type: "text-delta", textDelta: "Hello" });
    expect(results[1]).toEqual({ type: "finish", finishReason: "stop" });
  });

  it("should handle empty stream", async () => {
    const originalStream = (async function* () {
      // Empty stream
    })();

    const mappedStream = createMappedFullStream(originalStream);
    const results: StreamPart[] = [];

    for await (const part of mappedStream) {
      results.push(part);
    }

    expect(results).toHaveLength(0);
  });
});
