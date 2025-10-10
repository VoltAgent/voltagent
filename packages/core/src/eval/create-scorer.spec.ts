import { embedMany, generateText } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { z } from "zod";

import {
  type EmbeddingSimilarityStepResult,
  createEmbeddingSimilarityStep,
  createLlmJudgeGenerateScore,
  createLlmPromptStep,
  createLlmStep,
  createLlmToolStep,
  createScorer,
  parallelSteps,
  weightedBlend,
} from "./create-scorer";
import type { ScorerPipelineContext } from "./create-scorer";

vi.mock("ai", () => ({
  generateText: vi.fn(),
  embedMany: vi.fn(),
}));

const mockedGenerateText = vi.mocked(generateText);
const mockedEmbedMany = vi.mocked(embedMany);

interface TestPayload {
  input: string;
  output: string;
}

describe("createScorer", () => {
  beforeEach(() => {
    mockedGenerateText.mockReset();
    mockedEmbedMany.mockReset();
  });

  it("executes pipeline steps and returns score", async () => {
    const scorer = createScorer<TestPayload, { keyword: string }>({
      id: "keyword",
      preprocess: ({ payload }) => payload.output.toLowerCase(),
      analyze: ({ results, params }) => results.preprocess?.includes(params.keyword.toLowerCase()),
      generateScore: ({ results }) => (results.analyze ? 1 : 0),
      generateReason: ({ results }) => (results.analyze ? "Keyword present." : "Keyword missing."),
    });

    const result = await scorer.scorer({
      payload: { input: "", output: "VoltAgent is great" },
      params: { keyword: "VoltAgent" },
    });

    expect(result.status).toBe("success");
    expect(result.score).toBe(1);
    expect(result.metadata).toMatchObject({ reason: "Keyword present." });
  });

  it("handles metadata returned from score and reason", async () => {
    const scorer = createScorer<TestPayload, { threshold: number }>({
      id: "threshold",
      metadata: { base: true },
      generateScore: ({ params }) => ({
        score: 0.4,
        metadata: { threshold: params.threshold },
      }),
      generateReason: () => ({
        reason: "Below threshold",
        metadata: { severity: "warn" },
      }),
    });

    const result = await scorer.scorer({
      payload: { input: "", output: "" },
      params: { threshold: 0.5 },
    });

    expect(result.metadata).toMatchObject({
      base: true,
      threshold: 0.5,
      severity: "warn",
      reason: "Below threshold",
    });
  });

  it("returns error when a step throws", async () => {
    const scorer = createScorer<TestPayload, Record<string, never>>({
      id: "failing",
      analyze: () => {
        throw new Error("failure");
      },
    });

    const result = await scorer.scorer({
      payload: { input: "", output: "" },
      params: {},
    });

    expect(result.status).toBe("error");
    expect(result.error).toBeInstanceOf(Error);
  });

  it("supports async steps", async () => {
    const scorer = createScorer<TestPayload, Record<string, never>>({
      id: "async",
      preprocess: async ({ payload }) => payload.output,
      analyze: async ({ results }) => results.preprocess,
      generateScore: async ({ results }) => (results.analyze ? 0.9 : 0.1),
    });

    const result = await scorer.scorer({
      payload: { input: "", output: "test" },
      params: {},
    });

    expect(result.score).toBeCloseTo(0.9);
  });

  it("supports LLM prompt objects for generateScore", async () => {
    mockedGenerateText.mockResolvedValue({ text: '{"score":0.42}' });

    const scorer = createScorer<TestPayload, Record<string, never>>({
      id: "llm-prompt",
      generateScore: createLlmStep({
        model: { provider: "mock", modelId: "judge" } as any,
        buildPrompt: ({ payload }) => `Evaluate: ${payload.output}`,
        parse: ({ text }) => {
          const parsed = JSON.parse(text) as { score: number };
          return parsed.score;
        },
      }),
    });

    const result = await scorer.scorer({
      payload: { input: "", output: "LLM prompt" },
      params: {},
    });

    expect(result.status).toBe("success");
    expect(result.score).toBeCloseTo(0.42);
  });

  it("creates judge scorer using LLM helper", async () => {
    mockedGenerateText.mockResolvedValue({ text: '{"score":0.75,"reason":"helpful"}' });

    const scorer = createScorer<TestPayload, { criteria?: string }>({
      id: "judge",
      metadata: {
        voltAgent: {
          scorer: "judge",
        },
      },
      generateScore: (context) =>
        createLlmJudgeGenerateScore<TestPayload, { criteria?: string }>({
          model: { provider: "mock", modelId: "judge" } as any,
          instructions: "Score helpfulness",
          context,
        }),
    });

    const result = await scorer.scorer({
      payload: { input: "What is VoltAgent?", output: "It is a framework." },
      params: { criteria: "Prefer concise answers" },
    });

    expect(result.status).toBe("success");
    expect(result.score).toBeCloseTo(0.75);
    expect(result.metadata).toMatchObject({
      reason: "helpful",
      raw: '{"score":0.75,"reason":"helpful"}',
    });
  });

  it("supports schema-based LLM prompt helper for generateScore", async () => {
    mockedGenerateText.mockResolvedValue({ text: '{"score":0.91}' });

    const scorer = createScorer<TestPayload, Record<string, never>>({
      id: "llm-prompt-schema",
      generateScore: createLlmPromptStep({
        model: { provider: "mock", modelId: "judge" } as any,
        buildPrompt: () => "Rate answer",
        schema: z.object({ score: z.number().min(0).max(1) }),
        transform: ({ value }) => value.score,
      }),
    });

    const result = await scorer.scorer({
      payload: { input: "", output: "Great" },
      params: {},
    });

    expect(result.status).toBe("success");
    expect(result.score).toBeCloseTo(0.91);
  });

  it("uses LLM prompt helper inside preprocess step", async () => {
    mockedGenerateText.mockResolvedValue({ text: '{"normalized":"voltagent"}' });

    const scorer = createScorer<TestPayload, Record<string, never>>({
      id: "llm-preprocess",
      preprocess: createLlmPromptStep({
        model: { provider: "mock", modelId: "normalizer" } as any,
        buildPrompt: ({ payload }) => `Normalize: ${payload.output}`,
        schema: z.object({ normalized: z.string() }),
        transform: ({ value }) => value.normalized,
      }),
      analyze: ({ results }) => results.preprocess === "voltagent",
      generateScore: ({ results }) => (results.analyze ? 1 : 0),
      generateReason: ({ results }) => `Normalized value: ${results.preprocess}`,
    });

    const result = await scorer.scorer({
      payload: { input: "", output: "VoltAgent" },
      params: {},
    });

    expect(result.score).toBe(1);
    expect(result.metadata).toMatchObject({ reason: "Normalized value: voltagent" });
    expect(mockedGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: "Normalize: VoltAgent" }),
    );
  });

  it("provides detailed metadata when schema validation fails", async () => {
    mockedGenerateText.mockResolvedValue({ text: "not-json" });

    const scorer = createScorer<TestPayload, Record<string, never>>({
      id: "llm-schema-error",
      generateScore: createLlmPromptStep({
        model: { provider: "mock", modelId: "judge" } as any,
        buildPrompt: () => "Evaluate",
        schema: z.object({ score: z.number() }),
        transform: ({ value }) => value.score,
      }),
    });

    const result = await scorer.scorer({
      payload: { input: "", output: "" },
      params: {},
    });

    expect(result.status).toBe("error");
    expect(result.metadata).toMatchObject({
      raw: "not-json",
      validationError: expect.any(Object),
    });
    expect(result.metadata?.attempts).toBeDefined();
  });

  it("supports tool-calling helper with custom transform", async () => {
    mockedGenerateText.mockResolvedValue({
      text: "",
      toolCalls: [
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "judge",
          input: { score: 0.88 },
          dynamic: false,
        },
      ],
      toolResults: [],
    });

    const scorer = createScorer<TestPayload, Record<string, never>>({
      id: "llm-tool",
      preprocess: createLlmToolStep({
        model: { provider: "mock", modelId: "judge" } as any,
        buildPrompt: () => "Call judge tool",
        tools: {
          judge: {
            description: "Judge",
            parameters: z.object({ score: z.number() }),
            execute: vi.fn(),
          },
        } as any,
        transform: ({ toolCalls }) => toolCalls[0]?.input,
      }),
      generateScore: ({ results }) => (results.preprocess as { score: number }).score,
    });

    const result = await scorer.scorer({
      payload: { input: "", output: "" },
      params: {},
    });

    expect(result.status).toBe("success");
    expect(result.score).toBeCloseTo(0.88);
    expect(mockedGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({ tools: expect.any(Object) }),
    );
  });

  it("returns error when tool call is missing", async () => {
    mockedGenerateText.mockResolvedValue({
      text: "",
      toolCalls: [],
      toolResults: [],
    });

    const scorer = createScorer<TestPayload, Record<string, never>>({
      id: "llm-tool-error",
      generateScore: createLlmToolStep({
        model: { provider: "mock", modelId: "judge" } as any,
        buildPrompt: () => "Call tool",
        tools: {
          judge: {
            description: "Judge",
            parameters: z.object({ score: z.number() }),
            execute: vi.fn(),
          },
        } as any,
      }),
    });

    const result = await scorer.scorer({
      payload: { input: "", output: "" },
      params: {},
    });

    expect(result.status).toBe("error");
    expect(result.metadata).toMatchObject({ expectedTools: ["judge"] });
  });

  it("runs parallel steps and stores component metadata", async () => {
    const scoreStepA = ({
      payload,
    }: ScorerPipelineContext<TestPayload, Record<string, never>>) => ({
      score: payload.output.includes("Volt") ? 0.8 : 0.2,
      metadata: { id: "a" },
    });
    const scoreStepB = () => ({ score: 0.6, metadata: { id: "b" } });

    const scorer = createScorer<TestPayload, Record<string, never>>({
      id: "parallel",
      generateScore: parallelSteps([
        { id: "judgeA", step: scoreStepA },
        { id: "judgeB", step: scoreStepB },
      ]),
      generateReason: ({ results }) =>
        `A:${results.judgeA.score ?? "-"},B:${results.judgeB.score ?? "-"}`,
    });

    const result = await scorer.scorer({
      payload: { input: "", output: "VoltAgent" },
      params: {},
    });

    expect(result.score).toBeCloseTo(0.7);
    expect(result.metadata).toMatchObject({
      components: [
        { id: "judgeA", score: 0.8 },
        { id: "judgeB", score: 0.6 },
      ],
    });
    expect(result.metadata?.components?.length).toBe(2);
  });

  it("blends component scores using weights", async () => {
    const scorer = createScorer<TestPayload, Record<string, never>>({
      id: "blend",
      generateScore: weightedBlend(
        [
          {
            id: "model",
            weight: 0.7,
            step: ({ payload }) => ({
              score: payload.output.includes("Volt") ? 0.9 : 0.1,
              metadata: { label: "model" },
            }),
          },
          {
            id: "embedding",
            weight: 0.3,
            step: () => ({ score: 0.5, metadata: { label: "embedding" } }),
          },
        ],
        { metadataKey: "weights" },
      ),
      generateReason: ({ results }) => `Model:${results.model.score}`,
    });

    const result = await scorer.scorer({
      payload: { input: "", output: "VoltAgent" },
      params: {},
    });

    expect(result.status).toBe("success");
    expect(result.score).toBeCloseTo(0.78, 2);
    expect(result.metadata).toMatchObject({
      weights: {
        components: [
          { id: "model", weight: 0.7, score: 0.9 },
          { id: "embedding", weight: 0.3, score: 0.5 },
        ],
      },
    });
  });

  it("computes embedding similarity with default strategy", async () => {
    mockedEmbedMany.mockResolvedValue({
      embeddings: [
        [1, 0],
        [1, 0],
        [0, 1],
      ],
      values: [],
      usage: { tokens: 6 },
    } as any);

    const scorer = createScorer<TestPayload, Record<string, never>>({
      id: "embedding-default",
      analyze: createEmbeddingSimilarityStep<
        ScorerPipelineContext<TestPayload, Record<string, never>>
      >({
        model: { provider: "mock", modelId: "embed" } as any,
        buildInput: ({ payload }) => ({
          query: payload.output,
          references: [
            { id: "expected", text: "VoltAgent is great" },
            { id: "alt", text: "Something else" },
          ],
        }),
      }),
      generateScore: ({ results }) =>
        (results.analyze as EmbeddingSimilarityStepResult).aggregateScore,
    });

    const result = await scorer.scorer({
      payload: { input: "", output: "VoltAgent is great" },
      params: {},
    });

    expect(result.status).toBe("success");
    expect(result.score).toBeCloseTo(1);
    expect(mockedEmbedMany).toHaveBeenCalledTimes(1);
  });

  it("maps embedding similarity into score via transform", async () => {
    mockedEmbedMany.mockResolvedValue({
      embeddings: [
        [1, 0],
        [1, 0],
        [0, 1],
      ],
      values: [],
      usage: { tokens: 6 },
    } as any);

    const scorer = createScorer<TestPayload, Record<string, never>>({
      id: "embedding-score",
      generateScore: createEmbeddingSimilarityStep<
        ScorerPipelineContext<TestPayload, Record<string, never>>,
        { score: number }
      >({
        model: { provider: "mock", modelId: "embed" } as any,
        strategy: "average",
        buildInput: ({ payload }) => ({
          query: payload.output,
          references: [
            { id: "expected", text: "VoltAgent is great" },
            { id: "alt", text: "Totally different" },
          ],
        }),
        transform: ({ aggregateScore }) => ({ score: aggregateScore }),
      }),
    });

    const result = await scorer.scorer({
      payload: { input: "", output: "VoltAgent is great" },
      params: {},
    });

    expect(result.status).toBe("success");
    expect(result.score).toBeCloseTo(0.75, 2);
  });
});
