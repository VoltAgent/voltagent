import {
  type BuilderAnalyzeContext,
  type BuilderPrepareContext,
  type BuilderScoreContext,
  type EmbeddingSimilarityStepResult,
  type LanguageModel,
  type LocalScorerDefinition,
  buildScorer,
  createBuilderPromptStep,
  createEmbeddingSimilarityStep,
} from "@voltagent/core";
import { safeStringify } from "@voltagent/internal/utils";
import { z } from "zod";

type InferredEmbeddingModel = Parameters<
  typeof createEmbeddingSimilarityStep<
    BuilderAnalyzeContext<Record<string, unknown>, Record<string, unknown>>,
    any
  >
>[0]["model"];

const QUESTION_GEN_PROMPT = `Generate a question for the given answer and Identify if answer is noncommittal. Give noncommittal as 1 if the answer is noncommittal and 0 if the answer is committal. A noncommittal answer is one that is evasive, vague, or ambiguous. For example, "I don't know" or "I'm not sure" are noncommittal answers

The output should be a well-formatted JSON instance that conforms to the JSON schema below.

As an example, for the schema {"properties": {"foo": {"title": "Foo", "description": "a list of strings", "type": "array", "items": {"type": "string"}}}, "required": ["foo"]}
the object {"foo": ["bar", "baz"]} is a well-formatted instance of the schema. The object {"properties": {"foo": ["bar", "baz"]}} is not well-formatted.

Here is the output JSON schema:
\`\`\`
{"type": "object", "properties": {"question": {"title": "Question", "type": "string"}, "noncommittal": {"title": "Noncommittal", "type": "integer"}}, "required": ["question", "noncommittal"]}
\`\`\`

Do not return any preamble or explanations, return only a pure JSON string surrounded by triple backticks (\`\`\`).

Examples:

answer: "Albert Einstein was born in Germany."
context: "Albert Einstein was a German-born theoretical physicist who is widely held to be one of the greatest and most influential scientists of all time"
output: \`\`\`{"question": "Where was Albert Einstein born?", "noncommittal": 0}\`\`\`

answer: "It can change its skin color based on the temperature of its environment."
context: "A recent scientific study has discovered a new species of frog in the Amazon rainforest that has the unique ability to change its skin color based on the temperature of its environment."
output: \`\`\`{"question": "What unique ability does the newly discovered species of frog have?", "noncommittal": 0}\`\`\`

answer: "Everest"
context: "The tallest mountain on Earth, measured from sea level, is a renowned peak located in the Himalayas."
output: \`\`\`{"question": "What is the tallest mountain on Earth?", "noncommittal": 0}\`\`\`

answer: "I don't know about the  groundbreaking feature of the smartphone invented in 2023 as am unaware of information beyond 2022. "
context: "In 2023, a groundbreaking invention was announced: a smartphone with a battery life of one month, revolutionizing the way people use mobile technology."
output: \`\`\`{"question": "What was the groundbreaking feature of the smartphone invented in 2023?", "noncommittal": 1}\`\`\`

Your actual task:

answer: {{answer}}
context: {{context}}
output:
`;

const QUESTION_SCHEMA = z.object({
  question: z.string(),
  noncommittal: z.number().int().min(0).max(1),
});

export interface AnswerRelevancyPayload extends Record<string, unknown> {
  input: unknown;
  output: unknown;
  context: unknown;
}

export interface AnswerRelevancyParams extends Record<string, unknown> {
  strictness?: number;
  embeddingExpectedMin?: number;
  embeddingPrefix?: string;
}

export interface GeneratedQuestion {
  question: string;
  noncommittal: boolean;
}

export interface QuestionSimilarityEntry {
  question: string;
  score: number;
  rawScore: number;
  usage: number;
}

interface QuestionPromptValue {
  question: string;
  noncommittal: number;
}

type AnswerRelevancyPrepareContext<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = BuilderPrepareContext<Payload, Params>;

type AnswerRelevancyAnalyzeContext<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = BuilderAnalyzeContext<Payload, Params>;

type AnswerRelevancyScoreContext<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = BuilderScoreContext<Payload, Params>;

type AnswerRelevancySharedContext<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> =
  | AnswerRelevancyPrepareContext<Payload, Params>
  | AnswerRelevancyAnalyzeContext<Payload, Params>
  | AnswerRelevancyScoreContext<Payload, Params>;

export interface AnswerRelevancyScorerOptions<
  Payload extends Record<string, unknown> = AnswerRelevancyPayload,
  Params extends Record<string, unknown> = AnswerRelevancyParams,
> {
  id?: string;
  name?: string;
  model: LanguageModel;
  embeddingModel: InferredEmbeddingModel;
  maxQuestionTokens?: number;
  strictness?: number;
  embeddingExpectedMin?: number;
  embeddingPrefix?: string;
  metadata?: Record<string, unknown> | null;
  buildPayload?: (context: AnswerRelevancySharedContext<Payload, Params>) => {
    input: string;
    output: string;
    context: string;
  };
  questionGenerator?: (
    context: AnswerRelevancyPrepareContext<Payload, Params>,
    iteration: number,
  ) => Promise<GeneratedQuestion>;
  similarityCalculator?: (args: {
    context: AnswerRelevancyAnalyzeContext<Payload, Params>;
    question: GeneratedQuestion;
    index: number;
  }) => Promise<QuestionSimilarityEntry>;
}

type EmbeddingSimilarityResult = QuestionSimilarityEntry;

const DEFAULT_STRICTNESS = 3;
const DEFAULT_EMBEDDING_MIN = 0.7;

export function createAnswerRelevancyScorer<
  Payload extends Record<string, unknown> = AnswerRelevancyPayload,
  Params extends Record<string, unknown> = AnswerRelevancyParams,
>(options: AnswerRelevancyScorerOptions<Payload, Params>): LocalScorerDefinition<Payload, Params> {
  const {
    id = "answerRelevancy",
    name = "Answer Relevancy",
    model,
    embeddingModel,
    strictness: optionStrictness,
    embeddingExpectedMin: optionEmbeddingExpectedMin,
    embeddingPrefix: optionEmbeddingPrefix,
    maxQuestionTokens,
    metadata,
    buildPayload,
    questionGenerator,
    similarityCalculator,
  } = options;

  const resolvePayload = (
    context:
      | AnswerRelevancyPrepareContext<Payload, Params>
      | AnswerRelevancyAnalyzeContext<Payload, Params>
      | AnswerRelevancyScoreContext<Payload, Params>,
  ) => {
    if (buildPayload) {
      return buildPayload(context);
    }
    return {
      input: normalizeText(context.payload.input),
      output: normalizeText(context.payload.output),
      context: normalizeText((context.payload as Record<string, unknown>).context),
    };
  };

  const defaultQuestionStep = createBuilderPromptStep<
    AnswerRelevancyPrepareContext<Payload, Params>,
    QuestionPromptValue,
    GeneratedQuestion
  >({
    model,
    maxOutputTokens: maxQuestionTokens,
    schema: QUESTION_SCHEMA,
    buildPrompt: (context) => {
      const payload = resolvePayload(context);
      return QUESTION_GEN_PROMPT.replace("{{answer}}", payload.output).replace(
        "{{context}}",
        payload.context,
      );
    },
    transform: ({ value }) => ({
      question: value.question,
      noncommittal: value.noncommittal >= 1,
    }),
  });

  const defaultSimilarityStep = (question: string) =>
    createEmbeddingSimilarityStep<
      AnswerRelevancyAnalyzeContext<Payload, Params>,
      EmbeddingSimilarityResult
    >({
      model: embeddingModel,
      normalize: false,
      buildInput: (context) => {
        const payload = resolvePayload(context);
        const { embeddingPrefix } = resolveEmbeddingConfig(context.params, {
          embeddingExpectedMin: optionEmbeddingExpectedMin,
          embeddingPrefix: optionEmbeddingPrefix,
        });
        const prefix = embeddingPrefix ?? "";
        return {
          query: `${prefix}${question}`,
          references: [
            {
              id: "input",
              text: `${prefix}${payload.input}`,
            },
          ],
        };
      },
      transform: ({ items, usage, context }) => {
        const { embeddingExpectedMin = DEFAULT_EMBEDDING_MIN } = resolveEmbeddingConfig(
          context.params,
          {
            embeddingExpectedMin: optionEmbeddingExpectedMin,
            embeddingPrefix: optionEmbeddingPrefix,
          },
        );
        const entry = items[0];
        const rawScore = entry ? entry.score : 0;
        return {
          question,
          rawScore,
          usage,
          score: scaleEmbeddingScore(rawScore, embeddingExpectedMin),
        } satisfies EmbeddingSimilarityResult;
      },
    });

  const generateQuestion = questionGenerator
    ? questionGenerator
    : async (context: AnswerRelevancyPrepareContext<Payload, Params>, _iteration: number) =>
        defaultQuestionStep(context);

  const computeSimilarity = similarityCalculator
    ? similarityCalculator
    : async ({
        context,
        question,
      }: {
        context: AnswerRelevancyAnalyzeContext<Payload, Params>;
        question: GeneratedQuestion;
        index: number;
      }) => {
        const step = defaultSimilarityStep(question.question);
        return step(context);
      };

  return buildScorer<Payload, Params>({
    id,
    label: name,
    metadata: mergeMetadata(metadata, {
      voltAgent: {
        scorer: id,
        category: "answer_relevancy",
      },
    }),
  })
    .prepare(async (context) => {
      const strictness = resolveStrictness(context.params ?? {}, optionStrictness);
      const questions: GeneratedQuestion[] = [];
      for (let index = 0; index < strictness; index += 1) {
        questions.push(await generateQuestion(context, index));
      }
      context.results.raw.answerRelevancyQuestions = questions;
      return questions;
    })
    .analyze(async (context) => {
      const questions = (context.results.prepare as GeneratedQuestion[] | undefined) ?? [];
      if (questions.length === 0) {
        context.results.raw.answerRelevancySimilarity = [];
        return [];
      }
      const similarities: QuestionSimilarityEntry[] = [];
      for (let index = 0; index < questions.length; index += 1) {
        const similarity = await computeSimilarity({ context, question: questions[index], index });
        similarities.push(similarity);
      }
      context.results.raw.answerRelevancySimilarity = similarities;
      return similarities;
    })
    .score(({ results, params }) => {
      const questions = (results.prepare as GeneratedQuestion[] | undefined) ?? [];
      const similarity = (results.analyze as QuestionSimilarityEntry[] | undefined) ?? [];
      const hasNoncommittal = questions.some((q) => q.noncommittal);
      const score = hasNoncommittal
        ? 0
        : similarity.length === 0
          ? 0
          : similarity.reduce((sum, entry) => sum + entry.score, 0) / similarity.length;

      const strictness = resolveStrictness(params ?? {}, optionStrictness);

      return {
        score,
        metadata: {
          strictness,
          questions,
          similarity,
          noncommittal: hasNoncommittal,
        },
      };
    })
    .build();
}

function resolveStrictness(
  params: Record<string, unknown> | null | undefined,
  optionStrictness?: number,
): number {
  const fromParams =
    params && typeof (params as Record<string, unknown>).strictness === "number"
      ? Number((params as Record<string, unknown>).strictness)
      : undefined;
  const value = fromParams ?? optionStrictness ?? DEFAULT_STRICTNESS;
  return value > 0 ? Math.floor(value) : DEFAULT_STRICTNESS;
}

function resolveEmbeddingConfig(
  params: Record<string, unknown> | null | undefined,
  optionConfig: { embeddingExpectedMin?: number; embeddingPrefix?: string },
): {
  embeddingExpectedMin?: number;
  embeddingPrefix?: string;
} {
  const source = params ?? {};
  return {
    embeddingExpectedMin:
      typeof (source as Record<string, unknown>).embeddingExpectedMin === "number"
        ? Number((source as Record<string, unknown>).embeddingExpectedMin)
        : optionConfig.embeddingExpectedMin,
    embeddingPrefix:
      typeof (source as Record<string, unknown>).embeddingPrefix === "string"
        ? String((source as Record<string, unknown>).embeddingPrefix)
        : optionConfig.embeddingPrefix,
  };
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
