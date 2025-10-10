import { safeStringify } from "@voltagent/internal/utils";
import type { LanguageModel } from "ai";
import { generateText } from "ai";

import type { LocalScorerDefinition } from "../runtime";

type DefaultPayload = Record<string, unknown>;

export interface LlmJudgeScorerParams extends Record<string, unknown> {
  /** Optional criteria appended to the default judging instructions. */
  criteria?: string;
}

export interface CreateLlmJudgeScorerOptions {
  /** Unique identifier for the scorer (defaults to the provided name or `llm-judge`). */
  id?: string;
  /** Human readable name for the scorer. */
  name?: string;
  /** Model used to perform the judgment. */
  model: LanguageModel;
  /**
   * Base instructions describing how the judge should evaluate the assistant response.
   * The runtime will append the question/answer pair and criteria automatically.
   */
  instructions: string;
  /** Maximum number of tokens returned by the judge response. Defaults to 200. */
  maxOutputTokens?: number;
}

export function createLLMJudgeScorer<Payload extends DefaultPayload = DefaultPayload>(
  options: CreateLlmJudgeScorerOptions,
): LocalScorerDefinition<Payload, LlmJudgeScorerParams> {
  const { id, name, model, instructions, maxOutputTokens = 200 } = options;

  const scorerId = id ?? name ?? "llm-judge";
  const scorerName = name ?? scorerId;

  return {
    id: scorerId,
    name: scorerName,
    metadata: {
      voltAgent: {
        scorer: scorerId,
      },
    },
    scorer: async ({ payload, params }) => {
      const question = stringify(payload.input);
      const answer = stringify(payload.output);
      const criteria = params.criteria ? params.criteria.trim() : "";

      const prompt = buildPrompt({ instructions, criteria, question, answer });

      try {
        const { text } = await generateText({
          model,
          prompt,
          maxOutputTokens,
        });

        const parsed = parseJudgeResponse(text);
        if (!parsed) {
          return {
            status: "error",
            score: null,
            metadata: {
              raw: text.trim(),
              voltAgent: {
                scorer: scorerId,
              },
            },
            error: new Error("Judge response was not valid JSON"),
          };
        }

        return {
          status: "success",
          score: parsed.score,
          metadata: {
            reason: parsed.reason,
            raw: text.trim(),
            voltAgent: {
              scorer: scorerId,
            },
          },
        };
      } catch (error) {
        return {
          status: "error",
          score: null,
          metadata: {
            voltAgent: {
              scorer: scorerId,
            },
          },
          error,
        };
      }
    },
  } satisfies LocalScorerDefinition<Payload, LlmJudgeScorerParams>;
}

function buildPrompt(args: {
  instructions: string;
  criteria: string;
  question: string;
  answer: string;
}): string {
  const { instructions, criteria, question, answer } = args;
  const criteriaBlock = criteria ? `\nAdditional criteria:\n${criteria}` : "";

  return `You are a strict evaluator. Output JSON like {"score":0.82,"reason":"..."}.\nThe score must be between 0 and 1.\nYour goal: ${instructions}${criteriaBlock}\n\nQuestion:\n${question}\n\nAssistant Response:\n${answer}`;
}

function parseJudgeResponse(text: string): { score: number; reason: string } | null {
  const trimmed = text.trim();
  try {
    const parsed = JSON.parse(trimmed) as unknown;

    if (typeof parsed === "number") {
      const score = clamp(parsed);
      if (Number.isNaN(score)) {
        return null;
      }
      return {
        score,
        reason: "",
      };
    }

    if (parsed && typeof parsed === "object") {
      const record = parsed as { score?: number; reason?: string };
      const score = clamp(record.score ?? Number.NaN);
      if (Number.isNaN(score)) {
        return null;
      }
      return {
        score,
        reason: record.reason ?? "",
      };
    }

    return null;
  } catch {
    const numeric = clamp(Number.parseFloat(trimmed));
    if (Number.isNaN(numeric)) {
      return null;
    }
    return {
      score: numeric,
      reason: "Judge returned a bare score",
    };
  }
}

function clamp(value: number): number {
  if (Number.isNaN(value)) {
    return Number.NaN;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

function stringify(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "";
  }
  try {
    return typeof value === "object" ? safeStringify(value) : String(value);
  } catch {
    return String(value);
  }
}
