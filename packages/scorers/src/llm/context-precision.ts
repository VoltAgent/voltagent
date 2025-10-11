import {
  type BuilderScoreContext,
  type LanguageModel,
  type LocalScorerDefinition,
  buildScorer,
  createBuilderPromptStep,
} from "@voltagent/core";
import { safeStringify } from "@voltagent/internal/utils";
import { z } from "zod";

const CONTEXT_PRECISION_PROMPT = `Given question, answer and context verify if the context was useful in arriving at the given answer. Give verdict as "1" if useful and "0" if not with json output.

The output should be a well-formatted JSON instance that conforms to the JSON schema below.

As an example, for the schema {"properties": {"foo": {"title": "Foo", "description": "a list of strings", "type": "array", "items": {"type": "string"}}}, "required": ["foo"]}
the object {"foo": ["bar", "baz"]} is a well-formatted instance of the schema. The object {"properties": {"foo": ["bar", "baz"]}} is not well-formatted.

Here is the output JSON schema:
\`\`\`
{"description": "Answer for the verification task whether the context was useful.", "type": "object", "properties": {"reason": {"title": "Reason", "description": "Reason for verification", "type": "string"}, "verdict": {"title": "Verdict", "description": "Binary (0/1) verdict of verification", "type": "integer"}}, "required": ["reason", "verdict"]}
\`\`\`

Do not return any preamble or explanations, return only a pure JSON string surrounded by triple backticks (\`\`\`).

Examples:

question: "What can you tell me about albert Albert Einstein?"
context: "Albert Einstein (14 March 1879 – 18 April 1955) was a German-born theoretical physicist, widely held to be one of the greatest and most influential scientists of all time. Best known for developing the theory of relativity, he also made important contributions to quantum mechanics, and was thus a central figure in the revolutionary reshaping of the scientific understanding of nature that modern physics accomplished in the first decades of the twentieth century. His mass–energy equivalence formula E = mc2, which arises from relativity theory, has been called \"the world's most famous equation\". He received the 1921 Nobel Prize in Physics \"for his services to theoretical physics, and especially for his discovery of the law of the photoelectric effect\", a pivotal step in the development of quantum theory. His work is also known for its influence on the philosophy of science. In a 1999 poll of 130 leading physicists worldwide by the British journal Physics World, Einstein was ranked the greatest physicist of all time. His intellectual achievements and originality have made Einstein synonymous with genius."
answer: "Albert Einstein born in 14 March 1879 was German-born theoretical physicist, widely held to be one of the greatest and most influential scientists of all time. He received the 1921 Nobel Prize in Physics for his services to theoretical physics. He published 4 papers in 1905. Einstein moved to Switzerland in 1895"
verification: \`\`\`{"reason": "The provided context was indeed useful in arriving at the given answer. The context includes key information about Albert Einstein's life and contributions, which are reflected in the answer.", "verdict": 1}\`\`\`

question: "who won 2020 icc world cup?"
context: "The 2022 ICC Men's T20 World Cup, held from October 16 to November 13, 2022, in Australia, was the eighth edition of the tournament. Originally scheduled for 2020, it was postponed due to the COVID-19 pandemic. England emerged victorious, defeating Pakistan by five wickets in the final to clinch their second ICC Men's T20 World Cup title."
answer: "England"
verification: \`\`\`{"reason": "the context was useful in clarifying the situation regarding the 2020 ICC World Cup and indicating that England was the winner of the tournament that was intended to be held in 2020 but actually took place in 2022.", "verdict": 1}\`\`\`

question: "What is the tallest mountain in the world?"
context: "The Andes is the longest continental mountain range in the world, located in South America. It stretches across seven countries and features many of the highest peaks in the Western Hemisphere. The range is known for its diverse ecosystems, including the high-altitude Andean Plateau and the Amazon rainforest."
answer: "Mount Everest."
verification: \`\`\`{"reason": "the provided context discusses the Andes mountain range, which, while impressive, does not include Mount Everest or directly relate to the question about the world's tallest mountain.", "verdict": 0}\`\`\`

Your actual task:

question: {{question}}
context: {{context}}
answer: {{answer}}
verification:
`;

const CONTEXT_PRECISION_SCHEMA = z.object({
  reason: z.string().describe("Reason for verification"),
  verdict: z.number().int().min(0).max(1).describe("Binary (0/1) verdict of verification"),
});

export interface ContextPrecisionPayload extends Record<string, unknown> {
  input: unknown;
  expected: unknown;
  context: unknown;
}

export interface ContextPrecisionParams extends Record<string, unknown> {
  maxOutputTokens?: number;
}

export interface ContextPrecisionMetadata extends Record<string, unknown> {
  reason: string;
  verdict: number;
}

export interface ContextPrecisionScorerOptions<
  Payload extends Record<string, unknown> = ContextPrecisionPayload,
  Params extends Record<string, unknown> = ContextPrecisionParams,
> {
  id?: string;
  name?: string;
  model: LanguageModel;
  maxOutputTokens?: number;
  metadata?: Record<string, unknown> | null;
  buildPayload?: (context: BuilderScoreContext<Payload, Params>) => {
    input: string;
    expected: string;
    context: string;
  };
  evaluateWith?: (
    context: BuilderScoreContext<Payload, Params>,
  ) => Promise<ContextPrecisionMetadata>;
}

export function createContextPrecisionScorer<
  Payload extends Record<string, unknown> = ContextPrecisionPayload,
  Params extends Record<string, unknown> = ContextPrecisionParams,
>(options: ContextPrecisionScorerOptions<Payload, Params>): LocalScorerDefinition<Payload, Params> {
  const {
    id = "contextPrecision",
    name = "Context Precision",
    model,
    maxOutputTokens,
    metadata,
    buildPayload,
    evaluateWith: evaluateOverride,
  } = options;

  const resolvePayload = (context: BuilderScoreContext<Payload, Params>) => {
    if (buildPayload) {
      return buildPayload(context);
    }
    return {
      input: normalizeText(context.payload.input),
      expected: normalizeText((context.payload as Record<string, unknown>).expected),
      context: normalizeText((context.payload as Record<string, unknown>).context),
    };
  };

  const evaluatellm = createBuilderPromptStep<
    BuilderScoreContext<Payload, Params>,
    z.infer<typeof CONTEXT_PRECISION_SCHEMA>,
    ContextPrecisionMetadata
  >({
    model,
    maxOutputTokens,
    schema: CONTEXT_PRECISION_SCHEMA,
    buildPrompt: (context) => {
      const payload = resolvePayload(context);
      return CONTEXT_PRECISION_PROMPT.replace("{{question}}", payload.input)
        .replace("{{context}}", payload.context)
        .replace("{{answer}}", payload.expected);
    },
    transform: ({ value }) => ({
      reason: value.reason,
      verdict: clampVerdict(value.verdict),
    }),
  });

  return buildScorer<Payload, Params>({
    id,
    label: name,
    metadata: mergeMetadata(metadata, {
      voltAgent: {
        scorer: id,
        category: "context_precision",
      },
    }),
  })
    .score(async (context) => {
      const evaluation = evaluateOverride
        ? await evaluateOverride(context)
        : await evaluatellm(context);
      return formatScore(evaluation);
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

function clampVerdict(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function formatScore(result: ContextPrecisionMetadata) {
  return {
    score: clampVerdict(result.verdict),
    metadata: {
      reason: result.reason,
      verdict: clampVerdict(result.verdict),
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
