import {
  type BuilderScoreContext,
  type LanguageModel,
  type LocalScorerDefinition,
  buildScorer,
  createBuilderPromptStep,
} from "@voltagent/core";
import { safeStringify } from "@voltagent/internal/utils";
import { z } from "zod";

const CONTEXT_RECALL_PROMPT = `Given a context, and an answer, analyze each sentence in the answer and classify if the sentence can be attributed to the given context or not. Use only "Yes" (1) or "No" (0) as a binary classification. Output json with reason.

The output should be a well-formatted JSON instance that conforms to the JSON schema below.

As an example, for the schema {"properties": {"foo": {"title": "Foo", "description": "a list of strings", "type": "array", "items": {"type": "string"}}}, "required": ["foo"]}
the object {"foo": ["bar", "baz"]} is a well-formatted instance of the schema. The object {"properties": {"foo": ["bar", "baz"]}} is not well-formatted.

Here is the output JSON schema:
\`\`\`
{"type": "array", "items": {"$ref": "#/definitions/ContextRecallClassificationAnswer"}, "definitions": {"ContextRecallClassificationAnswer": {"title": "ContextRecallClassificationAnswer", "type": "object", "properties": {"statement": {"title": "Statement", "type": "string"}, "attributed": {"title": "Attributed", "type": "integer"}, "reason": {"title": "Reason", "type": "string"}}, "required": ["statement", "attributed", "reason"]}}}
\`\`\`

Do not return any preamble or explanations, return only a pure JSON string surrounded by triple backticks (\`\`\`).

Examples:

question: "What can you tell me about albert Albert Einstein?"
context: "Albert Einstein (14 March 1879 - 18 April 1955) was a German-born theoretical physicist, widely held to be one of the greatest and most influential scientists of all time. Best known for developing the theory of relativity, he also made important contributions to quantum mechanics, and was thus a central figure in the revolutionary reshaping of the scientific understanding of nature that modern physics accomplished in the first decades of the twentieth century. His mass-energy equivalence formula E = mc2, which arises from relativity theory, has been called 'the world's most famous equation'. He received the 1921 Nobel Prize in Physics 'for his services to theoretical physics, and especially for his discovery of the law of the photoelectric effect', a pivotal step in the development of quantum theory. His work is also known for its influence on the philosophy of science. In a 1999 poll of 130 leading physicists worldwide by the British journal Physics World, Einstein was ranked the greatest physicist of all time. His intellectual achievements and originality have made Einstein synonymous with genius."
answer: "Albert Einstein born in 14 March 1879 was  German-born theoretical physicist, widely held to be one of the greatest and most influential scientists of all time. He received the 1921 Nobel Prize in Physics for his services to theoretical physics. He published 4 papers in 1905.  Einstein moved to Switzerland in 1895"
classification: \`\`\`[{"statement": "Albert Einstein, born on 14 March 1879, was a German-born theoretical physicist, widely held to be one of the greatest and most influential scientists of all time.", "attributed": 1, "reason": "The date of birth of Einstein is mentioned clearly in the context."}, {"statement": "He received the 1921 Nobel Prize in Physics for his services to theoretical physics.", "attributed": 1, "reason": "The exact sentence is present in the given context."}, {"statement": "He published 4 papers in 1905.", "attributed": 0, "reason": "There is no mention about papers he wrote in the given context."}, {"statement": "Einstein moved to Switzerland in 1895.", "attributed": 0, "reason": "There is no supporting evidence for this in the given context."}]\`\`\`

question: "who won 2020 icc world cup?"
context: "The 2022 ICC Men's T20 World Cup, held from October 16 to November 13, 2022, in Australia, was the eighth edition of the tournament. Originally scheduled for 2020, it was postponed due to the COVID-19 pandemic. England emerged victorious, defeating Pakistan by five wickets in the final to clinch their second ICC Men's T20 World Cup title."
answer: "England"
classification: \`\`\`[{"statement": "England won the 2022 ICC Men's T20 World Cup.", "attributed": 1, "reason": "From context it is clear that England defeated Pakistan to win the World Cup."}]\`\`\`

question: "What is the primary fuel for the Sun?"
context: "NULL"
answer: "Hydrogen"
classification: \`\`\`[{"statement": "The Sun's primary fuel is hydrogen.", "attributed": 0, "reason": "The context contains no information"}]\`\`\`

Your actual task:

question: {{question}}
context: {{context}}
answer: {{answer}}
classification:
`;

const CONTEXT_RECALL_SCHEMA = z.array(
  z.object({
    statement: z.string(),
    attributed: z.number().int().min(0).max(1),
    reason: z.string(),
  }),
);

export interface ContextRecallPayload extends Record<string, unknown> {
  input: unknown;
  expected: unknown;
  context: unknown;
}

export interface ContextRecallParams extends Record<string, unknown> {
  maxOutputTokens?: number;
}

export interface ContextRecallEntry extends Record<string, unknown> {
  statement: string;
  attributed: number;
  reason: string;
}

export interface ContextRecallMetadata extends Record<string, unknown> {
  statements: ContextRecallEntry[];
}

type ContextRecallBuilderContext<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = BuilderScoreContext<Payload, Params>;

export interface ContextRecallScorerOptions<
  Payload extends Record<string, unknown> = ContextRecallPayload,
  Params extends Record<string, unknown> = ContextRecallParams,
> {
  id?: string;
  name?: string;
  model: LanguageModel;
  maxOutputTokens?: number;
  metadata?: Record<string, unknown> | null;
  buildPayload?: (context: ContextRecallBuilderContext<Payload, Params>) => {
    input: string;
    expected: string;
    context: string;
  };
  evaluateWith?: (
    context: ContextRecallBuilderContext<Payload, Params>,
  ) => Promise<ContextRecallEntry[]>;
}

type ContextRecallResult = { score: number; metadata: ContextRecallMetadata };

export function createContextRecallScorer<
  Payload extends Record<string, unknown> = ContextRecallPayload,
  Params extends Record<string, unknown> = ContextRecallParams,
>(options: ContextRecallScorerOptions<Payload, Params>): LocalScorerDefinition<Payload, Params> {
  const {
    id = "contextRecall",
    name = "Context Recall",
    model,
    maxOutputTokens,
    metadata,
    buildPayload,
    evaluateWith: evaluateOverride,
  } = options;

  const resolvePayload = (context: ContextRecallBuilderContext<Payload, Params>) => {
    if (buildPayload) {
      return buildPayload(context);
    }
    return {
      input: normalizeText(context.payload.input),
      expected: normalizeText((context.payload as Record<string, unknown>).expected),
      context: normalizeText((context.payload as Record<string, unknown>).context),
    };
  };

  const classifyStep = createBuilderPromptStep<
    ContextRecallBuilderContext<Payload, Params>,
    z.infer<typeof CONTEXT_RECALL_SCHEMA>,
    ContextRecallEntry[]
  >({
    model,
    maxOutputTokens,
    schema: CONTEXT_RECALL_SCHEMA,
    buildPrompt: (context) => {
      const payload = resolvePayload(context);
      return CONTEXT_RECALL_PROMPT.replace("{{question}}", payload.input)
        .replace("{{context}}", payload.context)
        .replace("{{answer}}", payload.expected);
    },
  });

  return buildScorer<Payload, Params>({
    id,
    label: name,
    metadata: mergeMetadata(metadata, {
      voltAgent: {
        scorer: id,
        category: "context_recall",
      },
    }),
  })
    .score(async (context) => {
      const entries = evaluateOverride
        ? await evaluateOverride(context)
        : await classifyStep(context);
      context.results.raw.contextRecall = entries;
      return formatEntries(entries);
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

function formatEntries(entries: ContextRecallEntry[]): ContextRecallResult {
  const attributedValues = entries.map((entry) => clampBinary(entry.attributed));
  const score =
    attributedValues.length === 0
      ? 0
      : attributedValues.reduce((sum, value) => sum + value, 0) / attributedValues.length;
  const normalizedStatements = entries.map(
    (entry, index) =>
      ({
        statement: entry.statement,
        attributed: attributedValues[index],
        reason: entry.reason,
      }) satisfies ContextRecallEntry,
  );

  return {
    score,
    metadata: {
      statements: normalizedStatements,
    },
  };
}

function clampBinary(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  if (numeric <= 0) {
    return 0;
  }
  if (numeric >= 1) {
    return 1;
  }
  return numeric;
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
