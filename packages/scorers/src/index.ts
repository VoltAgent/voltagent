import type { LocalScorerDefinition } from "@voltagent/core";
import {
  AnswerCorrectness,
  AnswerRelevancy,
  AnswerSimilarity,
  ContextEntityRecall,
  ContextPrecision,
  ContextRecall,
  ContextRelevancy,
  EmbeddingSimilarity,
  ExactMatch,
  Factuality,
  Humor,
  JSONDiff,
  Levenshtein,
  ListContains,
  Moderation,
  NumericDiff,
  Possible,
  Sql,
  Summary,
  Translation,
} from "autoevals";
import { createAutoEvalScorer } from "./autoeval";
import { createAnswerCorrectnessScorer } from "./llm/answer-correctness";
import { createAnswerRelevancyScorer } from "./llm/answer-relevancy";
import { createAnswerSimilarityScorer } from "./llm/answer-similarity";
import {
  createFactualityScorer,
  createSummaryScorer,
  createTranslationScorer,
} from "./llm/classifiers";
import { createContextEntityRecallScorer } from "./llm/context-entity-recall";
import { createContextPrecisionScorer } from "./llm/context-precision";
import { createContextRecallScorer } from "./llm/context-recall";
import { createContextRelevancyScorer } from "./llm/context-relevancy";

type AnswerCorrectnessFn = typeof AnswerCorrectness;
type AnswerRelevancyFn = typeof AnswerRelevancy;
type AnswerSimilarityFn = typeof AnswerSimilarity;
type ContextEntityRecallFn = typeof ContextEntityRecall;
type ContextPrecisionFn = typeof ContextPrecision;
type ContextRecallFn = typeof ContextRecall;
type ContextRelevancyFn = typeof ContextRelevancy;
type EmbeddingSimilarityFn = typeof EmbeddingSimilarity;
type FactualityFn = typeof Factuality;
type HumorFn = typeof Humor;
type JSONDiffFn = typeof JSONDiff;
type ListContainsFn = typeof ListContains;
type ModerationFn = typeof Moderation;
type NumericDiffFn = typeof NumericDiff;
type PossibleFn = typeof Possible;
type SqlFn = typeof Sql;
type SummaryFn = typeof Summary;
type TranslationFn = typeof Translation;

// These raw scorers mirror Viteval's prebuilt catalogue and are exposed for
// advanced use-cases (e.g., building custom adapters on top of AutoEval).
export const rawAutoEvalScorers: {
  readonly factual: FactualityFn;
  readonly moderation: ModerationFn;
  readonly sql: SqlFn;
  readonly summary: SummaryFn;
  readonly translation: TranslationFn;
  readonly answerCorrectness: AnswerCorrectnessFn;
  readonly answerRelevancy: AnswerRelevancyFn;
  readonly answerSimilarity: AnswerSimilarityFn;
  readonly contextEntityRecall: ContextEntityRecallFn;
  readonly contextPrecision: ContextPrecisionFn;
  readonly contextRecall: ContextRecallFn;
  readonly contextRelevancy: ContextRelevancyFn;
  readonly possible: PossibleFn;
  readonly embeddingSimilarity: EmbeddingSimilarityFn;
  readonly listContains: ListContainsFn;
  readonly numericDiff: NumericDiffFn;
  readonly jsonDiff: JSONDiffFn;
  readonly humor: HumorFn;
  readonly exactMatch: typeof ExactMatch;
  readonly levenshtein: typeof Levenshtein;
} = {
  factual: Factuality,
  moderation: Moderation,
  sql: Sql,
  summary: Summary,
  translation: Translation,
  answerCorrectness: AnswerCorrectness,
  answerRelevancy: AnswerRelevancy,
  answerSimilarity: AnswerSimilarity,
  contextEntityRecall: ContextEntityRecall,
  contextPrecision: ContextPrecision,
  contextRecall: ContextRecall,
  contextRelevancy: ContextRelevancy,
  possible: Possible,
  embeddingSimilarity: EmbeddingSimilarity,
  listContains: ListContains,
  numericDiff: NumericDiff,
  jsonDiff: JSONDiff,
  humor: Humor,
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

export {
  AnswerCorrectness,
  AnswerRelevancy,
  AnswerSimilarity,
  ContextEntityRecall,
  ContextPrecision,
  ContextRecall,
  ContextRelevancy,
  EmbeddingSimilarity,
  ExactMatch,
  Factuality,
  Humor,
  JSONDiff,
  Levenshtein,
  ListContains,
  Moderation,
  NumericDiff,
  Possible,
  Sql,
  Summary,
  Translation,
};

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

export { createAutoEvalScorer } from "./autoeval";
export type { AutoEvalScorerOptions } from "./autoeval";

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
  type GeneratedQuestion,
  type QuestionSimilarityEntry,
} from "./llm/answer-relevancy";
export {
  createAnswerSimilarityScorer,
  type AnswerSimilarityScorerOptions,
  type AnswerSimilarityPayload,
  type AnswerSimilarityParams,
  type AnswerSimilarityMetadata,
} from "./llm/answer-similarity";
export {
  createContextPrecisionScorer,
  type ContextPrecisionScorerOptions,
  type ContextPrecisionPayload,
  type ContextPrecisionParams,
  type ContextPrecisionMetadata,
} from "./llm/context-precision";
export {
  createContextRecallScorer,
  type ContextRecallScorerOptions,
  type ContextRecallPayload,
  type ContextRecallParams,
  type ContextRecallMetadata,
} from "./llm/context-recall";
export {
  createContextRelevancyScorer,
  type ContextRelevancyScorerOptions,
  type ContextRelevancyPayload,
  type ContextRelevancyParams,
  type ContextRelevancyMetadata,
} from "./llm/context-relevancy";
export {
  createContextEntityRecallScorer,
  type ContextEntityRecallScorerOptions,
  type ContextEntityRecallPayload,
  type ContextEntityRecallParams,
  type ContextEntityRecallMetadata,
} from "./llm/context-entity-recall";
