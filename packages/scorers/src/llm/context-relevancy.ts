import {
  Agent,
  type BuilderScoreContext,
  type LocalScorerDefinition,
  buildScorer,
} from "@voltagent/core";
import { safeStringify } from "@voltagent/internal/utils";
import type { LanguageModel } from "ai";
import { z } from "zod";

const CONTEXT_RELEVANCY_PROMPT = `Analyze the provided context and identify which parts are relevant to answering the given question. For each context sentence or passage, determine its relevance level.

Examples:

Question: "What is the capital of France?"
Context: "France is a country in Western Europe. Paris is the capital and largest city of France. The Eiffel Tower is located in Paris. France is famous for its wine and cheese."
Analysis:
- "France is a country in Western Europe." - Low relevance (background info)
- "Paris is the capital and largest city of France." - High relevance (directly answers the question)
- "The Eiffel Tower is located in Paris." - Medium relevance (related to Paris)
- "France is famous for its wine and cheese." - None relevance (unrelated to the question)

Your task:

Question: {{question}}
Context: {{context}}

Analyze each part of the context:`;

const CONTEXT_RELEVANCY_SCHEMA = z.object({
  evaluations: z
    .array(
      z.object({
        contextPart: z.string().describe("The specific part of context being evaluated"),
        relevanceLevel: z
          .enum(["high", "medium", "low", "none"])
          .describe("How relevant this part is to the question"),
        reasoning: z.string().describe("Brief explanation for the relevance level"),
      }),
    )
    .describe("Evaluation of each context part"),
});

export interface ContextRelevancyPayload extends Record<string, unknown> {
  input?: unknown;
  context?: unknown;
}

export interface ContextRelevancyParams extends Record<string, unknown> {}

export interface ContextRelevancyEntry extends Record<string, unknown> {
  sentence: string;
  reasons: string[];
}

export interface ContextRelevancyMetadata extends Record<string, unknown> {
  sentences: ContextRelevancyEntry[];
  coverageRatio: number;
}

export interface ContextRelevancyOptions {
  relevanceWeights?: {
    high?: number; // default: 1.0
    medium?: number; // default: 0.7
    low?: number; // default: 0.3
    none?: number; // default: 0.0
  };
  minimumRelevance?: "high" | "medium" | "low" | "none"; // default: "low"
}

type ResolvedContextRelevancyOptions = {
  relevanceWeights: {
    high: number;
    medium: number;
    low: number;
    none: number;
  };
  minimumRelevance: "high" | "medium" | "low" | "none";
};

type ContextRelevancyBuilderContext<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = BuilderScoreContext<Payload, Params>;

export interface ContextRelevancyScorerOptions<
  Payload extends Record<string, unknown> = ContextRelevancyPayload,
  Params extends Record<string, unknown> = ContextRelevancyParams,
> {
  id?: string;
  name?: string;
  model: LanguageModel;
  options?: ContextRelevancyOptions;
  metadata?: Record<string, unknown> | null;
  buildPayload?: (context: ContextRelevancyBuilderContext<Payload, Params>) => {
    input: string;
    context: string | string[];
  };
}

const DEFAULT_OPTIONS: ContextRelevancyOptions = {
  relevanceWeights: {
    high: 1.0,
    medium: 0.7,
    low: 0.3,
    none: 0.0,
  },
  minimumRelevance: "low",
};

export function createContextRelevancyScorer<
  Payload extends Record<string, unknown> = ContextRelevancyPayload,
  Params extends Record<string, unknown> = ContextRelevancyParams,
>({
  id = "contextRelevancy",
  name = "Context Relevancy",
  model,
  options = DEFAULT_OPTIONS,
  metadata,
  buildPayload,
}: ContextRelevancyScorerOptions<Payload, Params>): LocalScorerDefinition<Payload, Params> {
  const defaultWeights = DEFAULT_OPTIONS.relevanceWeights || {};
  const mergedOptions: ResolvedContextRelevancyOptions = {
    minimumRelevance: options?.minimumRelevance || DEFAULT_OPTIONS.minimumRelevance || "low",
    relevanceWeights: {
      high: options?.relevanceWeights?.high ?? defaultWeights.high ?? 1.0,
      medium: options?.relevanceWeights?.medium ?? defaultWeights.medium ?? 0.7,
      low: options?.relevanceWeights?.low ?? defaultWeights.low ?? 0.3,
      none: options?.relevanceWeights?.none ?? defaultWeights.none ?? 0.0,
    },
  };

  return buildScorer<Payload, Params>({
    id,
    label: name,
    metadata: mergeMetadata(metadata, {
      voltAgent: {
        scorer: id,
        category: "context_relevancy",
      },
    }),
  })
    .score(async (context) => {
      const agent = new Agent({
        name: "context-relevancy-evaluator",
        model,
        instructions: "You evaluate how relevant provided context is to answering questions",
      });

      const payload = resolvePayload(context, buildPayload);
      const contextText = Array.isArray(payload.context)
        ? payload.context.join("\n")
        : payload.context;

      const prompt = CONTEXT_RELEVANCY_PROMPT.replace("{{question}}", payload.input).replace(
        "{{context}}",
        contextText,
      );

      const response = await agent.generateObject(prompt, CONTEXT_RELEVANCY_SCHEMA);
      const evaluations = response.object.evaluations;

      context.results.raw.contextRelevancyEvaluations = evaluations;

      if (evaluations.length === 0) {
        return 0;
      }

      // Calculate weighted score based on relevance levels
      const weights = mergedOptions.relevanceWeights;
      const minLevel = mergedOptions.minimumRelevance;

      let totalWeight = 0;
      let relevantCount = 0;

      for (const evaluation of evaluations) {
        const weight = weights[evaluation.relevanceLevel] ?? 0;
        totalWeight += weights.high; // Maximum possible weight

        // Count as relevant if meets minimum threshold
        if (isRelevantEnough(evaluation.relevanceLevel, minLevel)) {
          relevantCount++;
        }

        // Add actual weight to score calculation
        totalWeight = totalWeight - weights.high + weight;
      }

      // Calculate coverage ratio (how many context parts meet minimum relevance)
      const coverageRatio = relevantCount / evaluations.length;

      // Calculate relevance score (weighted average)
      const relevanceScore =
        evaluations.reduce((sum, evaluation) => {
          return sum + (weights[evaluation.relevanceLevel] ?? 0);
        }, 0) / evaluations.length;

      context.results.raw.contextRelevancyCoverage = coverageRatio;
      context.results.raw.contextRelevancyScore = relevanceScore;

      // Return weighted combination of coverage and relevance
      return relevanceScore * 0.7 + coverageRatio * 0.3;
    })
    .reason(({ results }) => {
      const evaluations =
        (results.raw.contextRelevancyEvaluations as z.infer<
          typeof CONTEXT_RELEVANCY_SCHEMA
        >["evaluations"]) || [];
      const coverage = (results.raw.contextRelevancyCoverage as number) || 0;
      const score = (results.raw.contextRelevancyScore as number) || 0;

      if (evaluations.length === 0) {
        return { reason: "No context provided to evaluate" };
      }

      const highRelevance = evaluations.filter((e) => e.relevanceLevel === "high");
      const irrelevant = evaluations.filter((e) => e.relevanceLevel === "none");

      let reason = `Context relevancy: ${(score * 100).toFixed(1)}% relevant. `;
      reason += `${highRelevance.length}/${evaluations.length} high relevance, `;
      reason += `${irrelevant.length}/${evaluations.length} irrelevant.`;

      return {
        reason,
        metadata: {
          coverageRatio: coverage,
          relevanceScore: score,
          evaluationCount: evaluations.length,
          highRelevanceCount: highRelevance.length,
          irrelevantCount: irrelevant.length,
        },
      };
    })
    .build();
}

// Helper functions

function resolvePayload<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
>(
  context: ContextRelevancyBuilderContext<Payload, Params>,
  buildPayload?: (context: ContextRelevancyBuilderContext<Payload, Params>) => {
    input: string;
    context: string | string[];
  },
): { input: string; context: string | string[] } {
  if (buildPayload) {
    return buildPayload(context);
  }

  return {
    input: normalizeText(context.payload.input),
    context: normalizeContext(context.payload.context),
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

function isRelevantEnough(
  level: "high" | "medium" | "low" | "none",
  minimum: "high" | "medium" | "low" | "none",
): boolean {
  const order = { none: 0, low: 1, medium: 2, high: 3 };
  return order[level] >= order[minimum];
}

function mergeMetadata(
  base: Record<string, unknown> | null | undefined,
  additional: Record<string, unknown>,
): Record<string, unknown> {
  return { ...base, ...additional };
}
