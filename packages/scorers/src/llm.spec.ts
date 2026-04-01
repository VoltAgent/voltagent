import { describe, expect, it } from "vitest";

import { createMockLanguageModel } from "../../core/src/agent/test-utils";

const { createModerationScorer } = await import("./llm/moderation");

function createModelWithResponse(text: string) {
  return createMockLanguageModel({
    modelId: "moderation",
    doGenerate: {
      rawPrompt: null,
      rawSettings: {},
      content: [{ type: "text", text }],
      finishReason: "stop" as const,
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      warnings: [],
    },
  });
}

describe("createModerationScorer", () => {
  it("flags content based on LLM JSON output", async () => {
    const scorer = createModerationScorer({
      model: createModelWithResponse('{"flagged":true,"scores":{"violence":0.92},"reason":null}'),
      threshold: 0.5,
      categories: ["violence"],
    });

    const result = await scorer.scorer({ payload: { output: "violent content" }, params: {} });

    expect(result.status).toBe("success");
    expect(result.score).toBe(0);
    expect(result.metadata?.voltAgent).toMatchObject({
      scorer: "moderation",
      threshold: 0.5,
      flagged: true,
      thresholdPassed: false,
    });
    expect(result.metadata?.moderation).toMatchObject({
      flagged: true,
      scores: { violence: 0.92 },
    });
  });

  it("tracks threshold metadata for flagged content", async () => {
    const scorer = createModerationScorer({
      model: createModelWithResponse('{"flagged":true,"scores":{"violence":0.61},"reason":null}'),
      threshold: 0.6,
      categories: ["violence"],
    });

    const result = await scorer.scorer({ payload: { output: "threatening" }, params: {} });

    expect(result.score).toBe(0);
    expect(result.metadata?.voltAgent).toMatchObject({
      flagged: true,
      threshold: 0.6,
      thresholdPassed: false,
    });
  });

  it("returns passing score when content is clean", async () => {
    const scorer = createModerationScorer({
      model: createModelWithResponse('{"flagged":false,"scores":{"hate":0},"reason":null}'),
      threshold: 0.4,
      categories: ["hate"],
    });

    const result = await scorer.scorer({ payload: { output: "hello" }, params: {} });

    expect(result.score).toBe(1);
    expect(result.metadata?.voltAgent).toMatchObject({
      flagged: false,
      threshold: 0.4,
      thresholdPassed: true,
    });
  });

  it("propagates reason from moderation output", async () => {
    const scorer = createModerationScorer({
      model: createModelWithResponse(
        '{"flagged":true,"scores":{"hate":0.7},"reason":"Contains hate speech."}',
      ),
      threshold: 0.6,
      categories: ["hate"],
    });

    const result = await scorer.scorer({ payload: { output: "hate" }, params: {} });

    const moderationMetadata = result.metadata?.moderation as Record<string, unknown> | undefined;
    expect(moderationMetadata?.reason).toBe("Contains hate speech.");
  });
});
