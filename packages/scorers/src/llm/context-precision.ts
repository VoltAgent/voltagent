import {
  Agent,
  type BuilderScoreContext,
  type LocalScorerDefinition,
  buildScorer,
} from "@voltagent/core";
import { safeStringify } from "@voltagent/internal/utils";
import type { LanguageModel } from "ai";
import { z } from "zod";

const CONTEXT_PRECISION_PROMPT = `Given question, answer and context verify if the context was useful in arriving at the given answer. Give verdict as "1" if useful and "0" if not with json output.

Examples:

question: "What can you tell me about albert Albert Einstein?"
context: "Albert Einstein (14 March 1879 – 18 April 1955) was a German-born theoretical physicist, widely held to be one of the greatest and most influential scientists of all time. Best known for developing the theory of relativity, he also made important contributions to quantum mechanics, and was thus a central figure in the revolutionary reshaping of the scientific understanding of nature that modern physics accomplished in the first decades of the twentieth century. His mass–energy equivalence formula E = mc2, which arises from relativity theory, has been called \"the world's most famous equation\". He received the 1921 Nobel Prize in Physics \"for his services to theoretical physics, and especially for his discovery of the law of the photoelectric effect\", a pivotal step in the development of quantum theory. His work is also known for its influence on the philosophy of science. In a 1999 poll of 130 leading physicists worldwide by the British journal Physics World, Einstein was ranked the greatest physicist of all time. His intellectual achievements and originality have made Einstein synonymous with genius."
answer: "Albert Einstein born in 14 March 1879 was German-born theoretical physicist, widely held to be one of the greatest and most influential scientists of all time. He received the 1921 Nobel Prize in Physics for his services to theoretical physics. He published 4 papers in 1905. Einstein moved to Switzerland in 1895"
verification: {"reason": "The provided context was indeed useful in arriving at the given answer. The context includes key information about Albert Einstein's life and contributions, which are reflected in the answer.", "verdict": 1}

question: "who won 2020 icc world cup?"
context: "The 2022 ICC Men's T20 World Cup, held from October 16 to November 13, 2022, in Australia, was the eighth edition of the tournament. Originally scheduled for 2020, it was postponed due to the COVID-19 pandemic. England emerged victorious, defeating Pakistan by five wickets in the final to clinch their second ICC Men's T20 World Cup title."
answer: "England"
verification: {"reason": "the context was useful in clarifying the situation regarding the 2020 ICC World Cup and indicating that England was the winner of the tournament that was intended to be held in 2020 but actually took place in 2022.", "verdict": 1}

question: "What is the tallest mountain in the world?"
context: "The Andes is the longest continental mountain range in the world, located in South America. It stretches across seven countries and features many of the highest peaks in the Western Hemisphere. The range is known for its diverse ecosystems, including the high-altitude Andean Plateau and the Amazon rainforest."
answer: "Mount Everest."
verification: {"reason": "the provided context discusses the Andes mountain range, which, while impressive, does not include Mount Everest or directly relate to the question about the world's tallest mountain.", "verdict": 0}

Your actual task:

question: {{question}}
context: {{context}}
answer: {{answer}}`;

const CONTEXT_PRECISION_SCHEMA = z.object({
  reason: z.string().describe("Reason for verification"),
  verdict: z.number().int().min(0).max(1).describe("Binary (0/1) verdict of verification"),
});

export interface ContextPrecisionPayload extends Record<string, unknown> {
  input?: unknown;
  output?: unknown;
  context?: unknown;
  expected?: unknown;
}

export interface ContextPrecisionParams extends Record<string, unknown> {}

export interface ContextPrecisionOptions {
  binaryThreshold?: number;
  weighted?: boolean;
}

type ContextPrecisionScoreContext<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = BuilderScoreContext<Payload, Params>;

export interface ContextPrecisionScorerOptions<
  Payload extends Record<string, unknown> = ContextPrecisionPayload,
  Params extends Record<string, unknown> = ContextPrecisionParams,
> {
  id?: string;
  name?: string;
  model: LanguageModel;
  options?: ContextPrecisionOptions;
  metadata?: Record<string, unknown> | null;
  buildPayload?: (context: ContextPrecisionScoreContext<Payload, Params>) => {
    input: string;
    output: string;
    context: string | string[];
    expected: string;
  };
}

const DEFAULT_OPTIONS: ContextPrecisionOptions = {
  binaryThreshold: 0.5,
  weighted: false,
};

export function createContextPrecisionScorer<
  Payload extends Record<string, unknown> = ContextPrecisionPayload,
  Params extends Record<string, unknown> = ContextPrecisionParams,
>({
  id = "contextPrecision",
  name = "Context Precision",
  model,
  options = DEFAULT_OPTIONS,
  metadata,
  buildPayload,
}: ContextPrecisionScorerOptions<Payload, Params>): LocalScorerDefinition<Payload, Params> {
  const mergedOptions: Required<ContextPrecisionOptions> = {
    binaryThreshold: options?.binaryThreshold ?? DEFAULT_OPTIONS.binaryThreshold ?? 0.5,
    weighted: options?.weighted ?? DEFAULT_OPTIONS.weighted ?? false,
  };

  return buildScorer<Payload, Params>({
    id,
    label: name,
    metadata: mergeMetadata(metadata, {
      voltAgent: {
        scorer: id,
        category: "context_precision",
      },
    }),
  })
    .score(async (context) => {
      const agent = new Agent({
        name: "context-precision-evaluator",
        model,
        instructions: "You evaluate if context was useful for arriving at the answer",
      });

      const payload = resolvePayload(context, buildPayload);
      const contextText = Array.isArray(payload.context)
        ? payload.context.join("\n")
        : payload.context;

      const prompt = CONTEXT_PRECISION_PROMPT.replace("{{question}}", payload.input)
        .replace("{{context}}", contextText)
        .replace("{{answer}}", payload.output);

      const response = await agent.generateObject(prompt, CONTEXT_PRECISION_SCHEMA);

      context.results.raw.contextPrecisionVerdict = response.object;

      if (mergedOptions.weighted && response.object.verdict === 1) {
        // For weighted scoring, we could use confidence if available
        // For now, return the verdict as is
        return response.object.verdict;
      }

      // Binary scoring based on threshold
      return response.object.verdict >= mergedOptions.binaryThreshold ? 1 : 0;
    })
    .reason(({ results }) => {
      const verdict = results.raw.contextPrecisionVerdict as z.infer<
        typeof CONTEXT_PRECISION_SCHEMA
      >;

      if (!verdict) {
        return { reason: "No verdict available" };
      }

      return {
        reason: verdict.reason,
        metadata: { verdict: verdict.verdict },
      };
    })
    .build();
}

// Helper functions

function resolvePayload<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
>(
  context: ContextPrecisionScoreContext<Payload, Params>,
  buildPayload?: (context: ContextPrecisionScoreContext<Payload, Params>) => {
    input: string;
    output: string;
    context: string | string[];
    expected: string;
  },
): { input: string; output: string; context: string | string[]; expected: string } {
  if (buildPayload) {
    return buildPayload(context);
  }

  return {
    input: normalizeText(context.payload.input),
    output: normalizeText(context.payload.output),
    context: normalizeContext(context.payload.context),
    expected: normalizeText((context.payload as any).expected || ""),
  };
}

function normalizeText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "";
  }
  return safeStringify(value);
}

function normalizeContext(value: unknown): string | string[] {
  if (Array.isArray(value)) {
    return value.map((v) => normalizeText(v));
  }
  return normalizeText(value);
}

function mergeMetadata(
  base: Record<string, unknown> | null | undefined,
  additional: Record<string, unknown>,
): Record<string, unknown> {
  return { ...base, ...additional };
}
