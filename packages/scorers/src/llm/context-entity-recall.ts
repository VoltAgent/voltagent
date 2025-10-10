import {
  type BuilderScoreContext,
  type LanguageModel,
  type LocalScorerDefinition,
  buildScorer,
  evaluateWithLlm,
} from "@voltagent/core";
import { safeStringify } from "@voltagent/internal/utils";
import { z } from "zod";

const ENTITY_PROMPT = `Extract the distinct entities from the following text. Treat proper nouns, years, events, locations, organizations, and other identifying phrases as entities. Output only valid JSON matching the schema inside triple backticks.

Here is the output JSON schema:
\`\`\`
{"type": "object", "properties": {"entities": {"title": "Entities", "type": "array", "items": {"type": "string"}}}, "required": ["entities"]}
\`\`\`

Text: {{text}}
Output:
`;

const ENTITY_SCHEMA = z.object({
  entities: z.array(z.string()),
});

export interface ContextEntityRecallPayload extends Record<string, unknown> {
  expected: unknown;
  context: unknown;
}

export interface ContextEntityRecallParams extends Record<string, unknown> {
  maxOutputTokens?: number;
}

export interface ContextEntityRecallMetadata extends Record<string, unknown> {
  expectedEntities: string[];
  contextEntities: string[];
}

export interface ContextEntityRecallScorerOptions<
  Payload extends Record<string, unknown> = ContextEntityRecallPayload,
  Params extends Record<string, unknown> = ContextEntityRecallParams,
> {
  id?: string;
  name?: string;
  model: LanguageModel;
  maxOutputTokens?: number;
  metadata?: Record<string, unknown> | null;
  buildPayload?: (context: ContextEntityRecallContext<Payload, Params>) => {
    expected: string;
    context: string;
  };
  extractEntities?: (
    text: string,
    context: ContextEntityRecallContext<Payload, Params>,
  ) => Promise<string[]>;
}

type ContextEntityRecallContext<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = BuilderScoreContext<Payload, Params>;

export function createContextEntityRecallScorer<
  Payload extends Record<string, unknown> = ContextEntityRecallPayload,
  Params extends Record<string, unknown> = ContextEntityRecallParams,
>(
  options: ContextEntityRecallScorerOptions<Payload, Params>,
): LocalScorerDefinition<Payload, Params> {
  const {
    id = "contextEntityRecall",
    name = "Context Entity Recall",
    model,
    maxOutputTokens,
    metadata,
    buildPayload,
    extractEntities,
  } = options;

  const resolvePayload = (context: ContextEntityRecallContext<Payload, Params>) => {
    if (buildPayload) {
      return buildPayload(context);
    }
    return {
      expected: normalizeText((context.payload as Record<string, unknown>).expected),
      context: normalizeText((context.payload as Record<string, unknown>).context),
    };
  };

  const defaultExtractor = async (
    text: string,
    context: ContextEntityRecallContext<Payload, Params>,
  ) => {
    const normalized = normalizeText(text);
    if (!normalized) {
      return [];
    }

    const { result } = await evaluateWithLlm({
      model,
      maxOutputTokens,
      context,
      buildPrompt: () => ENTITY_PROMPT.replace("{{text}}", normalized),
      parse: ({ text: raw }) => parseEntityResponse(raw),
    });

    return Array.isArray(result.entities) ? result.entities : [];
  };

  const extractor = extractEntities ?? defaultExtractor;

  return buildScorer<Payload, Params>({
    id,
    label: name,
    metadata: mergeMetadata(metadata, {
      voltAgent: {
        scorer: id,
        category: "context_entity_recall",
      },
    }),
  })
    .score(async (context) => {
      const payload = resolvePayload(context);

      const expectedEntities = await extractor(payload.expected, context);
      const contextEntities = await extractor(payload.context, context);

      const recall = computeRecall(expectedEntities, contextEntities);

      context.results.raw.contextEntityRecall = {
        expectedEntities,
        contextEntities,
        recall,
      } satisfies ContextEntityRecallMetadata & { recall: number };

      return {
        score: recall,
        metadata: {
          expectedEntities,
          contextEntities,
        },
      };
    })
    .build();
}

function parseEntityResponse(text: string): z.infer<typeof ENTITY_SCHEMA> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { entities: [] };
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const result = ENTITY_SCHEMA.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
  } catch {
    // ignore parse error
  }
  return { entities: [] };
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

function computeRecall(expected: string[], contextEntities: string[]): number {
  if (expected.length === 0) {
    return 0;
  }

  const expectedSet = new Set(expected.map((value) => value.toLowerCase()));
  const contextSet = new Set(contextEntities.map((value) => value.toLowerCase()));

  let matches = 0;
  for (const value of expectedSet) {
    if (contextSet.has(value)) {
      matches += 1;
    }
  }

  return matches / expectedSet.size;
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
