import type { AgentEvalContext, LocalScorerDefinition } from "@voltagent/core";
// Only import heuristic scorers from AutoEvals that don't require LLM/API keys
// For LLM-based evaluation, use the native VoltAgent scorers below that take a model parameter
import { ExactMatch, JSONDiff, Levenshtein, ListContains, NumericDiff } from "autoevals";
import { createAutoEvalScorer } from "./autoeval";

// Type definitions for heuristic scorers only
type JSONDiffFn = typeof JSONDiff;
type ListContainsFn = typeof ListContains;
type NumericDiffFn = typeof NumericDiff;

// These raw scorers are heuristic scorers from AutoEvals that don't require LLM/API keys
// For LLM-based scorers, use the native VoltAgent create*Scorer functions that take a model parameter
export const rawAutoEvalScorers: {
  readonly listContains: ListContainsFn;
  readonly numericDiff: NumericDiffFn;
  readonly jsonDiff: JSONDiffFn;
  readonly exactMatch: typeof ExactMatch;
  readonly levenshtein: typeof Levenshtein;
} = {
  listContains: ListContains,
  numericDiff: NumericDiff,
  jsonDiff: JSONDiff,
  exactMatch: ExactMatch,
  levenshtein: Levenshtein,
} as const;

type GenericLocalScorer = LocalScorerDefinition<Record<string, unknown>, any>;

type AutoEvalScorerKeys = keyof typeof rawAutoEvalScorers;
type AutoEvalScorerMap = { [K in AutoEvalScorerKeys]: GenericLocalScorer };

const autoEvalDefaultDefinitions: Partial<AutoEvalScorerMap> = {};

for (const [key, scorer] of Object.entries(rawAutoEvalScorers) as Array<
  [keyof typeof rawAutoEvalScorers, (typeof rawAutoEvalScorers)[keyof typeof rawAutoEvalScorers]]
>) {
  autoEvalDefaultDefinitions[key] = createAutoEvalScorer({
    id: key,
    name: key,
    scorer: scorer as any,
  });
}

export const scorers: AutoEvalScorerMap = autoEvalDefaultDefinitions as AutoEvalScorerMap;

export type ScorersMap = typeof scorers;
export type ScorerName = keyof ScorersMap;

// Export only heuristic AutoEval scorers
// For LLM-based evaluation, use the create*Scorer functions below
export { ExactMatch, JSONDiff, Levenshtein, ListContains, NumericDiff };

export type {
  SamplingPolicy,
  SamplingMetadata,
  ScorerContext,
  ScorerResult,
  LocalScorerDefinition,
  LocalScorerExecutionResult,
  RunLocalScorersArgs,
  RunLocalScorersResult,
} from "@voltagent/core";

export {
  runLocalScorers,
  shouldSample,
  buildSamplingMetadata,
  normalizeScorerResult,
} from "@voltagent/core";

// createAutoEvalScorer is internal - for custom scorers use buildScorer from @voltagent/core

export { createModerationScorer } from "./llm/moderation";
export type { ModerationScorerOptions } from "./llm/moderation";
export {
  createFactualityScorer,
  createSummaryScorer,
  createTranslationScorer,
  createHumorScorer,
  createPossibleScorer,
  type FactualityScorerOptions,
  type SummaryScorerOptions,
  type TranslationScorerOptions,
  type HumorScorerOptions,
  type PossibleScorerOptions,
} from "./llm/classifiers";
export {
  createAnswerCorrectnessScorer,
  type AnswerCorrectnessScorerOptions,
  type AnswerCorrectnessPayload,
  type AnswerCorrectnessParams,
} from "./llm/answer-correctness";
export {
  createAnswerRelevancyScorer,
  type AnswerRelevancyScorerOptions,
  type AnswerRelevancyPayload,
  type AnswerRelevancyParams,
} from "./llm/answer-relevancy";
export {
  createContextPrecisionScorer,
  type ContextPrecisionScorerOptions,
  type ContextPrecisionPayload,
  type ContextPrecisionParams,
} from "./llm/context-precision";
export {
  createContextRecallScorer,
  type ContextRecallScorerOptions,
  type ContextRecallPayload,
  type ContextRecallParams,
} from "./llm/context-recall";
export {
  createContextRelevancyScorer,
  type ContextRelevancyScorerOptions,
  type ContextRelevancyPayload,
  type ContextRelevancyParams,
  type ContextRelevancyMetadata,
} from "./llm/context-relevancy";

export interface AgentScorerAdapterOptions<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> {
  buildPayload: (context: AgentEvalContext) => Payload | Promise<Payload>;
  buildParams?: (context: AgentEvalContext) => Params | undefined | Promise<Params | undefined>;
}

export function adaptScorerForAgentEval<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown> = Record<string, unknown>,
>(
  definition: LocalScorerDefinition<Payload, Params>,
  options: AgentScorerAdapterOptions<Payload, Params>,
): LocalScorerDefinition<AgentEvalContext, Params> {
  const { buildPayload, buildParams } = options;
  const originalParams = definition.params;

  const adaptedParams =
    buildParams ??
    (typeof originalParams === "function"
      ? async (agentContext: AgentEvalContext) => {
          const payload = await buildPayload(agentContext);
          return originalParams(payload);
        }
      : originalParams);

  return {
    ...definition,
    params: adaptedParams as
      | Params
      | ((payload: AgentEvalContext) => Params | undefined | Promise<Params | undefined>)
      | undefined,
    scorer: async ({ payload: agentPayload, params }) => {
      const resolvedPayload = await buildPayload(agentPayload);

      let resolvedParams = params as Params | undefined;
      if (resolvedParams === undefined) {
        if (buildParams) {
          resolvedParams = await buildParams(agentPayload);
        } else if (typeof originalParams === "function") {
          resolvedParams = await originalParams(resolvedPayload);
        } else if (originalParams !== undefined) {
          resolvedParams = originalParams as Params;
        }
      }

      return definition.scorer({
        payload: resolvedPayload,
        params: (resolvedParams ?? ({} as Params)) as Params,
      });
    },
  };
}
