import {
  Agent,
  type AgentModelReference,
  type BuilderPrepareContext,
  type BuilderScoreContext,
  type LocalScorerDefinition,
  buildScorer,
} from "@voltagent/core";
import { safeStringify } from "@voltagent/internal/utils";
import { z } from "zod";

const QUESTION_GEN_PROMPT = `Generate a question for the given answer and Identify if answer is noncommittal. Give noncommittal as 1 if the answer is noncommittal and 0 if the answer is committal. A noncommittal answer is one that is evasive, vague, or ambiguous. For example, "I don't know" or "I'm not sure" are noncommittal answers

Examples:

answer: "Albert Einstein was born in Germany."
context: "Albert Einstein was a German-born theoretical physicist who is widely held to be one of the greatest and most influential scientists of all time"
output: {"question": "Where was Albert Einstein born?", "noncommittal": 0}

answer: "It can change its skin color based on the temperature of its environment."
context: "A recent scientific study has discovered a new species of frog in the Amazon rainforest that has the unique ability to change its skin color based on the temperature of its environment."
output: {"question": "What unique ability does the newly discovered species of frog have?", "noncommittal": 0}

answer: "Everest"
context: "The tallest mountain on Earth, measured from sea level, is a renowned peak located in the Himalayas."
output: {"question": "What is the tallest mountain on Earth?", "noncommittal": 0}

answer: "I don't know about the  groundbreaking feature of the smartphone invented in 2023 as am unaware of information beyond 2022. "
context: "In 2023, a groundbreaking invention was announced: a smartphone with a battery life of one month, revolutionizing the way people use mobile technology."
output: {"question": "What was the groundbreaking feature of the smartphone invented in 2023?", "noncommittal": 1}

Your actual task:

answer: {{answer}}
context: {{context}}`;

const QUESTION_SCHEMA = z.object({
  question: z.string(),
  noncommittal: z.number().int().min(0).max(1),
});

export interface AnswerRelevancyPayload extends Record<string, unknown> {
  input?: unknown;
  output?: unknown;
  context?: unknown;
}

export interface AnswerRelevancyParams extends Record<string, unknown> {}

export interface AnswerRelevancyOptions {
  strictness?: number;
  uncertaintyWeight?: number;
  noncommittalThreshold?: number;
}

export interface GeneratedQuestion {
  question: string;
  noncommittal: boolean;
}

type AnswerRelevancyPrepareContext<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = BuilderPrepareContext<Payload, Params>;

type AnswerRelevancyScoreContext<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = BuilderScoreContext<Payload, Params>;

type AnswerRelevancySharedContext<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = AnswerRelevancyPrepareContext<Payload, Params> | AnswerRelevancyScoreContext<Payload, Params>;

export interface AnswerRelevancyScorerOptions<
  Payload extends Record<string, unknown> = AnswerRelevancyPayload,
  Params extends Record<string, unknown> = AnswerRelevancyParams,
> {
  id?: string;
  name?: string;
  model: AgentModelReference;
  options?: AnswerRelevancyOptions;
  metadata?: Record<string, unknown> | null;
  buildPayload?: (context: AnswerRelevancySharedContext<Payload, Params>) => {
    input: string;
    output: string;
    context: string;
  };
}

const DEFAULT_OPTIONS: AnswerRelevancyOptions = {
  strictness: 3,
  uncertaintyWeight: 0.3,
  noncommittalThreshold: 0.5,
};

export function createAnswerRelevancyScorer<
  Payload extends Record<string, unknown> = AnswerRelevancyPayload,
  Params extends Record<string, unknown> = AnswerRelevancyParams,
>({
  id = "answerRelevancy",
  name = "Answer Relevancy",
  model,
  options = DEFAULT_OPTIONS,
  metadata,
  buildPayload,
}: AnswerRelevancyScorerOptions<Payload, Params>): LocalScorerDefinition<Payload, Params> {
  const mergedOptions: Required<AnswerRelevancyOptions> = {
    strictness: options?.strictness ?? DEFAULT_OPTIONS.strictness ?? 3,
    uncertaintyWeight: options?.uncertaintyWeight ?? DEFAULT_OPTIONS.uncertaintyWeight ?? 0.3,
    noncommittalThreshold:
      options?.noncommittalThreshold ?? DEFAULT_OPTIONS.noncommittalThreshold ?? 0.5,
  };

  const generateQuestions = async (
    context: AnswerRelevancyPrepareContext<Payload, Params>,
  ): Promise<GeneratedQuestion[]> => {
    const agent = new Agent({
      name: "question-generator",
      model,
      instructions: "You generate questions from answers to evaluate relevancy",
    });

    const payload = resolvePayload(context, buildPayload);
    const questions: GeneratedQuestion[] = [];

    for (let i = 0; i < mergedOptions.strictness; i++) {
      const prompt = QUESTION_GEN_PROMPT.replace("{{answer}}", payload.output).replace(
        "{{context}}",
        payload.context,
      );

      const response = await agent.generateObject(prompt, QUESTION_SCHEMA);
      questions.push({
        question: response.object.question,
        noncommittal: response.object.noncommittal === 1,
      });
    }

    return questions;
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
      const questions = await generateQuestions(context);
      return {
        questions,
        strictness: mergedOptions.strictness,
      };
    })
    .score(async (context) => {
      const { questions } = context.results.prepare as {
        questions: GeneratedQuestion[];
        strictness: number;
      };
      const payload = resolvePayload(context, buildPayload);

      // Check for noncommittal answers
      const noncommittalCount = questions.filter((q: GeneratedQuestion) => q.noncommittal).length;
      const noncommittalRatio = noncommittalCount / questions.length;

      if (noncommittalRatio > mergedOptions.noncommittalThreshold) {
        context.results.raw.answerRelevancyNoncommittal = true;
        return 0;
      }

      // Calculate relevancy score
      let relevancyScore = 0;
      const inputLower = normalizeText(payload.input).toLowerCase();

      for (const question of questions) {
        const questionLower = question.question.toLowerCase();

        // Check if generated question relates to original input
        if (calculateSimilarity(questionLower, inputLower) > 0.5) {
          relevancyScore += 1;
        } else if (calculateSimilarity(questionLower, inputLower) > 0.3) {
          relevancyScore += mergedOptions.uncertaintyWeight;
        }
      }

      const finalScore = relevancyScore / questions.length;

      // Store results for reason step
      context.results.raw.answerRelevancyQuestions = questions;
      context.results.raw.answerRelevancyScore = finalScore;

      return finalScore;
    })
    .reason(({ results }) => {
      const questions = results.raw.answerRelevancyQuestions as GeneratedQuestion[];
      const score = results.raw.answerRelevancyScore as number;
      const noncommittal = results.raw.answerRelevancyNoncommittal as boolean;

      if (noncommittal) {
        return {
          reason: "Answer is noncommittal",
          metadata: { noncommittal: true, questions },
        };
      }

      return {
        reason: `Generated ${questions.length} questions with relevancy score ${score.toFixed(2)}`,
        metadata: {
          questions,
          score,
          strictness: mergedOptions.strictness,
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
  context: AnswerRelevancySharedContext<Payload, Params>,
  buildPayload?: (context: AnswerRelevancySharedContext<Payload, Params>) => {
    input: string;
    output: string;
    context: string;
  },
): { input: string; output: string; context: string } {
  if (buildPayload) {
    return buildPayload(context);
  }

  return {
    input: normalizeText(context.payload.input),
    output: normalizeText(context.payload.output),
    context: normalizeText((context.payload as any).context || ""),
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

function calculateSimilarity(text1: string, text2: string): number {
  // Simple word overlap similarity
  const words1 = new Set(text1.split(/\s+/));
  const words2 = new Set(text2.split(/\s+/));

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

function mergeMetadata(
  base: Record<string, unknown> | null | undefined,
  additional: Record<string, unknown>,
): Record<string, unknown> {
  return { ...base, ...additional };
}
