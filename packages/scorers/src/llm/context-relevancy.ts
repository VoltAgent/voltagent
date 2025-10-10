import {
  type BuilderScoreContext,
  type LanguageModel,
  type LocalScorerDefinition,
  buildScorer,
  createBuilderPromptStep,
} from "@voltagent/core";
import { safeStringify } from "@voltagent/internal/utils";
import { z } from "zod";

const CONTEXT_RELEVANCY_PROMPT = `You are given a question and a reference context. Extract the sentences from the context that are most relevant to answering the question. For each selected sentence, append a list of short reasons explaining why it is relevant. If no sentences are relevant, return an empty list.

Return ONLY valid JSON enclosed in triple backticks, matching the schema below.

Here is the output JSON schema:
\`\`\`
{"type": "object", "properties": {"sentences": {"title": "Sentences", "description": "List of referenced sentences", "type": "array", "items": {"type": "object", "properties": {"sentence": {"title": "Sentence", "description": "The selected sentence", "type": "string"}, "reasons": {"title": "Reasons", "description": "Reasons why the sentence is relevant. Explain your thinking step by step.", "type": "array", "items": {"type": "string"}}}, "required": ["sentence", "reasons"]}}}, "required": ["sentences"]}
\`\`\`

Input question: {{question}}
Reference context: {{context}}
Output:
`;

const CONTEXT_RELEVANCY_SCHEMA = z.object({
  sentences: z
    .array(
      z.object({
        sentence: z.string(),
        reasons: z.array(z.string()),
      }),
    )
    .describe("List of sentences deemed relevant with supporting reasons"),
});

export interface ContextRelevancyPayload extends Record<string, unknown> {
  input: unknown;
  context: unknown;
}

export interface ContextRelevancyParams extends Record<string, unknown> {
  maxOutputTokens?: number;
}

export interface ContextRelevancyEntry extends Record<string, unknown> {
  sentence: string;
  reasons: string[];
}

export interface ContextRelevancyMetadata extends Record<string, unknown> {
  sentences: ContextRelevancyEntry[];
  coverageRatio: number;
}

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
  maxOutputTokens?: number;
  metadata?: Record<string, unknown> | null;
  buildPayload?: (context: ContextRelevancyBuilderContext<Payload, Params>) => {
    input: string;
    context: string;
  };
  evaluateWith?: (
    context: ContextRelevancyBuilderContext<Payload, Params>,
  ) => Promise<ContextRelevancyEntry[]>;
}

type ContextRelevancyResult = { score: number; metadata: ContextRelevancyMetadata };

export function createContextRelevancyScorer<
  Payload extends Record<string, unknown> = ContextRelevancyPayload,
  Params extends Record<string, unknown> = ContextRelevancyParams,
>(options: ContextRelevancyScorerOptions<Payload, Params>): LocalScorerDefinition<Payload, Params> {
  const {
    id = "contextRelevancy",
    name = "Context Relevancy",
    model,
    maxOutputTokens,
    metadata,
    buildPayload,
    evaluateWith: evaluateOverride,
  } = options;

  const resolvePayload = (context: ContextRelevancyBuilderContext<Payload, Params>) => {
    if (buildPayload) {
      return buildPayload(context);
    }
    return {
      input: normalizeText(context.payload.input),
      context: normalizeText((context.payload as Record<string, unknown>).context),
    };
  };

  const evaluateStep = createBuilderPromptStep<
    ContextRelevancyBuilderContext<Payload, Params>,
    z.infer<typeof CONTEXT_RELEVANCY_SCHEMA>,
    z.infer<typeof CONTEXT_RELEVANCY_SCHEMA>
  >({
    model,
    maxOutputTokens,
    buildPrompt: (context) => {
      const payload = resolvePayload(context);
      return CONTEXT_RELEVANCY_PROMPT.replace("{{question}}", payload.input).replace(
        "{{context}}",
        payload.context,
      );
    },
    schema: CONTEXT_RELEVANCY_SCHEMA,
  });

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
      const payload = resolvePayload(context);
      const rawEntries = evaluateOverride
        ? await evaluateOverride(context)
        : (await evaluateStep(context)).sentences;

      context.results.raw.contextRelevancy = rawEntries;
      return formatEntries(payload.context, rawEntries);
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

function formatEntries(context: string, entries: ContextRelevancyEntry[]): ContextRelevancyResult {
  const normalizedSentences = entries.map(
    (entry) =>
      ({
        sentence: entry.sentence,
        reasons: Array.isArray(entry.reasons) ? entry.reasons : [],
      }) satisfies ContextRelevancyEntry,
  );

  const contextLength = context.length > 0 ? context.length : 1;
  const aggregatedLength = normalizedSentences.reduce(
    (sum, entry) => sum + entry.sentence.length,
    0,
  );
  const ratio = Math.min(Math.max(aggregatedLength / contextLength, 0), 1);

  return {
    score: ratio,
    metadata: {
      sentences: normalizedSentences,
      coverageRatio: ratio,
    },
  };
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
