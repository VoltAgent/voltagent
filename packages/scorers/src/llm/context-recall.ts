import {
  Agent,
  type AgentModelReference,
  type BuilderScoreContext,
  type LocalScorerDefinition,
  buildScorer,
} from "@voltagent/core";
import { safeStringify } from "@voltagent/internal/utils";
import { z } from "zod";

const CONTEXT_RECALL_EXTRACT_PROMPT = `Given the context and ground truth (expected output), extract all factual statements from the ground truth.

Examples:

Context: "The Eiffel Tower is a wrought-iron lattice tower on the Champ de Mars in Paris, France. It is named after the engineer Gustave Eiffel, whose company designed and built the tower. Constructed from 1887 to 1889, it was initially criticized by some of France's leading artists and intellectuals."
Ground Truth: "The Eiffel Tower was built between 1887 and 1889. It was designed by Gustave Eiffel's company and is located in Paris."

Statements:
- The Eiffel Tower was built between 1887 and 1889
- The Eiffel Tower was designed by Gustave Eiffel's company
- The Eiffel Tower is located in Paris

Your task:

Context: {{context}}
Ground Truth: {{expected}}

Extract all factual statements from the ground truth:`;

const CONTEXT_RECALL_VERIFY_PROMPT = `For each statement, determine if it can be attributed to the given context. Answer with "1" if the statement is supported by the context, "0" if not.

Context: {{context}}

Statement: {{statement}}

Analyze if this statement can be attributed to the context and provide your verdict:`;

const EXTRACT_SCHEMA = z.object({
  statements: z
    .array(z.string())
    .describe("List of factual statements extracted from the ground truth"),
});

const VERIFY_SCHEMA = z.object({
  verdict: z
    .number()
    .int()
    .min(0)
    .max(1)
    .describe("1 if statement is supported by context, 0 if not"),
  reasoning: z.string().describe("Brief reasoning for the verdict"),
});

export interface ContextRecallPayload extends Record<string, unknown> {
  input?: unknown;
  expected?: unknown;
  context?: unknown;
}

export interface ContextRecallParams extends Record<string, unknown> {}

export interface ContextRecallOptions {
  strictness?: number; // 0-1, how strict the attribution should be (default: 0.7)
  partialCredit?: boolean; // Whether to give partial credit for partially supported statements (default: false)
}

type ContextRecallScoreContext<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = BuilderScoreContext<Payload, Params>;

export interface ContextRecallScorerOptions<
  Payload extends Record<string, unknown> = ContextRecallPayload,
  Params extends Record<string, unknown> = ContextRecallParams,
> {
  id?: string;
  name?: string;
  model: AgentModelReference;
  options?: ContextRecallOptions;
  metadata?: Record<string, unknown> | null;
  buildPayload?: (context: ContextRecallScoreContext<Payload, Params>) => {
    input: string;
    expected: string;
    context: string | string[];
  };
}

const DEFAULT_OPTIONS: ContextRecallOptions = {
  strictness: 0.7,
  partialCredit: false,
};

export function createContextRecallScorer<
  Payload extends Record<string, unknown> = ContextRecallPayload,
  Params extends Record<string, unknown> = ContextRecallParams,
>({
  id = "contextRecall",
  name = "Context Recall",
  model,
  options = DEFAULT_OPTIONS,
  metadata,
  buildPayload,
}: ContextRecallScorerOptions<Payload, Params>): LocalScorerDefinition<Payload, Params> {
  const mergedOptions: Required<ContextRecallOptions> = {
    strictness: options?.strictness ?? DEFAULT_OPTIONS.strictness ?? 0.7,
    partialCredit: options?.partialCredit ?? DEFAULT_OPTIONS.partialCredit ?? false,
  };

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
      const agent = new Agent({
        name: "context-recall-evaluator",
        model,
        instructions: "You evaluate how well provided context supports factual statements",
      });

      const payload = resolvePayload(context, buildPayload);
      const contextText = Array.isArray(payload.context)
        ? payload.context.join("\n")
        : payload.context;

      // Extract statements from expected output
      const extractPrompt = CONTEXT_RECALL_EXTRACT_PROMPT.replace(
        "{{context}}",
        contextText,
      ).replace("{{expected}}", payload.expected);

      const extractResponse = await agent.generateObject(extractPrompt, EXTRACT_SCHEMA);
      const statements = extractResponse.object.statements;

      if (statements.length === 0) {
        context.results.raw.contextRecallStatements = [];
        context.results.raw.contextRecallVerdicts = [];
        return 0;
      }

      // Verify each statement against context
      const verdicts: Array<{ statement: string; verdict: number; reasoning: string }> = [];

      for (const statement of statements) {
        const verifyPrompt = CONTEXT_RECALL_VERIFY_PROMPT.replace(
          "{{context}}",
          contextText,
        ).replace("{{statement}}", statement);

        const verifyResponse = await agent.generateObject(verifyPrompt, VERIFY_SCHEMA);
        verdicts.push({
          statement,
          verdict: verifyResponse.object.verdict,
          reasoning: verifyResponse.object.reasoning,
        });
      }

      context.results.raw.contextRecallStatements = statements;
      context.results.raw.contextRecallVerdicts = verdicts;

      // Calculate score
      let supportedCount = 0;
      for (const verdict of verdicts) {
        if (verdict.verdict === 1) {
          supportedCount += 1;
        } else if (
          mergedOptions.partialCredit &&
          verdict.reasoning.toLowerCase().includes("partial")
        ) {
          supportedCount += 0.5;
        }
      }

      const recallScore = supportedCount / statements.length;

      // Apply strictness threshold if needed
      if (mergedOptions.strictness > 0.5) {
        // Penalize scores below strictness threshold
        const adjustedScore =
          recallScore >= mergedOptions.strictness
            ? recallScore
            : recallScore * (recallScore / mergedOptions.strictness);
        return Math.min(1, adjustedScore);
      }

      return recallScore;
    })
    .reason(({ results }) => {
      const statements = (results.raw.contextRecallStatements as string[]) || [];
      const verdicts =
        (results.raw.contextRecallVerdicts as Array<{
          statement: string;
          verdict: number;
          reasoning: string;
        }>) || [];

      if (statements.length === 0) {
        return { reason: "No statements found in expected output to evaluate" };
      }

      const supportedStatements = verdicts.filter((v) => v.verdict === 1);
      const unsupportedStatements = verdicts.filter((v) => v.verdict === 0);

      let reason = `Context recall: ${supportedStatements.length}/${statements.length} statements from expected output are supported by context.`;

      if (unsupportedStatements.length > 0) {
        reason += ` Missing support for: ${unsupportedStatements.map((v) => v.statement).join("; ")}`;
      }

      return {
        reason,
        metadata: {
          totalStatements: statements.length,
          supportedCount: supportedStatements.length,
          unsupportedCount: unsupportedStatements.length,
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
  context: ContextRecallScoreContext<Payload, Params>,
  buildPayload?: (context: ContextRecallScoreContext<Payload, Params>) => {
    input: string;
    expected: string;
    context: string | string[];
  },
): { input: string; expected: string; context: string | string[] } {
  if (buildPayload) {
    return buildPayload(context);
  }

  return {
    input: normalizeText(context.payload.input),
    expected: normalizeText((context.payload as any).expected || ""),
    context: normalizeContext(context.payload.context),
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

function normalizeContext(value: unknown): string | string[] {
  if (Array.isArray(value)) {
    return value.map((v) => normalizeText(v));
  }
  return normalizeText(value);
}

function mergeMetadata(
  base: Record<string, unknown> | null | undefined,
  additional: Record<string, unknown>,
): Record<string, unknown> {
  return { ...base, ...additional };
}
