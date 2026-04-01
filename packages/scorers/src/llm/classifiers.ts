import {
  Agent,
  type AgentModelReference,
  type BuilderScoreContext,
  type LocalScorerDefinition,
  buildScorer,
} from "@voltagent/core";
import { safeStringify } from "@voltagent/internal/utils";
import { z } from "zod";

type ChoiceId = string;

type ChoiceDefinition = {
  score: number;
  description: string;
};

type ChoiceAnalysis = {
  choice: ChoiceId;
  score: number;
  reason?: string;
  raw: unknown;
  definition: ChoiceDefinition;
};

type ErrorWithMetadata = Error & { metadata?: Record<string, unknown> };

const CHOICE_RESPONSE_SCHEMA = z.object({
  choice: z.string(),
  reason: z.string().nullable(),
});

function parseChoiceResponse(text: string): { choice: ChoiceId; reason?: string } {
  const trimmed = text.trim();

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown> | string;
    if (typeof parsed === "string") {
      return { choice: parsed.trim().toUpperCase() };
    }
    if (parsed && typeof parsed === "object") {
      const rawChoice = (parsed.choice ?? parsed.result ?? parsed.answer) as unknown;
      const rawReason = parsed.reason ?? parsed.explanation ?? parsed.reasons;
      if (typeof rawChoice === "string") {
        return {
          choice: rawChoice.trim().toUpperCase(),
          reason: typeof rawReason === "string" ? rawReason.trim() : undefined,
        };
      }
    }
  } catch {
    // fall through to heuristic
  }

  const match = trimmed.match(/[A-Z]/);
  if (match) {
    return { choice: match[0] };
  }

  const error = new Error("LLM response did not include a valid choice") as ErrorWithMetadata;
  error.metadata = { raw: trimmed };
  throw error;
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

interface EvaluateChoiceArgs {
  context: BuilderScoreContext<Record<string, unknown>, Record<string, unknown>>;
  model: AgentModelReference;
  buildPrompt: (
    context: BuilderScoreContext<Record<string, unknown>, Record<string, unknown>>,
  ) => string | Promise<string>;
  choices: Record<ChoiceId, ChoiceDefinition>;
  maxOutputTokens?: number;
  scorerId: string;
  judgeInstructions?: string;
}

async function evaluateChoice(args: EvaluateChoiceArgs): Promise<ChoiceAnalysis> {
  const { context, model, buildPrompt, choices, maxOutputTokens, scorerId, judgeInstructions } =
    args;

  const prompt = await buildPrompt(context);

  const agent = new Agent({
    name: `${scorerId}-judge`,
    model,
    instructions: judgeInstructions ?? buildDefaultChoiceInstructions(Object.keys(choices)),
  });

  const response = await agent.generateObject(prompt, CHOICE_RESPONSE_SCHEMA, {
    maxOutputTokens,
  });

  const { choice, reason } = extractChoiceFromResponse(response.object, choices, scorerId);
  const definition = choices[choice];

  return {
    choice,
    reason,
    raw: response.object,
    score: definition.score,
    definition,
  } satisfies ChoiceAnalysis;
}

function buildDefaultChoiceInstructions(choiceIds: string[]): string {
  const formatted = choiceIds.join(", ");
  return [
    "You are an impartial evaluator.",
    `Respond strictly with JSON in the shape {"choice":"<id>","reason":"..."} where <id> is one of [${formatted}].`,
    "Provide a concise reason; use null when a reason is not applicable.",
  ].join(" ");
}

function extractChoiceFromResponse(
  raw: unknown,
  choices: Record<ChoiceId, ChoiceDefinition>,
  scorerId: string,
): { choice: ChoiceId; reason?: string } {
  const parsed = CHOICE_RESPONSE_SCHEMA.safeParse(raw);
  if (parsed.success) {
    const choice = normalizeChoiceValue(parsed.data.choice, choices, scorerId, raw);
    const reason = parsed.data.reason ? parsed.data.reason.trim() || undefined : undefined;
    return { choice, reason };
  }

  const fallback = parseChoiceResponse(safeStringify(raw));
  const choice = normalizeChoiceValue(fallback.choice, choices, scorerId, raw);
  const reason = fallback.reason ? fallback.reason.trim() : undefined;
  return { choice, reason };
}

function normalizeChoiceValue(
  rawChoice: string,
  choices: Record<ChoiceId, ChoiceDefinition>,
  scorerId: string,
  raw: unknown,
): ChoiceId {
  const normalized = rawChoice.trim().toUpperCase();
  if (!choices[normalized]) {
    const error = new Error(
      `LLM choice '${normalized}' was not recognized for scorer ${scorerId}`,
    ) as ErrorWithMetadata;
    error.metadata = {
      raw,
      allowedChoices: Object.keys(choices),
    };
    throw error;
  }
  return normalized as ChoiceId;
}

function getChoiceAnalysis(
  rawResults: Record<string, unknown>,
  key: string,
): (ChoiceAnalysis & { definition: ChoiceDefinition }) | undefined {
  const value = rawResults[key];
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const choice = typeof record.choice === "string" ? (record.choice as ChoiceId) : undefined;
  const definition =
    record.definition && typeof record.definition === "object"
      ? (record.definition as ChoiceDefinition)
      : undefined;
  const score = typeof record.score === "number" ? record.score : definition?.score;
  if (!choice || !definition || typeof score !== "number") {
    return undefined;
  }
  return {
    choice,
    definition,
    score,
    reason: typeof record.reason === "string" ? record.reason : undefined,
    raw: record.raw,
  };
}

interface ChoiceScorerOptions {
  id: string;
  name: string;
  resultKey: string;
  model: AgentModelReference;
  maxOutputTokens?: number;
  buildPrompt: (
    context: BuilderScoreContext<Record<string, unknown>, Record<string, unknown>>,
  ) => string;
  choices: Record<ChoiceId, ChoiceDefinition>;
  defaultReason?: string;
  judgeInstructions?: string;
}

function createChoiceScorer(
  options: ChoiceScorerOptions,
): LocalScorerDefinition<Record<string, unknown>> {
  const { id, name, resultKey, model, maxOutputTokens, buildPrompt, choices, defaultReason } =
    options;

  return buildScorer<Record<string, unknown>, Record<string, unknown>>({
    id,
    label: name,
    metadata: {
      voltAgent: {
        scorer: id,
      },
    },
  })
    .score(async (context) => {
      const analysis = await evaluateChoice({
        context,
        model,
        buildPrompt,
        choices,
        maxOutputTokens,
        scorerId: id,
        judgeInstructions: options.judgeInstructions,
      });

      context.results.raw[resultKey] = analysis;

      return {
        score: analysis.definition.score,
        metadata: {
          choice: analysis.choice,
          reason: analysis.reason,
          raw: analysis.raw,
        },
      };
    })
    .reason(({ results }) => {
      const analysis = getChoiceAnalysis(results.raw, resultKey);
      if (!analysis) {
        return {
          reason: defaultReason ?? "No analysis was available.",
        };
      }

      const base = analysis.definition.description;
      const explanation = analysis.reason ? `${base} ${analysis.reason}` : base;
      return {
        reason: explanation.trim(),
      };
    })
    .build();
}

export interface FactualityScorerOptions {
  id?: string;
  name?: string;
  model: AgentModelReference;
  maxOutputTokens?: number;
}

export function createFactualityScorer(
  options: FactualityScorerOptions,
): LocalScorerDefinition<Record<string, unknown>> {
  const { id = "factuality", name = "Factuality", model, maxOutputTokens } = options;
  const choices: Record<ChoiceId, ChoiceDefinition> = {
    A: { score: 0.4, description: "Subset of expert answer; consistent." },
    B: { score: 0.6, description: "Superset of expert answer; consistent." },
    C: { score: 1, description: "Matches the expert answer." },
    D: { score: 0, description: "Conflicts with the expert answer." },
    E: { score: 1, description: "Differences do not impact factuality." },
  };

  return createChoiceScorer({
    id,
    name,
    resultKey: `${id}Analysis`,
    model,
    judgeInstructions: "Judge whether the submission matches the expert answer.",
    maxOutputTokens,
    choices,
    defaultReason: "Factuality judgement was unavailable.",
    buildPrompt: (context) => {
      const question = normalizeText(context.payload.input);
      const expert = normalizeText((context.payload as Record<string, unknown>).expected);
      const submission = normalizeText(context.payload.output);

      return [
        "You are comparing a submitted answer to an expert answer.",
        "",
        "[BEGIN DATA]",
        `[Question]: ${question}`,
        "************",
        `[Expert]: ${expert}`,
        "************",
        `[Submission]: ${submission}`,
        "[END DATA]",
        "",
        "Select the option that best describes the relationship between the submission and the expert answer:",
        "A. Submission is a subset of the expert answer and consistent.",
        "B. Submission is a superset of the expert answer and consistent.",
        "C. Submission contains the same details as the expert answer.",
        "D. Submission conflicts with the expert answer.",
        "E. Differences exist but do not affect factuality.",
        "",
        'Respond with JSON like {"choice":"A","reason":"..."}.',
      ].join("\n");
    },
  });
}

export interface SummaryScorerOptions {
  id?: string;
  name?: string;
  model: AgentModelReference;
  maxOutputTokens?: number;
}

export function createSummaryScorer(
  options: SummaryScorerOptions,
): LocalScorerDefinition<Record<string, unknown>> {
  const { id = "summary", name = "Summary", model, maxOutputTokens } = options;
  const choices: Record<ChoiceId, ChoiceDefinition> = {
    A: { score: 0, description: "Expert summary (A) is preferred." },
    B: { score: 1, description: "Submission summary (B) is preferred." },
  };

  return createChoiceScorer({
    id,
    name,
    resultKey: `${id}Analysis`,
    model,
    judgeInstructions: "Decide which summary better reflects the original text.",
    maxOutputTokens,
    choices,
    defaultReason: "Summary comparison was unavailable.",
    buildPrompt: (context) => {
      const original = normalizeText(context.payload.input);
      const expert = normalizeText((context.payload as Record<string, unknown>).expected);
      const submission = normalizeText(context.payload.output);

      return [
        "You are comparing two summaries of the same text.",
        "",
        "[BEGIN DATA]",
        `[Text]: ${original}`,
        "************",
        `[Summary A]: ${expert}`,
        "************",
        `[Summary B]: ${submission}`,
        "[END DATA]",
        "",
        "Choose which summary better describes the original text: A or B.",
        'Respond with JSON like {"choice":"B","reason":"..."}.',
      ].join("\n");
    },
  });
}

export interface HumorScorerOptions {
  id?: string;
  name?: string;
  model: AgentModelReference;
  maxOutputTokens?: number;
}

export function createHumorScorer(
  options: HumorScorerOptions,
): LocalScorerDefinition<Record<string, unknown>> {
  const { id = "humor", name = "Humor", model, maxOutputTokens } = options;
  const choices: Record<ChoiceId, ChoiceDefinition> = {
    YES: { score: 1, description: "The submission is humorous." },
    NO: { score: 0, description: "The submission is not humorous." },
    UNSURE: { score: 0.5, description: "Humor is uncertain." },
  };

  return createChoiceScorer({
    id,
    name,
    resultKey: `${id}Analysis`,
    model,
    maxOutputTokens,
    judgeInstructions: "Evaluate whether the submission is humorous.",
    choices,
    defaultReason: "Humor judgement was unavailable.",
    buildPrompt: (context) => {
      const content = normalizeText(context.payload.output);
      return [
        "You are evaluating whether the following text is humorous.",
        "Choose YES, NO, or UNSURE and explain briefly.",
        "",
        "Text:",
        '"""',
        content,
        '"""',
        "",
        'Respond with JSON like {"choice":"YES","reason":"..."}.',
      ].join("\n");
    },
  });
}

export interface PossibleScorerOptions {
  id?: string;
  name?: string;
  model: AgentModelReference;
  maxOutputTokens?: number;
}

export function createPossibleScorer(
  options: PossibleScorerOptions,
): LocalScorerDefinition<Record<string, unknown>> {
  const { id = "possible", name = "Possible", model, maxOutputTokens } = options;
  const choices: Record<ChoiceId, ChoiceDefinition> = {
    A: { score: 0, description: "Submission declares the task impossible." },
    B: { score: 1, description: "Submission provides guidance or a solution." },
  };

  return createChoiceScorer({
    id,
    name,
    resultKey: `${id}Analysis`,
    model,
    maxOutputTokens,
    judgeInstructions:
      "Determine whether the submission claims the task is impossible or offers guidance.",
    choices,
    defaultReason: "Possibility judgement was unavailable.",
    buildPrompt: (context) => {
      const task = normalizeText(context.payload.input);
      const submission = normalizeText(context.payload.output);

      return [
        "You are assessing whether a submission claims a task is impossible or offers guidance.",
        "",
        "[BEGIN DATA]",
        `[Task]: ${task}`,
        "************",
        `[Submission]: ${submission}`,
        "[END DATA]",
        "",
        "Choose one option:",
        "A. The submission declares the task impossible.",
        "B. The submission provides instructions or a solution.",
        'Respond with JSON like {"choice":"B","reason":"..."}.',
      ].join("\n");
    },
  });
}

export interface TranslationScorerOptions {
  id?: string;
  name?: string;
  model: AgentModelReference;
  maxOutputTokens?: number;
}

export function createTranslationScorer(
  options: TranslationScorerOptions,
): LocalScorerDefinition<Record<string, unknown>, { language?: string }> {
  const { id = "translation", name = "Translation", model, maxOutputTokens } = options;
  const choices: Record<ChoiceId, ChoiceDefinition> = {
    Y: { score: 1, description: "Submission matches the expert translation." },
    N: { score: 0, description: "Submission differs from the expert translation." },
  };

  return createChoiceScorer({
    id,
    name,
    resultKey: `${id}Analysis`,
    model,
    maxOutputTokens,
    judgeInstructions: "Judge whether the submission matches the expert translation.",
    choices,
    defaultReason: "Translation judgement was unavailable.",
    buildPrompt: (context) => {
      const payload = context.payload as Record<string, unknown>;
      const params = context.params as { language?: string } | undefined;

      const sentence = normalizeText(payload.input);
      const expert = normalizeText(payload.expected);
      const submission = normalizeText(payload.output);
      const language = params?.language ?? "the source language";

      return [
        "You are comparing an expert translation with a submitted translation.",
        "",
        `The sentence was translated from ${language} to English.`,
        "",
        "[BEGIN DATA]",
        `[Sentence]: ${sentence}`,
        "************",
        `[Expert Translation]: ${expert}`,
        "************",
        `[Submission Translation]: ${submission}`,
        "[END DATA]",
        "",
        "If the submission has the same meaning as the expert translation, choose 'Y'.",
        "If it differs in meaning, choose 'N'.",
        'Respond with JSON like {"choice":"Y","reason":"..."}.',
      ].join("\n");
    },
  });
}
