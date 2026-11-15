import { APICallError } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createTool } from "../tool";
import { Agent } from "./agent";

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 5, text: 5, reasoning: 0 },
};

describe("generateText model retries and fallback after tool execution", () => {
  it.each(["retry", "fallback"] as const)("does not replay a tool on model %s", async (mode) => {
    const providerError = new APICallError({
      message: "Model overloaded",
      url: "https://example.com/model",
      requestBodyValues: {},
      statusCode: 503,
      isRetryable: true,
    });
    const execute = vi.fn(async () => "recorded");
    let hasFailed = false;
    const primary = new MockLanguageModelV3({
      doGenerate: async ({ prompt }) => {
        if (!prompt.some((message) => message.role === "tool")) {
          return {
            content: [{ type: "tool-call", toolCallId: "call-1", toolName: "record", input: "{}" }],
            finishReason: { unified: "tool-calls", raw: undefined },
            usage,
            warnings: [],
          };
        }
        if (!hasFailed) {
          hasFailed = true;
          throw providerError;
        }
        return {
          content: [{ type: "text", text: "Done" }],
          finishReason: { unified: "stop", raw: undefined },
          usage,
          warnings: [],
        };
      },
    });
    const generateFallback = vi.fn(async () => {
      throw new Error("The fallback model should never be called");
    });
    const fallback = new MockLanguageModelV3({ doGenerate: generateFallback });
    const agent = new Agent({
      name: "tool-replay",
      instructions: "Record the action",
      model: mode === "retry" ? primary : [{ model: primary, maxRetries: 0 }, { model: fallback }],
      maxRetries: mode === "retry" ? 1 : 0,
      maxSteps: 2,
      memory: false,
      tools: [
        createTool({
          name: "record",
          description: "Record an action",
          parameters: z.object({}),
          execute,
        }),
      ],
    });

    const result = agent.generateText("Record the action");

    await expect(result).rejects.toBe(providerError);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(primary.doGenerateCalls).toHaveLength(2);
    expect(generateFallback).not.toHaveBeenCalled();
  });
});
