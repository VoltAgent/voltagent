import {
  type BuilderAnalyzeContext,
  type BuilderScoreContext,
  type LanguageModel,
  type LocalScorerDefinition,
  buildScorer,
  createBuilderPromptStep,
  createEmbeddingSimilarityStep,
} from "@voltagent/core";
import { safeStringify } from "@voltagent/internal/utils";
import { z } from "zod";

const ANSWER_CORRECTNESS_PROMPT = `Given a ground truth and an answer, analyze each statement in the answer and classify them in one of the following categories:

- TP (true positive): statements that are present in both the answer and the ground truth,
- FP (false positive): statements present in the answer but not found in the ground truth,
- FN (false negative): relevant statements found in the ground truth but omitted in the answer.

A single statement you must classify in exactly one category. Do not try to interpret the meaning of the ground truth or the answer, just compare the presence of the statements in them.

The output should be a well-formatted JSON instance that conforms to the JSON schema below.

As an example, for the schema {"properties": {"foo": {"title": "Foo", "description": "a list of strings", "type": "array", "items": {"type": "string"}}}, "required": ["foo"]}
the object {"foo": ["bar", "baz"]} is a well-formatted instance of the schema. The object {"properties": {"foo": ["bar", "baz"]}} is not well-formatted.

Here is the output JSON schema:
\`\`\`
{"type": "object", "properties": {"TP": {"title": "Tp", "type": "array", "items": {"type": "string"}}, "FP": {"title": "Fp", "type": "array", "items": {"type": "string"}}, "FN": {"title": "Fn", "type": "array", "items": {"type": "string"}}}, "required": ["TP", "FP", "FN"]}
\`\`\`

Do not return any preamble or explanations, return only a pure JSON string surrounded by triple backticks (\`\`\`).

Your actual task:

question: {{question}}
answer: {{answer}}
ground_truth: {{ground_truth}}
extracted_statements:
`;

const CLASSIFICATION_SCHEMA = z.object({
  TP: z.array(z.string()),
  FP: z.array(z.string()),
  FN: z.array(z.string()),
});

export interface AnswerCorrectnessPayload extends Record<string, unknown> {
  input: unknown;
  output: unknown;
  expected: unknown;
}

export interface AnswerCorrectnessParams extends Record<string, unknown> {
  factualityWeight?: number;
  answerSimilarityWeight?: number;
  embeddingExpectedMin?: number;
  embeddingPrefix?: string;
}

type InferredEmbeddingModel = Parameters<
  typeof createEmbeddingSimilarityStep<
    BuilderAnalyzeContext<Record<string, unknown>, Record<string, unknown>>,
    any
  >
>[0]["model"];

type AnswerCorrectnessScoreContext<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = BuilderScoreContext<Payload, Params>;

type AnswerCorrectnessAnalyzeContext<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = BuilderAnalyzeContext<Payload, Params>;

export interface AnswerCorrectnessScorerOptions<
  Payload extends Record<string, unknown> = AnswerCorrectnessPayload,
  Params extends Record<string, unknown> = AnswerCorrectnessParams,
> {
  id?: string;
  name?: string;
  model: LanguageModel;
  embeddingModel: InferredEmbeddingModel;
  maxOutputTokens?: number;
  metadata?: Record<string, unknown> | null;
  buildPayload?: (
    context:
      | AnswerCorrectnessScoreContext<Payload, Params>
      | AnswerCorrectnessAnalyzeContext<Payload, Params>,
  ) => {
    input: string;
    output: string;
    expected: string;
  };
  classifyWith?: (
    context: AnswerCorrectnessScoreContext<Payload, Params>,
  ) => Promise<ClassificationResult>;
  similarityWith?: (
    context: AnswerCorrectnessAnalyzeContext<Payload, Params>,
  ) => Promise<AnswerSimilarityResult>;
}

type Classification = z.infer<typeof CLASSIFICATION_SCHEMA>;

interface ClassificationResult extends Classification {
  f1Score: number;
}

interface AnswerSimilarityResult {
  score: number;
  rawScore: number;
  usage: number;
}

const DEFAULT_FACTUALITY_WEIGHT = 0.75;
const DEFAULT_SIMILARITY_WEIGHT = 0.25;
const DEFAULT_EMBEDDING_MIN = 0.7;

export function createAnswerCorrectnessScorer<
  Payload extends Record<string, unknown> = AnswerCorrectnessPayload,
  Params extends Record<string, unknown> = AnswerCorrectnessParams,
>(
  options: AnswerCorrectnessScorerOptions<Payload, Params>,
): LocalScorerDefinition<Payload, Params> {
  const {
    id = "answerCorrectness",
    name = "Answer Correctness",
    model,
    embeddingModel,
    maxOutputTokens,
    metadata,
    buildPayload,
  } = options;

  const classifyOverride = options.classifyWith;
  const similarityOverride = options.similarityWith;

  const classifyStep = createBuilderPromptStep<
    AnswerCorrectnessScoreContext<Payload, Params>,
    Classification,
    ClassificationResult
  >({
    model,
    maxOutputTokens,
    buildPrompt: (context) => {
      const payload = resolvePayload(context, buildPayload);
      return ANSWER_CORRECTNESS_PROMPT.replace("{{question}}", payload.input)
        .replace("{{answer}}", payload.output)
        .replace("{{ground_truth}}", payload.expected);
    },
    schema: CLASSIFICATION_SCHEMA,
    transform: ({ value }) => {
      const normalized = normalizeClassification(value);
      return {
        ...normalized,
        f1Score: computeF1Score(normalized),
      } satisfies ClassificationResult;
    },
  });

  const similarityStep = createEmbeddingSimilarityStep<
    AnswerCorrectnessAnalyzeContext<Payload, Params>,
    AnswerSimilarityResult
  >({
    model: embeddingModel,
    normalize: false,
    buildInput: (context) => {
      const payload = resolvePayload(context, buildPayload);
      const { embeddingPrefix } = resolveWeights(context.params);
      const prefix = embeddingPrefix ?? "";
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
    transform: ({ items, usage, context }) => {
      const { embeddingExpectedMin = DEFAULT_EMBEDDING_MIN } = resolveWeights(context.params);
      const first = items[0];
      const rawScore = first ? first.score : 0;
      return {
        score: scaleEmbeddingScore(rawScore, embeddingExpectedMin),
        rawScore,
        usage,
      } satisfies AnswerSimilarityResult;
    },
  });

  return buildScorer<Payload, Params>({
    id,
    label: name,
    metadata: mergeMetadata(metadata, {
      voltAgent: {
        scorer: id,
        category: "answer_correctness",
      },
    }),
  })
    .analyze(
      similarityOverride
        ? async (context) => {
            const { answerSimilarityWeight } = resolveWeights(context.params ?? {});
            if (answerSimilarityWeight === 0) {
              context.results.raw.answerCorrectnessSimilarity = null;
              return null;
            }
            const similarity = await similarityOverride(
              context as AnswerCorrectnessAnalyzeContext<Payload, Params>,
            );
            context.results.raw.answerCorrectnessSimilarity = similarity;
            return similarity;
          }
        : async (context) => {
            const { answerSimilarityWeight } = resolveWeights(context.params ?? {});
            if (answerSimilarityWeight === 0) {
              context.results.raw.answerCorrectnessSimilarity = null;
              return null;
            }
            const similarity = await similarityStep(
              context as AnswerCorrectnessAnalyzeContext<Payload, Params>,
            );
            context.results.raw.answerCorrectnessSimilarity = similarity;
            return similarity;
          },
    )
    .score(async (context) => {
      const classification = classifyOverride
        ? await classifyOverride(context)
        : await classifyStep(context);

      context.results.raw.answerCorrectnessClassification = classification;

      const { factualityWeight, answerSimilarityWeight } = resolveWeights(context.params ?? {});
      if (factualityWeight === 0 && answerSimilarityWeight === 0) {
        throw new Error(
          "At least one of factualityWeight or answerSimilarityWeight must be non-zero",
        );
      }

      const similarity =
        answerSimilarityWeight === 0
          ? null
          : ((context.results.raw.answerCorrectnessSimilarity as
              | AnswerSimilarityResult
              | null
              | undefined) ?? null);

      const numerator =
        factualityWeight * classification.f1Score +
        (similarity ? answerSimilarityWeight * similarity.score : 0);
      const denominator =
        factualityWeight + (answerSimilarityWeight === 0 ? 0 : answerSimilarityWeight);
      const score = denominator === 0 ? classification.f1Score : numerator / denominator;

      return {
        score,
        metadata: {
          factuality: {
            truePositive: classification.TP,
            falsePositive: classification.FP,
            falseNegative: classification.FN,
            f1Score: classification.f1Score,
          },
          similarity: similarity
            ? {
                score: similarity.score,
                rawScore: similarity.rawScore,
                usage: similarity.usage,
              }
            : null,
          weights: {
            factuality: factualityWeight,
            similarity: answerSimilarityWeight,
          },
        },
      };
    })
    .build();
}

function resolvePayload<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
>(
  context:
    | AnswerCorrectnessScoreContext<Payload, Params>
    | AnswerCorrectnessAnalyzeContext<Payload, Params>,
  buildPayload?: AnswerCorrectnessScorerOptions<Payload, Params>["buildPayload"],
) {
  if (buildPayload) {
    return buildPayload(context);
  }

  const input = normalizeText(context.payload.input);
  const output = normalizeText((context.payload as Record<string, unknown>).output);
  const expected = normalizeText((context.payload as Record<string, unknown>).expected);

  return { input, output, expected };
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

function computeF1Score(classification: Classification): number {
  const tp = classification.TP.length;
  const fp = classification.FP.length;
  const fn = classification.FN.length;
  const denominator = tp + 0.5 * (fp + fn);
  return denominator === 0 ? 0 : tp / denominator;
}

function normalizeClassification(classification: Classification): Classification {
  return {
    TP: classification.TP ?? [],
    FP: classification.FP ?? [],
    FN: classification.FN ?? [],
  } satisfies Classification;
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

interface Weights {
  factualityWeight: number;
  answerSimilarityWeight: number;
  embeddingExpectedMin?: number;
  embeddingPrefix?: string;
}

function resolveWeights(params: Record<string, unknown>): Weights {
  const factualityWeight = coerceNumber(params.factualityWeight, DEFAULT_FACTUALITY_WEIGHT);
  const answerSimilarityWeight = coerceNumber(
    params.answerSimilarityWeight,
    DEFAULT_SIMILARITY_WEIGHT,
  );
  if (factualityWeight < 0 || answerSimilarityWeight < 0) {
    throw new Error("Answer correctness weights must be non-negative");
  }
  return {
    factualityWeight,
    answerSimilarityWeight,
    embeddingExpectedMin: coerceNumber(params.embeddingExpectedMin, DEFAULT_EMBEDDING_MIN),
    embeddingPrefix:
      typeof params.embeddingPrefix === "string" ? params.embeddingPrefix : undefined,
  } satisfies Weights;
}

function coerceNumber(value: unknown, fallback: number): number {
  if (value === null || value === undefined) {
    return fallback;
  }
  const numeric = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(numeric) ? numeric : fallback;
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
