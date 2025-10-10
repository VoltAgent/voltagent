import {
  type BuilderAnalyzeContext,
  type BuilderScoreContext,
  type EmbeddingSimilarityStepResult,
  type LocalScorerDefinition,
  buildScorer,
  createEmbeddingSimilarityStep,
} from "@voltagent/core";
import { safeStringify } from "@voltagent/internal/utils";

const DEFAULT_EXPECTED_MIN = 0.7;

type InferredEmbeddingModel = Parameters<
  typeof createEmbeddingSimilarityStep<
    BuilderAnalyzeContext<Record<string, unknown>, Record<string, unknown>>,
    any
  >
>[0]["model"];

export interface AnswerSimilarityPayload extends Record<string, unknown> {
  output: unknown;
  expected: unknown;
}

export interface AnswerSimilarityParams extends Record<string, unknown> {
  embeddingExpectedMin?: number;
  embeddingPrefix?: string;
}

export interface AnswerSimilarityMetadata {
  score: number;
  rawScore: number;
  usage: number;
}

export interface AnswerSimilarityScorerOptions<
  Payload extends Record<string, unknown> = AnswerSimilarityPayload,
  Params extends Record<string, unknown> = AnswerSimilarityParams,
> {
  id?: string;
  name?: string;
  embeddingModel: InferredEmbeddingModel;
  metadata?: Record<string, unknown> | null;
  embeddingExpectedMin?: number;
  embeddingPrefix?: string;
  buildPayload?: (
    context:
      | AnswerSimilarityAnalyzeContext<Payload, Params>
      | AnswerSimilarityScoreContext<Payload, Params>,
  ) => {
    output: string;
    expected: string;
  };
  similarityWith?: (
    context: AnswerSimilarityAnalyzeContext<Payload, Params>,
  ) => Promise<AnswerSimilarityMetadata>;
}

type AnswerSimilarityAnalyzeContext<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = BuilderAnalyzeContext<Payload, Params>;

type AnswerSimilarityScoreContext<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = BuilderScoreContext<Payload, Params>;

export function createAnswerSimilarityScorer<
  Payload extends Record<string, unknown> = AnswerSimilarityPayload,
  Params extends Record<string, unknown> = AnswerSimilarityParams,
>(options: AnswerSimilarityScorerOptions<Payload, Params>): LocalScorerDefinition<Payload, Params> {
  const {
    id = "answerSimilarity",
    name = "Answer Similarity",
    embeddingModel,
    embeddingExpectedMin,
    embeddingPrefix,
    metadata,
    buildPayload,
    similarityWith,
  } = options;

  const resolvePayload = (
    context:
      | AnswerSimilarityAnalyzeContext<Payload, Params>
      | AnswerSimilarityScoreContext<Payload, Params>,
  ) => {
    if (buildPayload) {
      return buildPayload(context);
    }
    return {
      output: normalizeText(context.payload.output),
      expected: normalizeText((context.payload as Record<string, unknown>).expected),
    };
  };

  const similarityStep = createEmbeddingSimilarityStep<
    AnswerSimilarityAnalyzeContext<Payload, Params>,
    AnswerSimilarityMetadata
  >({
    model: embeddingModel,
    normalize: false,
    buildInput: (context) => {
      const payload = resolvePayload(context);
      const prefix = parsePrefix(context.params, embeddingPrefix);
      return {
        query: `${prefix}${payload.output}`,
        references: [
          {
            id: "expected",
            text: `${prefix}${payload.expected}`,
          },
        ],
      };
    },
    transform: ({ context, items, usage }) => {
      const expectedMin = parseExpectedMin(context.params, embeddingExpectedMin);
      const entry = items[0];
      const rawScore = entry ? entry.score : 0;
      return {
        score: scaleEmbeddingScore(rawScore, expectedMin),
        rawScore,
        usage,
      } satisfies AnswerSimilarityMetadata;
    },
  });

  return buildScorer<Payload, Params>({
    id,
    label: name,
    metadata: mergeMetadata(metadata, {
      voltAgent: {
        scorer: id,
        category: "answer_similarity",
      },
    }),
  })
    .analyze(
      similarityWith
        ? async (context) => {
            const similarity = await similarityWith(
              context as AnswerSimilarityAnalyzeContext<Payload, Params>,
            );
            context.results.raw.answerSimilarity = similarity;
            return similarity;
          }
        : async (context) => {
            const similarity = await similarityStep(
              context as AnswerSimilarityAnalyzeContext<Payload, Params>,
            );
            context.results.raw.answerSimilarity = similarity;
            return similarity;
          },
    )
    .score(({ results }) => {
      const similarity = (results.analyze as AnswerSimilarityMetadata | null | undefined) ?? null;
      if (!similarity) {
        return {
          score: 0,
          metadata: {
            similarity: null,
          },
        };
      }
      return {
        score: similarity.score,
        metadata: {
          similarity,
        },
      };
    })
    .build();
}

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  return safeStringify(value);
}

function parseExpectedMin(params: Record<string, unknown> | undefined, option?: number): number {
  const candidate =
    params && typeof params.embeddingExpectedMin === "number"
      ? params.embeddingExpectedMin
      : (option ?? DEFAULT_EXPECTED_MIN);
  return typeof candidate === "number" ? candidate : DEFAULT_EXPECTED_MIN;
}

function parsePrefix(params: Record<string, unknown> | undefined, option?: string): string {
  const candidate =
    params && typeof params.embeddingPrefix === "string" ? params.embeddingPrefix : option;
  return candidate ?? "";
}

function scaleEmbeddingScore(score: number, expectedMin: number): number {
  if (Number.isNaN(score) || !Number.isFinite(score)) {
    return 0;
  }
  const clampedExpected = Math.min(Math.max(expectedMin, -1), 1);
  const numerator = score - clampedExpected;
  const denominator = 1 - clampedExpected;
  if (denominator <= 0) {
    return Math.max(Math.min(score, 1), 0);
  }
  return Math.min(Math.max(numerator / denominator, 0), 1);
}

function mergeMetadata(
  primary: Record<string, unknown> | null | undefined,
  secondary: Record<string, unknown>,
): Record<string, unknown> | null {
  if (!primary) {
    return secondary;
  }
  return { ...secondary, ...primary };
}
