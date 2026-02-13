import { describe, expect, it } from "vitest";

import {
  type ToolCallAccuracyParams,
  type ToolCallAccuracyPayload,
  createToolCallAccuracyScorerCode,
} from "./tool-call-accuracy";

describe("createToolCallAccuracyScorerCode", () => {
  it("returns 1 when the expected tool is present in lenient mode", async () => {
    const scorer = createToolCallAccuracyScorerCode({
      expectedTool: "searchProducts",
    });

    const result = await scorer.scorer({
      payload: {
        toolCalls: [{ toolName: "searchProducts" }, { toolName: "checkInventory" }],
      } satisfies ToolCallAccuracyPayload,
      params: {} as ToolCallAccuracyParams,
    });

    expect(result.status).toBe("success");
    expect(result.score).toBe(1);
    expect((result.metadata?.toolCallAccuracy as Record<string, unknown>)?.correctToolCalled).toBe(
      true,
    );
  });

  it("returns 0 in strict single-tool mode when extra tools are called", async () => {
    const scorer = createToolCallAccuracyScorerCode({
      expectedTool: "searchProducts",
      strictMode: true,
    });

    const result = await scorer.scorer({
      payload: {
        toolCalls: [{ toolName: "searchProducts" }, { toolName: "checkInventory" }],
      } satisfies ToolCallAccuracyPayload,
      params: {} as ToolCallAccuracyParams,
    });

    expect(result.status).toBe("success");
    expect(result.score).toBe(0);
    expect((result.metadata?.toolCallAccuracy as Record<string, unknown>)?.correctToolCalled).toBe(
      false,
    );
  });

  it("checks tool order in strict mode", async () => {
    const scorer = createToolCallAccuracyScorerCode({
      expectedToolOrder: ["searchProducts", "checkInventory"],
      strictMode: true,
    });

    const passing = await scorer.scorer({
      payload: {
        toolCalls: [{ toolName: "searchProducts" }, { toolName: "checkInventory" }],
      } satisfies ToolCallAccuracyPayload,
      params: {} as ToolCallAccuracyParams,
    });
    const failing = await scorer.scorer({
      payload: {
        toolCalls: [
          { toolName: "searchProducts" },
          { toolName: "checkInventory" },
          { toolName: "fetchPricing" },
        ],
      } satisfies ToolCallAccuracyPayload,
      params: {} as ToolCallAccuracyParams,
    });

    expect(passing.score).toBe(1);
    expect(failing.score).toBe(0);
  });

  it("allows extra tools in non-strict order mode", async () => {
    const scorer = createToolCallAccuracyScorerCode({
      expectedToolOrder: ["searchProducts", "checkInventory"],
      strictMode: false,
    });

    const result = await scorer.scorer({
      payload: {
        toolCalls: [
          { toolName: "logRequest" },
          { toolName: "searchProducts" },
          { toolName: "cacheWarmup" },
          { toolName: "checkInventory" },
        ],
      } satisfies ToolCallAccuracyPayload,
      params: {} as ToolCallAccuracyParams,
    });

    expect(result.status).toBe("success");
    expect(result.score).toBe(1);
    expect((result.metadata?.toolCallAccuracy as Record<string, unknown>)?.correctOrderCalled).toBe(
      true,
    );
  });

  it("extracts tool names from message chains when toolCalls are not provided", async () => {
    const scorer = createToolCallAccuracyScorerCode({
      expectedTool: "weatherTool",
    });

    const result = await scorer.scorer({
      payload: {
        messages: [
          {
            id: "call-1",
            type: "tool_call",
            role: "assistant",
            name: "weatherTool",
            content: "{}",
          },
          {
            id: "call-1",
            type: "tool_result",
            role: "assistant",
            name: "weatherTool",
            content: '{"temperature":21}',
          },
        ],
      } satisfies ToolCallAccuracyPayload,
      params: {} as ToolCallAccuracyParams,
    });

    expect(result.status).toBe("success");
    expect(result.score).toBe(1);
  });

  it("supports custom buildPayload mappings", async () => {
    const scorer = createToolCallAccuracyScorerCode<{ events: Array<{ name: string }> }>({
      expectedTool: "searchProducts",
      buildPayload: ({ payload }) => ({
        toolCalls: payload.events.map((event) => ({ toolName: event.name })),
      }),
    });

    const result = await scorer.scorer({
      payload: {
        events: [{ name: "searchProducts" }],
      },
      params: {},
    });

    expect(result.status).toBe("success");
    expect(result.score).toBe(1);
  });

  it("falls back to extracting tool calls from output arrays", async () => {
    const scorer = createToolCallAccuracyScorerCode({
      expectedTool: "searchProducts",
    });

    const result = await scorer.scorer({
      payload: {
        output: [
          {
            type: "tool_call",
            role: "assistant",
            name: "searchProducts",
            content: "{}",
          },
        ],
      } satisfies ToolCallAccuracyPayload,
      params: {} as ToolCallAccuracyParams,
    });

    expect(result.status).toBe("success");
    expect(result.score).toBe(1);
  });

  it("ignores stream-event tool types when extracting tool names", async () => {
    const scorer = createToolCallAccuracyScorerCode({
      expectedTool: "searchProducts",
    });

    const result = await scorer.scorer({
      payload: {
        output: [
          {
            type: "tool_input_start",
            role: "assistant",
            content: "{}",
          },
          {
            type: "tool_output_end",
            role: "assistant",
            content: "{}",
          },
          {
            type: "tool_call_delta",
            role: "assistant",
            content: "{}",
          },
        ],
      } satisfies ToolCallAccuracyPayload,
      params: {} as ToolCallAccuracyParams,
    });

    expect(result.status).toBe("success");
    expect(result.score).toBe(0);
    expect((result.metadata?.toolCallAccuracy as Record<string, unknown>)?.actualTools).toEqual([]);
  });

  it("keeps extracting from tool_<name> type in tool call lists", async () => {
    const scorer = createToolCallAccuracyScorerCode({
      expectedTool: "searchProducts",
    });

    const result = await scorer.scorer({
      payload: {
        output: {
          toolCalls: [
            {
              type: "tool_searchProducts",
            },
          ],
        },
      } satisfies ToolCallAccuracyPayload,
      params: {} as ToolCallAccuracyParams,
    });

    expect(result.status).toBe("success");
    expect(result.score).toBe(1);
  });

  it("throws when no expected tool configuration is provided", () => {
    expect(() => createToolCallAccuracyScorerCode({})).toThrow(
      "createToolCallAccuracyScorerCode requires either expectedTool or expectedToolOrder",
    );
  });
});
