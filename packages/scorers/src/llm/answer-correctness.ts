import {
  Agent,
  type AgentModelReference,
  type BuilderScoreContext,
  type LocalScorerDefinition,
  buildScorer,
} from "@voltagent/core";
import { safeStringify } from "@voltagent/internal/utils";
import { z } from "zod";

const ANSWER_CORRECTNESS_PROMPT = `Given a ground truth and an answer, analyze each statement in the answer and classify them in one of the following categories:

- TP (true positive): statements that are present in both the answer and the ground truth,
- FP (false positive): statements present in the answer but not found in the ground truth,
- FN (false negative): relevant statements found in the ground truth but omitted in the answer.

A single statement you must classify in exactly one category. Do not try to interpret the meaning of the ground truth or the answer, just compare the presence of the statements in them.

Your actual task:

question: {{question}}
answer: {{answer}}
ground_truth: {{ground_truth}}`;

const CLASSIFICATION_SCHEMA = z.object({
  TP: z.array(z.string()),
  FP: z.array(z.string()),
  FN: z.array(z.string()),
});

export interface AnswerCorrectnessPayload extends Record<string, unknown> {
  input?: unknown;
  output?: unknown;
  expected?: unknown;
}

export interface AnswerCorrectnessParams extends Record<string, unknown> {}

export interface AnswerCorrectnessOptions {
  factualityWeight?: number;
}

type AnswerCorrectnessScoreContext<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = BuilderScoreContext<Payload, Params>;

export interface AnswerCorrectnessScorerOptions<
  Payload extends Record<string, unknown> = AnswerCorrectnessPayload,
  Params extends Record<string, unknown> = AnswerCorrectnessParams,
> {
  id?: string;
  name?: string;
  model: AgentModelReference;
  options?: AnswerCorrectnessOptions;
  metadata?: Record<string, unknown> | null;
  buildPayload?: (context: AnswerCorrectnessScoreContext<Payload, Params>) => {
    input: string;
    output: string;
    expected: string;
  };
}

type Classification = z.infer<typeof CLASSIFICATION_SCHEMA>;

interface ClassificationResult extends Classification {
  f1Score: number;
}

export function createAnswerCorrectnessScorer<
  Payload extends Record<string, unknown> = AnswerCorrectnessPayload,
  Params extends Record<string, unknown> = AnswerCorrectnessParams,
>({
  id = "answerCorrectness",
  name = "Answer Correctness",
  model,
  options = { factualityWeight: 1.0 },
  metadata,
  buildPayload,
}: AnswerCorrectnessScorerOptions<Payload, Params>): LocalScorerDefinition<Payload, Params> {
  const classifyStep = async (
    context: AnswerCorrectnessScoreContext<Payload, Params>,
  ): Promise<ClassificationResult> => {
    const agent = new Agent({
      name: "answer-correctness-classifier",
      model,
      instructions: "You classify statements for answer correctness evaluation",
    });

    const payload = resolvePayload(context, buildPayload);
    const prompt = ANSWER_CORRECTNESS_PROMPT.replace("{{question}}", payload.input)
      .replace("{{answer}}", payload.output)
      .replace("{{ground_truth}}", payload.expected);

    const response = await agent.generateObject(prompt, CLASSIFICATION_SCHEMA);
    const normalized = normalizeClassification(response.object);

    return {
      ...normalized,
      f1Score: computeF1Score(normalized),
    };
  };

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
    .score(async (context) => {
      const classification = await classifyStep(context);
      context.results.raw.answerCorrectnessClassification = classification;
      return classification.f1Score * (options?.factualityWeight ?? 1.0);
    })
    .reason(({ results }) => {
      const classification = results.raw.answerCorrectnessClassification as ClassificationResult;
      if (!classification) {
        return "Classification data not available";
      }

      const summary = [
        `True Positives: ${classification.TP.length}`,
        `False Positives: ${classification.FP.length}`,
        `False Negatives: ${classification.FN.length}`,
        `F1 Score: ${classification.f1Score.toFixed(3)}`,
      ].join(", ");

      return { reason: summary, metadata: { classification } };
    })
    .build();
}

// Helper functions

function resolvePayload<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
>(
  context: AnswerCorrectnessScoreContext<Payload, Params>,
  buildPayload?: (context: AnswerCorrectnessScoreContext<Payload, Params>) => {
    input: string;
    output: string;
    expected: string;
  },
): { input: string; output: string; expected: string } {
  if (buildPayload) {
    return buildPayload(context);
  }

  return {
    input: normalizeText(context.payload.input),
    output: normalizeText(context.payload.output),
    expected: normalizeText((context.payload as any).expected),
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

function normalizeClassification(classification: Classification): Classification {
  return {
    TP: classification.TP || [],
    FP: classification.FP || [],
    FN: classification.FN || [],
  };
}

function computeF1Score(classification: Classification): number {
  const { TP, FP, FN } = classification;

  if (TP.length === 0 && FP.length === 0) return 0;
  if (TP.length === 0 && FN.length === 0) return 0;

  const precision = TP.length / (TP.length + FP.length);
  const recall = TP.length / (TP.length + FN.length);

  if (precision === 0 && recall === 0) return 0;
  return (2 * (precision * recall)) / (precision + recall);
}

function mergeMetadata(
  base: Record<string, unknown> | null | undefined,
  additional: Record<string, unknown>,
): Record<string, unknown> {
  return { ...base, ...additional };
}
